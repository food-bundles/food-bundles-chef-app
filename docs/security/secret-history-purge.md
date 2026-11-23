# Purging the leaked Meta key from Git history (prepared, NOT run)

**Status:** prepared on 2026-11-18. Nothing here has been executed.

**Open item: rotate Meta key leaked in 41c7efc.** (PENDING ROTATION — key still active as of 2026-11-18.)

**The real fix is rotation.** The leaked `MODEL_API_KEY` must be revoked at the
provider. Once it is revoked, the value in history is useless. Rewriting history only
removes the dead value and is optional.

## What leaked

| Commit | File | Line | Rule | State today |
|---|---|---|---|---|
| `41c7efc` | `backend/.env.example` | 37 | `env-assigned-provider-key` (Meta `MODEL_API_KEY`) | Value removed in `e40ec95`; still present in history |

A full-history gitleaks scan (74 commits, rules in `.gitleaks.toml`) found **no other
secrets** and **no Anthropic key**. The finding is allowlisted by fingerprint in
`.gitleaksignore`, so CI stays green until the purge. Remove that line after the purge.

## Before you start

1. Confirm the old key is revoked at the provider and the new key is set on the server.
2. Pick a quiet window. Every collaborator must stop pushing until step 6.
3. Make a full mirror backup and keep it offline:

   ```bash
   git clone --mirror https://github.com/food-bundles/food-bundles-chef-app.git chef-app-backup.git
   ```

4. Install git-filter-repo (`pip install git-filter-repo`; version 2.45 or later).

## Purge commands

Run these in a **fresh mirror clone**, never in a working checkout:

```bash
git clone --mirror https://github.com/food-bundles/food-bundles-chef-app.git chef-app-purge.git
cd chef-app-purge.git

# replacements.txt holds ONE line: the leaked value, then ==>REDACTED_META_KEY
# Write it by hand from the provider console's record of the revoked key.
# Never paste the value into chat, tickets or shell history (use an editor).
#   <leaked-value>==>REDACTED_META_KEY
git filter-repo --replace-text ../replacements.txt

# Check that nothing is left. The command must print nothing:
git log --all -p | grep -F -f <(cut -d'=' -f1 ../replacements.txt) || echo "clean"

# Delete replacements.txt securely afterwards.
```

## Publish the rewritten history (needs owner approval)

```bash
# filter-repo removes the origin remote as a safety measure; add it back.
git remote add origin https://github.com/food-bundles/food-bundles-chef-app.git
git push --force --mirror origin
```

`--mirror` rewrites **every** branch and tag: `main`, `feat/*`, and so on. Coordinate this:

5. Tell everyone that history was rewritten. Open pull requests must be recreated from
   the new branches.
6. Every collaborator re-clones. Pulling into an old clone would bring the old commits
   back. Old local branches must be rebased onto the new ones with
   `git rebase --onto` before deleting the old clone.
7. GitHub keeps unreachable commits for a while. Ask GitHub Support to run a garbage
   collection on the repository and to clear cached views of `41c7efc`.
8. Remove the `41c7efc…` line from `.gitleaksignore` and confirm that the CI
   `secret-scan` job is green.

## If you decide not to rewrite

That is acceptable once the key is revoked. Keep the `.gitleaksignore` entry with its
comment, so future scans don't flag the dead key.
