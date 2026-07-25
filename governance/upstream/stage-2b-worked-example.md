# Stage 2b — Minimal Worked Example · Game Platform Core (TABLETOP)

*Object under test: the Stage 2 primitive set as ruled (RC-A amended package + RC-B..RC-G
all VALID, 2026-07-24). Hard constraints honored: no new theory, no generalization, no AE
resolved; the smallest instance that exercises every primitive.*

## 1 · Approved Primitive Set (restated, unmodified)

**Platform:** P1 CMP Component · P2 TM5 TurnMachine · P3 GRD Guard/refusal · P4 ST
StateTree · P5 RNG RNGStream · P6 LOG MoveLog/replay · P7 INT IntentSet · P8 DCK Deck ·
P9 CPK ContentPack · P10 TRN Transport *(membership pending, in-model)*.
**Library:** P11 OUT Outfit · P12 CRW Crew · P13 VNT Venture *(sole contract-shaped
primitive; Job = single-portion preset per RC-A′)* · P14 RTM Routing · P15 IWN
InteractionWindow · P16 LGR ResourceLedger *(membership pending)* · P17 EVT
EventResolution · P18 TFX TimedEffect · P19 RCK Reckoning *(membership pending)*.
**Contextual:** MEM StrataCriterion. **Carried (not under test):** CRL (E-1), PRS (E-2) —
proven-open interfaces, exercised by no step (correct: they have no interior to exercise).

## 2 · Selection Rationale — the minimal instance

**"MINIMAL" pack: two seats, two rounds, three cards, one die.** Seats A (role α) and B
(role β), each an Outfit with one Crew member and a two-card personal deck dealt from the
pack; max_turns = 2. Cards: **K1** a single-portion venture (the RC-A′ degenerate: value 4,
work 1, deadline round 2); **K2** a venture requiring role β (forces routing); **K3** a
table-scope TimedEffect (levy 1, duration 1 round).

*Why minimal:* one seat cannot exercise RTM (routing needs a counterparty), the cross-seat
debt web, or RCK's ranking — so two seats is the floor. Two rounds is the floor for a
round-wrap tick AND a deadline that can pass. Three cards is the floor to fire VNT in both
its degenerate and general forms plus one TFX through EVT. *What it does not exercise, and
why acceptable at base case:* living-deck injection, scripted decks, commission-now routing,
outfit-scope TFX, IWN auto-policy, elimination/estate — capabilities within primitives, not
primitives; each is content-reachable over the same set (verified in §3 notes) and lands in
the Stage-4/6 test obligations. AEs affecting selection: AE-c9/c10 (LGR/TRN membership
pending) — both primitives are *exercised* without resolving their membership (annotated).

## 3 · Step-by-Step Worked Execution (PD = 1.0 asserted per step; TM updated per step)

- **S0 Setup** — CPK loads MINIMAL, validates, expands; CMP instantiates the box (2 player
  boards, cards, die); ST built as one tree; RNG streams derived (seed σ=7: per-seat decks
  σ+1/σ+2, die σ+3); DCK shuffles both decks; LOG opens. *(CPK, CMP, ST, RNG, DCK, LOG ✓)*
- **S1 A·upkeep** — TM5 enters round 1/seat A; LGR posts A's overhead (−1) as a balanced
  entry (wages). *(TM5, LGR ✓)*
- **S2 A·draw** — A draws K2; EVT dispatches: venture requires role β → RTM with
  decision-timing=windowed → **IWN opens** (kind=routing, decider=A). *(DCK, EVT, RTM, IWN ✓)*
- **S3 A·decide** — A resolves the window: route to B, consideration=debt-carried → VNT-2
  created (initiator A, portion→(B, task β, funded-by-A-debt), deadline r2, payoff:
  receivable-to-B on complete + A's payable settles); window closes; advance unblocked.
  *(IWN apply, VNT general form, the cross-seat debt web ✓)*
- **S4 GRD negative probe** — B attempts an intent on A's turn → **REFUSED** (typed), ST
  byte-unchanged, intent NOT logged (log-after-success). *(GRD, LOG discipline ✓)*
- **S5 A·end → B·turn** — TM5 advances; B upkeep (LGR −1); B draws K3 → EVT → **TFX**
  (table levy 1, duration 1) attaches to ST. B assigns Crew-B to VNT-2's portion (CRW
  one-portion-at-a-time honored); progress burns work 1→0 — **portion complete → VNT-2
  all-complete** → payoff: Receivable(source=VNT-2, 3)→B (RC-E shape); A's carried payable
  due r2. *(TFX, EVT, CRW, VNT completion, LGR accrual ✓)*
- **S6 Round wrap** — TM5 wraps to round 2 **exactly once**; TFX ticks: levy charges A −1
  and B −1 (balanced posts), duration expires, TFX removed. *(TM5 wrap, TFX lifecycle ✓)*
- **S7 A·turn r2** — upkeep: A's payable to B settles (A −2 / B +2, cross-seat balanced
  pair); A draws K1 → EVT → **VNT-1 (single-portion preset — RC-A′ degenerate)**; A assigns
  Crew-A; work 1→0 → complete → Receivable(4)→A. *(VNT degenerate form, RTM-b unneeded ✓)*
- **S8 B·turn r2** — B upkeep; B's deck holds no third card (draw yields none — legal);
  B passes. *(TM5 pass path ✓)*
- **S9 End of game** — turn > max_turns with survivors → **RCK**: order fixed
  (trailing-first), no restricted moves taken, close-books force-collects both
  receivables; results rank by cash. Ledger check: every entry balanced; final cash =
  derived account balances (RC-D). A: −1−1−2+4 = 0… B: −1+3−1+2 = +3 → **B is champion**.
  *(RCK, LGR derivation ✓)*
- **S10 Replay** — a second client rebuilds from (σ, seats, LOG) → **byte-identical ST**;
  the refused S4 intent is absent from the log, replay unaffected. *(LOG, TRN-minimal ✓ —
  TRN's shared-row/host machinery stipulated, see L3)*

Every primitive invoked ≥ once: CMP S0 · TM5 S1/S5/S6/S8 · GRD S4 · ST S0/S4/S10 · RNG S0 ·
LOG S0/S4/S10 · INT throughout (every step is a logged intent) · DCK S0/S2/S5/S8 · CPK S0 ·
TRN S10 · OUT S1..S9 · CRW S5/S7 · VNT S3/S5/S7 (general AND degenerate) · RTM S2/S3 ·
IWN S2/S3 · LGR S1/S5/S6/S7/S9 · EVT S2/S5/S7 · TFX S5/S6 · RCK S9 · MEM S0 (the pack was
classified against it). PD = 1.0 at every step; no failure flagged.

## 4 · Assumption Exposure Log

| Assumption | Belongs to | Class |
|---|---|---|
| A-2b-01 Two seats is the minimal exercising instance | RTM/RCK | benign (argued §2) |
| A-2b-02 Human die/decisions stipulated as arguments | RNG/AX-3 | benign (the pinned path) |
| **A-2b-03 Payoff/penalty distributions execute via the EffectDescriptor vocabulary ("pay") — the dependency surfaces even at base case** | VNT/ODG-2 | **latent (logged → Stage 2 log)** |
| **A-2b-04 IWN auto-policy (AI/absent decider) assumed well-defined; unexercised (both seats human)** | IWN | **latent (logged)** |
| **A-2b-05 TRN exercised only as replay-equality; shared-row, host-election, presence machinery stipulated** | TRN/AE-c10 | **latent (logged)** |

No conflicting assumptions.

## 5 · AmbiguityElement Status (no AE resolved; status only)

Encountered-annotating: AE-c1 (log-as-truth exercised, S10) · AE-c9 (LGR exercised while
membership pending, S1/S9) · AE-c10 (TRN minimal form only, S10 → A-2b-05). Not
encountered: AE-c2..c8, c11, c12 (strict rotation used), c13 (no elimination). None blocked.

## 6 · Traceability Update (chain intact, no breaks)

Every primitive: Stage 2 definition → 2b step(s) (§3) → Stage 1 object (P1→O2 … P19→O25;
VNT→O14–O18 via the RC-A/RC-A′ merge record; TFX→O23+O24 via RC-G) → Stage 0 object scan →
owner concept (§9 reframe / inventory). Merged originals reachable as presets: PRJ/CVC/
RTD/INC/EXP/Job → VNT presets (VNT's two exercised forms bracket the preset family);
MOD/GLB → TFX(scope). Backward and forward links verified for all 19 + MEM.

## 7 · Pass / Fail Determination

**PASS WITH LATENT ASSUMPTIONS.** The reduced primitive set operates correctly on the
minimal instance: all steps completed, PD = 1.0 throughout, refusal path proven inert to
state and log, replay byte-identical, the Venture primitive verified in BOTH its general
(multi-party, routed, debt-carried) and degenerate (single-portion job) forms, the
cross-seat debt web — the proven "main event" — surviving the compression intact. Three
latent assumptions (A-2b-03/04/05) added to the Stage 2 Assumption Log; none blocks.
Proceed to Quality Gate 1 with the updated log.

## 8 · Stage 2b Quality Check

Instance genuinely minimal (floor argued per dimension) ✓ · every primitive invoked ✓ · no
new primitives/axioms/objects introduced ✓ · no AE resolved ✓ · assumptions classified and
routed ✓ · traceability intact Stage 2 ↔ 2b ✓ · determination explicit with justification ✓.

## 9 · User Approval Request

Determination: **PASS WITH LATENT ASSUMPTIONS** (three, logged, non-blocking — the
EffectDescriptor dependency, the IWN auto-policy, and Transport's stipulated machinery).
This is a load-bearing gate. Review the exposed assumptions and approve to proceed to
**Quality Gate 1** (consistency audit + the AE Resolution Protocol, where all 13 carried
AEs get forced dispositions)?
