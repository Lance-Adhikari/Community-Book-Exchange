export type SqlScalar = string | null;

export type ParsedRow = Readonly<Record<string, SqlScalar>>;

export interface ParsedLegacyDump {
  readonly schemas: ReadonlyMap<string, readonly string[]>;
  readonly rows: ReadonlyMap<string, readonly ParsedRow[]>;
}

export interface LegacyAddressSource {
  readonly legacyAddressId: number;
  readonly postalCode: string | null;
  readonly city: string | null;
  readonly streetName: string | null;
}

export interface LegacyMemberSource {
  readonly legacyUserId: number;
  readonly sourceCreatedOn: string | null;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly username: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly userStatus: string | null;
  readonly legacyAddressId: number | null;
  readonly address: LegacyAddressSource | null;
}

export interface LegacyCategorySource {
  readonly legacyCategoryId: number;
  readonly name: string;
  readonly abbreviation: string | null;
}

export interface LegacyBookSource {
  readonly legacyBookId: number;
  readonly title: string;
  readonly author: string | null;
  readonly legacyCategoryId: number;
  readonly publishedYear: number | null;
  readonly legacyStatusId: number | null;
  readonly barcode: string | null;
  readonly legacyOwnerUserId: number;
  readonly description: string | null;
  readonly isbn: string | null;
}

export interface ModernCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export type ClaimStatus = "unclaimed" | "review_required";

export interface LegacyMemberProposal {
  readonly legacy_user_id: number;
  readonly claimed_profile_id: null;
  readonly source_created_on: string | null;
  readonly first_name: string | null;
  readonly last_name: string | null;
  readonly display_name_candidate: string | null;
  readonly legacy_username: string | null;
  readonly legacy_email: string | null;
  readonly phone: string | null;
  readonly legacy_user_status: string | null;
  readonly legacy_address_id: number | null;
  readonly street_name: string | null;
  readonly address_city: string | null;
  readonly postal_code: string | null;
  readonly claim_status: ClaimStatus;
  readonly claimed_at: null;
  readonly source_row_hash: string;
}

export interface LegacyCategoryMapProposal {
  readonly legacy_category_id: number;
  readonly category_id: string;
  readonly legacy_name: string | null;
  readonly legacy_abbreviation: string | null;
  readonly mapping_reason: string;
  readonly source_row_hash: string;
  readonly modern_name: string;
  readonly modern_slug: string;
}

export interface PublicBookProposal {
  readonly owner_id: null;
  readonly title: string;
  readonly author: string | null;
  readonly category_id: string;
  readonly published_year: number | null;
  readonly isbn: string | null;
  readonly description: string | null;
  readonly condition: null;
  readonly status: "unavailable";
  readonly cover_path: null;
  readonly is_active: true;
  readonly source_kind: "legacy";
  readonly owner_display_name: "Community member";
}

export interface LegacyBookLinkProposal {
  readonly legacy_book_id: number;
  readonly book_id: null;
  readonly legacy_owner_user_id: number;
  readonly legacy_member_id: null;
  readonly legacy_member_lookup_user_id: number | null;
  readonly legacy_category_id: number;
  readonly legacy_status_id: number | null;
  readonly legacy_barcode: string | null;
  readonly source_row_hash: string;
}

export interface LegacyBookProposal {
  readonly legacyBookId: number;
  readonly publicBook: PublicBookProposal;
  readonly privateLink: LegacyBookLinkProposal;
}

export interface ImportCandidate {
  readonly key: string;
  readonly sourceRowHash: string;
}

export interface IdempotencyCounts {
  readonly insert: number;
  readonly noOpSameHash: number;
  readonly conflictDifferentHash: number;
  readonly invalid: number;
}

export interface SourceCounts {
  readonly users: number;
  readonly addresses: number;
  readonly authors: number;
  readonly categories: number;
  readonly books: number;
}

export interface TransformationResult {
  readonly sourceCounts: SourceCounts;
  readonly members: readonly LegacyMemberProposal[];
  readonly categoryMappings: readonly LegacyCategoryMapProposal[];
  readonly books: readonly LegacyBookProposal[];
  readonly excludedFieldViolations: Readonly<Record<string, number>>;
  readonly warnings: number;
}
