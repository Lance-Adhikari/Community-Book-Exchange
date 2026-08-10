# Initial Supabase schema review

## Scope and outcome

The first migration establishes a new PostgreSQL and Supabase foundation without importing legacy users, credentials, books, transactions, images, or private data. The schema follows the approved version-1 decisions: public browsing, authenticated ownership workflows, a 72-hour request window, and a 21-day loan duration.

This review covers the migration before and after it is applied. It does not authorize frontend conversion, legacy-data import, Storage bucket creation, email delivery, administrator tooling, or deployment.

## Enums

| Type | Values |
|---|---|
| `profile_role` | `user`, `admin` |
| `book_status` | `available`, `reserved`, `borrowed`, `unavailable` |
| `book_condition` | `new`, `like_new`, `good`, `fair`, `poor` |
| `request_status` | `pending`, `approved`, `declined`, `cancelled`, `expired` |
| `loan_status` | `active`, `returned`, `overdue`, `cancelled` |
| `notification_type` | `request_received`, `request_approved`, `request_declined`, `request_cancelled`, `loan_started`, `loan_due`, `loan_returned`, `system` |

All enum identifiers and stored values use lowercase snake case.

## Tables and relationships

| Table | Purpose | Principal relationships |
|---|---|---|
| `profiles` | Private application profile for an Auth identity | `id` references `auth.users(id)` with cascade deletion |
| `categories` | Safe public catalog taxonomy | Referenced by `books.category_id` |
| `books` | User-owned catalog items | Owner references `profiles`; category deletion sets the category to null |
| `book_images` | Future Storage object metadata | Book deletion cascades to image metadata |
| `borrow_requests` | Owner-approved borrowing workflow | Book, requester, and owner references; owner is derived from the locked book workflow |
| `loans` | Active and completed lending records | Unique originating request; book and participants use restrictive deletion behavior |
| `notifications` | Private in-app workflow messages | Recipient references `profiles` with cascade deletion |

Foreign-key columns used by authorization and workflow queries are indexed. Partial unique indexes enforce one pending request per requester and book, and one open (`active` or `overdue`) loan per book.

## Constraints and workflow invariants

- Profile display names, category names/slugs, book titles, image paths, and notification titles cannot be blank.
- Phone numbers and ISBNs are stored as text.
- Publication years, request and loan timestamps, message length, participant differences, image ordering, and JSON object shape are checked by the database.
- A request trigger derives `requester_id` from `auth.uid()`, derives `owner_id` from the available book, applies the 72-hour expiry, and rejects self-requests.
- Clients cannot directly set request workflow fields, create loans, set book workflow status, or create notification content.
- Approval locks the book before the request, validates ownership and state, creates one 21-day loan, marks the book borrowed, closes competing pending requests, and emits notifications atomically.
- Decline, cancellation, and return functions validate the caller and allowed source state before changing data.
- Returning a loan restores the book to available and notifies both participants.

## Functions and triggers

| Function | Security mode | Reason and safeguards |
|---|---|---|
| `private.set_updated_at()` | Invoker | Reusable timestamp trigger; private schema and fixed `pg_catalog` search path |
| `private.handle_new_user()` | Definer | Auth-owned trigger must create the matching profile; fixed search path, minimal insert, safe display-name fallback, no client execute permission |
| `private.prepare_borrow_request()` | Definer | Derives the authenticated requester and current book owner; fixed search path, fully qualified objects, no client execute permission |
| `private.notify_borrow_request_created()` | Definer | Trigger inserts an owner notification clients cannot forge; fixed search path and no client execute permission |
| `approve_borrow_request(uuid)` | Definer | Atomic owner-only approval and loan creation; checks `auth.uid()`, locks records consistently, validates state, and has authenticated-only execute permission |
| `decline_borrow_request(uuid)` | Definer | Owner-only pending-state transition; authenticated-only execute permission |
| `cancel_borrow_request(uuid)` | Definer | Requester-only pending-state transition; authenticated-only execute permission |
| `return_loan(uuid)` | Definer | Participant-only active/overdue return transition; authenticated-only execute permission |

Every security-definer function sets `search_path` to `pg_catalog`, uses fully qualified application objects, verifies the authenticated actor, and has default public/anonymous execution revoked.

## Row Level Security and grants

RLS is enabled on all seven application tables.

| Resource | Anonymous access | Authenticated access |
|---|---|---|
| `profiles` | None | Select and update only the caller's complete row; column grants prevent changing `id`, `role`, or audit fields |
| `categories` | Read | Read |
| `books` | Read active rows | Read active rows and all owned rows; insert/update/delete owned rows with workflow columns restricted by column grants |
| `book_images` | Read metadata for active books | Public read plus owned-book image management |
| `borrow_requests` | None | Read requests sent or received; insert only `book_id` and `message`; transitions only through secured functions |
| `loans` | None | Read only when owner or borrower; no direct client insert/update/delete |
| `notifications` | None | Read only own rows and update only own `read_at`; no direct insert/delete |

The full `profiles` table is not exposed to anonymous users. The `books.owner_id` value is a non-secret relationship identifier and cannot be joined through the Data API to another user's private profile row.

## Public profile view decision

`public.public_profiles` is intentionally omitted from the initial migration. The current schema can list books without exposing another user's profile. A minimal security-invoker view containing only `id`, `display_name`, and `avatar_path` may be added in a separately reviewed migration when the frontend requires public owner identity.

## Category seed

Only seven non-personal reference rows are seeded: Math, Science, Horror, Action, Fantasy, Grammar, and Other / Uncategorized. The stable slug for the final category is `other-uncategorized`. No user, book, request, loan, notification, or image data is seeded.

## Storage plan (deferred)

No Storage buckets or policies are created by this migration. A later reviewed migration may create `avatars` and `book-images` buckets with these requirements:

- authenticated users may write only ownership-scoped paths;
- reads are public only for explicitly approved image paths;
- update and delete policies validate the same ownership relationship as insert;
- application code validates file type and size before upload;
- legacy profile images are not migrated automatically; and
- the watermarked legacy asset is never uploaded.

## Known deferred work

- Automated transition of untouched requests from `pending` to `expired` requires a reviewed scheduled job or server workflow. Approval already rejects requests after `expires_at`.
- Automatic transition of due loans to `overdue` and `loan_due` notification scheduling are deferred.
- `loan_history` is deferred until event requirements and any cleaned legacy mapping are reviewed.
- Administrator grant/revocation tooling must be server-authorized and must not rely on editable user metadata.
- Public owner identity, contact exchange after request approval, email delivery, Storage buckets, and upload validation remain separate reviewed phases.
- RLS must receive multi-user positive and negative integration tests before production use.
- No legacy data migration is authorized by this schema.

## Applied migration verification

- Initial remote migration: `20260809201504_initial_community_book_exchange_schema`
- Privilege-hardening migration: `20260809201917_harden_application_privileges`
- Both local filenames use the same versions recorded by the remote migration history.
- All seven expected tables exist and have RLS enabled.
- All six enum types contain the reviewed values.
- Nineteen explicit RLS policies exist across the application tables.
- Exactly seven safe category rows exist.
- Auth users, profiles, books, requests, loans, and notifications all had zero rows after migration.
- The four client-callable workflow functions are authenticated-only; anonymous execution is denied.
- Private trigger functions are not executable by anonymous or authenticated API roles.

Post-application verification found that the project's preconfigured default privileges had granted broader table access to Data API roles than the initial migration assumed. RLS still restricted rows, and the database contained no users or private records, but the grants were not least privilege. The second migration revoked all application-table and sequence privileges from `anon` and `authenticated`, revoked the corresponding future defaults, and then restored only the reviewed table- and column-level privileges. A direct privilege-matrix check passed after that correction.

The platform also retains `supabase_admin` default ACLs that the migration role cannot alter. They do not override the now-correct grants on these seven tables, but every future migration that creates a Data API table must explicitly revoke broad `anon` and `authenticated` privileges on that table before granting its reviewed operations. This requirement must be verified with `has_table_privilege` and `has_column_privilege`; RLS alone is not a substitute for least-privilege grants.

## Advisor review

The security advisor reported no error or critical finding. It reported four warnings because the secured workflow RPCs are intentionally authenticated-callable `SECURITY DEFINER` functions. These are accepted by design: the RPCs need atomic access that clients do not otherwise have, and each function validates `auth.uid()`, ownership or participation, and the current workflow state; sets a fixed `pg_catalog` search path; fully qualifies application objects; and denies anonymous execution. See the [Supabase advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

The performance advisor reported sixteen informational unused-index notices, which are expected before application data or queries exist. The indexes support foreign keys, RLS predicates, catalog ordering, and planned request/loan/notification access patterns, so they are retained until production-like query evidence exists. See the [unused-index advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

The performance advisor also reported three warnings for separate permissive read policies on `books`, `book_images`, and `borrow_requests`. The policies intentionally separate public visibility from owner/participant visibility. They are correct and easier to audit in this initial migration; consolidation may be considered after measuring real queries. See the [multiple-policy advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).
