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
| module:MOD-07 build | f7fce8bb agent-a2245dc5 | sonnet | 22 | 37562 | 412035 | 6436 | 120358 | - | - | 2026-11-08 |
| module:MOD-07 lead | f7fce8bb | opus | 24 | 27404 | 5410160 | 18766 | 419170 | - | - | 2026-11-08 |
| module:MOD-11 build | f7fce8bb agent-a211cb0b | sonnet | 34 | 57613 | 844809 | 14526 | 229161 | - | - | 2026-11-08 |
| module:MOD-11 lead | f7fce8bb | opus | 18 | 19161 | 3800854 | 10323 | 279998 | - | - | 2026-11-08 |
| module:MOD-12 build | f7fce8bb agent-a02bb9cf | sonnet | 36 | 55514 | 859481 | 12552 | 218137 | - | - | 2026-11-08 |
| module:MOD-12 lead | f7fce8bb | opus | 6 | 11757 | 1462789 | 9020 | 141759 | - | - | 2026-11-08 |
| module:MOD-14 build | f7fce8bb agent-af2d7f62 | sonnet | 26 | 48822 | 565431 | 9872 | 166957 | - | - | 2026-11-08 |
| module:MOD-14 lead | f7fce8bb | opus | 8 | 10615 | 2005843 | 8371 | 163385 | - | - | 2026-11-08 |
| module:MOD-15 build | f7fce8bb agent-a3132a73 | sonnet | 42 | 88644 | 1437019 | 31957 | 414334 | - | - | 2026-11-08 |
| module:MOD-15 lead | f7fce8bb | opus | 6 | 12098 | 1534843 | 8586 | 143874 | - | - | 2026-11-08 |
| module:MOD-19 build | f7fce8bb agent-a632583f | sonnet | 18 | 54255 | 406637 | 13376 | 175380 | - | - | 2026-11-08 |
| module:MOD-19 lead | f7fce8bb | opus | 6 | 11263 | 1570029 | 7756 | 139813 | - | - | 2026-11-08 |
| module:MOD-25 build | f7fce8bb agent-ab791ae7 | sonnet | 22 | 38239 | 415907 | 7099 | 124906 | - | - | 2026-11-08 |
| module:MOD-25 lead | f7fce8bb | opus | 6 | 12983 | 1603721 | 7715 | 144733 | - | - | 2026-11-08 |
| module:MOD-26 build | f7fce8bb agent-a5106792 | sonnet | 16 | 37497 | 288046 | 2540 | 88392 | - | - | 2026-11-08 |
| module:MOD-26 lead | f7fce8bb | opus | 6 | 8465 | 1637850 | 7089 | 134274 | - | - | 2026-11-08 |
| module:MOD-32 build | f7fce8bb agent-ae90742c | sonnet | 16 | 35384 | 285233 | 3014 | 87839 | - | - | 2026-11-08 |
| module:MOD-32 lead | f7fce8bb | opus | 6 | 10688 | 1667177 | 7630 | 142891 | - | - | 2026-11-08 |
| module:MOD-34 build | f7fce8bb agent-ac863115 | sonnet | 18 | 36957 | 332860 | 3124 | 95120 | - | - | 2026-11-08 |
| module:MOD-34 lead | f7fce8bb | opus | 6 | 12301 | 1699337 | 7597 | 147560 | - | - | 2026-11-08 |
| module:MOD-35 build | f7fce8bb agent-aeba6b1f | sonnet | 18 | 41904 | 351928 | 4777 | 111476 | - | - | 2026-11-08 |
| R1 lead: unblocked modules done, waiting on the owner | f7fce8bb | opus | 10 | 12837 | 2900753 | 10006 | 220752 | - | - | 2026-11-08 |
| module:MOD-22 build | f7fce8bb agent-af957481 | sonnet | 38 | 76066 | 1232593 | 26297 | 349865 | - | - | 2026-11-08 |
| module:MOD-22 lead | f7fce8bb | opus | 24 | 24225 | 6545422 | 20323 | 477360 | - | - | 2026-11-08 |
| module:MOD-10 build | f7fce8bb agent-adcc3b07 | sonnet | 30 | 62457 | 774371 | 16992 | 240498 | - | - | 2026-11-08 |
| R1 lead: rulings, MOD-22, MOD-10 | f7fce8bb | opus | 8 | 14713 | 2472436 | 9021 | 198161 | - | - | 2026-11-08 |
