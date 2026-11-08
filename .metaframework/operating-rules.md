# Operating rules

The owner's rules for every builder in this build (2.6.21). tools/brief.py puts this file, whole, in every builder
brief, followed by its `MF-RULES` digest, and a builder launched without the current digest is refused. The owner
edits it per build; a brief made before an edit is stale.

1. **Fix your code until it passes.** A builder whose code a check refuses changes its own code until the check
   passes. It never asks for a check, test or standard to change, never adds a class or file the S3 doesn't list to
   get past a check, never reshapes code so the check has nothing to compare, and does not apply an owner ruling to a
   case the ruling doesn't name. When the fix needs another module's code changed, it reports that to the lead.
2. **Commit only through `git commit`, never with `--no-verify`.** Never `commit-tree`, `update-ref`, `branch -f`,
   `reset --hard <sha>`, `cherry-pick`, `revert` or `rebase`; a merge is `git merge --no-ff`.
3. **Stage in one call, commit in the next.** The gate judges a commit before the call runs, so a call that stages and
   then commits is checked against the old index.
4. **Name files, not folders, under `governance/S3/` and `src/`.** Never `cp x dir/`, `mv x dir`, `cp -t` or
   `-Destination` into them, and never remove a protected folder (`governance/S3`, `src`, `tools`, `.githooks`).
   Source files go through Write or Edit.
5. **A code hook rule names the threat, not a stand-in:** a decorator that replaces `execute`, not any decorator.
   Forms that rebind at run time (`type()`, computed bases, metaclasses, `setattr` with a computed name, `exec`) are
   known issues for K7's review, not new hook rules.
