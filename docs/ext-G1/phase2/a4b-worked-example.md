# Extension G-1 · Phase 2 · A4b — Worked example

The smallest instance that walks the admitted model end to end: S1's spinner preset S-min (step 4 §2: I = 0.002
kg·m², τ = 0.004 N·m, b = 0, 8 equal sectors, ε = 0.05, every value κ = assumed), one seat's four flicks, their replay,
a tampered replay, the die's input and reader on given rest poses, and the admission chain. Numbers are computed by
`a4b/a4b_g1.py` (sha256 `6492e51d627267e19c622ba8f286beb4059ca79d9d1ebe2b0cc1cdb4803b8c5f`) into `a4b/a4b-results.json`
(sha256 `3e54558db39fc276330196fa0877e5b34a7245680296aa2add297827f9d5974c`). The closed form stands in for the Simulator
because Phase 2 has no engine; it is labelled a stand-in and decides nothing in the model.

## 1. Steps

PD = 1.0 means the step loses no meaning from its input.

| # | Nodes | Input | Output | PD 1.0 because |
|---|---|---|---|---|
| W-1 | OBJ-02 PinRecord → OBJ-03 PhysicsHost → OBJ-05 PinMatch → OBJ-04 ReadySolver | a pin record naming build h; a build source holding h, then one holding h′ ≠ h | ReadySolver, and `wire` closing over it; with h′, UNCOMPUTABLE(π), not hosted | no roll exists on a substitute build (GBC-68) |
| W-2 | OBJ-07/09 SpinnerPreset → OBJ-10 PresetValidation → OBJ-11 ValidPreset | S-min; a variant with τ = 0 | S-min valid; the variant REFUSE(preset-inadmissible: "a spinner must stop") | admission refuses, never defaults (GBC-69, GBC-70) |
| W-3 | OBJ-40 Dyno → OBJ-41 DynoRecord → OBJ-12 PlayAdmission with OBJ-13 DynoPassRule | S-min with an assumed population | a development record; not admitted for play (XR-07); with no pass rule yet, UNDETERMINED (GBC-71); so XH-09 would refuse to wire S-min for play | the model keeps "valid" and "admitted for play" apart (RE-06) |
| W-4 | OBJ-17 Flick → OBJ-34 RollGuard | A0: 0 mrad/s | RULE_REFUSED "no flick"; no draw; not logged | the empty flick is refused, not repaired (GBC-66) |
| W-5 | OBJ-34 RollGuard | A1: 3000 mrad/s, below x_min = 6000 (this example's value) | RULE_REFUSED "re-spin"; no draw; not logged | the floor sits on the input, before any draw (F-1, GBC-72). At x_min·(1 − ε) the turn is 8.1225 rad ≥ 2π, so every u clears it |
| W-6 | OBJ-35 RollApplier → sealed MOD-04 draw → OBJ-19 Jitter → OBJ-20 EffectiveInput | A2: 12000 mrad/s, LEGAL; draw 1 of `rand:spinner-1` (XV-07) | u₁ = 0.557480385992676; factor 1.0057480385992676; ω_eff = 12.068976463191213 rad/s | one draw after LEGAL; the symmetric form (AE-c15 ruling); UnitsToBinary64 divides by the exact integer 1000, correctly rounded, before the factor applies |
| W-7 | OBJ-31 SettleRecords `lastRest` → OBJ-21 Pose → OBJ-24 Simulator (stand-in) → OBJ-25 RollRun | s0 = the canonical pose (first roll) | Θ = 36.41504821726587 rad | s0 never comes from the intent (AE-c18 ruling, XR-28) |
| W-8 | OBJ-28 SpinnerReader → OBJ-29 RollOutcome | Θ ≥ 2π; rest 4.999121681367939 rad | VALUE(6) | the defect hook does not fire; the half-open rule by default (AE-c29 open) |
| W-9 | OBJ-30 SettleRecord; OBJ-35's apply return | A2's values | σ₁ (k = 1, H₁ = `df84e47a7d97a000`, stand-in); Spinner.sector := 6; logged | the kind's sealed field takes only the VALUE; the rest pose stays in σ (AE-c17 ruling, EL-7) |
| W-10 | OBJ-35 … OBJ-30 | A3: 12000 mrad/s; draw 2; s0 = A2's rest | u₂ = 0.5018962631002069; ω_eff = 12.00227551572025; Θ = 36.013654388814444; rest 3.3136642271048657; VALUE(4); σ₂ (H₂ = `27ee2f13db7dc8d3`) | the draw index is 2: A0 and A1 drew nothing (GBC-85) |
| W-11 | OBJ-48 EnergyBooks against OBJ-47 | A2, A3 (b = 0, no pegs) | ½Iω_eff² − τΘ = 0.0 for both | a consistency check of the stand-in only: Θ = ω²/(2a) makes the books zero by construction, so GX-50 is not tested here (XV-02 tests it on the engine) |
| W-12 | OBJ-03 `replay` → sealed `rebuild` (OBJ-35 re-runs) → OBJ-32 ReplayCheck with OBJ-33 ReplayReference | the log [A2, A3] (A0 and A1 were never logged) | both σ and H equal: a replay | the same draws in the same order, the same starts (GBC-80 in one process) |
| W-13 | OBJ-32 | the log with A3's x tampered to 12001 | A2 equal; A3's H differs: DIVERGENCE, refused whole | tampering is detected, not absorbed (GBC-77) |
| W-14 | OBJ-16 Throw → OBJ-19 → OBJ-20 | p = (0, 50, 0) mm, v = (800, 0, −200) mm/s, w = (0, 0, 15000) mrad/s (this example's throw); u₁ and ε borrowed from the spinner, a stand-in for the die's own first draw | p_eff = (0, 0.05, 0) m, unscaled; v_eff = (0.8045984308794142, 0, −0.20114960771985355) m/s; w_eff = (0, 0, 15.086220578989014) rad/s | one factor on velocity and spin, the release position unjittered (F-6) |
| W-15 | OBJ-27 DieReader → OBJ-29 → OBJ-30 → OBJ-31 | given rests: identity; 20° about z (α = 10°, cos α = 0.984807753012208, S1 E-17) | VALUE(1); REFUSE(cocked), σ written, Die.face unchanged, logged, the next throw starting from that rest quaternion | refused, never nudged flat (GBC-73); an outcome refusal draws and is logged (AE-c14 ruling) |

**Determination: PASS WITH LATENT ASSUMPTIONS.** Computed by the script: W-4 to W-14 and W-15's reader. Traced
through the model, not computed: W-1 to W-3, and W-15's σ, log and next start. Not exercised (corrected after TE-6,
F2-13): OBJ-14, OBJ-22, OBJ-23 (a stand-in only), OBJ-36, OBJ-37 to OBJ-39, OBJ-42, OBJ-43 to OBJ-46 and OBJ-49; the
dataset waits on the films and the trajectory's view on ODG-g9.

## 2. Assumptions

| ID | Assumption | Class | Handling |
|---|---|---|---|
| AS-1 | The closed form stands in for the Simulator | benign | labelled; the model routes no decision through OBJ-47 (RE-05) |
| AS-2 | x_min = 6000 mrad/s | benign | the floor's rule is exercised, not its value; ODG-g5 stays the owner's |
| AS-3 | The input units: mm, mm/s, mrad/s, divided by 1000 | latent | AE-c20, put to the owner at the final gate |
| AS-4 | The component's stream is named after it (`rand:spinner-1`) | latent | S1's LA-1; Phase 3 fixes the name (XV-07's discharge) |
| AS-5 | H is a stand-in over (rest, x, u), not a world snapshot | benign | labelled; OBJ-23 hashes the engine's snapshot |
| AS-6 | The die's rest poses are given, not simulated | benign | the die needs the engine (XV-04, deferred) |
| AS-7 | Where σ sits in the state tree | latent | Phase 3 names the module's key (SC-x4) |
| AS-8 | The pin record is handed to the host | latent | its home is ODG-g7, open |
| AS-9 | H_ref is the live run's, in one process | latent | the holder is ODG-g11, open |
| AS-10 | The play path is walked on S-min, which W-3 shows is not admitted for play | latent | as in S1's own worked example; a preset admitted for play changes no step |
| AS-11 | The readers and poses are stand-ins: angle arithmetic (`rest // W`, `cos`) where OBJ-27 and OBJ-28 use the quaternion, dot products and sign tests | benign | labelled; analysis only (F-5c) |

No assumption is conflicting; nothing escalates from this stage. Batches under standing approval.
