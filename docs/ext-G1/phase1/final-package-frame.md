# S1 · TABLETOP Extension G-1 — Final Kickoff Package (Phase 1)

*Assembled by `assemble_package.py` from this frame and the approved step files; sections 2 to 7 and 12 are those files
carried whole, headings shifted down two levels. Run R2, 2026-11-08. Library sealed at `seal-1` (`fca9e10`).*

## 1. Executive summary

- **Original concept.** Gap G-1 (`ui/gaps.md`, `ready` on the owner's word, 2026-11-09): throw a die or flick a spinner
  and the result is the move, with physics deciding the outcome (I-260, reversing I-82(e)), reusing Rapier's
  deterministic WASM build.
- **Refined purpose.** A Die's face and a Spinner's sector are decided by a deterministic simulation of the seat's
  logged integer input, jittered symmetrically by one seeded draw, on a pinned build, in a fresh world at a fixed step;
  refused, never repaired, when the throw does not settle cleanly; replayed bit-for-bit from (seed, seats, log); fair by
  measurement, with every number's source stated.
- **Key theoretical objects.** 22, under axioms GX-40 to GX-52 (step 2): the pin, the preset, the input, the start
  pose, the jitter, the roll, the outcome reader, the settle record, the snapshot hash and replay check, the trajectory,
  the dyno in two claims, provenance and the dataset, the closed-form oracle.
- **Base primitive set.** P-1 to P-11 (step 3 §5). No object removed; three removal candidates failed their tautology
  tests. Base cases GBC-65 to GBC-87, refusals first.
- **Minimal Worked Example.** **PASS WITH LATENT ASSUMPTIONS**, approved by the owner ("Approve, go on"). G-1's own
  example re-derives exactly; an applier-decided refusal left unlogged makes replay diverge (same sector, a different
  rest angle and hash; first misstated as "sector 3 against 0", corrected after the adversarial pass); five latent
  assumptions added to the reduction's log.
- **Determinism, proved rather than assumed.** Theorem D (step 2 §8) derives bit-identical outcomes and hashes from the
  pinned build, integer inputs, basic-operation starting values, a fixed step and a fresh world, given Rapier's own
  per-version claim (cited, external), and shows each condition necessary by a counterexample. The snapshot hash makes a
  failure loud; the cross-platform vector XV-03 is the test that discharges it.
- **The owner's rulings at the Consistency Gate.** Refused rolls are logged; the engine loads before hosting; each roll
  starts where the component last rested; I-260 supersedes the S1 v2.0 do-not's first half for the Die and the Spinner,
  and "seeded result" reads "engine-decided"; the rest pose lives in a settle record (no sealed kind changes); a roll's
  write is its own mutation, not an effect; the jitter is symmetric; the die refusals no-tumble and escaped, the die's
  admission rule, and the footage rule are adopted.
- **Logic Stress-Test.** All three scenarios failed and were corrected: the spinner's floor becomes integer preset data
  tested on the input before the draw, so no refusal can select on the jitter (first recorded as a pass; the
  adversarial pass showed an aimer reaching 8 × fair through re-spins); a slow-motion clip's time base must be verified
  in frame, with a time-dependent held-out check; a preset is admitted for play only on the measured population.
- **The independent adversarial pass (TE-6).** Fifteen findings (1 blocking, 8 major, 6 minor), each re-checked by the
  lead and each holding. The owner directed: "Adopt the fix" (the floor before the draw; fairness on accepted
  outcomes), "Both stand" (the logging and start rulings, on corrected grounds: logging was never forced, and the
  chained-start χ² was withdrawn), "Velocity and spin only" (the die's jitter), and "Apply all" (the other twelve: a
  proof repair over prior engine outputs, a split admission, two load-bearing hooks with tests, the tier checker's
  missing rules, a non-finite guard, a named synchronous hash, an exact-Math allow-list, the coverage bound, and three
  bookkeeping slips).
- **Appendix A.** Cited: A.1 (EV-5's outcomes), A.2, A.3, A.4 (`ASSERT_ABSENT`, prohibited forms), A.5 (the circuit and
  hooks), A.6 (invariants), A.7 (tautology tests). No decision gate was raised against the appendix.
- **Architectural starting point.** Ten modules (X1 to X10), the first seven in a library-tier package, reached by the
  sealed engine only through `registerIntent` and the `wire` argument of `host`, `resume` and `rebuild`.
- **Reusability contracts:** 8, governed by one rule: one roll function and one reader serve play, replay, the view and
  the dyno. **Scalability constraints:** 6, governed by one attempt, one world, and data over code. **Elegance
  rules:** 11, governed by "the seed never decides, nothing is repaired, nothing is stored that can be derived".
- **Major risks and review needs.** Three of the final review's carried findings gate parts of the extension's Phase 4:
  K7-1-3 (tier check, ODG-g8), K7-1-11 (no component state in the SeatView, ODG-g9, which blocks the Physics Bench) and
  K7-1-1/K7-1-10 (REF-24's detector, ODG-g10). The trust model (ODG-g6): a client that knows the seed can aim, as every
  lockstep peer does. The replay reference (ODG-g11).
- **Next actions.** The owner's approval of this package; then R3, Phase 2 of the extension, started fresh from these
  files (TE-3); the owner films the spinners and dice (240 fps, a time reference in frame); the owner sets ε, x_min,
  A_max and the pass rule at R5.

## 2. Theoretical Design deliverable

<!-- INCLUDE step-2-theoretical-design.md -->

## 3. Base Case Reduction deliverable

<!-- INCLUDE step-3-base-case-reduction.md -->

## 4. Minimal Worked Example deliverable

<!-- INCLUDE step-4-minimal-worked-example.md -->

## 5. Consistency Gate — consistency audit and AE Resolution Protocol

<!-- INCLUDE step-5-consistency-gate.md -->

## 6. Logic Stress-Test summary

<!-- INCLUDE step-6-logic-stress-test.md -->

## 7. Implementation Specification deliverable

<!-- INCLUDE step-7-implementation-specification.md -->

## 8. Revision history

| Rev | Step | Issue found | Change made | Reason | Traceability impact |
|---|---|---|---|---|---|
| r1 | 3 | The reduction had no assumption-log heading | §14 appended: A-1..A-7 by reference, LA-1..LA-5 | The Minimal Worked Example's rule | none: adds a log |
| r2 | 4 | — | §9: the owner's approval recorded | Load-bearing gate | none |
| r3 | 2 → 5 | GX-48(b)'s test form | Read as the aim-advantage bound (LA-2, I-1) | χ² uniformity from the jitter alone is unattainable | GX-48 → X8, RX-8 |
| r4 | 3 → 5 | "not objects of their own" for the refusals | Clarified as preserved named outcomes (I-8) | Could read as a removal | none |
| r5 | 5 | Eight AEs and two conflicts open | The owner's rulings, §9 | Design rulings are the owner's (SR-3) | each resolved form replaces its AE forward |
| r6 | 6 → 7 | The one-turn floor; a declared time base; an assumed population | M_min as preset data; an in-clip time base and a T residual; the measured population for play | Stress-test failures and strengthening | X2, X8, X9; SX-19, SX-20, SX-22 |
| r7 | 7 | GX-46 needs a reference the sealed row lacks | ODG-g11 named | Found writing SX-13 | SX-13, XH-07 |
| r8 | 2, 3, 6, 7 | F-1: a floor tested after the draw lets refusals select on u | The spinner's floor x_min on the input at G-1; the turn test a defect hook; fairness on accepted outcomes; GBC-72 rewritten, GBC-87 added; XR-15 rewritten, XR-33, XP-17 added | Owner: "Adopt the fix" | GX-45, GX-48, G-1, G-4, X3, X5, X8, RX-8 |
| r9 | 2, 3, 4, 5 | F-2, F-3, F-4: evidence shown at two gates was wrong | 7.52 withdrawn; E-12 restated; "forced" removed and the Guard-side route recorded | Owner: "Both stand" | AE-c14, AE-c18 grounds; LA-3 |
| r10 | 2, 5, 7 | F-6: the die half of AE-c15 was never ruled | Velocity and spin only; position unjittered | Owner: "Velocity and spin only" | GX-42, SX-06, RX-6 |
| r11 | 2, 3, 7 | F-5, F-7 to F-12, F-15 | Theorem D by induction from a canonical pose; s0 as a quaternion; Θ accumulated, sectors by sign tests; G-0a/G-0b; XH-03 load-bearing with XR-30; XH-09 with XR-31; ODG-g8's RULES rows; G-F, XH-11, XR-32, GBC-86; a synchronous pure-JS hash; the exact-Math allow-list and the insertion-order row; `MoveListener` cited | Owner: "Apply all" | GX-41, GX-46, X2 to X6, SX-08, SX-09, SX-13, SX-17, SX-22, RX-1, RX-3, EL-2, VC-3 |
| r12 | 2, 4, scripts | F-13, F-14 | Coverage floors from 2π − W (53.6, 27.5 rad); XV-01's oracle values, E-12's replay figures and the final-rules re-run computed by the script; the COS_ALPHA comment | Owner: "Apply all" | E-15, XV-01, step 4 §10 |

### The adversarial pass and the owner's directions

<!-- INCLUDE step-8-adversarial-pass.md -->

## 9. Traceability map

| Concept element | Theoretical object | Primitive or preserved object | MWE step | Stress-test record | Module | Seam | Contract | Scalability | Notes |
|---|---|---|---|---|---|---|---|---|---|
| the seat's own logged throw or flick decides | Roll, RollInput | P-6, P-3 | E-5, E-9 | — | X4, X3 | SX-06, SX-07 | RX-1 | SC-x2 | GX-40 |
| the seed supplies only a jitter | Jitter | P-5 | E-4, E-8 | S-1 (coverage) | X3 | SX-05 | RX-6 | — | symmetric (ruling) |
| replay is exact on any machine | EnginePin, WorldBuild, Step | P-1, P-6 | E-1, E-12 | — | X1, X4 | SX-01, SX-02, SX-07 | RX-2, RX-4 | SC-x5 | theorem D |
| the snapshot hash is the replay check | SnapshotHash, ReplayCheck | P-8, P-9 | E-12, E-13 | — | X6 | SX-13 | RX-1 | — | ODG-g11 |
| refuse, never repair | OutcomeReader; the two refusals | P-7 | E-3, E-6, E-17 | — | X3, X5 | SX-04, SX-08 | RX-3 | — | logged outcome refusals (ruling) |
| a spinner with no friction is refused | Preset | P-2 | E-2 | S-1 (x_min) | X2 | SX-22 | RX-7 | SC-x1 | GX-51 |
| fairness is measured | Dyno | P-10 | E-15, E-16 | S-1, S-3 | X8 | SX-19 | RX-8 | SC-x6 | two claims |
| measured, published or assumed | Provenance, Dataset | P-11 | E-18 | S-2 | X9, X2 | SX-20 | RX-7 | — | footage rule (ruling) |
| the view shows the decided outcome | Trajectory | derived | — | — | X7 | SX-14, SX-15, SX-16 | RX-1 | SC-x4 | ODG-g9 |
| the Spinner's sector and resting angle | SettleRecord | P-8, P-7 | E-9, E-10 | — | X6, X5 | SX-09, SX-10, SX-12 | — | SC-x4 | settle record (ruling) |
| the spinner proves the engine | ClosedForm, EnergyBooks | contextual | E-11, E-14, E-19 | — | X10 | SX-21 | — | — | XV-01, XV-02 |
| the async engine meets the sync submit | SolverLoader, ReadySolver | contextual | E-1 | — | X1 | SX-02 | RX-4 | — | load before hosting (ruling) |

## 10. Object preservation register

| Object | Status | Reason | Tautology proof required | Proof status | Traceability impact |
|---|---|---|---|---|---|
| EnginePin, Preset, RollInput, OutcomeReader, ReplayCheck, Provenance | primitive, preserved | each irreducible (step 3 §5) | no | — | none |
| PinRecord, StartState, JitterDraw, Roll, SettleRecord, Dyno, Dataset | hybrid, preserved | each partly open (AE named) | no | — | none |
| InputInEffect, SnapshotHash, Trajectory, EnergyBooks, SkillIndex, JitterCoverage | derived, preserved | expressions over primitives | no | — | none |
| SolverLoader, ReadySolver, ClosedForm | contextual, preserved | scoped to the host boundary or to tests | no | — | none |
| IntentRefusal, OutcomeRefusal | preserved as named outcomes | GX-47; I-8 | yes (tested) | INVALID ⇒ preserved (step 3 §8) | none |
| REFUSE(escaped) against REFUSE(unsettled) | both preserved | different meaning and function | yes | INVALID ⇒ preserved | none |
| Dyno (hand) against Dyno (jitter) | both preserved | different claims | yes | INVALID ⇒ preserved | none |
| Every sealed object | cited, unchanged | E-1 | no (never a candidate) | — | none |

## 11. Open decision gates (all steps)

| Gate | Source step | Decision | Blocking | Downstream impact | Resolves with |
|---|---|---|---|---|---|
| ODG-g5 | 6, 7 | ε, x_min, A_max, the pass rule, per component | no (Phases 2–3); yes for admitting a preset for play | sets floors and how much the hand controls | the owner at R5 |
| ODG-g6 (AE-c25) | 5, 6, 7 | trust model against scripted aimers | no | a defence changes the sealed seed model | the owner (Phase 5 security review or first networked game) |
| ODG-g7 (AE-c16) | 5, 7 | the pinned build; where the pin record lives | no (Phases 2–3); yes for Phase 4 | in the pack, SUP-1 refuses mismatches for free | the owner (version), Phase 2 (placement) |
| ODG-g8 (K7-1-3) | 1, 5, 7 | HOOK-06 by path containment, plus RULES rows for the physics package and Rapier in the sealed `tools/check-tiers.mjs` | yes for Phase 4's merge | without it a platform import of physics or Rapier passes | the owner (`seal.py reopen`); placement alone cannot discharge it |
| ODG-g9 (K7-1-11, AE-c22) | 1, 5, 7 | the SeatView carries component state and σ | yes for X7's view use, HOOK-11's extension, R6 | without it no view shows a decided outcome lawfully | the owner (`seal.py reopen`) |
| ODG-g10 (K7-1-1, K7-1-10) | 1, 5, 7 | REF-24's detector names X3's writes | no | XR-20 is the only guard meanwhile | the owner |
| ODG-g11 | 7 | where the replay reference hash is held | no (Phases 2–3); yes for VC-1 in production | without one, GX-46 detects within one session only | Phase 2/3 with the developer |
| AE-c19 | 1–5 | settle numbers, floors, α, T_f | no | preset data | the dataset, R5 |
| AE-c20 | 1–5 | units of x | no | resolution and range | Phase 2 |
| AE-c26 | 1–5 | τ, b in the engine; tolerance | no | XV-01's tolerance | Phase 4's first vector |
| AE-c28 | 1–5 | several dice per throw | no | one world per throw | the first such content |
| AE-c29 | 2–5 | the on-the-line rule | no | a game-rule choice | the owner at R5 |

## 12. CLAUDE.md handoff file

<!-- INCLUDE CLAUDE_TABLETOP_G1.md -->

---

**Approval request.** This gate always halts. The owner is asked to approve the assembled package as the S1 for
extension G-1, so that R3 (Phase 2) may start fresh from these files.

**Approved by the owner, 2026-11-08, live at the gate: "Approve and commit (Recommended)".** R2 spend at the gate:
4.83M of 8M weighted (`.metaframework/spend-ledger.md`, rows "phase1:… G-1 (R2)").
