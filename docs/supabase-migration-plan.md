# Proposed Supabase migration plan

## Status

This is a design proposal only. No Supabase project was connected, no SQL was executed, no table was created, and `backup.sql` was not imported.

The target model separates identity, public profile data, catalog data, request workflow, active loans, immutable history, images, and notifications. Names use lower snake_case; identifiers are generated UUIDs unless a small reference table benefits from identity integers. Event timestamps should be `timestamptz`.

## Mapping overview

| Legacy source/concept | Supabase target | Migration treatment |
|---|---|---|
| `user` authentication fields | `auth.users` | Do not copy password hashes. Create/invite only approved deduplicated identities through Supabase Auth. |
| `user` profile fields | `public.profiles` | Map approved name/username/phone data to the new Auth UUID; retain legacy ID only in a private migration ledger or nullable temporary mapping column. |
| `category` | `public.categories` | Seed cleaned unique names/slugs; decide whether all six values remain. |
| `book` | `public.books` | Clean owner/category references; use text for ISBN/barcode; quarantine owner/category 0 rows. |
| Numeric user image filenames | Storage bucket + `public.profiles.avatar_path` | Import only consented/licensed images under UUID-based paths. |
| Future book photos | Storage bucket + `public.book_images` | New normalized table; legacy app has no reliable book-image relationship. |
| Email-based borrow action | `public.borrow_requests` | Replace hidden-field/email side effect with a durable owner-approved workflow. |
| Current borrowed/reserved transaction | `public.loans` | Create only when evidence is consistent and identities map. |
| `booktransaction` chronology | `public.loan_history` | Transform valid chronological events; quarantine invalid status 0 and ambiguous records. |
| Runtime alerts/email outcomes | `public.notifications` | New in-app notification record; email can become an out-of-band delivery channel, not source of truth. |
| `changepassword` | Supabase Auth recovery | Never migrate. |
| `address`, `author`, `borrow`, `General*` | No initial target | Omit unless a future approved feature requires them. |

## Proposed target entities

Column lists are intentionally implementation-ready but are not executable schema.

### `auth.users`

Managed by Supabase Auth.

- `id uuid` — canonical identity.
- Email and authentication provider data are managed by Auth.
- Do not store authorization roles in editable `user_metadata`; if roles are later needed, use controlled app metadata or a server-managed role table.
- Do not import legacy bcrypt cost-4 hashes, activation tokens, reset tokens, or usernames as passwords.
- Preferred onboarding: deduplicate and approve identities, create/invite them through an administrative migration job, require a fresh verified sign-in, then link the returned UUID to profile/catalog rows.

### `public.profiles`

| Proposed column | Type/constraint | Purpose |
|---|---|---|
| `id` | `uuid primary key references auth.users(id) on delete cascade` | One profile per Auth user |
| `username` | `text`, required after onboarding, case-insensitive unique index | Public handle |
| `first_name` | `text` | Profile name; visibility decision required |
| `last_name` | `text` | Profile name; visibility decision required |
| `phone` | `text` | Optional private contact data; never numeric |
| `avatar_path` | `text` nullable | Storage object path, not a public filesystem filename |
| `created_at` | `timestamptz not null default now()` | Audit timestamp |
| `updated_at` | `timestamptz not null default now()` | Audit timestamp |

A private migration ledger should map `legacy_user_id -> auth_user_id` plus review status and provenance. Do not expose legacy identifiers in public API responses unless needed temporarily. A signup trigger may provision a blank profile, but it must be minimal and tested because a failing Auth trigger can block signups.

### `public.categories`

| Proposed column | Type/constraint | Purpose |
|---|---|---|
| `id` | small generated identity PK | Stable reference |
| `name` | `text not null unique` | Display label |
| `slug` | `text not null unique` | URL/filter key |
| `description` | `text` nullable | Future managed copy |
| `is_active` | `boolean not null default true` | Retire without deleting history |
| `created_at`, `updated_at` | `timestamptz` | Audit timestamps |

Seed only after deciding how category 0 maps. Retain legacy wording when approved.

### `public.books`

| Proposed column | Type/constraint | Purpose |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Book record identity |
| `owner_id` | `uuid not null references profiles(id)` | Current owner |
| `category_id` | FK to `categories`, nullable only if “Uncategorized” is approved | Category |
| `title` | `text not null` | Title |
| `author` | `text not null` | Preserve simple legacy author field initially |
| `published_year` | integer nullable with sensible range check | Publication year |
| `isbn` | `text` nullable with normalized validation | Preserves zeros/hyphens |
| `barcode` | `text` nullable | Community/local identifier; uniqueness policy required |
| `memo` | `text` nullable | Description/notes; sanitize on render |
| `availability` | constrained text/enum-like value | Proposed: `available`, `reserved`, `on_loan`, `unavailable`, `lost` |
| `created_at`, `updated_at` | `timestamptz` | Audit timestamps |

The active workflow, not a copied `StatusId`, should control availability. “Returned” belongs in history, after which the book normally becomes available. Define whether ownership transfer is still a feature; if so, record it explicitly rather than a `Secondowner` column.

### `public.book_images`

| Proposed column | Type/constraint | Purpose |
|---|---|---|
| `id` | UUID PK | Image metadata identity |
| `book_id` | UUID FK to `books` with cascade | Parent book |
| `storage_path` | `text not null unique` | Private/controlled Storage object path |
| `alt_text` | `text` nullable | Accessibility |
| `position` | small integer with nonnegative check | Ordering |
| `is_primary` | boolean default false | Cover choice; enforce one primary per book with partial unique index |
| `created_at` | `timestamptz` | Audit timestamp |

Use a dedicated bucket and object paths such as `{owner_uuid}/{book_uuid}/{image_uuid}`. Validate MIME type/size and re-encode on trusted server infrastructure when appropriate.

### `public.borrow_requests`

| Proposed column | Type/constraint | Purpose |
|---|---|---|
| `id` | UUID PK | Request identity |
| `book_id` | UUID FK to `books` | Requested book |
| `requester_id` | UUID FK to `profiles` | Borrower |
| `owner_id` | UUID FK to `profiles` | Owner at request time for audit/policy |
| `status` | constrained value | `pending`, `accepted`, `declined`, `cancelled`, `expired` |
| `message` | `text` nullable with length limit | Borrower message |
| `requested_at` | `timestamptz default now()` | Creation time |
| `responded_at` | `timestamptz` nullable | Decision time |
| `expires_at` | `timestamptz` nullable | Optional stale-request cleanup |

Constraints should prevent requesting one’s own book, require requester and owner to differ, and prevent more than one active request by the same requester/book. Acceptance must be a transaction or secured server function that locks the book, changes request state, creates a loan, updates availability, appends history, and creates notifications atomically.

### `public.loans`

| Proposed column | Type/constraint | Purpose |
|---|---|---|
| `id` | UUID PK | Loan identity |
| `borrow_request_id` | UUID nullable unique FK | Accepted request origin |
| `book_id` | UUID FK to `books` | Loaned book |
| `lender_id` | UUID FK to `profiles` | Owner/lender at creation |
| `borrower_id` | UUID FK to `profiles` | Borrower |
| `status` | constrained value | `active`, `returned`, `cancelled`, `lost` |
| `loaned_at` | `timestamptz` | Start |
| `due_at` | `timestamptz` nullable | Due date if product adopts one |
| `returned_at` | `timestamptz` nullable | Return time |
| `created_at`, `updated_at` | `timestamptz` | Audit timestamps |

Use a partial unique index to enforce at most one active loan per book. Add checks for lender ≠ borrower, returned timestamp consistency, and due date after loan date.

### `public.loan_history`

| Proposed column | Type/constraint | Purpose |
|---|---|---|
| `id` | generated bigint or UUID PK | Event identity |
| `loan_id` | UUID FK to `loans` | Parent loan |
| `from_status` | constrained value nullable | Previous state |
| `to_status` | constrained value | New state |
| `actor_id` | UUID FK to `profiles` nullable for migration/system | Who caused it |
| `note` | `text` nullable | Reason/context |
| `occurred_at` | `timestamptz not null` | Event time |

Treat as append-only. Legacy `booktransaction` records may need synthetic loan grouping before they can become history; not every “Available” row belongs to a loan.

### `public.notifications`

| Proposed column | Type/constraint | Purpose |
|---|---|---|
| `id` | UUID PK | Notification identity |
| `recipient_id` | UUID FK to `profiles` | Only recipient may read/update |
| `type` | constrained text | Request accepted/declined, loan due, returned, etc. |
| `title` | `text not null` | Short display copy |
| `body` | `text` nullable | Detail copy |
| `borrow_request_id` | nullable UUID FK | Related request |
| `loan_id` | nullable UUID FK | Related loan |
| `book_id` | nullable UUID FK | Related book |
| `read_at` | `timestamptz` nullable | Read state |
| `created_at` | `timestamptz default now()` | Ordering |

Notification content must avoid storing unnecessary email/phone data.

## Access-control model

Enable RLS on every table exposed through the Data API and explicitly grant only required table/schema privileges. Supabase’s current platform behavior is moving away from automatically exposing all new `public` tables, so grants must be part of the reviewed migration rather than assumed.

| Entity | Read | Insert | Update/delete |
|---|---|---|---|
| `profiles` | Public fields readable per product decision; owner reads full own row | Authenticated user creates only own row, or controlled trigger | Owner updates own row; sensitive fields may require server action |
| `categories` | Public/authenticated read | Admin/server only | Admin/server only |
| `books` | Public or authenticated browse, depending product decision | Authenticated owner only | Current owner only; deletion restricted when history exists |
| `book_images` | Same visibility as parent book | Parent-book owner only | Parent-book owner only |
| `borrow_requests` | Requester and owner only | Authenticated requester, `requester_id = auth.uid()` | Requester may cancel; owner may accept/decline through secured transaction |
| `loans` | Lender and borrower only | Secured acceptance function/server only | Controlled transitions by participants/server; no arbitrary mutation |
| `loan_history` | Participants in parent loan | Secured function/server only | No client update/delete |
| `notifications` | Recipient only | Server/secured function only | Recipient may set `read_at`; no arbitrary recipient/content change |

Policy implementation notes:

- Use `(select auth.uid())` in policies and explicit `TO authenticated` where appropriate.
- An UPDATE policy needs both row visibility (`USING`) and allowed new values (`WITH CHECK`), plus the corresponding SELECT policy.
- Index every policy/FK column (`owner_id`, `requester_id`, `recipient_id`, participant IDs, book IDs).
- Never place a service-role key in browser code. Service access bypasses RLS.
- Test policies with distinct user fixtures and unauthenticated requests, including negative cases.

Official references: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [User management](https://supabase.com/docs/guides/auth/managing-user-data), and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## Storage plan

1. Create separate controlled buckets for avatars and book images; decide public vs signed URL behavior explicitly.
2. RLS policies on `storage.objects` must scope paths to the owning Auth UUID and, for books, validate book ownership.
3. Insert requires an INSERT policy; overwrite/upsert also requires appropriate SELECT and UPDATE policies.
4. Never import numeric legacy filenames directly as public identity paths.
5. Exclude the watermarked Getty asset, blank image, unrelated sample photo, and any image without verified ownership/consent.

## Clean migration workflow

### Phase 0 — containment

- Rotate/revoke the exposed database and SMTP credentials.
- Ensure SQL/XML are not deployed to Vercel or bundled into the application.
- Decide whether a separately approved Git-history rewrite is necessary; do not do it as part of normal rebuild work.

### Phase 1 — classify and approve identities

- Work on an encrypted copy outside the application tree.
- Normalize email casing/whitespace and phone strings.
- Produce a human-reviewed duplicate-resolution table without exposing values in logs.
- Mark each legacy identity `invite`, `re-register`, `exclude`, or `merge`.
- Create new Auth users only after consent and policy decisions; require fresh credentials.

### Phase 2 — create the identity map

- Record approved `legacy_user_id -> auth.users.id` mappings in a restricted migration ledger.
- Insert profiles with only approved fields.
- Verify no password, status token, reset token, or legacy secret entered the target.

### Phase 3 — reference data

- Approve category taxonomy and status semantics.
- Insert categories using new stable IDs/slugs.
- Record `legacy_category_id -> category_id`; resolve category 0 explicitly.

### Phase 4 — catalog

- Normalize title/author whitespace; validate years; convert ISBN/barcode to text.
- Resolve owner 0 or quarantine that book.
- Insert approved books in batches and retain a restricted legacy-book mapping.
- Import only licensed/consented images after the parent records exist.

### Phase 5 — requests, loans, and history

- Do not manufacture `borrow_requests` from legacy email flow unless evidence exists.
- Sort legacy transactions per book and validate intervals/status transitions.
- Resolve status 0 and determine which transaction sequences represent actual loans.
- Create loans first, then append mapped loan-history events. Keep ambiguous records in a quarantine report, not production tables.

### Phase 6 — verification and cutover

- Compare approved source counts with inserted/quarantined counts.
- Validate every FK, uniqueness/check constraint, one-active-loan invariant, and RLS negative case.
- Verify no PII appears in client bundles, logs, notification bodies, or public Storage URLs.
- Run a rehearsed migration on non-production data, then an approved production cutover with rollback checkpoints.

For bulk inserts, use batch/COPY-style loading in dependency order rather than row-at-a-time client calls. Build indexes/constraints deliberately and analyze loaded tables after the final import.

## Human decisions blocking implementation

1. Invite approved legacy users, require all to re-register, or use a mixed policy?
2. Which duplicated user records are canonical?
3. Is phone number necessary, and who may see it?
4. Should browsing require login?
5. Does a borrow request reveal contact information before or only after owner acceptance?
6. Are due dates, renewals, cancellations, and owner-transfer still product requirements?
7. Does “Returned” immediately mean “Available,” and how should “Lost” affect the book versus the loan?
8. How should legacy category 0, owner 0, and status 0 be resolved?
9. Which legacy books/history/images are real, licensed, consented, and worth retaining?
10. Who has admin/moderator authority, and how is it granted/revoked?
