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

**Builder note (audit, 2026-07-25):** 18/18 tests green *(round-1 count, superseded —
now 28/28 after K7 round-2 + external-audit closures; EA-3)*, tsc clean, HK-6 CI green. All
statuses above are CLAIMS per RD-2 — K7 falsifies or confirms. No F2 work begins until K7
passes F1 (build-order discipline + the drift teeth).

**K7 round 1 (2026-07-25): RETURN.** Falsified claims: "HK-1/HK-2 divergence-injection
passing" (HK-1 leg false — mutation A survived); Guard's CC-3 claim (unregistered seats
schema). D-1..D-7 closed by builder; suite now 24/24 (aliasing tamper-stability, I-7
row-seat tests, K7-recipe HK-1 on-path injection added). Statuses remain CLAIMS —
awaiting K7 re-verify with mutations A–E re-run.

## F2 rows (opened at build slot 2)

| Module | CC-1 trace | CC-2 rules | CC-3 fidelity | CC-4 refusals | CC-5 vectors | CC-6 hooks | Status |
|---|---|---|---|---|---|---|---|
| M9 EffectEngine | claimed | claimed (GX-7/11) | claimed (I-11/I-13) | R-3, R-24 struct, R-17 eng (claims) | **V-3 DEFERRED → blocks; dischargeable at the F2 R gate** | HK-9 M9-side (claim) | BUILT — awaiting K7 |
| M7 WindowManager | claimed | claimed (GX-8) | claimed (I-12) | R-6, R-7 (claims) | — | HK-5 (claim) | BUILT — awaiting K7 |
| M5 TurnMachine | claimed | claimed (GX-9) | claimed (I-9/I-12) | R-8 (claim) | — | HK-3 (claim) | BUILT — awaiting K7 |
| M6 Deck | claimed | claimed (GX-12) | claimed | — (GBC-14 claims) | — | — | BUILT — awaiting K7 |
| M8 PackLoader | claimed | claimed (GX-10) | claimed (I-10) | R-2 (claim) | — | HK-4 M8-side (claim) | BUILT — awaiting K7 |
| M3 (F1, revisited) | — | — | — | — | **V-2 dischargeable at the F2 R gate; V-1 corrected to post-F5 (I-14)** | — | blocked on vectors |

**Builder note (2026-07-25):** F2 built instruments-first; suite 61/61; tsc clean; HK-6
green. All statuses CLAIMS per RD-2 — K7 falsifies or confirms. Vector computation (V-2,
V-3) is LOAD-BEARING and waits for the owner's R gate after K7.

**K7-F2 round 1 (2026-07-25): RETURN** — 5 blocking (two theater hooks MUT-2/MUT-4; auto-path
depth MUT-13; HK-4 schema leg / NaN commit; nonexistent-decider deadlock) + 10 further.
All 15 closed (DF2-1..15 in the drift ledger; I-15..I-18, I-8′ registered); suite 75/75;
builder re-ran MUT-2/MUT-4/MUT-13 — all killed by named tests. Statuses remain CLAIMS —
awaiting K7 re-verify.
