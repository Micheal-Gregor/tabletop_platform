# Completion Ledger — TABLETOP build

A module is COMPLETE only when every applicable box is checked (S3 §6 checklist).
Deferred-undischarged vectors block completion BY RULE. K7 confirms or returns — builder
statuses are claims.

| Module | CC-1 trace | CC-2 rules | CC-3 fidelity | CC-4 refusals | CC-5 vectors | CC-6 hooks | Status |
|---|---|---|---|---|---|---|---|
| kernel/types | claimed | claimed | claimed (I-1/I-2 registered) | n/a (no guard) | n/a | n/a | BUILT — awaiting K7 |
| M1 StateTree | claimed | claimed | claimed | R-10 passing (claim) | — | — | BUILT — awaiting K7 |
| M2 Guard | claimed | claimed | claimed | R-1 passing (claim) | — | — | BUILT — awaiting K7 |
| M3 IntentLog | claimed | claimed | claimed | R-9 passing (claim) | **V-1, V-2 DEFERRED-UNDISCHARGED → NOT-COMPLETE by rule** (dischargeable only after F2 exists to run the MINIMAL game) | HK-2 (claim) | BUILT — blocked on V-1/V-2 |
| M4 RNGStreams | claimed | claimed | claimed (I-4 algorithm registered) | — (GBC-6/7 passing, claim) | — | — | BUILT — awaiting K7 |
| kernel/core | claimed | claimed | claimed | R-1/R-9/R-10 orchestration (claim) | — | HK-1/HK-2 divergence-injection passing (claim) | BUILT — awaiting K7 |

**Builder note (audit, 2026-07-25):** 18/18 tests green, tsc clean, HK-6 CI green. All
statuses above are CLAIMS per RD-2 — K7 falsifies or confirms. No F2 work begins until K7
passes F1 (build-order discipline + the drift teeth).

**K7 round 1 (2026-07-25): RETURN.** Falsified claims: "HK-1/HK-2 divergence-injection
passing" (HK-1 leg false — mutation A survived); Guard's CC-3 claim (unregistered seats
schema). D-1..D-7 closed by builder; suite now 24/24 (aliasing tamper-stability, I-7
row-seat tests, K7-recipe HK-1 on-path injection added). Statuses remain CLAIMS —
awaiting K7 re-verify with mutations A–E re-run.
