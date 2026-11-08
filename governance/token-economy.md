# Token economy — Amendment T-1 (TE-1 to TE-9)

*Adopted by the owner, 24 Oct 2026, on the T-1 proposal from the Account Foundation run ("we need to update
metaframework plugin"). Plugin 2.6.14. Each phase roster carries Amendment T-1, which points here; this file holds
the rules in full.*

*Amended 1 Nov 2026, plugin 2.8.1: TE-1, TE-7 and TE-8 measure tokens from each session's own record. The owner:
dollar tracking "doesn't make sense in Claude Code and we need token tracking instead"; dollars stay for cloud runs.
On a flat plan no session can read `/cost`, so the ledgers filled with estimates (Tessera: 66 of 76 rows; LedgerCore
V2: every USD cell), and TE-1 halted the work over dollars nobody was charged. On 2 Nov 2026 the owner ruled three
points before release: a tokens budget weighs each kind by its API price (TE-1, TE-7, TE-8); a running build restates
its remaining budgets in tokens (TE-1); and the lead's own measured row at each step's close is wanted (TE-9).*

The framework governed rigour but not cost: no rule on budgets, model choice, session size, or how much
verification each stage gets. The Account Foundation run spent about $190 of a $250 budget on Phases 1–3, and
nothing in the pipeline forecast it or warned. T-1 makes cost a gate input, like any other carried constraint.

## The cost model

**Cost = context length × turns × model price, summed over every session and sub-agent.**

- **A long session is the largest hidden multiplier.** Every turn re-sends the whole history, so even a one-line
  turn late in a session is expensive. One coordinator ran Phases 1 to 3 and was compacted twice.
- **Fan-out multiplies whatever each agent reads.** Five Phase 3 facet agents each re-read S2, the A5 bundle, the
  engine and the S1 tables: about 1.23M tokens, most of it the same reading.
- **Parallel or sequential changes wall-clock time, never cost.**

## What T-1 never removes

No rule here drops a gate. A1, C0, S5, K6, K7, the seal and every human gate are unchanged. TE-6 scopes an
adversarial pass to what was judged or changed; it never skips one. When the money runs short the work halts for
the owner (TE-1). It never carries on at lower rigour.

## The rules

### TE-1 · Budget at intake

- The owner declares a budget at Phase 1 Intake, in dollars or tokens: one for the run and one for each phase.
  The Intake document records both, and the measure with them (2.8.1):
  - **tokens** where the plan is flat (Claude Code on a subscription): nobody is billed per token, so a dollar
    figure there could only be an estimate. A tokens budget is in **weighted tokens** (TE-7): each kind counts at
    its API price against one fresh input token, so a cache read counts a tenth of one or less, and an output
    token five;
  - **dollars** only where billing is per token (a cloud or API run), from that bill.
- **A build already running when it adopts 2.8.1** restates its remaining budgets in tokens, for the remaining work
  only (the owner, 2 Nov 2026). Its rows from before measuring stay as they are, as history. The tokens measure
  leaves them out, so the restated budget is set against measured rows alone.
- Every human gate reports the spend so far and the forecast to the next gate:
  `spend.py status --budget B --measure tokens` (or `usd`), with `--units N --unit-kind K` when fan-out comes next.
- When spend plus forecast exceeds the budget, `status` exits 1 and the work halts for an owner decision: raise the
  budget, narrow the scope, or stop. The halt is the gate working, not a failure.

### TE-2 · Model tiering by role

| Tier | Roles |
|---|---|
| **Top (Opus)** | Judgment: the A1 and C0 halts, C0's partition pricing, S5's contradictions, K6, K7, every adversarial pass and re-attack. In Phase 1: reductions, tautology proofs and the Consistency Gate's AE dispositions |
| **Mid (Sonnet)** | Applying a decided spec: facet specification, module builds, table writing, record assembly (a Final Package, an emitted document) |
| **Script** | Anything a script can answer (TE-5) |

- **The test for judgment:** a second capable reader could reasonably decide it the other way.
- **Choosing the model in Claude Code:**
  - the coordinator: the session's own model;
  - a sub-agent: `model: "sonnet"` or `model: "opus"` on the Agent call;
  - K7: `reviewer_command` with `--model opus`, which RD-29 allows.
- Name the tier (`opus`, `sonnet`), never a dated model id, so the rule outlives a model release.

### TE-3 · Session hygiene

- **A fresh session for each phase,** and a fresh coordinator after every closed gate.
- **State lives in approved documents** (SC-01), so the new session reads files, never the old transcript.
- **A coordinator never carries more than one phase of history.** Compaction is not hygiene: a compacted session
  still re-sends its summary every turn, and the summary loses detail the files keep.

### TE-4 · Narrow briefs, short reports

- A sub-agent or sub-session receives **only its slice**: its rows, its seams, and the interfaces of what it calls.
  Never the whole S1, S2 or S3.
- It writes its full output to a file and returns **at most about 20 lines**: verdict, counts, findings, and the
  file's path.
- The coordinator opens the file only where those lines say a judgment is needed.

### TE-5 · Scripts before agents

Every mechanical check is a script: coverage, ID minting, emission, cross-references, vector re-derivation, method
cross-checks. An agent is spent only on a judgment a script cannot make. This was already the roster's spirit and
HARNESS.md's design rule; T-1 adds the cost reason.

### TE-6 · Proportional verification

- **One** independent adversarial pass per phase, at its closing gate, **scoped to what the phase judged or
  changed**.
- A re-attack after fixes covers only the fixes.
- Mutation suites and checkers are reused across phases, not rebuilt.
- The pipeline's own adversarial steps (Phase 1's Logic Stress-Test, Phase 2's ST) and K7 are gates, not extra
  passes. TE-6 neither removes nor narrows them.

### TE-7 · The spend ledger

- `.metaframework/spend-ledger.md`. It is opened at Phase 1 Intake, in the working directory, and carried into the
  build repo at Phase 4 setup.
- **One row per stage:** a session, a sub-agent, or a K7 round. Columns: Stage, Session, Model, Uncached in,
  Cache write, Cache read, Tokens out, Weighted, USD, Output, Date (2.8.1).
- **Tokens are measured, never typed or estimated (2.8.1).** Append with `spend.py add --stage … --measured`. The
  lead names the stage; the four counts come from the session's own record, its Claude Code transcript:
  - **the lead's row:** its own replies since its last row;
  - **a sub-agent's row:** `--agent <agentId>`, the id the Agent result gives;
  - **a K7 round's row:** `--session-id <ids>`, the line `k7-run.py` prints at the round's end.

  Each reply is counted once, even when the transcript writes it on several lines or a resumed session copies it,
  and every reply a row counts is listed in `spend-ledger.measured.jsonl` beside the ledger, which travels with it.
  The four kinds stay apart because one total misleads: a long session's tokens are almost all cache reads.
  `spend.py measure` prints the counts without writing. A usage notice's figure is one reply's context, not a
  stage's usage, and is never entered.
- **Weighted** weighs the four kinds by their API price against one fresh input token (the owner, 2 Nov 2026). The
  ratios are the claude-api skill's pricing reference's: `shared/prompt-caching.md`, "Economics", and each model's
  pricing line in `shared/model-migration.md`.

  | Kind | Weight |
  |---|---|
  | Uncached input | 1 |
  | Cache write to the 5-minute cache | 1.25 |
  | Cache write to the 1-hour cache | 2 |
  | Cache read | 0.1, or the lower rate the reference gives a model (0.05, 0.025) |
  | Output | 5 |

  Each reply's split between the two caches comes from its record (`usage.cache_creation`); a write the record
  does not split is the 5-minute cache's, the API's default. A cache read is weighed for the model that gave the
  reply; a model the reference gives no lower rate reads at 0.1. The raw counts keep their own cells. Weighted is
  what a tokens budget, `status` and `forecast` compare, and their output shows the raw counts beside it.
- **USD only from a per-token bill** (a cloud or API run's `/cost`). On the tokens measure the USD cell is `-`,
  never an estimate.
- **A cell nobody knows is `-`: unknown, never zero.** `status` and `forecast` refuse to count it.
- **Rows from before 2.8.1** stay as they were. A ledger that has them gets a second table, "Measured rows", at its
  first measured row. The tokens measure leaves the old rows out, since their tokens were never measured, and
  `status` says how many it left out.
- The ledger is updated at every gate, before the gate's report.
- **Stage names** are `kind:id detail`, for example `phase1:intake`, `facet:F-03`, `module:MOD-07 build`,
  `module:MOD-07 K7`, `reattack:R1`. TE-8 prices by kind and id; the detail is free text.

### TE-8 · Forecast before fan-out

- Before C0's facets launch, before Phase 4's module loop, and before any re-attack, the coordinator forecasts
  **units × cost per unit**: `spend.py forecast --units N --unit-kind K`.
- The cost per unit comes from the ledger: the kind's total over its distinct units. A module's build row and its
  K7 rows are one module. On the tokens measure a row's cost is its Weighted cell, and only measured rows price
  a unit; the forecast also shows the units' raw tokens and each kind's share (2.8.1).
- Until the ledger holds a unit of that kind, the owner states an estimate with `--unit-cost X`, in the declared
  measure. The tool never invents one. Once a unit is measured, the ledger's figure replaces the estimate.
- The owner approves the forecast spend at the gate, before the fan-out starts.
- Re-forecast once real units are measured. Account Foundation measures MOD-01 to MOD-03, then forecasts the other
  13, and the owner decides.

### TE-9 · The Phase 4 module loop

- **One sub-session per module**, in S3 §10 build order. The order is fixed, so running modules in parallel saves
  nothing.
- **The builder runs on the mid tier with that module's S3 slice only:**
  - its §2 row;
  - the §4 seams it is the source of;
  - its §5 to §8 rows;
  - the §3 interfaces of those seams' targets.
- **K7 runs on the top tier, separately:** `tools/k7-run.py`, as RD-6 and RD-29 already require.
- **The coordinator** receives the builder's report of 20 lines or fewer. It updates the completion ledger and the
  spend ledger (one row for the build, one for each K7 round, and its own), then runs `spend.py status` before the
  next module starts.
- **The lead's own measured row** closes each step: `spend.py add --stage "module:MOD-nn lead" --measured`. It is
  TE-7's one row per session, not an added step (the owner, 2 Nov 2026). It holds the lead's replies since its
  last row, which are most of a build's tokens: in Tessera-build's Phase 4 session on 1 Nov, 80.7M of its 88.9M
  raw tokens were the lead's.

## The tool

```sh
python tools/spend.py add --stage "module:MOD-03 build" --measured --agent a335969187c9646a1 --note "MOD-03 built, 41 tests green"
python tools/spend.py add --stage "module:MOD-03 lead" --measured --note "verified, ledgers"
python tools/spend.py measure
python tools/spend.py forecast --units 13 --unit-kind module --measure tokens
python tools/spend.py status --budget 8000000 --units 13 --unit-kind module --measure tokens
```

- **The session** is `CLAUDE_CODE_SESSION_ID`, which Claude Code sets in every command a session runs. So the right
  session is found when several share a folder, and no hook is needed: Phases 1–3 measure exactly as Phase 4 does.
  `--session-id` names another session (several, comma-separated, for one K7 round); `--transcript PATH` a file.
- `--measure tokens` totals the Weighted cells of every measured row and shows their raw counts beside them.
  `--measure usd` (the default) totals the USD cells.
- `--ledger PATH` names another ledger. Phases 1 to 3 run before the build repo exists, so they run the plugin's
  copy of `spend.py` against their working directory's ledger. `add` creates the ledger on its first row.
- **Exit codes:** 0 when the answer is stated; 1 when `status` finds spend plus forecast over the budget; 2 for a
  usage error, an unreadable ledger or transcript, a row that would record nothing, or an unknown cost the answer
  would rest on.

## Where each phase applies it

| Phase | Where |
|---|---|
| 1 | TE-1 and TE-7 at Intake. TE-2, TE-3 and TE-4 (compressor-mode workers). TE-6 at Final Package Assembly |
| 2 | TE-1 at every gate. TE-2, TE-3, TE-4. TE-6 at the Final Package gate |
| 3 | TE-1 at every gate. TE-8 at C0, before the facets launch. TE-2, TE-3, TE-4 for the facets. TE-6 after K6 |
| 4 | TE-1 at every gate. TE-8 at setup, before the module loop. TE-9 for the loop itself |
