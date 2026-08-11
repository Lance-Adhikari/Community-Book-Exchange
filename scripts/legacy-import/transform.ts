import { createHash } from "node:crypto";

import { ImportValidationError } from "./parser";
import type {
  LegacyAddressSource,
  LegacyBookProposal,
  LegacyBookSource,
  LegacyCategoryMapProposal,
  LegacyCategorySource,
  LegacyMemberProposal,
  LegacyMemberSource,
  ModernCategory,
  ParsedLegacyDump,
  ParsedRow,
  SqlScalar,
  TransformationResult,
} from "./types";

const GENERAL_COLUMNS = Array.from({ length: 10 }, (_, index) => `General${index + 1}`);

const CATEGORY_DESTINATIONS: Readonly<Record<number, { readonly name: string; readonly slug: string }>> = {
  0: { name: "Other / Uncategorized", slug: "other-uncategorized" },
  1: { name: "Math", slug: "math" },
  2: { name: "Science", slug: "science" },
  3: { name: "Horror", slug: "horror" },
  4: { name: "Action", slug: "action" },
  5: { name: "Fantasy", slug: "fantasy" },
  6: { name: "Grammar", slug: "grammar" },
};

const FORBIDDEN_DESTINATION_FIELDS = new Set([
  "password",
  "password_hash",
  "reset_token",
  "token",
  "smtp_password",
  "database_password",
  "email_recovery_state",
  "authentication_secret",
]);

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`).join(",")}}`;
}

export function stableHash(value: unknown): string {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

function trimToNull(value: SqlScalar | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requireText(row: ParsedRow, column: string, table: string): string {
  const value = trimToNull(row[column]);
  if (value === null) {
    throw new ImportValidationError("REQUIRED_SOURCE_FIELD", `A required ${table} field is missing.`);
  }
  return value;
}

function parseInteger(value: SqlScalar | undefined, table: string, required: true): number;
function parseInteger(value: SqlScalar | undefined, table: string, required: false): number | null;
function parseInteger(value: SqlScalar | undefined, table: string, required: boolean): number | null {
  const text = trimToNull(value);
  if (text === null) {
    if (required) throw new ImportValidationError("REQUIRED_SOURCE_INTEGER", `A required ${table} identifier is missing.`);
    return null;
  }
  if (!/^-?\d+$/u.test(text)) {
    throw new ImportValidationError("INVALID_SOURCE_INTEGER", `The ${table} table contains a non-integer identifier.`);
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) {
    throw new ImportValidationError("UNSAFE_SOURCE_INTEGER", `The ${table} table contains an out-of-range identifier.`);
  }
  return parsed;
}

function parseDate(value: SqlScalar | undefined): string | null {
  const text = trimToNull(value);
  if (text === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new ImportValidationError("INVALID_SOURCE_DATE", "A legacy member has an invalid source date.");
  }
  return text;
}

function parsePublishedYear(value: SqlScalar | undefined): number | null {
  const year = parseInteger(value, "book", false);
  if (year === null) return null;
  if (year < 1000 || year > 2100) {
    throw new ImportValidationError("INVALID_PUBLISHED_YEAR", "A legacy book has a year outside the target constraint.");
  }
  return year;
}

function hasContent(value: SqlScalar | undefined): boolean {
  return trimToNull(value) !== null;
}

export function countExcludedFieldViolations(dump: ParsedLegacyDump): Readonly<Record<string, number>> {
  const checks: Array<{ table: string; columns: readonly string[] }> = [
    { table: "user", columns: GENERAL_COLUMNS },
    { table: "address", columns: GENERAL_COLUMNS },
    { table: "book", columns: ["Secondowner", ...GENERAL_COLUMNS] },
  ];
  const violations: Record<string, number> = {};
  for (const check of checks) {
    const tableRows = dump.rows.get(check.table) ?? [];
    for (const column of check.columns) {
      const count = tableRows.filter((row) => hasContent(row[column])).length;
      if (count > 0) violations[`${check.table}.${column}`] = count;
    }
  }
  return violations;
}

function normalizeIdentity(value: string | null): string | null {
  return value?.trim().toLocaleLowerCase("en-CA") || null;
}

function isPlausibleEmail(value: string | null): boolean {
  return value !== null && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function countBy(values: readonly (string | null)[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function sourceAddresses(rows: readonly ParsedRow[]): readonly LegacyAddressSource[] {
  return rows.map((row) => ({
    legacyAddressId: parseInteger(row.AddressId, "address", true),
    postalCode: trimToNull(row.ZipCode),
    city: trimToNull(row.City),
    streetName: trimToNull(row.StreetName),
  }));
}

function sourceMembers(rows: readonly ParsedRow[], addresses: readonly LegacyAddressSource[]): readonly LegacyMemberSource[] {
  const addressById = new Map(addresses.map((address) => [address.legacyAddressId, address]));
  return rows.map((row) => {
    const legacyAddressId = parseInteger(row.AddressId, "user", false);
    const address = legacyAddressId === null ? null : addressById.get(legacyAddressId) ?? null;
    if (legacyAddressId !== null && address === null) {
      throw new ImportValidationError("ORPHAN_ADDRESS", "A legacy member references a missing address row.");
    }
    return {
      legacyUserId: parseInteger(row.UserId, "user", true),
      sourceCreatedOn: parseDate(row.CreateDate),
      firstName: trimToNull(row.FirstName),
      lastName: trimToNull(row.LastName),
      username: trimToNull(row.Username),
      email: trimToNull(row.Email),
      phone: trimToNull(row.PhoneNumber),
      userStatus: trimToNull(row.UserStatus),
      legacyAddressId,
      address,
    };
  });
}

function transformMembers(sources: readonly LegacyMemberSource[]): readonly LegacyMemberProposal[] {
  const emailKeys = sources.map((member) => normalizeIdentity(member.email));
  const usernameKeys = sources.map((member) => normalizeIdentity(member.username));
  const namePhoneKeys = sources.map((member) => {
    const name = normalizeIdentity([member.firstName, member.lastName].filter(Boolean).join(" "));
    const phone = normalizeIdentity(member.phone);
    return name !== null && phone !== null ? `${name}\u0000${phone}` : null;
  });
  const emailCounts = countBy(emailKeys);
  const usernameCounts = countBy(usernameKeys);
  const namePhoneCounts = countBy(namePhoneKeys);

  return sources.map((member, index) => {
    const emailKey = emailKeys[index];
    const usernameKey = usernameKeys[index];
    const namePhoneKey = namePhoneKeys[index];
    const claimReady = isPlausibleEmail(emailKey)
      && emailCounts.get(emailKey!) === 1
      && (usernameKey === null || usernameCounts.get(usernameKey) === 1)
      && (namePhoneKey === null || namePhoneCounts.get(namePhoneKey) === 1);
    const displayNameCandidate = member.username
      ?? trimToNull([member.firstName, member.lastName].filter(Boolean).join(" "));
    const hashInput = {
      legacy_user_id: member.legacyUserId,
      source_created_on: member.sourceCreatedOn,
      first_name: member.firstName,
      last_name: member.lastName,
      display_name_candidate: displayNameCandidate,
      legacy_username: member.username,
      legacy_email: member.email,
      phone: member.phone,
      legacy_user_status: member.userStatus,
      legacy_address_id: member.legacyAddressId,
      street_name: member.address?.streetName ?? null,
      address_city: member.address?.city ?? null,
      postal_code: member.address?.postalCode ?? null,
      claim_status: claimReady ? "unclaimed" : "review_required",
    } as const;

    return {
      ...hashInput,
      claimed_profile_id: null,
      claimed_at: null,
      source_row_hash: stableHash(hashInput),
    };
  });
}

function sourceCategories(rows: readonly ParsedRow[]): readonly LegacyCategorySource[] {
  return rows.map((row) => ({
    legacyCategoryId: parseInteger(row.CategoryId, "category", true),
    name: requireText(row, "CategoryName", "category"),
    abbreviation: trimToNull(row.CategoryAbbreviation),
  }));
}

export function transformCategories(
  sources: readonly LegacyCategorySource[],
  modernCategories: readonly ModernCategory[],
): readonly LegacyCategoryMapProposal[] {
  const sourceById = new Map<number, LegacyCategorySource>();
  for (const source of sources) {
    if (sourceById.has(source.legacyCategoryId)) {
      throw new ImportValidationError("DUPLICATE_CATEGORY_ID", "The legacy category table contains a duplicate identifier.");
    }
    sourceById.set(source.legacyCategoryId, source);
  }

  const modernBySlug = new Map<string, ModernCategory[]>();
  for (const category of modernCategories) {
    modernBySlug.set(category.slug, [...(modernBySlug.get(category.slug) ?? []), category]);
  }

  return Object.entries(CATEGORY_DESTINATIONS).map(([legacyIdText, destination]) => {
    const legacyCategoryId = Number(legacyIdText);
    const source = sourceById.get(legacyCategoryId) ?? null;
    if (legacyCategoryId !== 0 && source === null) {
      throw new ImportValidationError("MISSING_LEGACY_CATEGORY", "An approved legacy category row is missing.");
    }
    if (source !== null && normalizeIdentity(source.name) !== normalizeIdentity(destination.name)) {
      throw new ImportValidationError("LEGACY_CATEGORY_NAME_MISMATCH", "A legacy category name differs from the approved mapping.");
    }
    const matches = modernBySlug.get(destination.slug) ?? [];
    if (matches.length !== 1 || matches[0].name !== destination.name) {
      throw new ImportValidationError("MODERN_CATEGORY_MISMATCH", "A modern category destination is missing or ambiguous.");
    }
    const modern = matches[0];
    const hashInput = {
      legacy_category_id: legacyCategoryId,
      legacy_name: source?.name ?? null,
      legacy_abbreviation: source?.abbreviation ?? null,
      modern_slug: modern.slug,
      modern_name: modern.name,
      mapping_reason: legacyCategoryId === 0 ? "synthetic_uncategorized_mapping" : "approved_semantic_match",
    } as const;
    return {
      legacy_category_id: legacyCategoryId,
      category_id: modern.id,
      legacy_name: hashInput.legacy_name,
      legacy_abbreviation: hashInput.legacy_abbreviation,
      mapping_reason: hashInput.mapping_reason,
      source_row_hash: stableHash(hashInput),
      modern_name: modern.name,
      modern_slug: modern.slug,
    };
  });
}

function sourceBooks(rows: readonly ParsedRow[]): readonly LegacyBookSource[] {
  return rows.map((row) => ({
    legacyBookId: parseInteger(row.BookId, "book", true),
    title: requireText(row, "Title", "book"),
    author: trimToNull(row.Author),
    legacyCategoryId: parseInteger(row.CategoryId, "book", true),
    publishedYear: parsePublishedYear(row.PublishedYear),
    legacyStatusId: parseInteger(row.StatusId, "book", false),
    barcode: trimToNull(row.Barcode),
    legacyOwnerUserId: parseInteger(row.UserId, "book", true),
    description: trimToNull(row.Memo),
    isbn: trimToNull(row.Isbn),
  }));
}

function transformBooks(
  sources: readonly LegacyBookSource[],
  members: readonly LegacyMemberProposal[],
  mappings: readonly LegacyCategoryMapProposal[],
): readonly LegacyBookProposal[] {
  const memberIds = new Set(members.map((member) => member.legacy_user_id));
  const categoryByLegacyId = new Map(mappings.map((mapping) => [mapping.legacy_category_id, mapping]));
  const seenBookIds = new Set<number>();

  return sources.map((source) => {
    if (seenBookIds.has(source.legacyBookId)) {
      throw new ImportValidationError("DUPLICATE_BOOK_ID", "The legacy book table contains a duplicate identifier.");
    }
    seenBookIds.add(source.legacyBookId);
    const mapping = categoryByLegacyId.get(source.legacyCategoryId);
    if (!mapping) throw new ImportValidationError("UNMAPPED_BOOK_CATEGORY", "A legacy book category is not mapped.");
    if (source.legacyOwnerUserId !== 0 && !memberIds.has(source.legacyOwnerUserId)) {
      throw new ImportValidationError("UNRESOLVED_BOOK_OWNER", "A legacy book references an unknown nonzero owner.");
    }

    const publicBook = {
      owner_id: null,
      title: source.title.trim(),
      author: source.author?.trim() || null,
      category_id: mapping.category_id,
      published_year: source.publishedYear,
      isbn: source.isbn?.trim() || null,
      description: source.description?.trim() || null,
      condition: null,
      status: "unavailable",
      cover_path: null,
      is_active: true,
      source_kind: "legacy",
      owner_display_name: "Community member",
    } as const;
    const hashInput = {
      legacy_book_id: source.legacyBookId,
      legacy_owner_user_id: source.legacyOwnerUserId,
      legacy_category_id: source.legacyCategoryId,
      legacy_status_id: source.legacyStatusId,
      legacy_barcode: source.barcode,
      category_slug: mapping.modern_slug,
      public_book: publicBook,
    } as const;
    const privateLink = {
      legacy_book_id: source.legacyBookId,
      book_id: null,
      legacy_owner_user_id: source.legacyOwnerUserId,
      legacy_member_id: null,
      legacy_member_lookup_user_id: source.legacyOwnerUserId === 0 ? null : source.legacyOwnerUserId,
      legacy_category_id: source.legacyCategoryId,
      legacy_status_id: source.legacyStatusId,
      legacy_barcode: source.barcode,
      source_row_hash: stableHash(hashInput),
    } as const;
    return { legacyBookId: source.legacyBookId, publicBook, privateLink };
  });
}

function collectObjectKeys(value: unknown, keys = new Set<string>()): ReadonlySet<string> {
  if (value === null || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    for (const item of value) collectObjectKeys(item, keys);
    return keys;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    keys.add(key.toLowerCase());
    collectObjectKeys(child, keys);
  }
  return keys;
}

export function assertSecurityExclusions(value: unknown): void {
  const keys = collectObjectKeys(value);
  for (const forbidden of FORBIDDEN_DESTINATION_FIELDS) {
    if (keys.has(forbidden)) {
      throw new ImportValidationError("SECURITY_FIELD_PRESENT", "A forbidden authentication or credential field reached importer output.");
    }
  }
}

export function transformLegacyDump(
  dump: ParsedLegacyDump,
  modernCategories: readonly ModernCategory[],
): TransformationResult {
  const excludedFieldViolations = countExcludedFieldViolations(dump);
  if (Object.keys(excludedFieldViolations).length > 0) {
    throw new ImportValidationError(
      "EXCLUDED_FIELD_HAS_DATA",
      "An intentionally excluded legacy field unexpectedly contains data.",
      { violations: excludedFieldViolations },
    );
  }

  const addresses = sourceAddresses(dump.rows.get("address") ?? []);
  const memberSources = sourceMembers(dump.rows.get("user") ?? [], addresses);
  const categorySources = sourceCategories(dump.rows.get("category") ?? []);
  const bookSources = sourceBooks(dump.rows.get("book") ?? []);
  const members = transformMembers(memberSources);
  const categoryMappings = transformCategories(categorySources, modernCategories);
  const books = transformBooks(bookSources, members, categoryMappings);
  const result = {
    sourceCounts: {
      users: memberSources.length,
      addresses: addresses.length,
      authors: (dump.rows.get("author") ?? []).length,
      categories: categorySources.length,
      books: bookSources.length,
    },
    members,
    categoryMappings,
    books,
    excludedFieldViolations,
    warnings: 0,
  } as const;
  assertSecurityExclusions({ members, categoryMappings, books });
  return result;
}
