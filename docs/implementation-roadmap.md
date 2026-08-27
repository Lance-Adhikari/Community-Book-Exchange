# Implementation roadmap

## Objective and guardrails

Rebuild the application with Next.js App Router, TypeScript, Tailwind CSS, Supabase, and Vercel while preserving the legacy site’s recognizable header, layout, content order, forms, dashboard menu, tables, and wording.

This audit phase makes no application, database, asset, SQL, or configuration change. Every later phase begins only after its preceding review gate.

## Main risks discovered

| Priority | Risk | Required response |
|---|---|---|
| Critical | Live-looking database and SMTP credentials are committed in XML | Rotate/revoke immediately; keep new secrets in managed environment variables; separately decide Git-history remediation |
| Critical | Authentication guards do not reliably protect pages/endpoints | Do not expose legacy runtime; implement server-verified Auth and RLS before private routes go live |
| Critical | SQL contains PII, weak password hashes, reset tokens, duplicates, and orphan references | Quarantine; never direct-import; use approved cleaning/mapping pipeline |
| High | No CSRF/object authorization and unescaped output enables unauthorized mutation/XSS | Replace endpoints; enforce RLS/server validation and escaped React rendering |
| High | Borrow flow reserves before email and has no request/approval record | Introduce atomic borrow request → acceptance → loan workflow |
| High | Upload handling is predictable and weakly validated | Use Storage, path-scoped policies, size/type validation, and licensed/consented assets only |
| High | Layout can be lost through a greenfield redesign | Require page-by-page visual invariants and side-by-side review |
| High | Watermarked/unverified media presents copyright/privacy risk | Exclude until ownership/licensing is proven |
| Medium | Legacy status model conflicts between `book` and `booktransaction` | Decide status semantics before schema implementation/data mapping |
| Medium | Current links, IDs, forms, and scripts are internally broken | Preserve visible intent, not defects; add regression acceptance cases |
| Medium | Vercel cannot persist local uploads or run the PHP/Bitnami assumptions | Complete Storage/Auth/data replacement before cutover |

## Recommended delivery phases

### Phase 1 — audit review and incident containment

Deliverables:

- Human sign-off on all six audit documents.
- Credential owner confirms database and SMTP credential rotation/revocation.
- Decision on whether repository history must be rewritten in a separately approved operation.
- Classification of legacy environment as permanently non-deployable.

Gate: no implementation begins until visual invariants and data-handling decisions are accepted.

### Phase 2 — visual baseline and acceptance fixtures

- Run the legacy app only in an isolated local environment with no live credentials.
- Capture desktop and mobile screenshots for every page/state in `visual-preservation-rules.md`.
- Record visible copy, field order, result columns, empty states, and navigation flows.
- Convert the page map into manual/automated acceptance scenarios.

Gate: owner approves which visual defects are corrected and which wording is retained.

### Phase 3 — nonfunctional Next.js shell

- Initialize Next.js App Router, TypeScript, Tailwind CSS, ESLint, `src/`, and npm on the approved branch.
- Establish accessible design tokens derived from the legacy blue/light-blue/gray identity.
- Build the faithful shared header, logo treatment, public/private navigation, form primitives, modal, table, and responsive containers.
- Recreate public first page, About, Contact, Login, and Registration as visual-only routes first.
- Do not connect real Auth or data until those pages pass visual review.

Gate: side-by-side desktop/mobile approval, lint/build/type checks passing.

### Phase 4 — Supabase project and security foundation

- Create/link separate development, preview, and production Supabase/Vercel environments.
- Store only publishable client configuration in browser-available environment variables; keep privileged keys server-only.
- Implement the reviewed schema, constraints, indexes, explicit grants, RLS policies, Storage buckets, and policy tests.
- Configure Supabase Auth email templates and redirect allowlists.
- Add CI checks without including database backups or secrets in build artifacts.

Gate: security review passes negative RLS tests; unauthenticated users cannot access private data.

### Phase 5 — authentication and account vertical slice

- Implement registration, login, logout, verification/recovery, server-side session refresh/protection, profile display/edit, and avatar upload.
- Preserve legacy page structure while replacing username/password PHP semantics with approved Supabase Auth behavior.
- Do not expose Auth UUIDs or phone/email outside approved contexts.

Gate: full account lifecycle works in preview, including invalid/expired links and unauthorized access tests.

### Phase 6 — catalog vertical slice

- Implement categories, Add Book, Book Search/results, My Books, book images, ownership controls, and empty/loading/error states.
- Preserve form/table ordering and dashboard navigation.
- Add server validation, pagination/search indexes, and ownership RLS tests.

Gate: catalog flows match visual baseline and security rules.

### Phase 7 — borrow and loan workflow

- Implement durable borrow requests, owner accept/decline, atomic loan creation, returns/loss handling, append-only history, and notifications.
- Decide whether/when email or phone becomes visible; email delivery is supplementary to persisted state.
- Define ownership transfer separately from normal return.

Gate: concurrent-request tests prove that a book cannot have conflicting active requests/loans.

### Phase 8 — cleaned data migration rehearsal

- Work from a secured copy, never direct-import `backup.sql`.
- Apply the migration order below; batch inserts and preserve a restricted mapping/quarantine ledger.
- Reconcile inserted, merged, excluded, and quarantined counts.
- Run RLS, data-integrity, privacy, and asset-license checks.

Gate: human signs off the reconciliation report and every anomalous row decision.

### Phase 9 — Vercel preview, production cutover, and legacy retirement

- Verify production-like preview end to end: browser → Auth → API/RLS → Storage → notifications/email.
- Confirm secrets, SQL dumps, PHP, XML, Apache config, and unapproved images are absent from deployment artifacts.
- Execute approved production migration/cutover with monitoring and rollback checkpoints.
- Retain the legacy source in a restricted archive until acceptance and required retention periods expire.
- Remove legacy files only under the file-retirement plan below.

Gate: product owner, data/privacy owner, and technical owner approve retirement.

## Proposed data migration order

1. Contain/rotate exposed secrets; freeze and encrypt the source copy.
2. Classify, deduplicate, consent, and approve users.
3. Create approved Supabase Auth users with fresh authentication; build legacy-user-to-UUID mapping.
4. Insert `profiles` with minimum approved personal data.
5. Approve and insert `categories`; build category mapping.
6. Clean and insert `books`, resolving/quarantining category 0 and owner 0.
7. Import only approved avatar/book images into Storage and metadata tables.
8. Reconstruct valid `loans` from reviewed transaction sequences.
9. Append valid `loan_history` events; quarantine status 0 and ambiguous histories.
10. Start `borrow_requests` and `notifications` clean unless human evidence supports legacy reconstruction.
11. Reconcile counts and validate constraints, indexes, RLS, privacy, and application flows.
12. Cut over only after signed approval; retain rollback export according to policy.

Never migrate `changepassword`, legacy password hashes, activation/reset tokens, XML configuration, or test/session artifacts.

## File retirement plan

No file listed here should be moved or deleted during the audit. “Eventually remove” means only after the corresponding Next.js/Supabase replacement is complete, accepted, backed up where legally necessary, and confirmed absent from runtime dependencies.

### Retire after equivalent Next.js pages are approved

- `index.html`
- `aboutUs.html`
- `contactUs.html`
- `login.html`
- `register.html`
- `dashboard.html`
- `account.html`
- `booksearch.html`
- `header.html`

### Retire after PHP features are replaced and traffic is cut over

- Empty/stub pages: `php/aboutUs.php`, `php/contactUs.php`, `php/firstpage.php`, `php/login.php`, `php/updateaccount.php`
- Auth/account: `php/process.php`, `php/register.php`, `php/emailconfirm.php`, `php/changePassword.php`, `php/updatepassword.php`, `php/logout.php`, `php/account.php`, `php/dashboard.php`
- Catalog/loan: `php/BookInsert.php`, `php/booksearch.php`, `php/mybook.php`, `php/emailsend.php`
- Libraries/config: `php/config.php`, `php/libconfig.php`, `php/libemail.php`, `php/library.php`
- Upload/diagnostic/prototypes: `php/loadProfile.php`, `php/upload.php`, `php/phpinfo.php`, `php/test.php`, `php/testfile.php`

### Retire after all legacy styling/scripts are replaced

- CSS: `css/aboutUs.css`, `css/account.css`, `css/bitnami.css`, `css/changePass.css`, `css/contactUs.css`, `css/dashboard.css`, `css/email.css`, `css/emailsend.css`, `css/firstpage.css`, `css/header.css`, `css/insert.css`, `css/login.css`, `css/mybook.css`, `css/popup.css`, `css/register.css`, `css/search.css`
- JavaScript: `js/userInfo.js`
- Vendored library: `vendor/jquery/jquery-3.2.1.js`, `vendor/jquery/jquery-3.2.1.min.js`

### Quarantine, then remove from deployable source after approved handling

- `conf/bookshare.xml` — contains `[REDACTED]` credentials; revoke/rotate first. Removing the file does not erase Git history.
- `backup.sql`, `Sql backup/backup.sql` — identical sensitive dumps. Preserve one encrypted compliance/archive copy only if required, outside deployable source.
- `temp/oldhttp.conf` — obsolete local Bitnami/Apache configuration.

### Asset-by-asset disposition

- Preserve/reuse after optimization and rights check: `Images/logo.jpg`, `Images/combookexchange.mp4`.
- Do not automatically migrate: `Images/2021100055.jpg`, `Images/2023050123.jpg`, `Images/2023050124.jpg`, `Images/nepal-mountain-wallpaper.jpg`, `Images/sampleimage.jpg`.
- Recommend exclusion/removal after archive review: the watermarked Getty image (`Images/2023050123.jpg`), blank image (`Images/2023050124.jpg`), and unrelated sample photo (`Images/sampleimage.jpg`).
- The remaining uncertain images require human provenance/consent decisions.

## Verification strategy

### Per pull request

- Typecheck, lint, unit tests, production build.
- No secret/SQL/XML artifact in build output.
- Accessibility and responsive checks for every edited route.
- Visual comparison against approved desktop/mobile baseline.
- RLS/policy tests for positive and negative actors whenever data access changes.

### Pre-cutover

- Complete route/link/form inventory has an implemented or explicitly retired counterpart.
- Account lifecycle, catalog, request, acceptance, loan, return, history, notification, and upload flows pass end to end.
- Duplicate/concurrent request tests pass.
- No service-role key or personal source data appears in browser code/logs.
- Vercel environment separation, Supabase redirect URLs, Storage policies, backup, monitoring, and rollback are verified.

## Human decisions required

### Product and visual

1. Is every page invariant in `visual-preservation-rules.md` approved?
2. Which spelling/grammar fixes and placeholder copy changes are authorized?
3. Should About/Contact remain placeholders at first launch?
4. Should browsing be public or login-only?
5. Is “Update Owner” a required feature, and what exact business event authorizes transfer?
6. Are due dates, renewals, request expiry, and cancellations required?

### Identity, privacy, and data

7. Re-register all users, invite approved users, or combine both approaches?
8. Which duplicate user records are canonical, and which are test data?
9. Is phone number required; when may another member see it?
10. Who is authorized to decide consent/retention for names, contact data, history, and images?
11. How should legacy owner 0, category 0, and status 0 be resolved?
12. Which books and transaction timestamps are trustworthy enough to retain?

### Security and operations

13. Have the exposed database and SMTP credentials been revoked/rotated?
14. Is a Git-history rewrite required, and who will coordinate downstream clones/backups?
15. Who holds admin/moderator authority in the new system?
16. What production retention, backup, incident-response, email-provider, and domain policies apply?
17. Are the logo/video licensed for continued use, and which other assets have verified provenance?

## Audit stop point

The next action is human review. Do not initialize Next.js, connect Supabase, create tables, import data, move/delete legacy files, or commit this audit automatically until the decisions above are addressed.
