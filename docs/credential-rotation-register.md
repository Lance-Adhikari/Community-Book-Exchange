# Credential rotation register

This register records status only. It must never contain a credential value.

| Credential or secret class | Status | Required action | Responsibility |
|---|---|---|---|
| Legacy MySQL credentials | Compromised; must never be reused | Revoke or rotate externally and verify that the legacy credential no longer authenticates | Account owner |
| Gmail SMTP app password | Compromised; external revocation required | Revoke the exposed app password in the owning account | Account owner |
| New Gmail/SMTP credential | Not to be created yet | Choose the production email provider and create a replacement only when the server-side email integration is approved | Future implementation phase |
| Supabase keys | Not created yet | Create only with the approved Supabase project; store privileged values server-side | Future implementation phase |
| Vercel secrets | Not created yet | Configure only after the application and deployment project are approved | Future deployment phase |

## Responsibility boundary

### Repository containment completed by Codex

- Created and verified an external private backup of the legacy credential and data sources.
- Removed the live credential configuration and personal SQL exports from the current branch working tree.
- Added placeholder-only configuration and environment templates.
- Added ignore rules and security handling documentation.
- Prepared a Git-history cleanup plan without rewriting history.

### External account-owner action still required

Code inspection cannot prove revocation. The account owner must revoke or rotate the legacy MySQL credential and Gmail SMTP app password at their providers, then record verification without placing replacement values in Git or this document.
