import { realpath } from "node:fs/promises";

import { loadApprovedPrivateSource } from "./input";
import { ImportValidationError, parseLegacyDump } from "./parser";
import { aggregateDigest, assertExpectedReconciliation, classifyIdempotency } from "./reconcile";
import { stableHash, transformLegacyDump } from "./transform";
import type { ModernCategory } from "./types";

interface Arguments {
  readonly sourcePath: string;
  readonly targetEmpty: boolean;
  readonly categoriesJson: string;
}

function parseArguments(argv: readonly string[]): Arguments {
  const sourcePath = argv[0];
  if (!sourcePath || sourcePath.startsWith("--")) {
    throw new ImportValidationError("MISSING_SOURCE_PATH", "Provide the approved private SQL path as the first argument.");
  }
  let targetEmpty = false;
  let categoriesJson: string | null = null;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--target-empty") {
      targetEmpty = true;
    } else if (argument === "--categories-json") {
      categoriesJson = argv[index + 1] ?? null;
      index += 1;
    } else {
      throw new ImportValidationError("UNKNOWN_ARGUMENT", "The dry run received an unsupported argument.");
    }
  }
  if (!targetEmpty) {
    throw new ImportValidationError(
      "TARGET_STATE_REQUIRED",
      "This phase requires an explicit empty-target assertion after a separate read-only Supabase verification.",
    );
  }
  categoriesJson ??= process.env.CBE_LEGACY_IMPORT_CATEGORIES_JSON ?? null;
  if (categoriesJson === null) {
    throw new ImportValidationError("MISSING_CATEGORY_SNAPSHOT", "Provide the read-only modern category snapshot.");
  }
  return { sourcePath, targetEmpty, categoriesJson };
}

function parseModernCategories(json: string): readonly ModernCategory[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ImportValidationError("INVALID_CATEGORY_SNAPSHOT", "The modern category snapshot is not valid JSON.");
  }
  if (!Array.isArray(parsed)) {
    throw new ImportValidationError("INVALID_CATEGORY_SNAPSHOT", "The modern category snapshot must be an array.");
  }
  const categories = parsed.map((item) => {
    if (item === null || typeof item !== "object") {
      throw new ImportValidationError("INVALID_CATEGORY_SNAPSHOT", "A modern category snapshot entry is invalid.");
    }
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "number" || typeof record.id === "string" ? String(record.id) : "";
    const name = typeof record.name === "string" ? record.name : "";
    const slug = typeof record.slug === "string" ? record.slug : "";
    if (!/^\d+$/u.test(id) || name.trim() === "" || slug.trim() === "") {
      throw new ImportValidationError("INVALID_CATEGORY_SNAPSHOT", "A modern category snapshot entry is incomplete.");
    }
    return { id, name, slug };
  });
  if (new Set(categories.map((category) => category.slug)).size !== categories.length) {
    throw new ImportValidationError("AMBIGUOUS_CATEGORY_SNAPSHOT", "The modern category snapshot contains duplicate slugs.");
  }
  return categories;
}

async function main(): Promise<void> {
  const args = parseArguments(process.argv.slice(2));
  const repositoryRoot = await realpath(process.cwd());
  const source = await loadApprovedPrivateSource(args.sourcePath, repositoryRoot);
  const modernCategories = parseModernCategories(args.categoriesJson);
  const parsed = parseLegacyDump(source.sql);
  const transformed = transformLegacyDump(parsed, modernCategories);
  assertExpectedReconciliation(transformed);

  const emptyTarget = new Map<string, string>();
  const memberCandidates = transformed.members.map((member) => ({
    key: String(member.legacy_user_id), sourceRowHash: member.source_row_hash,
  }));
  const categoryCandidates = transformed.categoryMappings.map((mapping) => ({
    key: String(mapping.legacy_category_id), sourceRowHash: mapping.source_row_hash,
  }));
  const bookCandidates = transformed.books.map((book) => ({
    key: String(book.legacyBookId), sourceRowHash: book.privateLink.source_row_hash,
  }));
  const memberIdempotency = classifyIdempotency(memberCandidates, emptyTarget);
  const categoryIdempotency = classifyIdempotency(categoryCandidates, emptyTarget);
  const bookIdempotency = classifyIdempotency(bookCandidates, emptyTarget);
  const unclaimed = transformed.members.filter((member) => member.claim_status === "unclaimed").length;
  const reviewRequired = transformed.members.filter((member) => member.claim_status === "review_required").length;
  const resolvedOwners = transformed.books.filter((book) => book.privateLink.legacy_member_lookup_user_id !== null).length;
  const ownerZeroBooks = transformed.books.filter((book) => book.privateLink.legacy_owner_user_id === 0).length;
  const memberDigest = aggregateDigest(transformed.members.map((member) => member.source_row_hash));
  const categoryDigest = aggregateDigest(transformed.categoryMappings.map((mapping) => mapping.source_row_hash));
  const bookDigest = aggregateDigest(transformed.books.map((book) => book.privateLink.source_row_hash));

  const report = {
    status: "PASS",
    mode: "DRY_RUN_ONLY",
    source: {
      pathValidation: "PASS_OUTSIDE_REPOSITORY",
      sizeBytes: source.sizeBytes,
      sha256: source.sha256,
      approvedFingerprint: true,
    },
    sourceTables: transformed.sourceCounts,
    deferredTablesIgnored: ["borrow", "booktransaction", "status", "changepassword"],
    reconciliation: {
      members: transformed.members.length,
      unclaimed,
      reviewRequired,
      claimed: 0,
      categoryMappings: transformed.categoryMappings.length,
      publicBooks: transformed.books.length,
      legacyBookLinks: transformed.books.length,
      resolvedMemberOwners: resolvedOwners,
      unresolvedOwnerZero: ownerZeroBooks,
      lostBooks: transformed.sourceCounts.books - transformed.books.length,
      unexplainedUsers: transformed.sourceCounts.users - transformed.members.length,
      unexplainedBooks: transformed.sourceCounts.books - transformed.books.length,
      unexpectedExcludedFieldValues: Object.keys(transformed.excludedFieldViolations).length,
      warnings: transformed.warnings,
    },
    categoryMappings: transformed.categoryMappings.map((mapping) => ({
      legacyCategoryId: mapping.legacy_category_id,
      modernName: mapping.modern_name,
      modernSlug: mapping.modern_slug,
    })),
    idempotency: {
      members: memberIdempotency,
      categories: categoryIdempotency,
      books: bookIdempotency,
      legacyBookLinks: bookIdempotency,
      targetState: "EXTERNALLY_VERIFIED_EMPTY",
    },
    securityExclusions: "PASS",
    digests: {
      members: memberDigest,
      categories: categoryDigest,
      books: bookDigest,
      combined: stableHash({ memberDigest, categoryDigest, bookDigest }),
    },
  } as const;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const failure = error instanceof ImportValidationError
    ? { category: error.code, details: error.details ?? null }
    : { category: "UNEXPECTED_IMPORTER_ERROR", details: null };
  process.stderr.write(`${JSON.stringify({ status: "FAIL", ...failure })}\n`);
  process.exitCode = 1;
});
