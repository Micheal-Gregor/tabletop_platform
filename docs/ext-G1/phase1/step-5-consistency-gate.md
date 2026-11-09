# Extension G-1 · Phase 1 · Step 5 — Consistency Gate

Audit of `step-2-theoretical-design.md`, `step-3-base-case-reduction.md` (with its §14 appended at Step 4) and
`step-4-minimal-worked-example.md` (owner-approved, "Approve, go on"). **Load-bearing: it halts while any AE is open.**
Design rulings are the owner's (SR-3), so every disposition below that decides a design is put to the owner; the
lead's recommendation is marked as a recommendation.

## 1. Audit summary

The Theoretical Design, the Base Case Reduction and the Minimal Worked Example are consistent with one another and
with the sealed library at `seal-1`, with eight issues, none of which reverses a prior step (§2). The framework is
**ready for the Logic Stress-Test once the owner rules on the escalated AEs** (§5).

## 2. Issue register

| # | Issue | Stage | Severity | Why it matters | Correction |
|---|---|---|---|---|---|
| I-1 | GX-48(b) says the jitter's claim is tested "against the same target"; the worked example (E-15) shows χ² uniformity from the jitter alone is out of reach for any physical spinner, and that the claim's purpose is a bound | Theoretical Design | minor | A test that can never pass would block every preset | Read GX-48(b) as LA-2's aim-advantage bound, A = N_s · max_i p_i(x) over admissible inputs; the owner sets the acceptable A with ε. Carried forward in that form |
| I-2 | The Base Case Reduction template has no assumption-log heading, so the latent assumptions had nowhere to go until §14 was appended | Base Case Reduction | minor | The rule requires them in that log before the Consistency Gate | Done: §14 lists A-1 to A-7 by reference and LA-1 to LA-5 |
| I-3 | Theorem D's step (2) holds only if every drawing attempt is in the log | Theoretical Design | moderate | Without it the theorem is false with the sealed streams (E-12) | Depends on AE-c14 (§5) |
| I-4 | The die's simulation is not executed at the base case | Minimal Worked Example | moderate | A tumbling die is chaotic, so its only proof of determinism is the cross-platform replay vector | Carried: no die module counts complete until GBC-80 is computed on two platforms (a deferred vector, Implementation Specification) |
| I-5 | The hand's claim was exercised on an assumed population | Minimal Worked Example | minor | It is evidence about the method, not about fairness | None: labelled assumed; the dataset supplies the real population |
| I-6 | Three items were added beyond G-1's list: the die refusals "no-tumble" and "escaped", and the die's half of GX-51 (μ > 0, e < 1) | Theoretical Design | moderate | They are design additions, traced to G-1's rules but not written there | Put to the owner (§5, AE batch) |
| I-7 | Step 3's S-1 (a gate reduced to an invariant) relies on the new module offering no way to make a roll applier without a ready solver | Base Case Reduction | minor | A second door would reopen the gate S-1 removed | Carried into the Implementation Specification as a constraint and a hook |
| I-8 | Step 3 §6 states that the two refusals are "not objects of their own" | Base Case Reduction | minor | Could be read as a removal without a proof | Clarified: both are preserved as distinct named outcomes (REFUSE(intent: …) at G-1, REFUSE(outcome: …) at G-2..G-5) with distinct records; step 3 §8's tautology test preserved both. No removal occurred |

No contradiction, circular argument, invalid removal, or mathematics before circuit was found. Theorem D rests on A-1,
an external claim, and is not circular: GX-46 makes A-1 falsifiable.

## 3. Object preservation review

All 22 Theoretical Design objects are accounted for. EnginePin, Preset, RollInput, OutcomeReader, ReplayCheck and
Provenance are primitives. PinRecord, StartState, JitterDraw, Roll, SettleRecord, Dyno and Dataset are hybrids, each
with its open AE. InputInEffect, SnapshotHash, Trajectory, EnergyBooks, SkillIndex and JitterCoverage are derived.
SolverLoader, ReadySolver and ClosedForm are contextual. IntentRefusal and OutcomeRefusal are preserved as named
outcomes (I-8). Every object the worked example invoked is in the primitive set or derived from it; nothing was
invoked from outside it.

## 4. Traceability review

TM-1 to TM-19 (step 4 §6) link each primitive to its reduction, its worked step, its theoretical object and the G-1
element it serves. No break. The stand-ins (closed form, stand-in hash) decide nothing and are traced as Φ, a
contextual object.

## 5. AE Resolution Protocol

Every AE from Intake to the worked example gets a disposition. **Owner** marks a design ruling put to the owner live.

| AE | Question | MWE status | Disposition (recommended) | Owner's ruling |
|---|---|---|---|---|
| AE-c13 | Async load against sync submit | annotating | **RESOLVE NOW (owner).** Load before hosting: the host awaits the pinned solver, then calls the sealed `host`, `resume` or `rebuild` synchronously with a `wire` that closes over the ready solver. `submit` never awaits. A pin that cannot load means UNCOMPUTABLE(π): the game is not hosted, never a substitute engine or a seeded fallback. Ground: the sealed applier returns a state, not a promise (`core.ts:35`), and `wire` is the sealed way in (MOD-27) | **RESOLVED** as recommended: "Load before hosting" |
| AE-c14 | Is a refused roll logged? | annotating (E-12) | **RESOLVE NOW (owner).** An outcome refusal is a succeeded, logged attempt: the settle record is written, the kind's field is not, and the seat owes the roll. An intent refusal stays unlogged (REF-01, GX-2 unchanged). Ground as first stated: the sealed apply context offers only cached, advancing streams with no rollback (`core.ts:31-33`, `rng.ts:18-27`), and E-12 shows an applier-decided refusal left unlogged diverges. *Corrected after the adversarial pass:* E-12's divergence is in the rest angle and H, the sector being the same (F-3); and logging is not forced, since a Guard could rebuild the draw from a fresh stream with no sealed change (F-4). Grounds that stand: a refused spin's rest must enter state (AE-c18), GX-47, re-roll telemetry, and an unlogged refusal would reuse u | **RESOLVED** as recommended: "Log it" |
| AE-c15 | The jitter's form | annotating (E-4, E-15) | **ESCALATE (owner).** Keep the gap's one-sided form ω₀·(1 + ε·u), or use the symmetric form ω₀·(1 + ε·(2u − 1)). At ε = 0.05 and 12 rad/s the symmetric form doubles the spread (0.59 to 1.15 turns), makes every sector reachable (6 to 8) and lowers a perfect aimer's edge (1.73 to 1.42 × fair). ε's value stays the owner's at R5 | **RESOLVED: symmetric**, x_eff = x ⊙ (1 + ε·(2u − 1)) ("Symmetric"). ε stays the owner's at R5. The die half (which components) was missed here and ruled after the adversarial pass (F-6): **velocity and spin only**, one factor, position unjittered ("Velocity and spin only") |
| AE-c16 | Where the pin is recorded | not encountered | **CARRY FORWARD** to Phase 2/3. Constraint: (packRef, seed, seats, log) must cover it and it is checked before any roll is simulated. Candidates: inside the pack, so packRef's hash covers it and SUP-1 refuses a mismatch; or a one-time setup intent. Trigger: Phase 2 reads PackLoader's schema rules | — |
| AE-c17 | Where the rest pose lives | annotating | **RESOLVE NOW (owner).** In a settle record the new module owns; the sealed Spinner kind keeps `{sector}` and the Die keeps `{face}`. The alternative, superseding the Spinner kind, changes a sealed object: under E-1 that is a blocking redesign gate | **RESOLVED** as recommended: "Settle record" |
| AE-c18 | Where a roll starts | annotating (E-9, E-16) | **RESOLVE NOW (owner).** Each roll starts where the component last rested (a refused attempt's rest included); the first roll starts from a canonical pose in the preset; never from the throw's arguments. Evidence as first stated: an assumed population failed χ² with a fixed start (35.8) and passed when starts chain (7.52). *Corrected after the adversarial pass (F-2):* the 7.52 is withdrawn (the start is public; a chained χ² is vacuous). Grounds that stand: continuity of what is shown (GX-52) and never taking the start from the intent | **RESOLVED** as recommended: "Where it last rested" |
| AE-c19 | Settle numbers (thresholds, K, N, α, T_f, floors) | annotating | **CARRY FORWARD** to the dataset and R5: preset data, each with κ. Trigger: the fits | — |
| AE-c20 | Units of the integer inputs | annotating | **CARRY FORWARD** to Phase 2 (the Throw and Flick objects). Constraint: units fine enough that rounding moves Θ by far less than the skill index (mrad/s gives ≤ 0.001 rad/s against 0.13) | — |
| AE-c21 | The dyno's pass rule | annotating | **CARRY FORWARD** to the owner at R5, with ε. Constraint from LA-2 and LA-3: the hand's claim names its population and start policy; the jitter's claim is a bound on A | — |
| AE-c22 | How the trajectory reaches the view | not encountered | **CARRY FORWARD** as a dependency: derived per read from the settle record (EV-3), which reaches a view only once the SeatView carries component state. That is K7-1-11's fix (SEAM-44), a `seal.py reopen` on the owner's ruling. Blocks R6 and the HOOK-11 module, not R3 or R4 | — |
| AE-c23 | "Seeded result" in GX-38, SEAM-44, REF-20, HOOK-11 | not encountered | **RESOLVE NOW (owner)**, with CF-1. Read as "the engine-decided result". I-260's record already says "HK-11 holds (shown ≡ computed)" | **RESOLVED** as recommended, with CF-1: "Yes, both" |
| AE-c24 | Is writing a Randomizer's outcome an effect? | annotating | **RESOLVE NOW (owner).** It is the roll intent's own mutation, like placement (`component:place`), not an EFX effect; EFX stays v1.1.1. The new module writes no effect-owned field (cash, favor, assets, sueRights, windows, deck inject). When K7-1-1/K7-1-10's write-resolving detector is built, it must see the module's writes and name them by register row. The alternative, an EFX member through an ExtensionContract cycle, needs `vocabularies.ts` reopened | **RESOLVED** as recommended: "Own mutation" |
| AE-c25 | Whom "no player can aim" protects against | not encountered | **CARRY FORWARD** as an owner gate and a production concern. Every lockstep peer knows the seed, so a modified client can search for a throw that lands a chosen outcome; no jitter computed from information the thrower holds at commit time can stop it, and a defence needs entropy the thrower cannot know (commit-reveal across seats, or a host secret), which changes the sealed seed model. Against a human hand, the jitter plus the hand's spread suffice (measured by the dyno). Trigger: Phase 5's security review, or the first networked game | — |
| AE-c26 | τ and b in the engine; the vector's tolerance | annotating (E-14) | **CARRY FORWARD** to Phase 4's first spinner vector. Constraint from LA-4: compare Θ within at least ω_eff·dt/2, never sectors | — |
| AE-c27 | Third-party footage as a source | not encountered | **RESOLVE NOW (lead's method, owner may strike):** third-party footage with an unknown time base yields only time-free quantities (bounce-height ratios for restitution; rest-face counts; tumble counts), or speeds once its time base is calibrated by a free fall against g; it never makes a speed or decay "measured" otherwise. D-1 to D-3 qualify only so | **RESOLVED** as written, with I-6: "Accept all three" |
| AE-c28 | Several dice in one throw | not encountered | **CARRY FORWARD:** the base case is one die; a multi-die throw is one world per throw (the dice collide), fresh per throw. Trigger: the first content that throws two dice | — |
| AE-c29 | A peg-free spinner resting on a line | annotating | **CARRY FORWARD** to the owner at R5: the half-open rule decides by default in the engine; whether to refuse within δ of a line is a game rule choice | — |

**Also put to the owner (design additions, I-6):** the die refusals "no-tumble" (a die slid flat keeps the face its
thrower placed) and "escaped", and GX-51's die half (μ > 0, e < 1 at admission).

## 6. Conflict review

| ID | Disposition |
|---|---|
| CF-1 | Escalated with AE-c23: does I-260 supersede the first half of the S1 v2.0 do-not ("Do not let a gesture influence a result") for the Die and the Spinner? The second half (no animation carries game meaning) stays, as GX-52 |
| CF-2 | Escalated with AE-c23 |
| CF-3 | Resolved in the Theoretical Design (INTERP benign): GX-5 and GX-14 hold as written |
| CF-4 | Escalated with AE-c14 |
| CF-5 | Carried with AE-c22 (dependency K7-1-11) |
| CF-6 | Carried as a dependency: Rapier and the new module enter a library-tier package; HOOK-06 must decide by path containment (K7-1-3), **and** `tools/check-tiers.mjs` (sealed) needs new RULES rows naming the physics package and Rapier whatever the placement, since it forbids only `@tabletop/patterns` and `@tabletop/presentation` (corrected after the adversarial pass, F-9) |
| CF-7 | Escalated with AE-c24; dependency K7-1-1/K7-1-10 |
| CF-8 | Resolved by GX-41 and GX-44 |
| CF-9 | Confirmed by E-15; carried into the Logic Stress-Test's Scenario 1 |

No conflict was silently resolved in the worked example: E-9, E-12 and E-16 ran both readings.

## 7. Proof quality review

- Tautology claims (step 3 §8): each INVALID result names a failing dimension; none is weak.
- Theorem D: sound given A-1 and AE-c14; necessity is shown per condition, and the integer condition is stated no more
  strongly than it holds (step 2 §8).
- PD 1.0 in the worked example: each of E-1 to E-19 gives its reason; none is asserted bare.

## 8. Recommendation

Before the rulings: blocked pending AE resolution (AE-c13, AE-c14, AE-c15, AE-c17, AE-c18, AE-c23 with CF-1, AE-c24,
AE-c27 and I-6).

**After the rulings: Approved with minor revisions** (I-1, I-2 and I-8 corrected above) **for the Logic Stress-Test.**

## 9. The owner's rulings (2026-11-08, live at this gate)

| Item | Ruling (the owner's words) | Resolved form, carried forward in place of the AE |
|---|---|---|
| AE-c14 | "Log it (Recommended)" | An outcome refusal is a succeeded, logged attempt (settle record written, kind field unchanged, the roll still owed). An intent refusal is not logged (REF-01) |
| AE-c13 | "Load before hosting (Recommended)" | The host awaits the pinned solver, then hosts, resumes or rebuilds synchronously with a `wire` closing over it. `submit` never awaits. An unloadable pin is UNCOMPUTABLE(π): not hosted |
| AE-c18 | "Where it last rested (Recommended)" | s0 = the component's last rest pose (a refused attempt's included); the first roll starts from the preset's canonical pose; never from the throw's arguments |
| CF-1, AE-c23 | "Yes, both (Recommended)" | I-260 supersedes the S1 v2.0 do-not's first half for the Die and the Spinner; its second half stands as GX-52. "Seeded result" in GX-38, SEAM-44, REF-20 and HOOK-11 reads "the engine-decided result" |
| AE-c17 | "Settle record (Recommended)" | The rest pose lives in a settle record the new module owns; Spinner `{sector}` and Die `{face}` are unchanged |
| AE-c24 | "Own mutation (Recommended)" | The roll intent writes its own outcome; EFX stays v1.1.1; the module writes no effect-owned field; the K7-1-1/K7-1-10 detector names its writes by register row |
| AE-c15 | "Symmetric (Recommended)" | x_eff = x ⊙ (1 + ε·(2u − 1)); ε per component stays the owner's at R5 |
| I-6, AE-c27 | "Accept all three (Recommended)" | REFUSE(no-tumble) and REFUSE(escaped) for the die; die admission needs μ > 0 and e < 1; third-party footage of unknown time base gives only time-free quantities, or speeds after a free-fall calibration against g |

The CARRY FORWARD dispositions (AE-c16, c19, c20, c21, c22, c25, c26, c28, c29) were presented with this file and stand
as recorded in §5, each with its trigger.

**After the adversarial pass** (`step-8-adversarial-pass.md`), the owner was told that three pieces of evidence shown
at this gate were wrong (F-2, F-3, F-4) and ruled, live: "Both stand (Recommended)" (AE-c14 and AE-c18 stand on the
corrected grounds), "Adopt the fix (Recommended)" (F-1: the spinner's floor on the input, before the draw; fairness
measured on accepted outcomes), "Velocity and spin only (Recommended)" (F-6) and "Apply all (Recommended)" (the other
twelve corrections).
