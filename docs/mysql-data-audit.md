# MySQL data audit

## Scope

Two SQL files were inspected:

- `backup.sql`
- `Sql backup/backup.sql`

They are byte-for-byte identical (20,407 bytes and the same SHA-256 digest). The root copy is therefore a redundant backup, not a second dataset. Neither file was imported or modified.

The dump contains nine table definitions and data in six tables. There are no declared foreign keys anywhere.

## Row counts

| Table | Rows in dump | Classification |
|---|---:|---|
| `address` | 0 | Unused/unfinished |
| `author` | 0 | Unused/unfinished |
| `book` | 7 | Legacy catalog data requiring review |
| `booktransaction` | 16 | Legacy status history requiring reconstruction |
| `borrow` | 0 | Unused prototype |
| `category` | 6 | Reference data, partly contradicted by book rows |
| `changepassword` | 18 | Security-sensitive transient data; never migrate |
| `status` | 5 | Reference data to reinterpret, not copy blindly |
| `user` | 28 | Personal/authentication data requiring consent and deduplication |

## Complete schema inventory

MySQL types and nullability below are exactly those declared in the dump. “PK” means an actual declared primary key.

### `address`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `AddressId` | `bigint` | NOT NULL | PK |
| `ZipCode` | `varchar(20)` | NULL | Personal location data |
| `City` | `varchar(20)` | NULL | Personal location data |
| `StreetName` | `varchar(20)` | NULL | Personal location data |
| `General1` … `General10` | ten × `varchar(255)` | NULL | Undefined extension fields |

No rows exist. `user.AddressId` implies a relationship, but no foreign key is declared.

### `author`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `authorid` | `int` | NULL | No PK/unique constraint |
| `firstname` | `varchar(100)` | NULL |  |
| `middlename` | `varchar(100)` | NULL |  |
| `lastname` | `varchar(100)` | NULL |  |

No rows exist, and application code stores author as free text in `book.Author`; this table is unused.

### `book`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `BookId` | `bigint` | NOT NULL | PK; allocated with `MAX + 1` |
| `Title` | `varchar(50)` | NULL |  |
| `Author` | `varchar(50)` | NULL | Free text; not linked to `author` |
| `CategoryId` | `int` | NULL | Implies `category.CategoryId`; no FK |
| `PublishedYear` | `int` | NULL | No range constraint |
| `StatusId` | `int` | NOT NULL | Implies `status.StatusId`; also duplicates active transaction state |
| `Barcode` | `varchar(20)` | NULL | Code binds it numerically despite text schema |
| `UserId` | `int` | NULL | Implies owner `user.UserId`; no FK; type differs from some related `bigint` columns |
| `Memo` | `varchar(255)` | NULL | User-authored content |
| `Isbn` | `bigint` | NULL | Wrong semantic type; can lose leading zeros and ISBN formatting |
| `Secondowner` | `int` | NULL | Unused implied user relationship |
| `General1` … `General10` | ten × `varchar(255)` | NULL | Undefined; all null in dump |

Data quality: five of seven rows use `CategoryId = 0`, which has no category; one row uses owner `UserId = 0`, which has no user; four duplicate barcode values and five duplicate ISBN values occur when non-null values are compared. All book statuses happen to resolve.

### `booktransaction`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `BookId` | `bigint` | NOT NULL | Composite PK part; implies `book.BookId` |
| `StartDate` | `datetime` | NOT NULL | Composite PK part |
| `EndDate` | `datetime` | NOT NULL | Composite PK part; year 9999 means “active” |
| `LoanerId` | `bigint` | NULL | Implies borrower `user.UserId`; no FK |
| `StatusId` | `int` | NOT NULL | Implies `status.StatusId`; no FK |

All book and non-null loaner references resolve in this dump. One historical row uses invalid `StatusId = 0`. Seven rows use a `9999-...` end-date sentinel; each book has exactly one such active row. The composite PK prevents exact duplicates but does not enforce one active row per book or a valid time interval.

### `borrow`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `BarcodeOfBook` | `varchar(20)` | NULL | Implies `book.Barcode`, which is not unique |
| `DateOfRequest` | `date` | NULL |  |
| `LengthOfNumberOfDays` | `int` | NULL | No positive-value constraint |
| `BorrowerId` | `varchar(20)` | NULL | Type conflicts with numeric user IDs |

No PK, uniqueness, foreign keys, or rows. The live borrow flow does not use this table; it emails and writes `booktransaction` directly.

### `category`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `CategoryId` | `int` | NOT NULL | No declared PK/unique constraint |
| `CategoryName` | `varchar(40)` | NULL | No unique constraint |
| `CategoryAbbreviation` | `varchar(15)` | NULL | No unique constraint |

The six values are Math, Science, Horror, Action, Fantasy, and Grammar. IDs are distinct in the dump, but the database does not enforce that. Five book rows reference missing category 0.

### `changepassword`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `UserId` | `int` | NOT NULL | Implies `user.UserId`; no FK |
| `Email` | `varchar(50)` | NULL | Duplicates personal data from `user` |
| `Token` | `int` | NULL | Plaintext six-digit reset token |
| `CreateDate` | `datetime` | NULL | No expiry column |

No primary key, unique constraint, expiry, consumed flag, or foreign key. There are 18 rows: 17 six-digit tokens, one null token, and three rows whose `UserId` no longer exists. Dates range from 2021-01-31 through 2022-10-15. These records are obsolete credentials and must never be migrated.

### `status`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `StatusId` | `int` | NOT NULL | No declared PK/unique constraint |
| `StatusName` | `varchar(20)` | NOT NULL | No unique constraint |

Values: 1 Available, 2 Reserved, 3 Borrowed, 4 Returned, 5 Lost. “Returned” is an event/history state rather than a durable availability state and must be mapped deliberately.

### `user`

| Column | Type | Nullable/default | Key/notes |
|---|---|---|---|
| `UserId` | `int` | NOT NULL | PK; manually constructed/allocated |
| `CreateDate` | `date` | NULL |  |
| `FirstName` | `varchar(20)` | NULL | Personal data |
| `LastName` | `varchar(20)` | NULL | Personal data |
| `PhoneNumber` | `bigint` | NULL | Personal data; wrong semantic type |
| `Email` | `varchar(35)` | NULL | Personal data; no unique constraint |
| `Username` | `varchar(30)` | NOT NULL | No unique constraint |
| `UserStatus` | `varchar(255)` | NULL | Mixes active/suspended flag and activation token |
| `Password` | `varchar(255)` | NOT NULL | Legacy bcrypt hash |
| `AddressId` | `bigint` | NULL | Implies `address.AddressId`; no FK |
| `General1` … `General10` | ten × `varchar(255)` | NULL | Undefined; all null in dump |

The dump contains 28 rows. All `UserStatus` values are active (`1`); there are no pending activation values left in this snapshot. All 28 password values are syntactically bcrypt hashes at cost 4. There are two duplicate usernames, 20 duplicate email occurrences, and 18 duplicate phone occurrences when repeated values beyond the first are counted. No address or General field is populated.

## Existing and missing relationships

The dump declares **zero foreign keys**. These relationships are inferred from names and application code:

| Source | Intended target | Current integrity/result | PostgreSQL disposition |
|---|---|---|---|
| `user.AddressId` | `address.AddressId` | No rows use it; address table empty | Do not migrate unless address collection is approved |
| `book.CategoryId` | `category.CategoryId` | 5/7 orphaned | Clean/map category before insert; enforce FK |
| `book.StatusId` | `status.StatusId` | Resolves, but may be stale versus transactions | Replace with a deliberate availability field or derived state |
| `book.UserId` | `user.UserId` | 1/7 orphaned | Require mapped owner profile or quarantine row |
| `book.Secondowner` | `user.UserId` | All null; feature unused | Drop unless product owner defines it |
| `booktransaction.BookId` | `book.BookId` | All resolve | Map only after books; enforce FK |
| `booktransaction.LoanerId` | `user.UserId` | All non-null values resolve | Map to borrower profile; enforce FK |
| `booktransaction.StatusId` | `status.StatusId` | One invalid status 0 | Quarantine/repair before history import |
| `borrow.BarcodeOfBook` | `book.Barcode` | No data; barcode is non-unique | Replace with `book_id` FK |
| `borrow.BorrowerId` | `user.UserId` | No data; incompatible type | Replace with UUID profile FK |
| `changepassword.UserId` | `user.UserId` | 3/18 orphaned | Do not migrate table/data |
| `book.Author` | `author` | No relationship; `author` empty | Keep author text initially unless normalized later |

Every future foreign key column should be indexed. Composite access patterns such as current loans by book/status and unread notifications by recipient/read time will require matching composite indexes.

## Duplicate and obsolete structures

- The two SQL files are duplicate backups.
- `address`, `author`, and `borrow` are empty prototypes unused by current code.
- Ten `General*` columns on both `user` and `book` are an untyped extension mechanism and entirely null.
- `book.Secondowner` is unused.
- `book.StatusId` duplicates the active status recorded by `booktransaction`; exact-search code and current-history code can disagree.
- `changepassword` stores temporary security material permanently and is superseded by Supabase Auth.
- `category` and `status` look like reference tables but lack primary keys.

## Test, personal, and security-sensitive data

No row should be assumed production-authoritative. The repository resembles a student/development deployment: numeric identifiers resemble institutional IDs, contact values are heavily duplicated, catalog rows contain invalid reference IDs, and asset filenames mirror user-like IDs. Human confirmation is required before calling any record real, test, or consented.

| Data class | Present | Migration rule |
|---|---|---|
| Names, usernames, emails, phone numbers | Yes, in 28 users | Personal data; migrate only consented, deduplicated accounts |
| Password hashes | 28 bcrypt cost-4 hashes | Never import into Supabase Auth |
| Activation/status tokens | Schema/code supports them; dump status values are active | Never import tokens |
| Password-reset tokens | 18 rows, including orphaned records | Never import table or rows |
| Book ownership/loan history | 7 books, 16 transactions | Migrate only after identity mapping and manual anomaly resolution |
| Free text | Book title/author/memo and request messages in runtime | Sanitize for unsafe HTML and privacy before migration |
| Profile/identity-like images | Numeric filenames in `Images/` | Review consent, ownership, and licensing individually |
| SMTP/database credentials | XML config, not SQL | Revoke/rotate; never copy into new app/data |

## MySQL-specific and unsafe migration constructs

- Backtick-quoted mixed-case identifiers.
- `ENGINE=InnoDB`, `DEFAULT CHARSET`, `CHARACTER SET`, and MySQL collation clauses.
- Dump directives such as versioned `/*! ... */` statements, `LOCK TABLES`, key enable/disable operations, and session `SET` statements.
- MySQL `datetime` without timezone; target should use `timestamptz` for events.
- `SYSDATE()` in application queries.
- Year-9999 dates as active-row sentinels; target should use nullable end timestamps and explicit state constraints.
- Numeric phone and ISBN fields.
- Manual ID allocation rather than identity/UUID generation.
- Composite transaction PK that cannot enforce one current state.
- Mixed-case table/column names and table name `user`; target should use lower snake_case and avoid auth ambiguity.
- No PostgreSQL-ready sequences, foreign keys, checks, or RLS policies.

## Data that must not be migrated

1. Any password hash, reset token, activation token, session data, or secret.
2. The `changepassword` table and all rows.
3. Database/SMTP/server configuration from XML.
4. Duplicate, placeholder, or unconsented user records.
5. The owner-0 book until a human selects a legitimate owner or rejects the row.
6. Category-0 references until mapped or rejected.
7. The status-0 transaction until its meaning is resolved.
8. Empty prototype tables and all `General*` columns.
9. Unlicensed or irrelevant images; notably the watermarked Getty image.
10. Raw HTML/script content in text fields without sanitization review.

## Required pre-migration decisions

- Which of the 28 users are real, current, and consented, and how should duplicate identities be merged?
- Should legacy users receive invitations/magic links, or should all users re-register?
- Which owner should replace legacy owner 0, if the affected book is retained?
- What should category 0 mean, and should the category taxonomy remain the six legacy values?
- What did status 0 mean in the historical transaction?
- Are legacy book/loan timestamps trustworthy enough to import as history?
- Is any legacy profile image owned/licensed and consented for reuse?
- Must historical phone numbers be retained at all?
