# Legacy catalog import dry run

## Purpose and boundary

This tooling validates the minimum legacy member, category, and book migration without writing to Supabase. It has no apply command, database client, RPC call, migration operation, Auth administration, or Storage operation. A real import requires a separate review and explicit approval.

The dry run reads the approved SQL backup into memory, parses only the first-phase source tables, transforms them to the already-applied legacy compatibility schema, simulates idempotent inserts, and emits a count-only reconciliation report. It does not write normalized records or personal-data exports to disk.

## Private input requirements

The SQL path must be supplied at runtime and must resolve outside the Git repository. Repository-local SQL input is rejected. The only accepted source in this version is the verified private backup with:

- Size: 20,407 bytes
- SHA-256: `648E7DA6E5CDE3D617AFBF40027128A69C222E1D918B736A39147E4CAE9500B7`

There is intentionally no hash override. A missing file, repository-local file, size mismatch, or hash mismatch stops the run before parsing.

## Included and deferred tables

The parser reads only:

- `user`
- `address`
- `category`
- `author`
- `book`

These tables remain deferred and their row values are not parsed by this phase:

- `borrow`
- `booktransaction`
- `status`
- `changepassword`

The password column in `user` must be scanned to find tuple boundaries in the MySQL insert statement, but its value is discarded by the parser and never becomes a parsed field, source model, transformation input, hash input, or report field.

## Security exclusions

The importer never produces a destination field from:

- Legacy passwords or password hashes
- Password-reset tokens or recovery state
- Activation/authentication secrets
- SMTP credentials
- Database credentials

The `changepassword` table is ignored. Destination objects are checked for forbidden security-field names before reconciliation. No Supabase Auth user or profile is proposed or created.

## Member transformation and claim classification

Each source user becomes one proposed `private.legacy_members` row keyed by `legacy_user_id`. Basic identity, contact, status, date, and address fields are preserved only in the private destination model. The generated `normalized_email` column is left to PostgreSQL.

`claim_status` is calculated as follows:

- `unclaimed`: the normalized email is plausible and unique, and no supported username or name/phone identity signal is duplicated.
- `review_required`: the normalized email is missing, invalid, or duplicated, or another supported identity signal is ambiguous.
- `claimed`: never produced by import. Claiming requires a future verified account-linking workflow.

Expected dry-run classification is 4 `unclaimed`, 24 `review_required`, and 0 `claimed`.

## Category mapping

Modern category IDs are not hard-coded. An authenticated operator first reads the current `public.categories` rows and supplies a non-personal snapshot containing only IDs, names, and slugs. The importer requires each stable slug/name destination to exist exactly once.

| Legacy ID | Modern category | Stable slug |
|---:|---|---|
| 0 | Other / Uncategorized | `other-uncategorized` |
| 1 | Math | `math` |
| 2 | Science | `science` |
| 3 | Horror | `horror` |
| 4 | Action | `action` |
| 5 | Fantasy | `fantasy` |
| 6 | Grammar | `grammar` |

ID 0 is a synthetic mapping; IDs 1–6 must match the six source category rows. A missing, ambiguous, or renamed destination fails the run.

## Book and ownership transformation

Every distinct source `BookId` remains a distinct proposed book, even when records look duplicated. No content-based deduplication occurs.

The proposed `public.books` values are:

- `source_kind = 'legacy'`
- `owner_id = NULL`
- `owner_display_name = 'Community member'`
- mapped modern `category_id`
- trimmed title and free-text author
- validated published year
- ISBN converted to text
- legacy memo used as description
- `condition = NULL`
- `cover_path = NULL`
- `is_active = true`
- `status = 'unavailable'`

Each book also produces a proposed `private.legacy_book_links` record. A valid nonzero legacy owner is represented by a `legacy_user_id` lookup key; the future apply phase must resolve the generated `legacy_members.id` inside the import transaction. Legacy owner 0 remains `legacy_owner_user_id = 0` with no member lookup and no fabricated member. Barcode and legacy status remain private provenance.

## Excluded legacy fields

The dry run requires these fields to remain null/unused:

- `user.General1` through `user.General10`
- `address.General1` through `address.General10`
- `book.Secondowner`
- `book.General1` through `book.General10`

Any unexpected value fails the run. Failure output contains only the table, column, and affected-row count.

## Deterministic hashes and idempotency

Each member, category mapping, and book/link proposal receives a SHA-256 `source_row_hash` over a canonical, sorted-key representation of migrated/provenance fields. Passwords, reset data, generated database IDs, and timestamps are excluded. Aggregate digests allow two dry runs to be compared without printing row data.

Idempotency keys are:

- Members: `legacy_user_id`
- Category mappings: `legacy_category_id`
- Books and links: `legacy_book_id`

Each candidate is classified as `INSERT`, `NO-OP SAME HASH`, `CONFLICT DIFFERENT HASH`, or `INVALID`. This version accepts `--target-empty` only after the live zero-row target has been independently verified through authenticated, read-only Supabase administration. It does not use a service-role key or weaken private-schema security.

## Invocation

First run the deterministic internal checks:

```text
npm run legacy-import:validate
```

Then obtain a read-only category snapshot and independently verify the target legacy tables and `public.books` are empty. Supply the category snapshot through `CBE_LEGACY_IMPORT_CATEGORIES_JSON` or the `--categories-json` option, and supply the private SQL path at runtime:

```text
npm run legacy-import:dry-run -- "<PRIVATE_SQL_PATH>" --target-empty
```

There is deliberately no `legacy-import:apply` script.

## Reconciliation acceptance rules

The dry run exits nonzero unless all of these statements are true:

- 28 source users produce 28 member proposals.
- Member proposals contain 4 unclaimed and 24 review-required rows.
- 6 source categories plus synthetic ID 0 produce 7 mappings.
- 7 source books produce 7 public-book proposals and 7 private-link proposals.
- 6 book links resolve by valid legacy member key.
- 1 book retains unresolved owner 0.
- No source user or book is unexplained or lost.
- No excluded field contains an unexpected value.
- No security field reaches importer output.
- An empty target classifies 28 members, 7 mappings, and 7 books/links as inserts with no no-op, conflict, or invalid result.

## Privacy and logging

Standard output is limited to counts, non-personal category mappings, source/aggregate hashes, warning/error categories, and validation status. It does not print names, usernames, emails, phones, addresses, barcodes, ISBNs, book titles, passwords, reset tokens, or source rows. Unexpected parser errors do not include SQL snippets or raw values.

No detailed personal-data debug file is generated. If a later investigation genuinely requires private diagnostics, it must be separately approved and written only under the private development archive, never inside Git.

## Real import remains separately gated

A future approved apply phase must add a narrowly scoped administrative import path, resolve generated member/book IDs transactionally, recheck hashes and target conflicts, preserve the same count-safe reporting rules, and reconcile the database afterward. This dry-run tool cannot write data by design.
