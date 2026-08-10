# Product decisions

The following decisions are approved for version 1:

1. Existing user credentials will not be imported.
2. Users must create new accounts.
3. Old password hashes and reset tokens will never be migrated.
4. Anyone may browse available books.
5. Login is required to add, request, lend, borrow, or manage books.
6. Phone number is optional and private.
7. Email addresses are never displayed publicly.
8. Contact information may be shared only after an owner approves a request.
9. Ownership transfer is excluded from version 1.
10. Standard loan duration is 21 days.
11. Requests expire after 72 hours if not accepted.
12. A requester may cancel before approval.
13. Renewals are excluded from version 1.
14. Legacy `CategoryId` 0 maps to Other / Uncategorized.
15. Legacy owner or `UserId` 0 maps to `NULL` and requires review.
16. Legacy `StatusId` 0 transactions are excluded unless manually approved.
17. Lance is the only initial administrator.
18. Legacy profile images are not migrated automatically.
19. The watermarked Getty Images asset must not be used.
20. Logo and video ownership must be confirmed before production.
21. Git history containing secrets will be remediated after a verified backup.

## Current security-containment status

- The legacy Gmail SMTP credential is unchanged for now and must not be used by the rebuilt application.
- The legacy MySQL credential is unchanged for now and must not be used by the rebuilt application.
- Git-history remediation is deferred.
- The GitGuardian incidents remain open while history remediation is deferred.
- The rebuilt application may use only newly issued Supabase credentials and newly issued credentials from a future email provider.
