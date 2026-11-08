# Spend ledger

Amendment T-1 (`governance/token-economy.md`, TE-7). One row per stage: a session, a sub-agent,
or a K7 round. Append with `tools/spend.py add --measured`; read with `spend.py forecast` and
`spend.py status`. The four token counts are measured from the session's own record, never typed:
uncached input, cache writes, cache reads, output. Weighted weighs them by API price against one
fresh input token, and is what a tokens budget compares (TE-1). USD is a per-token bill's figure
(a cloud or API run's `/cost`), else `-`. A cell nobody knows is `-`: unknown, never zero. A Stage
named `kind:id detail` (`module:MOD-03 build`) is one unit of that kind for TE-8's forecast.

| Stage | Session | Model | Uncached in | Cache write | Cache read | Tokens out | Weighted | USD | Output | Date |
|---|---|---|---|---|---|---|---|---|---|---|
| R1 lead: setup and reading | f7fce8bb | opus | 102 | 235135 | 10195597 | 31513 | 1137717 | - | R1 budget 30M weighted (owner: Approve 30M, 2026-11-08); the install half's session is not in this ledger | 2026-11-08 |
| module:MOD-05 build | f7fce8bb agent-a6cc7b04 | sonnet | 24 | 38979 | 447966 | 4558 | 116334 | - | - | 2026-11-08 |
| module:MOD-05 lead | f7fce8bb | opus | 120 | 155347 | 21181527 | 105289 | 1896335 | - | - | 2026-11-08 |
