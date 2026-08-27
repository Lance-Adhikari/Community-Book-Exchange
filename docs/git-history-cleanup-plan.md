# Git-history cleanup plan

This document is a plan only. History must not be rewritten until credential revocation, backups, ownership approval, and collaborator coordination are complete.

## Why a deletion commit is not enough

Deleting a sensitive file in a new commit removes it from the current tree, but the file remains available in earlier commits, tags, reflogs, forks, caches, and existing clones. The current containment commit therefore reduces future accidental use but does not erase prior exposure.

## Prerequisites

1. Revoke or rotate every exposed credential before attempting history cleanup. History rewriting cannot make a credential trustworthy again.
2. Verify the private local archive and document its hashes without exposing contents.
3. Obtain repository-owner approval for a coordinated force-push and maintenance window.
4. Inventory branches, tags, pull requests, forks, deployments, mirrors, and integrations that may retain old objects.
5. Freeze repository writes during the rewrite.

## Mirror backup

Create a private, access-controlled mirror backup outside the working checkout before rewriting:

```text
git clone --mirror <repository-url> <private-backup-path>
git -C <private-backup-path> fsck --full
```

The mirror location must not be placed inside this repository or published. Record the mirror's repository state and protect it according to the legacy-data retention policy.

## Paths requiring removal

The initial path-removal set is:

- `conf/bookshare.xml`
- `backup.sql`
- `Sql backup/backup.sql`

Before execution, rescan every branch and tag for renamed copies, additional SQL exports, and other credential-bearing configuration.

## Proposed git-filter-repo procedure

On a fresh private mirror clone, use `git-filter-repo` with path inversion to remove the approved sensitive paths from every reachable ref. A reviewed path list file should be used so paths with spaces are handled safely. Do not run the command from a normal development checkout.

Conceptually:

```text
git filter-repo --invert-paths --paths-from-file <reviewed-sensitive-path-list>
```

Exact commands and the path list must receive repository-owner approval immediately before execution.

## Secret-value replacement

If a credential value also appears in files that must remain in history, create a private replacement mapping for `git-filter-repo --replace-text`. The mapping must never be committed, logged, pasted into an issue, or included in this plan. Replace matches with a neutral redaction marker, then securely delete the mapping after verification and the approved retention window.

## Force-push and branch protection

- Rewritten commits have new object IDs and require a coordinated force-push of affected branches and tags.
- Temporarily changing branch protection requires repository-owner approval and an audit trail.
- Use force-with-lease where operationally possible, but recognize that a full mirror rewrite may require carefully controlled ref updates.
- Block merges and automated writers during the maintenance window.
- Restore branch protection immediately after verification.

## Collaborator impact

Existing clones retain the old objects and can accidentally reintroduce them. Collaborators must stop work, archive any legitimate unpushed changes separately, delete old clones, and re-clone after the rewrite. Fork owners and external mirrors require separate coordination.

## Verification

After rewriting and before declaring success:

- Search all rewritten branches and tags for every sensitive path.
- Search for approved secret fingerprints without printing values.
- Run `git fsck --full` and inspect reachable objects.
- Verify fresh clones cannot resolve the removed paths from rewritten refs.
- Confirm the default branch, protected branches, tags, open pull requests, and expected commit graph are correct.
- Ask the hosting provider about cached views or support-assisted purging where appropriate.
- Continue treating old credentials as compromised regardless of scan results.

## Integration coordination

Notify and verify GitHub Actions, Vercel, dependency services, mirrors, webhooks, and other repository integrations after the rewrite. Re-link or redeploy only from verified rewritten refs. Remove cached deployment artifacts containing legacy files, but do not create replacement services as part of history cleanup.

## Rollback plan

Keep the verified private mirror offline and unchanged until the rewritten repository has passed technical and stakeholder review. If required refs or legitimate files are lost, stop all writes, restore the approved refs from the mirror, investigate the path specification, revise the procedure, and schedule a new maintenance window. A rollback restores repository availability; it does not reverse credential compromise or eliminate the need for revocation.
