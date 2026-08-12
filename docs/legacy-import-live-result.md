# Legacy catalog live import result

## Import summary

- Import timestamp (UTC): 2026-08-11T20:29:10Z
- Source: approved private `backup.sql` outside Git
- Source size: 20,407 bytes
- Source SHA-256: `648E7DA6E5CDE3D617AFBF40027128A69C222E1D918B736A39147E4CAE9500B7`
- Execution: one atomic administrative PostgreSQL statement
- Result: committed after every in-transaction assertion passed

No password hash, reset token, legacy authentication state, SMTP credential, or database credential was imported. No Supabase Auth user or profile was created.

## Reconciliation

### Members

- Source users: 28
- Imported private legacy members: 28
- Unclaimed: 4
- Review required: 24
- Claimed: 0
- Lost users: 0

Equation: `28 source users = 28 legacy members = 4 unclaimed + 24 review required`.

### Categories

- Source category rows: 6
- Synthetic legacy CategoryId 0 mapping: 1
- Imported private category mappings: 7
- Category destinations: Other / Uncategorized, Math, Science, Horror, Action, Fantasy, and Grammar

Equation: `6 source categories + 1 synthetic CategoryId 0 mapping = 7 mappings`.

### Books and ownership provenance

- Source books: 7
- Imported public legacy books: 7
- Imported private legacy book links: 7
- Links resolved to imported legacy members: 6
- Unresolved legacy UserId 0 links: 1
- Lost books: 0

Equation: `7 source books = 7 public books = 7 provenance links = 6 member-linked + 1 unresolved owner-zero`.

All imported books are active for browsing, have status `unavailable`, have no current profile owner, and use the public owner label `Community member`. They cannot participate in request or loan workflows until ownership is verified and claimed.

## Hash and idempotency verification

- Member source-row hashes matched: 28 of 28
- Category mapping source-row hashes matched: 7 of 7
- Book provenance source-row hashes and public book fields matched: 7 of 7
- Duplicate transformed legacy identifiers: 0

Post-import classification:

| Destination | Insert | No-op, same hash | Conflict | Invalid |
| --- | ---: | ---: | ---: | ---: |
| Legacy members | 0 | 28 | 0 | 0 |
| Category mappings | 0 | 7 | 0 | 0 |
| Books | 0 | 7 | 0 | 0 |
| Legacy book links | 0 | 7 | 0 | 0 |

## Security verification

- Row Level Security remains enabled on all three private legacy tables.
- `anon` and `authenticated` have no direct private-schema or private-table read access.
- Public browsing remains limited by the active-book select policy.
- Normal application clients cannot set or update `source_kind` or `owner_display_name`.
- Owner update and delete policies remain owner-only.
- Borrow-request policy and trigger checks reject books without a verified current owner.
- Auth users: 0
- Profiles: 0
- Borrow requests: 0
- Loans: 0
- Notifications: 0
- Storage buckets: 0
- Applied migrations: 4

No legacy personal data, raw SQL records, or credentials are included in this document. Account claiming and historical borrow/transaction migration remain separate reviewed phases.
