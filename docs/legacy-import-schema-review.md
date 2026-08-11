# Legacy import schema review

## Scope

This schema foundation preserves legacy member, category, book, and ownership identifiers without importing any legacy rows. It does not create Auth users, claim accounts, import password material, migrate transaction history, or expose private contact data.

The reviewed source inventory for the first import phase is:

- 28 legacy users
- 0 address rows
- 0 normalized author rows
- 6 legacy category rows
- 7 legacy book rows
- 6 books with valid legacy owners
- 1 book with legacy `UserId` 0
- 5 books with legacy `CategoryId` 0

## Private legacy members

`private.legacy_members` stores source identity and contact fields outside the exposed `public` schema. It contains no password, password hash, reset token, or authentication secret.

`legacy_user_id` is the stable source identifier. `claimed_profile_id` is nullable and may point to at most one `public.profiles` row. A generated normalized email supports a future verified claim workflow, but duplicate emails remain allowed because the source contains ambiguous identities.

`claim_status` is limited to `unclaimed`, `review_required`, and `claimed`. Claimed records require both a profile link and claim timestamp. Other states require both claim fields to be null. If a claimed profile is deleted, a protected trigger returns the legacy member to `review_required` rather than deleting the provenance record.

Address fields are flattened into the private member record because the reviewed source contains no address rows and every source address reference is null. This avoids an unnecessary public or private address table while retaining compatibility with the source shape.

## Private category mapping

`private.legacy_category_map` maps a stable legacy category identifier to an existing `public.categories` row. The table is intentionally empty in this schema phase. The later private import will map legacy categories 1–6 by stable modern slug and map legacy category 0 to Other / Uncategorized.

Keeping mappings private prevents source identifiers from becoming part of the public catalog API and supports deterministic, repeatable imports.

## Book ownership compatibility

`public.books.owner_id` is nullable so a legacy book can exist before its owner creates and verifies a modern account. The foreign key now uses `ON DELETE SET NULL` so claimed legacy books retain their catalog record if the profile link is later removed.

`source_kind` is limited to `native` and `legacy`:

- Native books require a non-null authenticated owner.
- Legacy books may be ownerless before claim.
- Claimed legacy books retain `source_kind = 'legacy'` while receiving `owner_id`.

`owner_display_name` is public-safe catalog data. Native book labels are derived from `profiles.display_name`; authenticated clients cannot supply or mutate the field. Owner display-name changes synchronize only to books belonging to that profile. Unclaimed imports use the generic label `Community member` and never expose a legacy name, email, phone number, or address.

Deleting a profile that still owns a native book is intentionally blocked by the native-owner constraint until those books are resolved. Claimed legacy books can safely return to ownerless state because their private provenance remains available.

## Private book provenance

`private.legacy_book_links` provides a one-to-one mapping between a legacy `BookId` and a public book row. It preserves:

- Original book identifier
- Original owner `UserId`, including 0
- Resolved private legacy-member link when one exists
- Original category identifier
- Original workflow status identifier
- Original barcode
- Source-row reconciliation hash

Legacy `UserId` 0 is represented by `legacy_owner_user_id = 0` with a null `legacy_member_id`; no fake member is created. Duplicate-looking books remain separate because `legacy_book_id` is authoritative.

## Privacy and privileges

All three legacy tables are in the non-exposed `private` schema, have RLS enabled as defense in depth, and grant no direct access to `PUBLIC`, `anon`, or `authenticated`. No client policies exist for them.

Application access to public books continues through explicit column grants and RLS. The system-controlled `source_kind` and `owner_display_name` columns are excluded from authenticated insert and update privileges. A later import will use a trusted administrative path rather than broad client grants.

## Public browsing and My Books

An active imported book can be browsed while ownerless. Its owner label is generic, and it begins with status `unavailable` pending ownership and status review. Ownerless books cannot enter borrow-request or loan workflows.

Before claim:

- Browse/Search may show the active imported book.
- No authenticated account can edit or delete it.
- It does not appear in a user's My Books solely because an email matches.

After a future verified claim:

- A trusted function sets `books.owner_id` to the verified profile.
- Existing owner RLS makes the book manageable by that account.
- Private `legacy_book_links` provenance remains unchanged.

## Deferred account claiming

No account-claiming RPC is created in this phase. A later reviewed function must derive identity from the verified Supabase Auth session, reject ambiguous duplicate-email matches, lock claim candidates, and transfer ownership atomically. It must never trust a client-supplied email, profile UUID, role, or confirmation state.

## Borrow and loan compatibility

The request insert policy and protected request-preparation trigger explicitly require a non-null current book owner. This keeps ownerless legacy books browsable but outside existing request and loan workflows. Borrow and transaction-history import remains deferred.

## Expected first import reconciliation

The future private import should produce:

- 28 legacy-member rows: 4 claim-eligible and 24 review-required
- 7 category mappings: six source categories plus synthetic category 0 mapping
- 7 public book rows and 7 private book-link rows
- 6 book links resolved to legacy members
- 1 preserved unresolved owner-zero book
- 0 lost or silently deduplicated books

The import must be idempotent by `legacy_user_id` and `legacy_book_id`, compare source-row hashes, and stop for review rather than overwrite a claimed or edited book.
