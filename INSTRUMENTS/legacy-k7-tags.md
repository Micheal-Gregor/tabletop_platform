# Legacy K7 tags — the 36 `k7-pass-*` tags that predate the K7 runner

*R1 (2026-11-08, I-261). `phase4-checks.py tags` reads every `k7-pass-*` tag as `k7-pass-<N>` with a verdict file
`INSTRUMENTS/k7-verdict-<N>.json` whose `reviewed.tree_sha` equals the tagged tree. These 36 tags were placed between
25 Jul and 4 Aug 2026, before the plugin template and its `tools/k7-run.py` existed (the earliest plugin release the
README logs is 2.2.0, 11 Oct). Their reviews were run as fresh sessions or sub-agents with no builder context, under
the hand-copied roster v0.2, and recorded in prose: the drift ledger's Log and register rows, the completion ledger,
`governance/audits/`, and each tagged commit's message. So the check reports each as `tag_malformed`: none has a
numeric suffix, and none has a schema verdict file to match.*

**Accounting.** Each tag is kept as placed. RD-11: closed gates stay closed, and a tag is never voided or moved;
renaming one would rewrite the record it marks. Nothing is re-reviewed for them: R1's final review
(`k7-run.py --final`) reviews every module in full, and the seal's `reviewed` and `full-review` steps read that
round's verdict file, not these tags. The `tags` check's 36 findings therefore stand as known issues for the owner's
seal approval, each accounted for below. The library's facet certifications (`k7-pass-f1`..`f7`, `k7-pass-boty`,
`k7-pass-layout`) cover code R1 then repaired; the 3D programme's tags cover the bench, which stopped unsealed
(I-260) and is not library code.

| Tag | Commit | Date | Scope | What the tagged commit records |
|---|---|---|---|---|
| `k7-pass-f1` | `f55f310` | 2026-07-25 | library (packages/, packs/boty) | K7 round 2: PASS — mutations A-H re-run, probes reconstructed live; all drift >=7, teeth released; obs-1..3 registered; M3 held NOT-COMPL… |
| `k7-pass-f2` | `8493a59` | 2026-07-25 | library (packages/, packs/boty) | K7-F2 round 3: PASS — NEW-1 re-proven closed by reviewer mutation; all F2 drift >=7, teeth released; V-2/V-3 queued at the R gate |
| `k7-pass-f3` | `64d156e` | 2026-07-26 | library (packages/, packs/boty) | K7-F3 round 3: PASS — P11/P12 re-proven closed, zero survivors across 30 mutations; all F3 drift >=7; P13 characterized into SP-4's orbit |
| `k7-pass-f4` | `d21566c` | 2026-07-26 | library (packages/, packs/boty) | K7-F4 round 2: PASS — conditions of record executed (NEW-2 clone-first at all three doors + getter regression; I-32' expected-survivors);… |
| `k7-pass-f5` | `53af075` | 2026-07-26 | library (packages/, packs/boty) | K7-F5 round 3: PASS — teeth released; OBS-r3 closed same-commit |
| `k7-pass-f7` | `b095606` | 2026-07-31 | library (packages/, packs/boty) | K7-F7 round 3: PASS — F7 certified, teeth released |
| `k7-pass-boty` | `39955c3` | 2026-07-31 | library (packages/, packs/boty) | K7-BOTY: PASS — first content pack certified; D1-D5 closed; M17 COMPLETE |
| `k7-pass-f6` | `96af48f` | 2026-07-31 | library (packages/, packs/boty) | K7-F6 round 2: PASS — F6 certified; all seven facets + BOTY certified |
| `k7-pass-layout` | `6f3e207` | 2026-07-31 | library (packages/, packs/boty) | K7-L: PASS — layout contracts certified |
| `k7-pass-v1x` | `e7e3765` | 2026-07-31 | library (packages/, packs/boty) | K7-v1x re-verify PASS: two minors closed, ledgers sealed |
| `k7-pass-parity` | `7742711` | 2026-08-02 | library (packages/, packs/boty) | K7-parity re-verify PASS + obs closures: GD drill rename, filter rule live-exercised |
| `k7-pass-books` | `ee4232f` | 2026-08-02 | library (packages/, packs/boty) | K7-books re-verify PASS: R1 recorded with trigger, R2/R3 folded; ledger sealed |
| `k7-pass-visual-gate` | `7241873` | 2026-08-02 | bench / 3D programme (utilization/) | K7-vg D5 closure: strike-4 wording fixed with the I-58 grep-falsify pass on the record |
| `k7-pass-maturity` | `64aadef` | 2026-08-02 | bench / 3D programme (utilization/) | Arc step 3 SEALED: K7-v7 PASS — completion ledger + strike-8 fold into the I-58 home row |
| `k7-pass-3d-adoption` | `208c8d0` | 2026-08-02 | bench / 3D programme (utilization/) | Arc step 4 SEALED: k7-pass-3d-adoption — Phase A opens (roadmap A1) |
| `k7-pass-a1b-read` | `be5b43a` | 2026-08-02 | bench / 3D programme (utilization/) | roadmap ledger: A1b K7 PASS (k7-pass-a1b-read) |
| `k7-pass-a1c-stage` | `b008050` | 2026-08-02 | bench / 3D programme (utilization/) | K7-A1c' closure: shortest-arc falsified for real; false survivor record superseded |
| `k7-pass-a1d-ladder` | `34da5fa` | 2026-08-02 | bench / 3D programme (utilization/) | K7-A1d closure (D1-D5): region-read leg falsified, register hygiene |
| `k7-pass-a2-deck` | `a4740f7` | 2026-08-03 | bench / 3D programme (utilization/) | K7-A2 D7 closure: the one-theater falsifier made deterministic; false kill record superseded |
| `k7-pass-a2b-stack` | `b1bda05` | 2026-08-03 | bench / 3D programme (utilization/) | A2b: cards are thin boxes - the pile has physical height (owner: 'decks not visible') |
| `k7-pass-a3-fortune` | `b839d26` | 2026-08-02 | bench / 3D programme (utilization/) | A3: the fortune card in 3D — reading board shows boty:fortune-card anatomy (I-69) |
| `k7-pass-a3b-opaque` | `f938500` | 2026-08-03 | bench / 3D programme (utilization/) | A3b: the reading card renders opaque over the veil (I-70) |
| `k7-pass-split` | `a3aa802` | 2026-08-03 | bench / 3D programme (utilization/) | refactor: split game3d.ts into bench-local modules (I-71) |
| `k7-pass-a15-box` | `bcdd9c4` | 2026-08-03 | bench / 3D programme (utilization/) | A15: the game box — open, lid off, static, right of the board (I-75) |
| `k7-pass-a4-die` | `6eee282` | 2026-08-03 | bench / 3D programme (utilization/) | A4: round preamble + round card + a seeded rolling EXHIBIT die (I-73) |
| `k7-pass-a10-ledger` | `e17053a` | 2026-08-03 | bench / 3D programme (utilization/) | A10: the books ledger in 3D — flat book flips open to the Balance Sheet (I-74) |
| `k7-pass-ka-harness` | `0b37bcd` | 2026-08-03 | bench / 3D programme (utilization/) | K-A: drop-in Component architecture — spine → registry-driven harness (I-77) |
| `k7-pass-kb-gate` | `b16b61f` | 2026-08-03 | bench / 3D programme (utilization/) | K-B: split the visual gate + land the size gate (I-78) |
| `k7-pass-kc-books` | `9297bff` | 2026-08-03 | bench / 3D programme (utilization/) | K-C: books — two-page ledger (P&L left, Balance right), read-mode + switch (I-79) |
| `k7-pass-kd-box` | `b27b823` | 2026-08-03 | bench / 3D programme (utilization/) | K-D: box — right of the table, >=1/4-table, open base + lipped bottomless lid (I-80) |
| `k7-pass-ke-dice` | `249dc4b` | 2026-08-03 | bench / 3D programme (utilization/) | K-E: dice — free to tumble the whole table, not caged to a square (I-81) |
| `k7-pass-p1-dice` | `bfa5612` | 2026-08-03 | bench / 3D programme (utilization/) | P-1: dice half-size + dice-region HOME + return-home glide (I-83; K7-P D3/D5 closed) |
| `k7-pass-p2-ledger` | `677d1c5` | 2026-08-03 | bench / 3D programme (utilization/) | P-2/P-2b/P-2c: ledger folder — anchor-per-report + folded-sheet form + THE THREE-OBJECTS LAW (I-84/85/86; owner-sealed; K7-P D1/D2/D6/D9 … |
| `k7-pass-g1` | `eedbd08` | 2026-08-03 | bench / 3D programme (utilization/) | G-1b: the VG8a count law catches up with P-2c's persistent sheets (I-102) |
| `k7-pass-s1` | `747f062` | 2026-08-03 | bench / 3D programme (utilization/) | S-1b: the five dropped gate keys restored + the gate-surface guard (I-104) |
| `k7-pass-r1a` | `8e44c9c` | 2026-08-04 | bench / 3D programme (utilization/) | R-1a6c: the ONE-FRAME fix — the M4 class again, across two planes (I-117) |
