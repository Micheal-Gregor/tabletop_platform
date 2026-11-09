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
| module:MOD-02 build | f7fce8bb agent-a38937cc | sonnet | 36 | 75941 | 1074089 | 21497 | 309856 | - | - | 2026-11-08 |
| module:MOD-02 lead | f7fce8bb | opus | 40 | 32432 | 10834201 | 19750 | 705364 | - | - | 2026-11-08 |
| module:MOD-03 build | f7fce8bb agent-a6684b26 | sonnet | 24 | 48309 | 529040 | 8241 | 154519 | - | - | 2026-11-08 |
| module:MOD-03 lead | f7fce8bb | opus | 6 | 9466 | 1985943 | 8030 | 158385 | - | - | 2026-11-08 |
| module:MOD-08 build | f7fce8bb agent-aea0fbe8 | sonnet | 44 | 92689 | 1549261 | 40840 | 475031 | - | - | 2026-11-08 |
| module:MOD-08 lead | f7fce8bb | opus | 12 | 18248 | 4049573 | 13372 | 305847 | - | - | 2026-11-08 |
| module:MOD-09 build | f7fce8bb agent-a0cb276d | sonnet | 36 | 56620 | 916738 | 10097 | 212970 | - | - | 2026-11-08 |
| module:MOD-09 lead | f7fce8bb | opus | 6 | 12407 | 2074587 | 9117 | 174134 | - | - | 2026-11-08 |
| module:MOD-10 split build | f7fce8bb agent-a5a6e2fd | sonnet | 18 | 37521 | 335358 | 3994 | 100425 | - | - | 2026-11-08 |
| module:MOD-10 split lead | f7fce8bb | opus | 6 | 11953 | 2110464 | 8714 | 173005 | - | - | 2026-11-08 |
| module:MOD-13 build | f7fce8bb agent-a80b4a92 | sonnet | 26 | 47782 | 579239 | 9648 | 165917 | - | - | 2026-11-08 |
| module:MOD-13 lead | f7fce8bb | opus | 6 | 11474 | 2145614 | 8090 | 170685 | - | - | 2026-11-08 |
| module:MOD-17 build | f7fce8bb agent-a388fd48 | sonnet | 44 | 73255 | 1390482 | 23451 | 347916 | - | - | 2026-11-08 |
| module:MOD-17 lead | f7fce8bb | opus | 6 | 11151 | 2180357 | 8349 | 173071 | - | - | 2026-11-08 |
| module:MOD-22 second build | f7fce8bb agent-a1dcb318 | sonnet | 20 | 41736 | 400650 | 8079 | 132650 | - | - | 2026-11-08 |
| module:MOD-22 second lead | f7fce8bb | opus | 6 | 14282 | 2214719 | 8745 | 183031 | - | - | 2026-11-08 |
| module:MOD-24 build | f7fce8bb agent-a63ef042 | sonnet | 24 | 47886 | 519678 | 8367 | 153684 | - | - | 2026-11-08 |
| module:MOD-24 lead | f7fce8bb | opus | 6 | 9475 | 2252571 | 8187 | 172520 | - | - | 2026-11-08 |
| module:MOD-27 build | f7fce8bb agent-a65f9951 | sonnet | 40 | 85215 | 1271232 | 25316 | 360262 | - | - | 2026-11-08 |
| module:MOD-27 lead | f7fce8bb | opus | 6 | 11762 | 2285231 | 8397 | 179777 | - | - | 2026-11-08 |
| module:MOD-28 build | f7fce8bb agent-a68b53ba | sonnet | 22 | 57245 | 536047 | 9938 | 174873 | - | - | 2026-11-08 |
| module:MOD-28 lead | f7fce8bb | opus | 6 | 13594 | 2320396 | 8813 | 187279 | - | - | 2026-11-08 |
| module:MOD-30 build | f7fce8bb agent-ac8951a0 | sonnet | 20 | 49254 | 444512 | 8973 | 150904 | - | - | 2026-11-08 |
| module:MOD-30 lead | f7fce8bb | opus | 6 | 12204 | 2358010 | 8752 | 186074 | - | - | 2026-11-08 |
| module:MOD-31 build | f7fce8bb agent-adf19e2d | sonnet | 24 | 43649 | 509363 | 6661 | 138827 | - | - | 2026-11-08 |
| module:MOD-31 lead | f7fce8bb | opus | 6 | 9728 | 2393636 | 7995 | 179119 | - | - | 2026-11-08 |
| module:MOD-33 build | f7fce8bb agent-a103ebf3 | sonnet | 32 | 58620 | 797860 | 13792 | 222053 | - | - | 2026-11-08 |
| module:MOD-33 lead | f7fce8bb | opus | 14 | 13606 | 5694772 | 10310 | 363515 | - | - | 2026-11-08 |
| R1 lead: 15 held modules | f7fce8bb | opus | 2 | 2667 | 818544 | 2678 | 59653 | - | - | 2026-11-08 |
| module:MOD-04 build | f7fce8bb agent-af4a4260 | sonnet | 30 | 51370 | 683281 | 12140 | 193271 | - | - | 2026-11-08 |
| module:MOD-04 lead | f7fce8bb | opus | 22 | 19836 | 8293385 | 14746 | 528093 | - | - | 2026-11-08 |
| R1 lead: MOD-04, scorer pass | f7fce8bb | opus | 24 | 16333 | 10195524 | 10698 | 595956 | - | - | 2026-11-08 |
| k7:round-1 final | 44220f9f, c8bae6ca | opus | 326 | 468288 | 25349076 | 85767 | 2633191 | - | - | 2026-11-08 |
| R1 lead: K7 final, seal check | f7fce8bb | opus | 38 | 22289 | 16468647 | 12776 | 931928 | - | - | 2026-11-08 |
| R1 lead: seal approval recorded | f7fce8bb | opus | 20 | 22372 | 8922907 | 5674 | 519279 | - | - | 2026-11-08 |
| R1 lead: seal applied | f7fce8bb | opus | 14 | 12204 | 6343497 | 2562 | 354407 | - | - | 2026-11-08 |
| phase1:intake G-1 (R2) | e44ecb20 | opus | 74 | 236525 | 7078688 | 69691 | 1175513 | - | step-1-intake.md: declarations, inputs by hash, AE-c13..c28, CF-1..9 | 2026-11-08 |
| phase1:intake web-fetch (R2) | e44ecb20 agent-ad303c2a | haiku | 8 | 23758 | 22730 | 7240 | 68178 | - | Rapier determinism and loading docs; video oEmbed | 2026-11-08 |
| phase1:theoretical-design+base-case-reduction G-1 (R2) | e44ecb20 | opus | 8 | 37886 | 1165082 | 41385 | 340959 | - | step-2 (GX-40..52, theorem D) and step-3 (P-1..11, GBC-65..85); one row: both written before a row was taken | 2026-11-08 |
| phase1:minimal-worked-example G-1 (R2) | e44ecb20 | opus | 12 | 36645 | 2005959 | 30956 | 328380 | - | step-4 PASS WITH LATENT ASSUMPTIONS (LA-1..7); mwe/mwe_g1.py + mwe-results.json | 2026-11-08 |
| phase1:consistency-gate G-1 (R2) | e44ecb20 | opus | 12 | 19696 | 2200274 | 25025 | 274543 | - | step-5: I-1..8, AE protocol c13..c29, owner's 8 rulings live | 2026-11-08 |
| phase1:logic-stress-test G-1 (R2) | e44ecb20 | opus | 4 | 14263 | 768247 | 16205 | 147967 | - | step-6: S1 pass+strengthening, S2 fail (time base), S3 fail (population); stress/stress_g1.py | 2026-11-08 |
| phase1:implementation-specification G-1 (R2) | e44ecb20 | opus | 4 | 26643 | 798958 | 17172 | 179098 | - | step-7: X1..X10, SX-01..22, RX-1..8, SC-x1..6, EL-1..11, XP/XR, XV-01..10, XH-01..10, XPC-01..08, ODG-g5..g11 | 2026-11-08 |
| phase1:final-package adversarial pass (TE-6) G-1 (R2) | e44ecb20 agent-ac2e69c4 | opus | 80 | 214308 | 7446197 | 69930 | 989925 | - | 15 findings: 1 blocking, 8 major, 6 minor | 2026-11-08 |
| phase1:final-package G-1 (R2) | e44ecb20 | opus | 56 | 116864 | 12741366 | 91660 | 1329152 | - | 15 adversarial findings applied on the owner's directions; CLAUDE_TABLETOP_G1.md; S1-G1-final-package.md assembled | 2026-11-08 |
