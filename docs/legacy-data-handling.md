# Legacy data handling

## Private archive

The verified private source archive is stored outside Git at:

`C:\Users\dropo\OneDrive\Documents\Community-Book-Exchange-Private\legacy-backup-2026-08-09`

It contains preserved copies of:

- `conf/bookshare.xml`
- `backup.sql`
- `Sql backup/backup.sql`
- `php/config.php`

The archive is private migration input. It must not be copied into the repository, a pull request, a deployment artifact, a shared issue, or a public file service.

## Why database backups cannot remain in Git

The legacy SQL exports contain personal records and authentication-related material. Git retains objects in earlier commits even after a file is deleted, and ordinary repository cloning can expose those objects. Current-tree removal reduces ongoing exposure but does not replace credential revocation or history remediation.

## Authentication data disposition

- Existing user credentials will not be imported.
- Old password hashes and password-reset tokens will not be imported.
- Users will register again through the new authentication system.
- Migration tools must reject authentication secrets even if they appear in source columns.

## Future migration workflow

- Migration tooling will accept an explicit private input path outside Git.
- Inputs must remain read-only during extraction and profiling.
- Intermediate files belong under an ignored private working directory outside the repository whenever possible.
- Cleaned output must contain only approved catalog or transaction fields and must exclude unapproved personal data, credentials, password material, reset tokens, private contact details, and unapproved images.
- Reports may contain aggregate counts and source identifiers needed for review, but not personal records.
- No import into Supabase may occur until the schema, Row Level Security policies, mapping rules, and a dry-run report are approved.

## Retention and deletion review

Before launch, the project owner must review whether the private archive is still legally and operationally necessary, define its retention period, confirm who can access it, and approve secure deletion when it is no longer required. Backups and migration outputs must be included in that review.
