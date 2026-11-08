# The frozen test set — Amendment S-1 (TS-1 to TS-8)

*Ruled by the owner, live, 26 Oct 2026, on the frozen-test-set proposal from the LedgerCore V2 run. Plugin 2.6.15.
Each phase roster carries Amendment S-1, which points here; this file holds the rules in full, the method
`tools/test-set.py` runs, and its config.*

Every phase and agent could add a test and no step could remove one. Phase 1 carried everything forward, Phase 2
carried the verification payload unchanged, Phase 3's facets wrote a derived row for every guard S1 gave no case
for, and S5 never resolves by dropping a claim. On LedgerCore V2, **71 S1 test groups became 238 refusal rows**. The
owner's words: a "union of ideas when I need the intersection". The set analysis of that §5 kept 169 rows.

## What S-1 never removes

- **The dedupe never drops a guard element.** Every guard S1 names stays on the critical path, including the ones S1
  gave no case for. `test-set.py` exits 1 if a guard element would be left uncovered.
- **Cut rows stay on record.** They remain in S3 §5. They are not written and they gate nothing, unless the owner
  schedules them.
- **Every human gate, K6 and K7 are unchanged** except as TS-1 and TS-7 to TS-8 say. The completion ledger's PC enum
  box is unchanged.

## The rules

### TS-1 · CT-4 counts guard elements

A **guard element** is the pair (module, refusal outcome): the outcome the forbidden input is rejected with, as §5's
`Outcome` names it. A row that observes no named outcome (a static check, a FAILING status) is keyed by the invariant
it guards. CT-4 requires **one refusal per distinct guard element per module**. An S1 case decides *which* row
covers a guard element, never *whether* it is covered.

### TS-2 · Shared guards

A guard implemented once and called from many modules is tested in full at its **owner** module. Each calling module
keeps **one wiring row**, which proves the call, not one row per outcome. A caller keeps none where a hook statically
proves the wrapping. A guard that S1 requires at two points, or one act's own guard limb that shares an outcome name
with another's, is not a shared guard: it stays tested at each point. Which guards are shared, and who owns them, is
a judgment call: it goes in the config, which the lead approves.

### TS-3 · Hook duplicates

A refusal row whose only check is that a hook blocks duplicates that HOOK row, which must itself be shown to block
(CT-6). Its `Outcome` is that `HOOK-nn`, alone; it is not a separate guard element.

### TS-4 · Facets flag, never derive

A Phase 3 facet writes a §5 row for each S1 case its slice carries, one per guard element. A guard element its slice
carries with no S1 case is **flagged** in its facet document, as an uncovered guard: module, outcome, where S1 names
it. The facet never writes a derived row for it. S5 consolidates the flags once, across facets, applying TS-2 and
TS-3, and writes one row for each flagged guard element that remains. K6's CT-4 then holds: every guard element S1
names has its row.

### TS-5 · The Outcome column and `tools/test-set.py`

§5 carries an `Outcome` column (the emission contract, §4). `test-set.py` reads it and gives every row one
disposition. It runs **before Phase 3's human gate**, where its report goes to the owner with the S3, and **when
Phase 4 freezes each stretch** (TS-7). Its config (below) holds the judgment calls, and the lead approves it with the
report.

### TS-6 · A dedupe the lead approves (Phases 1 to 3)

The carry-forward rules carry every test forward, and they still do. A carried test may now be **deduplicated** when
the lead approves it, not only added to. A dedupe removes a row only where another row covers the same guard element
in the same module. It never drops a guard element or the last row of an S1 test group, and the removed rows stay on
record with their disposition.

### TS-7 · Phase 4's frozen set

- **The lead fixes the critical path per build stretch,** before the stretch starts: `test-set.py` for the
  stretch's modules, written to a report and recorded in `INSTRUMENTS/test-intake-log.md` under Frozen sets.
- **COMPLETE counts only the frozen set.** The completion ledger's CT-4 box counts the module's critical rows, plus
  any proposal admitted for it. Its other boxes are unchanged: the vectors are computed and re-derived (CC-5), the
  hooks are shown to block (CC-6), and the production concerns are enumerated (PC enum).
- **CC-4 checks only the frozen set.** This AMENDS the Phase 4 roster §3 (v0.10). A cut row is not written; its
  missing test is not a finding.
- **Sub-agents, sub-sessions and reviewers only propose tests.** Each proposal is a row in the test-intake log,
  naming the guard element it claims to cover and why.
- **Execute, log, then review.** Proposals and issues are logged during the stretch and not acted on, unless one
  blocks the build. A proposal waits in the log until the owner schedules it: the end-of-stretch dedupe and the
  owner's batch ruling on it are cut (roster v0.14, RD-34, 31 Oct 2026).
- **A repo with no frozen set recorded** counts every §5 row, as before S-1.

### TS-8 · K7 proposes

K7's verdict carries an optional `proposed_tests` field, each entry naming the guard element it claims to cover.

- **A guard element the frozen set does not cover is still a RETURN** (CC-4): it goes in `blocking`.
- **Another test for a covered element is a proposal.** `tools/k7-run.py` appends it to the test-intake log, pending.
  It blocks nothing and changes no verdict.

The field changes the K7 charter's text. Where a PipelineGate store pins the charter's digest (RD-28, RD-29), the
changed charter refuses as `DECIDER_NOT_IN_RUBRIC` until the owner signs a new `k7_verdict` version for it.

## The method

`test-set.py` runs these steps over §5, in this order:

1. **Guard elements.** For each row: (module, each outcome its `Outcome` names); a row with no named outcome is keyed
   by its invariant; a `HOOK-nn` row is a hook duplicate (TS-3); a row the config lists as a misfiled positive moves
   to the positive suite and is not a refusal.
2. **The cover.** For each module, a minimal set cover of its guard elements, built greedily. It takes the row that
   covers the most elements still uncovered; on a tie, a row that carries an S1 case; then the lowest ID. Every other
   candidate is a **variant** and is cut. A row carries an S1 case when its Invariant cites one (the config's
   `s1_case.pattern`) and the row is not marked *derived*.
3. **Shared guards** (TS-2). A calling module's first critical row on a shared guard becomes its wiring row; its
   other rows on that guard are cut, as tested at the owner. Where the config sets `wiring_row` false, all are cut.
4. **The S1 floor.** Every S1 test group a row cites keeps at least one kept row. A cut row that is the only carrier of
   a group is restored. Groups that run as whole suites (`suite_groups`) are exempt.
5. **No drop.** Every guard element must be covered by a kept row in its module, by the owner module of its shared
   guard, or by its HOOK row. One that is not is named on stderr, and the tool exits 1.

Dispositions: `critical`, `critical (wiring row: proves the call)`, `critical (restored: only carrier of T-nn)`,
`cut: variant of a kept row`, `cut: covered by its HOOK row (HOOK-nn)`, `cut: shared guard tested at its owner
(name)`, and `positive suite`.

```
python tools/test-set.py <S3> --config <config> [--modules MOD-01,MOD-02] [--out <report>] [--json]
```

Phase 3 runs before a build repo exists, so it runs the plugin's copy of the file (the phase4-build skill's template,
`tools/test-set.py`) against its working directory. Phase 4 setup copies the approved config to
`.metaframework/test-set.json`. `--modules` limits the listing to one stretch, while the analysis still covers every
module, so the owner of a shared guard outside the stretch still counts. Exit 0 means every guard element is covered;
1 means one would be dropped, or the config or an `Outcome` cell does not agree with §5; 2 is a usage error or an
unreadable document.

## The config

A JSON object; a key the tool does not read is refused, so a typo cannot silently drop a rule.

| Key | Holds |
|---|---|
| `s1_case` | `pattern`: the regular expression an S1 test case ID matches in §5's Invariant (default `\bT-[0-9]+\b`). `suite_groups`: S1 groups that run as whole suites, exempt from the floor. |
| `shared_guards` | One object per shared guard: `name`, `outcomes` (the refusal names it returns), `owners` (the modules that test it in full), `wiring_row` (default true; false where a hook proves the wrapping), and an optional `why`. |
| `misfiled_positives` | REF ids that §5 files as refusals but that test an allowed path: they run in the positive suite. |
| `pre_outcome` | Only for an S3 emitted before the Outcome column (below). |
| `about` | Free text. |

## An S3 emitted before the Outcome column

emission-check notes such a document rather than failing it, and the S3 is frozen, so the outcome comes from the
config. `pre_outcome` supplies it:

- **`vocabulary`**: the outcome names a row's Expected rejection is read against. They are every UPPER_SNAKE name in
  the S1 document given as `--s1`, plus `add` (outcome names S1 writes without an underscore, such as `EXISTS`), minus
  `drop` (UPPER_SNAKE names that are not outcomes, such as a setting's value), plus any name that starts with one of
  the `prefixes` (a family such as `PLUGIN_MAY_NOT_`). A row's outcomes are the names of four characters or more in
  its Expected rejection that fall in the vocabulary.
- **`hook_pattern`**: a regular expression, matched case-insensitively against the Expected rejection of a row that
  names no outcome. A match makes the row a hook duplicate (TS-3) only when the row also names its §7 HOOK row: a
  `HOOK-nn` that §7 holds, or a hook check ID (`hook_ids`) that a HOOK row's Condition carries. The row is then cut to
  that HOOK row, by name. A row worded as a hook's that names none stays in the cover, keyed by its invariant.
- **`hook_ids`**: a regular expression for the S3's own hook check IDs, as §7's Conditions write them (LedgerCore V2:
  `HK-V2-[0-9]+`). Not an invariant ID: an invariant can be guarded by a hook and by a refusal both, and only the
  hook's own check says the row duplicates the hook. Without it, only a cited `HOOK-nn` names a HOOK row.
- **`outcomes`**: `{"REF-nn": "<Outcome cell>"}`, written as the column would be. It overrides the reading for one row.

A row with no outcome and no hook match is keyed by its invariant, as with the column. Read the report's appendix
against §5 before approving the config: the derived outcomes are a reading, and the lead signs for it. LedgerCore V2's
config is `references/examples/test-set.ledgercore-v2.json` in the phase4-build skill. Run with its S1 as `--s1`, it
gives 238 rows, 172 critical, 42 variants, 8 hook duplicates, 11 shared-guard repeats and 5 positives. Before 2.6.23 a
hook-pattern match alone cut a row, and the same run gave 169 critical and 11 hook duplicates: three rows (REF-119,
REF-152, REF-153) were cut to hooks that did not guard them, and K7 round 12 returned all three under CC-4.
