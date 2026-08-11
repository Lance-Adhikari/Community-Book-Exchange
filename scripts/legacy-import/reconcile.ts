import { createHash } from "node:crypto";

import { ImportValidationError } from "./parser";
import type { IdempotencyCounts, ImportCandidate, TransformationResult } from "./types";

const EMPTY_COUNTS = (): { insert: number; noOpSameHash: number; conflictDifferentHash: number; invalid: number } => ({
  insert: 0,
  noOpSameHash: 0,
  conflictDifferentHash: 0,
  invalid: 0,
});

export function classifyIdempotency(
  candidates: readonly ImportCandidate[],
  targetHashes: ReadonlyMap<string, string>,
): IdempotencyCounts {
  const counts = EMPTY_COUNTS();
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.key.length === 0 || !/^[0-9a-f]{64}$/u.test(candidate.sourceRowHash) || seen.has(candidate.key)) {
      counts.invalid += 1;
      continue;
    }
    seen.add(candidate.key);
    const targetHash = targetHashes.get(candidate.key);
    if (targetHash === undefined) counts.insert += 1;
    else if (targetHash === candidate.sourceRowHash) counts.noOpSameHash += 1;
    else counts.conflictDifferentHash += 1;
  }
  return counts;
}

export function aggregateDigest(hashes: readonly string[]): string {
  return createHash("sha256").update([...hashes].sort().join("\n"), "utf8").digest("hex");
}

export function assertExpectedReconciliation(result: TransformationResult): void {
  const unclaimed = result.members.filter((member) => member.claim_status === "unclaimed").length;
  const reviewRequired = result.members.filter((member) => member.claim_status === "review_required").length;
  const resolvedOwners = result.books.filter((book) => book.privateLink.legacy_member_lookup_user_id !== null).length;
  const ownerZero = result.books.filter((book) => (
    book.privateLink.legacy_owner_user_id === 0
    && book.privateLink.legacy_member_lookup_user_id === null
  )).length;
  const uniqueBookIds = new Set(result.books.map((book) => book.legacyBookId)).size;

  const checks: Array<[boolean, string]> = [
    [result.sourceCounts.users === 28, "SOURCE_USER_COUNT"],
    [result.members.length === 28, "MEMBER_PROPOSAL_COUNT"],
    [unclaimed === 4, "UNCLAIMED_COUNT"],
    [reviewRequired === 24, "REVIEW_REQUIRED_COUNT"],
    [result.sourceCounts.addresses === 0, "ADDRESS_COUNT"],
    [result.sourceCounts.authors === 0, "AUTHOR_COUNT"],
    [result.sourceCounts.categories === 6, "SOURCE_CATEGORY_COUNT"],
    [result.categoryMappings.length === 7, "CATEGORY_MAPPING_COUNT"],
    [result.categoryMappings.some((mapping) => mapping.legacy_category_id === 0 && mapping.modern_slug === "other-uncategorized"), "CATEGORY_ZERO_MAPPING"],
    [result.sourceCounts.books === 7, "SOURCE_BOOK_COUNT"],
    [result.books.length === 7, "BOOK_PROPOSAL_COUNT"],
    [uniqueBookIds === 7, "BOOK_ID_PRESERVATION"],
    [resolvedOwners === 6, "RESOLVED_OWNER_COUNT"],
    [ownerZero === 1, "OWNER_ZERO_COUNT"],
    [Object.keys(result.excludedFieldViolations).length === 0, "EXCLUDED_FIELD_COUNT"],
  ];
  const failed = checks.find(([passed]) => !passed);
  if (failed) {
    throw new ImportValidationError("RECONCILIATION_FAILED", `Dry-run reconciliation failed: ${failed[1]}.`);
  }
}
