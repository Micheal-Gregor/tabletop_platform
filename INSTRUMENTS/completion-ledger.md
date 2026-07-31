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

**K7-F2 round 2 (2026-07-25): RETURN (narrow — NEW-1 zero-option window).**
**K7-F2 round 3 (2026-07-25): PASS.** NEW-1 reconstructed and re-proven closed by the
reviewer's own mutation (MUT-N6 kills exactly the named test); OBS-A/B/C verified closed;
all F2 drift ≥ 7, teeth released; F3 slot may open. STANDING: V-2/V-3 discharge at the
owner's R gate → M9 + M3 re-enter K7 after (RD-1); packRef-mismatch refusal = F7; window
pruning + 'ended' = F5 (I-17).

**Compaction-control verification pass (2026-07-25, RD-15):** working tree clean · HEAD ≡
origin · CLAUDE.md ≡ frozen S3 copy · vectors/ empty of values · 76/76 · HK-6 green.
Row-status corrections (append-only; rows above stand as the historical claims): all five
F2 module rows — K7 **PASS round 3** (drift ≥ 7); F1 rows — K7 PASS round 2 + external
audit 1 PASS. F1·M3's original "after F2" V-1 wording is SUPERSEDED by I-14 (post-F5).
Still open by rule: M3 + M9 NOT-COMPLETE until V-2/V-3 discharge at the owner's R gate.

**EXTERNAL AUDIT round 2 (F2, 2026-07-25): RETURN** — report archived at
governance/audits/K7_AUDIT_REPORT-2.md. Five defects BOTH builder and internal K7 missed
(EXT2-1..5 + OBS closures in the drift ledger) — notably the NEW-1 SIBLING (single-
recursing-option brick) and the wirePack seal proven on one door of two: two closures
were narrower than their own claims. All closed; suite 85/85; builder re-ran the survivor
mutations (MP6, R2-1 guard) — killed. M8/M9 re-enter K7 with these closures; V-2/V-3
discharge remains queued at the owner's R gate behind the re-verify.

**EXTERNAL AUDIT round 2B re-verify (2026-07-25): PASS** — archived at
governance/audits/K7_AUDIT_REPORT-2B.md. All EXT2 closures reconstructed and
mutation-verified by the finding auditor; ZERO survivors; three probes beyond the
builder's tests (auto-target-recursing window, string-typed fx, gated:true presence) all
correct; forged-genesis refactor confirmed to preserve on-path R-17 falsifiability.
Re-scores: M8 5→8, M9 7→8; all F2 ≥ 7 — **teeth released, F2 CERTIFIED (internal K7 r3
+ external 2/2B)**. Carry-forwards unchanged: V-2/V-3 at the owner's R gate; F7 packRef
obligation.

**R-GATE DISCHARGE (2026-07-25, owner-approved):** V-2 + V-3 computed from the certified
implementation, persisted (vectors/V-2.json, V-3.json), re-derived — now live regression
anchors in the suite (87/87). M3 IntentLog and M9 EffectEngine: CC-5 satisfied-CLAIMED;
per RD-1 their completion confirmation is BOUND to the next K7 entry (the F3 review will
re-check CC-5 alongside its own scope). V-1 remains post-F5.

## F3 rows (opened at build slot 3)

| Module | CC-4 refusals | CC-5 vectors | CC-6 hooks | Status |
|---|---|---|---|---|
| ME1 KindRegistry | R-14 (claim) | — | — | BUILT — awaiting K7 |
| ME5 AdmissibilityGate | GBC-18 legs (claim) | **V-5 DEFERRED → blocks; dischargeable at the F3 R gate** | HK-7 (claim) | BUILT — awaiting K7 |
| ME2 RoleBinder | R-11 (claim) | — | — | BUILT — awaiting K7 |
| ME3 RelationEngine | R-12, R-13 (claims) | — | HK-8 (claim) | BUILT — awaiting K7 |
| ME4 SurfaceManager | GBC-23/24 (claims) | **V-6 DEFERRED → blocks; dischargeable at the F3 R gate** | — | BUILT — awaiting K7 |

**Builder note (2026-07-25):** F3 built instruments-first (GX-13..18, GBC-18..24,
I-20..I-23); suite 115/115; tsc clean; HK-6 green. Statuses are CLAIMS per RD-2. The F3
K7 entry ALSO carries the bound CC-5 re-check for M3/M9 (V-2/V-3 discharge, RD-1).
I-20 flags an upstream record question for the owner: "12 kinds" vs 11 named.

**K7-F3 rounds 1-3 (2026-07-25): RETURN → RETURN(narrow) → PASS.** 30 mutations across
three rounds, zero final survivors; all F3 drift ≥ 7, teeth released; F4 slot may open.
P13 characterized (raw Placement rows never denormalize — coherent; next-touch: refuse or
register, folded into SP-4). STANDING: V-5/V-6 at the owner's R gate (ME5/ME4 blocked by
rule); SP-4 + I-20 await the owner; onTurn dedup at next touch.

## F4 rows (opened at build slot 4)

| Module | CC-4 refusals | CC-5 vectors | CC-6 hooks | Status |
|---|---|---|---|---|
| MR1 RuleRegistry | R-16 rt, R-17 MR1, R-24 | V-7, V-8 FROZEN (R-gate discharge 3) | HK-9 full | **COMPLETE** (K7-F5 entry confirmed CC-5 per RD-1) |
| MR2 HookBus | — | — | S-4 consume (claim) | BUILT — awaiting K7 re-verify |
| MR3 ContributionLoader | R-15, R-16 static (claims) | — | HK-4 MR3 side (claim) | BUILT — awaiting K7 re-verify |
| MR4 StateSlotManager | R-18 (claim) | — | — | BUILT — awaiting K7 re-verify |
| MR5 ExtensionContract | GBC-31 (claim) | — | — | BUILT — awaiting K7 re-verify |
| MR6 RulesetView + vocabularies + wire | GBC-32 (claims) | — | — | BUILT — awaiting K7 re-verify |

**K7-F4 round 1 (2026-07-25): RETURN** — 3 blocking (D1 brick classes at the contribution
door; D2 order unproven; D3 activation unfalsifiable) + 2 major (unsealed register door;
prototype-keyed banks) + 6 further. All 11 closed (DF4-1..11; I-32); suite 160/160;
builder re-ran MUT-2/MUT-3 — killed. Awaiting K7 re-verify.

**K7-F4 round 2 (2026-07-25): PASS.** All 11 closures reconstructed live; MUT-2/MUT-3 +
6 new-guard mutants each die on exactly one named test; two survivors registered (I-32).
Conditions of record executed same-commit: DF4-12/NEW-2 (clone-first at all three doors +
getter regression) and I-32′. All F4 drift ≥ 7 — teeth released; **F5 slot may open**.
STANDING: V-7/V-8 at the owner's R gate (MR1 blocked by rule); MR1 completion binds to
the next K7 entry (RD-1).

**EXTERNAL AUDIT round 3 (F4, 2026-07-25): RETURN → closures landed.** Report archived at
governance/audits/K7_AUDIT_REPORT-3.md. Zero theater (14/14 guard mutations killed; the 4
predicted survivors matched I-32/I-32′ exactly), S5 boundary verified sound, docket seal
verified. Findings EXT3-A..D (all validation-door fidelity, none dispatch-law) closed at
both doors incl. the pre-existing F2 packloader sibling; suite 165/165. Awaiting the
external auditor's targeted re-verify (P1/P8 reconstruction) to clear MR3's teeth.

**EXTERNAL AUDIT round 3B (2026-07-25): RETURN(narrow) → closures landed → SIGNED OFF per
the auditor's own condition** ("add the pack-door falsifying test + close the two minor
residuals, then this can be signed off without another external round"). Report archived
(K7_AUDIT_REPORT-3B.md). All three 3B residuals closed with falsifying tests; suite
168/168. **F4 CERTIFIED (internal K7 r2 + external 3/3B).** MR3 7, MR4 8 per auditor
re-score. STANDING: V-7/V-8 at the owner's R gate.

**R-GATE DISCHARGE 3 (2026-07-25, owner-approved):** V-7 + V-8 computed, persisted,
re-derived — live anchors (170/170). Six of nine vectors now frozen. MR1: CC-5
satisfied-CLAIMED; confirmation binds to the next K7 entry (the F5 review). Remaining:
V-1 (post-F5) · V-4 (F7/BOTY pack) · V-9 (F6).

---

## F5 Mechanics Library (opened 2026-07-26 after R-gate discharge 3)

| Module | CC-4 refusals | CC-5 vectors | CC-6 hooks | Status |
|---|---|---|---|---|
| M13 Ledger | R-5 = GX-25 (claim: GBC-33) | — | — | BUILT — awaiting K7 |
| M10 Venture + M11 Routing | GX-26/27 legs (claims: GBC-34) | — | — | BUILT — awaiting K7 |
| M12a Outfit + M12b Crew | GX-28 legs (claims: GBC-35) | — | — | BUILT — awaiting K7 |
| M14 TimedEffects | GX-29 legs (claims: GBC-36/39) | — | — | BUILT — awaiting K7 |
| M15 ClosingRound | GX-30 gate (claim: GBC-38) | — | — | BUILT — awaiting K7 |
| library/wire (the weave, I-29) | R-6 through turn:end (K7 r1-r3 verified) | V-1 FROZEN (R-gate discharge 4) | HK-5 on turn:end proven (D2 divergence-injection) | **COMPLETE** (K7-F7 entry confirmed per RD-1) |

Statuses are CLAIMS (RD-1) — K7 confirms or returns. GBC-40 (the MINIMAL game,
Stage-2b S0..S10) passes end-to-end at build: A ends 0, B ends +3, B champion; every
ledger entry balanced; cash ≡ derived balances; rebuild ×2 byte-identical; off-turn
probe refused unlogged. Suite 181/181; HK-6 tier gate OK. V-1 is NOT pinned — it feeds
from GBC-40 and is discharged only at the owner's R gate. STANDING carried: MR1
completion confirmation binds to THIS K7 entry (RD-1, from R-gate discharge 3).

**K7-F5 round 1 (2026-07-26): RETURN** — 4 blocking (DF5-1 turn:pass weave-bypass on the
live path; DF5-2 brick values through the F5 doors; DF5-3 HK-5 theater on turn:end;
DF5-4 three weave legs unproven) + 2 major (DF5-5 unloaded-Ledger upkeep incoherence;
DF5-6 survivors P/F/O untested) + 3 moderate + 1 minor. Teeth engaged on M10/M11, M14,
library/wire (axiom 5s). All 10 closed same-day (DF5-1..10; I-37/I-38/I-39; kernel
supersession door added; phantom cites T2/T3/T6 excised): suite 198/198, tsc clean,
HK-6 OK; builder re-ran all 7 survivors (L2, M1, M3, M4, P, F, O) → each killed by a
named f5-k7-closures test. Auditor also CONFIRMED: MR1 CC-5 completion (RD-1 bound from
R-gate discharge 3 — the ledger records it here: **MR1 COMPLETE**), S5 boundary (R-24)
sound in F5, V-1 deferral law held. Awaiting K7 re-verify.

**K7-F5 round 2 (2026-07-26): RETURN(narrow) → closures landed.** All ten round-1
closures reconstructed live by the auditor (Probes 1-4 re-run; all 7 survivors killed by
named tests; new guards themselves mutation-falsifiable). One new blocking residual:
NEW-1 unknown-field NaN smuggling through the three persisting doors (the signature
"closure narrower than its claim" pattern — DF5-11). Closed both legs same-day: doors
refuse unknown keys (refusal-not-repair), modules construct stored rows from validated
named fields only; D9 falsifying tests per door. Minors NEW-2/3/4 closed (I-40 expected
survivors registered; empty-ground assertion; core row amended — DF5-12). M13/M12/M15
cleared teeth at r2. Suite 203/203; tsc clean; HK-6 OK. Awaiting K7 re-verify on NEW-1
(M10/M11, M14, library/wire teeth held at axiom 6 pending NEW-PROBE-5 reconstruction).

**K7-F5 round 3 (2026-07-26): PASS.** NEW-PROBE-5 reconstructed live at all doors (five
probes + direct-module depth beyond the builder's own test); 9 closure-mutants: 7 killed
by named tests, MF/MG survived as I-40(b)-class depth behind proven doors — closed
same-commit anyway per OBS-r3 (direct-call assertions in D9e; the doors no longer mask
the modules). Cumulative: 35 distinct mutants across three rounds, zero unregistered
survivors; Probes 1-5 closed; all four I-29 weave legs falsifiable; S5/R-24 sound; MR1
COMPLETE stands. **All F5 modules ≥ 7 on every dimension — teeth released. F5 CERTIFIED
(internal K7 r3).** STANDING by rule: library/wire NOT-COMPLETE until V-1 discharges at
the owner's R gate (feeds from GBC-40); after discharge, library/wire completion
confirmation binds to the next K7 entry (RD-1). F7 slot may open.

**R-GATE DISCHARGE 4 (2026-07-26, owner-approved):** V-1 computed from the single-source
fixture (computeV1 = the GBC-40 script through the same wireMinimal), persisted
(finalHash b773bf95ff085494, champion B at +3, 22 moves, full row), re-derived on the
full suite — a live anchor (204/204). The vector's rule stands independently of the pin
(SP-5): the Stage-2b script + the ranking law. SEVEN of nine vectors now frozen
(V-1/2/3/5/6/7/8). library/wire: CC-5 satisfied-CLAIMED; confirmation binds to the next
K7 entry (the F7 review) per RD-1 — the MR1 pattern. Remaining: V-4 (F7/BOTY pack) ·
V-9 (F6). **The F7 slot is open.**

**EXTERNAL AUDIT round 4 (F5): RETURN — AUDIT-SUBJECT MISMATCH, disposition recorded.**
The external auditor ran against a stale local clone (HEAD 2cea884, F4-era; never pulled
since external audit 3) and correctly refused to certify an absent increment — the right
behavior for the seat, wrong tree for the charge. Verified same-day from the build
environment: origin/main = 1114f1e; tags k7-pass-f5 (53af075) and resolution-run-4
(2eb46a9) live on the remote; the full F5 range 4985beb..2eb46a9 exists. ROOT CAUSE
(process, on the record): the audit charge omitted an explicit sync step — the builder's
"pull latest first" lived outside the paste-block. CORRECTIVE: every future external
charge BEGINS with `git fetch --tags && git pull` + HEAD/tag attestation BEFORE baseline.
Report archived (K7_AUDIT_REPORT-4.md). F5 external audit to be RE-ISSUED against the
true HEAD; K7-4-3 (audit reports untracked in the owner's worktree) is already satisfied
in the repo — governance/audits/ is committed; the owner's loose copies are working files.

**EXTERNAL AUDIT round 4B (F5, 2026-07-30): RETURN(narrow) → closures landed.** Report
archived (K7_AUDIT_REPORT-4B.md). Attestation step held (audited tree = b2fc773). The
auditor found the SEVENTH closure-narrower-than-claim: FA-1 — the spawn door's
deadline/work/party legs present and correct but unfalsifiable at BOTH doors (44 other
mutations killed; no state-breaking defect anywhere; S5, the weave, the supersession
door, and V-1 all independently verified sound — V-1 re-derived to b773bf95ff085494).
All four findings closed same-day (EXT4B-1..4): D10 falsifying door tests (deadline 0/
NaN/-1/1.5, work 0/NaN/-2/0.5, party GHOST — builder re-ran all three door deletions →
each killed); I-40(b) extended to the ventures module-door masking (FA-2); D11 out-of-
range + done-portion refusals (FA-3); D12 per-turn slot sweep on a non-wrapping turn:end
(FA-4). Suite 209/209; tsc clean; HK-6 OK. Awaiting the auditor's narrow re-verify
(FA-1 legs) to clear M10/M11 + library/wire base-case teeth.

**EXTERNAL AUDIT round 4C (F5, 2026-07-30): PASS — F5 EXTERNAL AUDIT SIGNED OFF.**
Report archived (K7_AUDIT_REPORT-4C.md). All four 4B findings independently re-verified
by live mutation (6/6 killed by the named D10/D11/D12 tests, zero survivors in scope);
I-40(b) extension confirmed accurate; M10/M11 and library/wire base-case 6→8 — teeth
released. **F5 now carries: internal K7 r3 PASS + external 4B/4C sign-off.** Combined
with tag k7-pass-f5 and R-gate discharge 4 (V-1 frozen), the F5 chapter closes. The F7
slot stands open per K7-F5 r3; library/wire completion confirmation still binds to the
F7 K7 entry (RD-1).

---

## F7 Edges & Content Tiers (opened 2026-07-30 after F5 certification + ODG-3 ruling)

| Module | CC-4 refusals | CC-5 vectors | CC-6 hooks | Status |
|---|---|---|---|---|
| M16 Transport (lockstep) | GX-31/32 legs (claims: GBC-41/42/43 — packRef legs NAMED; writer breach unlogged) | — | — | BUILT — awaiting K7 |
| M17 PatternLibrary | GX-33 legs (K7 r1-r3 verified) | V-4 FROZEN (R-gate discharge 5 — the full 24-entry catalog sweep) | — | **COMPLETE** (K7-BOTY entry confirmed per RD-1) |
| TierCriterion | R-4 (claim: GBC-45 — four injected inversions each FAIL naming the file; clean tree passes) | — | HK-6 (claim: falsifiable, not presence-of-script) | BUILT — awaiting K7 |

Statuses are CLAIMS (RD-1) — K7 confirms or returns. ODG-3 resolved on the record
(RESOLUTION_RECORD.md; I-41). Suite 230/230; tsc clean both packages; HK-6 OK.
STANDING carried: library/wire completion confirmation binds to THIS K7 entry (RD-1,
from R-gate discharge 4).

**K7-F7 round 1 (2026-07-30): RETURN** — 2 blocking (DF7-1 throwing-subscriber poison;
DF7-2 raw-intent alias at the fan-out — the kernel D-2 class at the transport door) +
2 moderate (DF7-3 content-branch theater under MUT-C3; DF7-4 'defaults' record drift) +
4 minor. 15/16 mutants killed at review; SUP-1 legs, writer discipline, and GX-33 build
refusals all proven falsifiable. Auditor CONFIRMED: library/wire completion (RD-1 bound
from R-gate discharge 4 — the ledger records it here: **library/wire COMPLETE**); V-4
deferral law held; tier law clean on the new code; catalog grounds verified against the
inventory. All 8 findings closed same-day (DF7-1..8; I-45 registered; I-42 extended;
GX-32/GX-33/RESOLUTION_RECORD corrected append-only; F7 section header added): sealed-
clone fan-out + per-listener containment/eviction + listenerFaults(); D1/D2/D7 falsifying
tests; bare-specifier content probe. Builder re-ran MUT-C3 + the D1/D2 reverts → each
killed by a named test. Suite 234/234; tsc clean; HK-6 OK. Awaiting K7 re-verify.

**K7-F7 round 2 (2026-07-30): RETURN(narrow) → closures landed.** All 8 round-1 closures
reconstructed live and CLOSED (6/6 round-2 mutants killed); TierCriterion and M17 clear
(8s across); library/wire COMPLETE stands. One narrow blocker: NEW-1 — the containment
catch crashed on `throw null` (the closure-narrower-than-claim signature, falsifying
I-45 as registered) + NEW-2 minor (fault entries aliased). Closed same-commit: safe
extraction (any thrown value), frozen fault rows, I-45 corrected append-only, falsifying
test legs (throw null / string-throw / corruption probe); builder re-ran both reverts →
each killed. Suite 236/236; tsc clean; HK-6 OK. Awaiting the narrow re-verify (NEW-1
probe + MUT-R1 against the extended D1).

**K7-F7 round 3 (2026-07-30): PASS — F7's internal K7 is complete.** All closures
reconstructed live over the full throw domain; 24 valid mutants across three rounds,
zero unregistered survivors; M16/M17/TierCriterion all ≥ 7 every dimension — teeth
released. **F7 CERTIFIED (internal K7 r3).** STANDING by rule: M17 NOT-COMPLETE until
V-4 discharges at the owner's R gate (I-44 — the GBC-44 floor grows to the FULL catalog
sweep at discharge); after discharge, M17 completion confirmation binds to the next K7
entry (RD-1). Remaining vectors: V-4 (F7 R gate) · V-9 (F6). The F6 slot may open.

**R-GATE DISCHARGE 5 (2026-07-30, owner-approved):** V-4 computed as the FULL catalog
sweep (I-44): all 6 VNT spawned through the engine (routed opens its gated routing
window, job runs RC-A′ end-to-end to its receivable), 3 RTM fragments + subcontract-debt
driven through venture:route, all 9 IWN kinds opened engine-gated, both TFX scopes
ticked at the wrap (table charges both, modifier charges one outfit), closing defaults +
family counts — 24 entries, persisted, re-derived on the full suite (237/237). The laws
stand independently of the pin (SP-5/VK-8). EIGHT of nine vectors frozen. M17: CC-5
satisfied-CLAIMED; confirmation binds to the next K7 entry (the F6/BOTY review) per
RD-1. Remaining: V-9 (F6). **The BOTY pack + F6 slots are open.**

---

## Content — packs/boty (opened 2026-07-30 after R-gate discharge 5 + ODG-4 scope ruling)

| Module | CC-4 refusals | CC-5 vectors | CC-6 hooks | Status |
|---|---|---|---|---|
| BOTY pack + genesis | GBC-46 (K7-BOTY verified: MUT-1/3 killed) | — | — | VERIFIED (K7-BOTY PASS) |
| BOTY slice game | GBC-47 (K7-BOTY verified: reconciliation hand-confirmed; MUT-4/6 killed, MUT-5 closed at D3) | — (content owns no vector; V-4 anchors the presets it consumes) | — | VERIFIED (K7-BOTY PASS) |

Statuses are CLAIMS (RD-1). Content adds NO law: 8 cards ⊆ EFX v1.1.1, contributions
through the MR3 door, presets consumed as data, tier gate clean (content imports
downward only; nothing imports content). Suite 239/239 (vitest now includes
packs/*/tests); tsc clean (engine, patterns, boty); HK-6 OK. STANDING carried: M17
completion confirmation binds to THIS K7 entry (RD-1, from R-gate discharge 5).

**K7-BOTY round 1 (2026-07-30): PASS.** Content adds no law — proven by mutation, not
presence: EFX/MR3/venture/tfx/route doors all refused genuine poison on the real paths
(MUT-1/3/4/6 killed; P1-P4 probes held); I-46a reconciliation independently hand-walked
and confirmed exact; tier gate clean and falsifiable; SUP-1 legs named via Transport.
Auditor CONFIRMED M17 completion per RD-1 (the ledger records it here: **M17 COMPLETE**).
Five non-blocking findings (D1 phantom paths; D2 door-call theater; D3 deck-order
survivor MUT-5; D4 vacuous assertion; D5 ci gap) — all closed same-day: paths corrected,
comment rectified, drawn-card identity asserted (MUT-5 now dies), poisoned-contribution
probe replaces the length check, ci typechecks the pack. Content rows → VERIFIED.
Suite 239/239; full ci green. **The BOTY slice is CERTIFIED. The F6 slot is open.**

---

## F6 Presentation (opened 2026-07-30 after BOTY certification; ODG-p1 completed by owner ruling)

| Module | CC-4 refusals | CC-5 vectors | CC-6 hooks | Status |
|---|---|---|---|---|
| MP5 SeatProjector + MP6 Unboxer | R-19 (claims: GBC-48 — raw state refused; redaction; validated reveal) | — | HK-10 (claim: brand door on the real render path) | BUILT — awaiting K7 |
| MP3 IntentEmitter | R-23 (claims: GBC-50 — closed map; non-intent refused; engine accepts emissions) | — | — | BUILT — awaiting K7 |
| MP4 SkinBinder + D-1 Placeholder | R-21, R-22 (claims: GBC-49 — missing named; raw values incl. filenames/colors/paths refused; placeholder complete) | — | HK-12 (claim) | BUILT — awaiting K7 |
| MP1/MP2/MP7 Renderers | GBC-52 (claims: tokens-only; a11y floor 0; booklet total exposure) | — | — | BUILT — awaiting K7 |
| MP8 TheaterSync + D-2 flourishes | R-20 (claims: GBC-51 — mismatch FLAGGED, truth wins; captions self-remove) | **V-9 DEFERRED → blocks; dischargeable at the F6 R gate** | HK-11 (claim) | BUILT — NOT-COMPLETE by rule |
| MP9 ClockDriver + A11y | GBC-53 (claims: two clocks; timeline touches no state byte) | — | — | BUILT — awaiting K7 |

Statuses are CLAIMS (RD-1). ODG-p1 completed on the record (headless + SVG strings,
I-47); D-1/D-2 doctrines realized as ratified; ODG-e1 stays OPEN. GBC-54 (die-tile-page)
passes at build — feeds V-9, pinned only at the owner's R gate. Suite 251/251; tsc clean
×3; HK-6 OK.

**K7-F6 round 1 (2026-07-30): RETURN** — 2 blocking (DF6-1 shallow emission door: nested
functions/thenables crossed the seam and detonated untyped — GX-37 breached + M7
survivor; DF6-2 vacuous a11y floor — M8 survivor) + 1 moderate (DF6-3 EP-1′ /
fidelity-min-formula silence) + 3 minor. 14/16 mutants killed at review; the
projection/redaction core, skin law, theater law, two clocks, and S-6 seam all passed
adversarial testing outright. All findings closed same-day: DEEP pure-data door
(structuredClone round-trip → typed refusal; the clone also severs args aliasing) with
poisoned-args tests; a11y negative cases; EP-1′/fidelity terms ruled UNRECOVERABLE from
the record → routed upstream as SP-6 (F-backflow), N/A-BY-UNRECOVERABILITY stated,
"labels split" corrected; D-2 flourish-home record corrected; I-48 registered; row
fixes; dead VERB_NAMES export removed. Builder re-ran M7/M8 → each killed by a named
test. Suite 252/252; tsc clean ×3; HK-6 OK. Awaiting K7 re-verify.
