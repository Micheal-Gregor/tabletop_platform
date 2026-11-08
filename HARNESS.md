# Metaframework Harness v1.0

Mechanical gates for Phase 4 and the seal that ends it. Everything here exists to move rules out of
prose and into files that execute, because prose is advisory and compaction
thins it, while a script that exits 2 does not reinterpret itself.

**Design rule.** Nothing in this harness asks a model to assess itself. Every
gate compares an artifact to another artifact, or an exit code to zero.

---

## Contents

| File | Installs at | Does |
|---|---|---|
| `S2-S3-emission-contract.md` | `governance/` | Fixed headings, column sets, ID scheme, and status enums for the Phase 2 and Phase 3 documents. The contract everything else reads. |
| `emission-check.py` | `tools/` | Validates a Phase 2 or Phase 3 document against that contract. |
| `structure-check.py` | `tools/` | Classifies every tracked `.md` by role and enforces the resident line cap and one-acceptance-test-per-step. |
| `phase4-checks.py` | `tools/` | Seven gates against Phase 4 instruments: `rosters`, `modules`, `tags`, `scaffold`, `seal`, `objects` (Object Writing Standard OS-1..OS-12; OS-3 reads the partition from S3 §2 only, 2.6.17), and `gates` (the gate install, 2.6.17). |
| `gate.py` | `tools/` | The PreToolUse wall: the frozen S3, sealed files, OS-1 and OS-2 at the write, seal and k7-pass tags, merges, and the 2.6.17 reach rules in `gate_reach.py`. Fails closed; its hook command ends in `\|\| exit 2` so a python3 that cannot start denies too. |
| `gate_reach.py` | `tools/` | Amendment H-1 (2.6.17), the rules that let the gate hold from every session shape: the liveness probe (`.metaframework/gate-probe`, refused and logged to `gate-live.jsonl` with the nonce, session and agent ids and gate.py's digest), the gate's machinery off limits to builders, no source written through a shell, no change to `core.hooksPath`, a commit into the repo however spelled (`git -C`, `cd`) never skipping `precommit.py`, and the MF-BRIEF stamp on a builder's launch. 2.6.21 reads shell paths for where they land (a folder target is `<folder>/<file>`, a folder removal takes everything beneath it), and refuses what would land commits the hooks never checked (`cherry-pick`/`revert` without `--no-commit`, `rebase`, `commit-tree`, `update-ref`, `branch -f`, `reset` onto another commit, a fast-forward `merge`, any `pull`, `am --no-verify`), a call that stages and then commits (stage in one call, commit in the next), a session writing inside `.git/`, a change to `core.hooksPath`, `merge.ff` or `pull.ff` (read by intent, not text), a builder placing a tag, and a builder launch without the brief's current `MF-RULES` line. The owner can run any of these from their own terminal. |
| `precommit.py` | `tools/` | The checks every commit runs, from a session or a plain shell (2.6.17): a probe left on disk, the frozen S3 and sealed files, the append-only logs, `objects`, the declaration comparison, structure, every `project_hooks` script, and code-gates when declared. They read exactly what the commit records: a throwaway worktree of the staged tree (2.6.18). `.githooks/pre-commit` and `pre-merge-commit` run it; so does `gate.py` before a session's commit. |
| `pre-commit`, `pre-merge-commit` | `.githooks/` | git's hooks (2.6.17; the merge hook 2.6.18): each runs `tools/precommit.py`, refusing the commit or merge when python3 cannot start. Active once `core.hooksPath` is `.githooks`. |
| `install-gates.py` | `tools/` | Once per clone (git does not clone config): sets `core.hooksPath` (also at the worktree level when `extensions.worktreeConfig` is on, as in the desktop app's worktrees), `merge.ff=false` and `pull.ff=only` (2.6.21), makes the hooks executable, records this machine's code-gates `gates.cjs` (`--code-gates`) in the uncommitted `.metaframework/local.json`, writes the session profiles (2.7.0: `.claude/agents/builder.md`, and the uncommitted `.claude/settings.local.json` turning off every installed plugin but metaframework and oop-standards), and prints what is still missing. |
| `gatecheck.py` | `tools/` | Is the install present and current? Settings wire gate.py on every writing tool and fail closed, git runs the hook, the machinery equals `template-manifest.json`, every `hooks/*.py` is listed, code-gates resolves when declared, no probe left, and (2.7.0) the session profiles are the template's and this machine's. `phase4-checks.py gates`, `state.py`, `k7-run.py` and the SessionStart hook all read it. |
| `template-manifest.json` | `.metaframework/` | The digests of the template's gate machinery at its release. A repo whose `gate.py` predates the probe rule fails `gates`, so a restarted build cannot run on an older gate unnoticed. |
| `basis.py` | `tools/` | The review basis (2.6.17): the roster, the standard, the S3, the S2 and the object model, with live digests. `brief.py` stamps a brief with them, `gate.py` refuses a stale stamp, and `k7-run.py` shows the reviewer the same list. |
| `isolation-run.py` | `tools/` | A Python build's OS-12 runner (2.6.21): runs the isolation tests the `isolation_test_pattern` names with the environment cleared, no user site, `PYTHONHASHSEED=0` and `TZ=UTC0`. The Python preset's `isolation_test_command`. |
| `anchor-s3.py` | `tools/` | The owner's one-command S3 anchor (2.6.21), from PowerShell or any shell: `python tools/anchor-s3.py --from <folder>` places the Phase 3 exports in `governance/S3/` by name, commits through the hook and tags `s3-anchor-v1.0`. Before the seal, `--revision <folder> --discharges SP-n,...` anchors F's revision the same way in `governance/S3/v1.<n>/`, points `s3_document` at it, appends to the C4 and F records and tags `s3-anchor-v1.<n>` (2.8.2). |
| `preset.py` | `tools/` | `python tools/preset.py python\|typescript\|php` (2.6.21) fills `project.json`'s per-language settings from `.metaframework/presets/`, never overwriting a value the build set. `_metaframework/new-build.py --lang` runs it. |
| `brief.py` | `tools/` | A builder's brief, generated (2.6.17): the module's S3 rows (§2, §3, §4 with bindings, §5, §7), its S2 nodes, its object-model rows, the `new-object.py` command for each class, the standard in full, the gate probe with its nonce, and (2.6.21) `.metaframework/operating-rules.md` whole with its `MF-RULES` digest line, which the gate requires on the launch. `verify --nonce N` accepts a step only when one probe with that nonce was refused inside a sub-agent by the current gate.py, and (2.7.0, Python) its red run stands. `red --nonce N` runs the tests the step's new base-case rows name, each on its own, and logs them to `.metaframework/red-log.jsonl` only when every one fails; until then the gate refuses the builder's code. The brief is launched as `subagent_type: builder`. |
| `php_support.py` | `tools/` | PHP for every tool that reads code (2.6.13): the OS-1 and OS-2 scanners, signatures, and import resolution through composer.json's PSR-4 maps. Setup for a PHP build: `governance/languages/php.md`. |
| `new-object.py` | `tools/` | Scaffolds a class that already satisfies the standard (TypeScript, JavaScript, Python or PHP): declared inputs as constructor parameters, the OS-12 isolation test, the object-model row. The compliant path, made the cheap one. |
| `source_scan.py` | `tools/` | The source readers `gate.py`, `phase4-checks.py`, `seal.py` and `k7-run.py` share (2.6.19): `glob_to_regex`, the OS-1 detector and the signature reader, held once instead of copied into each tool. |
| `seal.py` | `tools/` | Ends Phase 4: one sweep (`check`), the lock (`apply`), `verify`, `list`, `begin-extension` to hand a sealed repo back to Phase 4, and `reopen` to reopen the latest seal for one owner ruling. From 2.8.0 (RD-33) the final review covers the code without a closing tag, the owner's one approval (`apply`) also writes the final review's findings to `ui/gaps.md` and merges `phase4` into `main` with `--no-ff`, and the sweep carries the open owner gates and the object standard's exceptions. |
| `run.py` | `tools/` | Long runs (2.8.0, RD-35): `python tools/run.py --kind k7\|seal-check\|suite\|other --label L [--timeout S] [--result P] [--wait] -- <command>` starts the command under a supervisor detached from the session (a detached process group on Windows, `setsid` on POSIX), which keeps `.metaframework/runs/<run_id>.json` (schema 1) with a heartbeat every 30 s and then the result. Readers derive interrupted and stalled. The gate refuses `k7-run.py`, `seal.py check` and the full suite started any other way; `state.py`'s hooks print each run's change of state to every session; `--list` shows them all. |
| `reopen.py` | `tools/` | The reopen record, `.metaframework/reopen.json`: the latest seal, the ruling, who approved it. It binds to one tag, so the next seal closes it (and `seal.py apply` retires it); `gate.py`, `seal.py`, `state.py`, `phase4-checks.py` and `k7-run.py` read it. |
| `tests/` | `tools/` | The tools' own tests: the reopen and the seal that closes it, K7's seal guard, the state hook, the spend ledger (`test_spend.py`) and its measured tokens (`test_measured_tokens.py`, 2.8.1, on fixture transcripts in `fixtures/transcripts/`), the frozen test set (`test_test_set.py`), the gate's reach from every session shape and every commit path (`test_gate_reach.py`, 2.6.17), and PHP (`test_php.py`; set `MF_PHPUNIT` to a phpunit binary to run the generated test too). Each builds throwaway repositories from the template part of the checkout: in a build, its own folders, worktrees, installs and history are not copied (2.6.21). Run them from the repository root with `python -m unittest discover -s tools/tests` and no `-t`, in the plugin's template and in a build alike, a build whose own `tests/` is a package included: `-t .` stops at "Start directory is not importable" (2.6.21). |
| `token-economy.md` | `governance/` | Amendment T-1 (2.6.14; TE-1, TE-7, TE-8 and TE-9 amended in 2.8.1 to measure tokens, weighted by API price), TE-1 to TE-9 in full: the budget at intake and at every gate, model tiering by role, session hygiene, narrow briefs, scripts before agents, proportional verification, the spend ledger, the forecast before fan-out, and the Phase 4 module loop. It removes no gate. |
| `spend.py` | `tools/` | The spend ledger (T-1). `add --measured` appends one stage's row, its four token counts (uncached input, cache writes, cache reads, output) read from the session's own Claude Code transcript (`CLAUDE_CODE_SESSION_ID`; `--agent` for a sub-agent, `--session-id` for a K7 round), each reply once and only the replies no earlier row counted, and their Weighted figure: each kind at its API price against one fresh input token (2.8.1); a typed count is refused. On `--measure tokens`, `status` and `forecast` compare the Weighted figures and show the raw counts beside them. `measure` prints the counts and writes nothing; `forecast --units N --unit-kind K` prices N more units from the units already measured, or the owner's `--unit-cost` before there are any; `status --budget B` gives spend, forecast and headroom, and exits 1 when spend plus forecast exceeds the budget. An unknown cost is never counted as zero (exit 2). |
| `spend-ledger.md` | `.metaframework/` | The ledger `spend.py` reads and writes, one row per stage: Stage (`kind:id detail`), Session, Model, Uncached in, Cache write, Cache read, Tokens out, Weighted, USD, Output, Date (2.8.1; a ledger with the older Tokens in and Tokens out columns keeps them, and its measured rows go in a second table). Beside it, `spend-ledger.measured.jsonl` lists every reply a measured row counted. Both are opened at Phase 1 Intake and carried into the repo at setup. |
| `test-set.md` | `governance/` | Amendment S-1 (2.6.15), TS-1 to TS-8 in full: CT-4 as one refusal per distinct guard element per module, shared guards, hook duplicates, facets that flag rather than derive, a dedupe the lead approves, Phase 4's frozen set per stretch, and K7's proposals. Also the method `test-set.py` runs and its config. No guard element is dropped; cut rows stay on record. |
| `test-set.py` | `tools/` | The frozen test set's set cover (S-1). Reads S3 §5 with its `Outcome` column and gives every row one disposition: critical, cut (variant, hook duplicate, shared guard re-tested in a caller) or positive suite. It exits 1 when a guard element would be dropped. `--modules` lists one stretch. For an S3 from before the column, the config supplies the outcome. |
| `test-set.json` | `.metaframework/` | `test-set.py`'s config, approved by the lead: the S1 case pattern, shared-guard owners, misfiled positives, and `pre_outcome` for an older S3. Written in Phase 3, carried in at setup. |
| `test-intake-log.md` | `INSTRUMENTS/` | The frozen set per stretch, and every proposed test, pending until the owner schedules it (the end-of-stretch dedupe and its batch ruling are cut, 2.8.0). `k7-run.py` appends a verdict's `proposed_tests` to it. |
| `receipts.py` | `tools/` | The gates as PipelineGate receipts (RD-28), when `pipelinegate_command` is declared. Points on each module's content: `k7`, `owner-triage` and `full-review` (the `battery` point is cut, 2.8.0). `setup` prints the owner's signing commands; `owner-close`, `standing` and `manifest` do the rest. |
| `rubrics/` | `governance/` | The rubrics a store admits on the owner's signature: `k7_verdict.md` and `owner_triage.md` (judged), with the canonical JSON specs the engine admits for them, `k7_verdict.json` and `owner_triage.json`, which carry the same text. `battery_complete.py` (mechanical) and `battery-record.schema.json` stay for a store that signed the battery rubric before 2.8.0 cut it; `setup` no longer admits it. |
| `manifests.py` | `tools/` | Credited review (RD-27): each module's content fingerprint (its files, the tests that import them, its object-model rows, the modules it imports, resolved), the mode `k7-run.py` gives it (credited / diff / full), and the seal's full-review backstop. `python tools/manifests.py scope` previews a round. |
| `k7-scratch.py` | `tools/` | The K7 reviewer's whole shell (RD-29): `suite`, `select <name>`, `rederive`, `reset` and `status`, each run in the round's throwaway worktree (`.k7/wt`), never in the repository. The declared commands are the project's own; a test name goes in as one argument, never through a shell. |
| `k7-reviewer.md` | `.claude/agents/` | The K7 reviewer's charter (RD-29). A repo may edit its copy; with a PipelineGate store its digest is pinned by the `k7_verdict` version the store admitted, so a change (2.6.15's `proposed_tests` among them) is the owner's signed act. |
| `contracts/` | `governance/` | The two resident contracts: `phase4-contract.md` (appended to the S3 instruction at setup) and `CLAUDE-phase5.md` (installed by `seal.py apply`). |
| `k7-verdict.schema.json` | `governance/` | The verdict contract. The only durable output of a K7 review. |
| `project.json` | `.metaframework/` | Declares test and rederive commands, source glob, scaffold exemptions. |
| `doc-roles.json` | `.metaframework/` | Maps path globs to document roles. Every tracked `.md` must match one — an unclassified document has an unknown residency cost and fails `structure-check`. |

Tooling must live in `tools/` or `.metaframework/`. The scaffold check scans
tracked files for placeholder markers and will match its own source otherwise.

---

## Install order

1. **`.metaframework/project.json`** — fill from the template. Nothing else runs
   without `source_glob`, and `test_command` is what CC-4 becomes.

2. **`tools/`** — the three checkers. Confirm each exits 0 on a clean tree
   before wiring anything to a hook; a gate that fails open is worse than none.

3. **`.metaframework/roster-manifest.json`** — record authoritative digests:

   ```sh
   python3 - <<'PY'
   import hashlib, json, pathlib
   files = ["governance/Phase4_Conformance_Build_Roster.md",
            "governance/Object_Writing_Standard.md"]
   m = {f: hashlib.sha256(pathlib.Path(f).read_bytes()).hexdigest() for f in files}
   pathlib.Path(".metaframework/roster-manifest.json").write_text(json.dumps(m, indent=2))
   PY
   ```

   Regenerate **only** when deliberately refreshing from the skill rosters. That
   is the entire point: an undeclared change to a governance copy becomes a
   build failure instead of silently instructing the next session from
   superseded mechanics.

4. **`governance/`** — the emission contract and verdict schema, committed and
   tagged with the S3 anchor.

5. **Hooks** — `python3 tools/install-gates.py`, before the first commit and in every fresh
   clone, then `python3 tools/phase4-checks.py gates` exits 0. The session hooks are in
   `.claude/settings.json`; a session started in another folder reaches `gate.py` through the
   metaframework plugin's router (`hooks/route.py` in the plugin), which every session with the
   plugin enabled runs. Nothing a session does can make a session ungated silently: a builder's
   probe that is not refused leaves `.metaframework/gate-probe` on disk, and `precommit.py`
   refuses every commit while it is there.

---

## Gate topology

What blocks what, and at which frequency.

```
any session, any folder-> plugin router -> gate.py (PreToolUse: every write, shell and launch
                                                    touching the repo; H-1, 2.6.17)
C4 close, a step's start, a K7 round
                       -> phase4-checks gates      (the install present and current)
a builder's launch     -> gate.py brief rule       (a current MF-BRIEF stamp from brief.py)
a builder's first call -> the probe, refused        (logged; brief.py verify accepts the step)
git commit, any shell  -> .githooks/pre-commit -> precommit.py
write any .md          -> structure-check          (PreToolUse, every write)
any human gate         -> spend.py status          (TE-1: exit 1 halts for the owner)
before a fan-out       -> spend.py forecast        (TE-8: the owner approves the spend)
emit S2 / S3           -> emission-check           (C4 anchor, once per phase)
Phase 3 human gate     -> test-set.py              (S-1: exit 1 means a guard element dropped)
start a build stretch  -> test-set.py --modules    (S-1: the lead freezes the set; intake log)
build one rung         -> test_module              (inner loop, scoped, fast)
close a rung           -> test_command             (full suite, unscoped)
close a ladder         -> phase4-checks --all
                          + rederive --all
the foundation built   -> run.py -- k7-run.py --checkpoint (one fix pass, no re-check)
the last module built  -> ui/interface-contract.md
                          -> run.py -- k7-run.py --final
                          -> run.py -- seal.py check (one sweep)
                          -> the owner's one approval: seal.py apply (seal + merge phase4 into main)
a long run             -> run.py (record + heartbeat; the hooks print its result)
after a seal           -> gate.py refuses writes to sealed files; seal.py verify
Phase 5 merge          -> intact seal only (no K7)
extension K7           -> --modules required; sealed files unchanged
owner ruling on sealed -> seal.py reopen -> the ruled change (K7 may review it)
                          -> seal.py check -> seal.py apply (closes the reopen)
```

Two frequencies matter. `test_module` is for feedback while building; it is
never a gate. `test_command` runs the whole suite unscoped, because the value of
a suite is re-validating what you did not think you touched — and because the
K7 mutation tests' "named tests MUST fail" is meaningless if the run was scoped.

---

## What is mechanical now

- Document structure: headings, columns, IDs, enums, orphans, duplicate IDs,
  deferred vectors missing a discharge condition.
- The critical path: one refusal per guard element per module, none dropped (`test-set.py`).
- Governance copies match their authoritative digests.
- CC-1 in both directions: declared modules exist on disk, tracked sources are
  claimed by a module.
- Tags are backed by verdicts covering the tree they point at.
- The close's order (RD-34): after a checkpoint the next round is the final review, and after it
  no round runs without the owner's order (an owner-round tag).
- Long runs (RD-35): K7, the seal check and the full suite start through `run.py`, and every
  session is told when one's state changes, crash or not.
- The seal: sealed files unchanged, every seal has its record, Phase 5 runs no K7.
- OS-2 at the write, the objects check at the commit, the isolation tests at the seal.
- The gate's reach (H-1, 2.6.17): every session shape reaches `gate.py`, every commit runs
  `precommit.py`, the install proves itself (`gates`), every builder proves it is gated (the
  probe), and builders and K7 are given the same documents (`basis.py`).
- No scaffold markers in committed artifacts.
- Resident documents under the line cap; every step has exactly one acceptance
  test.

## Remaining

Nothing. `tools/rederive.py` and `tools/state.py` complete the set.

`rederive` is language-agnostic: it drives your implementation through one
declared `rederive_invoke` command, so declare that alongside `test_command`.
It fails a vector whose value does not recompute, **and** one whose `impl_sha`
is absent or stale — a record asserting false provenance is a false record.
`--refresh-provenance` re-pins `impl_sha` for vectors whose value re-derives; it
cannot rescue a wrong value.

`state.py` owns STATE.json. Git-derived fields refresh automatically; intent
fields (`next_action`, `current_module`, `blocked_on`, `phase`, `concept`) are
set explicitly and survive every refresh. `hook-session-start` injects the state
block on start, resume, and post-compaction; `hook-precompact` checkpoints to
disk and appends to `INSTRUMENTS/state-log.jsonl` before context is lost.

`tools/k7-run.py` and `tools/gate.py` supersede the old S3 write-protect hook,
which missed Bash writes, passed `NotebookEdit` on an empty path, and failed
open when `python3` was absent. Remove `hooks/protect-s3.sh` when wiring `gate.py`.

**`reviewer_command`** defaults to `claude -p --agent k7-reviewer --output-format text`. For a
Claude Code reviewer the runner appends the grant itself (RD-29): project settings only (no
user or local allow rules), `--permission-mode dontAsk`, `Edit(.k7/**)`, and
`tools/k7-scratch.py` as the shell. A command that would widen that (skip permissions, its own
allow list, settings, extra directories, an inline agent or system prompt) is refused;
`--model` is fine. If `claude` on PATH is not the install you use, name it by path.
`k7-run.py --dry-run` runs preflight and prints the prompt and the composed command without
spawning anything.
