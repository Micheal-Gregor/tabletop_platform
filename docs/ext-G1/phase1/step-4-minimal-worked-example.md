# Extension G-1 · Phase 1 · Step 4 — Minimal Worked Example

Sources: `step-1-intake.md` and `step-3-base-case-reduction.md` only. Seeded by G-1's own worked example (E-1), which
this step re-derives. **Load-bearing gate: halts for the owner.**

Every number below is computed by `mwe/mwe_g1.py` (SHA-256 `f6dadd37…e7c81b66`, revised after the adversarial pass
and set to write LF line endings so its output re-derives byte-for-byte on any platform; first run `71747afa…952e2c`),
whose output is `mwe/mwe-results.json` (`06ae05dc…5aa4bee7`; first run `770cad1f…c8f997`). The jitter draws come from the **sealed** RNGStream
(`packages/engine/src/kernel/rng-stream.ts`), run by node from the sealed source, with seed `sigma-7` (the seed of the
sealed V-1 and V-9) and stream `rand:spinner-1`. No implementation of the extension exists, so the spinner's closed
form stands in for the engine and a SHA-256 of the closed-form rest state stands in for the snapshot hash. Both are
labelled stand-ins wherever they appear.

## 1. The approved primitive set (under test, unmodified)

P-1 EnginePin π · P-2 Preset P (values with κ) · P-3 RollInput x · P-4 StartState s0 · P-5 JitterDraw u · P-6 Roll
roll_π (fresh world, fixed dt, ρ, N) · P-7 OutcomeReader read_c (gates G-2..G-5) · P-8 SettleRecord σ · P-9 ReplayCheck χ
· P-10 Dyno Δ (two claims) · P-11 Provenance κ with Dataset 𝒟. (Definitions: step 3 §5.)

## 2. Selection rationale

**The instance.** One peg-free, drag-free spinner (preset S-min, the gap's numbers: I = 0.002 kg·m², τ = 0.004 N·m,
b = 0, 8 equal sectors, ε = 0.05, all κ = assumed) on one seat's log of three submissions: A0 an empty flick, A1 a weak
flick, A2 the gap's 12 rad/s flick. Then the replay of that log, the dyno's two claims for that preset, the die's outcome
reader on three given rest poses, and the pin check at the host boundary.

**Why minimal.** The spinner has one degree of freedom, the fewest of the two kinds, and its closed form lets the
example be computed without an engine. Three submissions are the fewest that exercise an intent refusal (no draw), an
outcome refusal (a draw), an accepted outcome (a second draw, so the draw index is tested) and a replay that can
diverge. Eight sectors are kept, not two, because the gap's worked example seeds this step (E-1) and its numbers are
re-derived here; the sector count changes no primitive exercised.

**What is not exercised, and why that is acceptable.** The die's simulation (no closed form; it needs the engine, so it
is a deferred vector), drag (b > 0) and pegs (ΔE), several dice at once (AE-c28). The die shares P-6 with the spinner;
its reader (P-7) is exercised on given poses.

**AEs affecting selection.** AE-c14 (logging) and AE-c18 (start state) change the replay's and A2's results, so both
readings are run and reported side by side; neither is chosen here. AE-c15 (the jitter's form) is run in both forms for
the dyno. AE-c20 (units): mrad/s is used, labelled as this example's choice.

## 3. Step-by-step worked execution

PD (PreservationDoctrine) = 1.0 means the step loses no meaning from its input; the justification is given per step.

| # | Primitive | Input | Output | PD 1.0 because | TM | AE |
|---|---|---|---|---|---|---|
| E-1 | P-1, G-H | the pin π (build hash h_π); the host loads a solver whose build is h_π, then a variant whose build is h′ ≠ h_π | first: hosted, the wire closes over S; variant: UNCOMPUTABLE(π), not hosted, no roll ever simulated | no roll exists on a substitute engine; the variant's failure is named, not hidden (GBC-68) | TM-1 | AE-c13 annotates |
| E-2 | P-2, G-0 | S-min with κ on each value; a variant with τ = 0 | S-min admitted (τ > 0, every value tagged "assumed" with its source); the variant refused: "a spinner must stop" | admission refuses rather than defaults (GBC-69, GBC-70) | TM-2 | AE-c21 annotates (no dyno pass rule yet) |
| E-3 | P-3, G-1 | A0: x = 0 mrad/s | intent refusal RULE_REFUSED "no flick"; nothing drawn; nothing logged; the stream's count stays 0 | the empty flick is refused, not repaired into a roll (GBC-66) | TM-3 | — |
| E-4 | P-5, P-3 | A1: x = 3000 mrad/s; draw 1 of `rand:spinner-1` | u₁ = 0.557480385992676; ω_eff = 3.0·(1 + 0.05·u₁) = 3.0836 rad/s | one draw, from the sealed stream, applied by GX-41's operations | TM-4 | AE-c15 annotates (one-sided form as the gap wrote it) |
| E-5 | P-4, P-6 | s0 = 0; ω_eff | Θ = Iω²/2τ = 2.3772 rad (stand-in) | the closed form is the model the engine integrates; nothing outside the record enters | TM-5 | — |
| E-6 | P-7 (G-4) | Θ = 2.3772 < 2π | REFUSE(under-one-turn), "re-spin"; Spinner.sector unchanged | refused, not nudged to a turn (GBC-72) | TM-6 | — |
| E-7 | P-8 | A1's values | σ₁ = (spinner-1, k = 1, x = 3000, u₁, ω_eff, s0 = 0, REFUSE(under-one-turn), rest 2.3772, H₁) | the record holds every input the result depends on | TM-7 | AE-c14 encountered (see E-12), AE-c17 annotates |
| E-8 | P-5, P-3 | A2: x = 12000 mrad/s; draw 2 | u₂ = 0.5018962631002069; ω_eff = 12.3011 rad/s | the draw index is 2 because A1 drew; A0 did not | TM-8 | AE-c14 |
| E-9 | P-4, P-6, P-7 | reading R-a, s0 = A1's rest (2.3772); reading R-b, s0 = 0 | Θ = 37.8295 rad (6.02 turns) ≥ 2π. R-a: θ_rest = 40.2067 → 2.5076 mod 2π → **VALUE(sector 3)**. R-b: 0.1304 → **VALUE(sector 0)** | the reader maps the rest angle by the half-open rule; both readings are executed, neither is chosen | TM-9 | AE-c18 encountered, annotating; AE-c29 not encountered (0.13 rad is far from a line at δ ≪ 0.1) |
| E-10 | P-8 | A2's values (R-a) | σ₂ with VALUE(3), rest 2.5076, H₂ (stand-in); Spinner.sector := 3 | the kind's sealed field takes only the VALUE; the angle stays in σ | TM-10 | AE-c17 annotates |
| E-11 | P-6 (energy books) | A1, A2 | ½Iω_eff² − τΘ = 0 to rounding in both | the model's invariant holds; nothing is lost between energy and angle | TM-11 | — |
| E-12 | P-9 | replay of the log under AE-c14's two readings | **Refused attempt logged** (log = A1, A2): A2 replays with u₂, θ_rest = 2.5076, VALUE(3), H equal: replay. **Not logged** (log = A2): A1 wrote nothing, so A2 starts at 0 live as well; live draws u₂ (ω_eff = 12.3011, rest 0.1304, sector 0), the replay's first draw u₁ goes to A2 (ω_eff = 12.3345, rest 0.3358, sector 0). **Same sector; the rest angle and H differ: DIVERGENCE** in σ and the state hash | the replay check makes the difference loud (GBC-77); "not logged", *when the refusal is decided in the applier*, breaks GBC-80 and GBC-85 with the sealed streams | TM-12 | AE-c14 encountered, **annotating** (both readings execute; the Consistency Gate decides) |
| E-13 | P-9 | the log with A2's x tampered to 12001 | H differs: DIVERGENCE, refused whole | tampering is detected, not absorbed | TM-13 | — |
| E-14 | P-6 (tolerance) | ω_eff = 12.3011, dt = 1/240 s, a semi-implicit Euler step with constant friction (not the engine) | 37.8039 rad against 37.8295 closed form: −0.0256 rad, which equals ω_eff·dt/2 | shows the order of a fixed-step error (3.3% of a sector), so GX-50's tolerance is on Θ, never on the sector | TM-14 | AE-c26 encountered, annotating |
| E-15 | P-10 (the jitter's claim) | x = 12 rad/s fixed, s0 = 0, u over [0, 1) | one-sided g(u) = u: span 3.69 rad (0.59 turn), 6 of 8 sectors reachable, best sector p = 0.2166 (1.73 × fair), χ² = 5647.6 at N = 10,000. Symmetric g(u) = 2u − 1: span 7.20 rad (1.15 turns), all 8 reachable, best p = 0.1773 (1.42 × fair), χ² = 499.5. Critical χ² (7 df): 14.067 at 0.05. Coverage floors for every sector to be reachable at any alignment: Θ₀ > 53.6 rad one-sided, > 27.5 rad symmetric (the span must exceed 2π − W; first printed as 61.3 and 31.4 from a whole turn, corrected after the adversarial pass, F-13) | the claim is computed exactly from the model; nothing is assumed fair | TM-15 | AE-c15 encountered, annotating; CF-9 confirmed |
| E-16 | P-10 (the hand's claim) | an **assumed** population ω₀ ~ U[8, 16] rad/s, one-sided jitter, N = 10,000, closed form standing in for the engine | with s0 = 0 every time, which is the outcome *relative to the start*: counts 1306, 1240, 1209, 1164, 1125, 1282, 1319, 1355; **χ² = 35.8 > 14.07: fails**. With s0 = the last rest angle (R-a): 1252, 1223, 1271, 1297, 1280, 1263, 1182, 1232; χ² = 7.52. **The 7.52 is withdrawn as fairness evidence** (adversarial pass, F-2): the start is public, so a player aims relative to it, and chained samples are dependent; one constant 12 rad/s flick with no jitter scores χ² = 0.04 under chaining while aiming perfectly. The relative test (35.8) is the one that counts | the dyno reports what the population and the start policy give; it does not choose either | TM-16 | AE-c18, AE-c21 encountered, annotating |
| E-17 | P-7 (die reader) | rest q = identity; q = 20° about z; up-face sequences [1,1,1,1] and [1,2,6,5,1] with T_f = 3 (assumed); cos α = 0.984807753012208 (α = 10°, pinned literal) | identity: face 1, dot 1.0, VALUE(1). Tilted: best dot 0.9397 < cos α, REFUSE(cocked). [1,1,1,1]: 1 distinct face, REFUSE(no-tumble). [1,2,6,5,1]: 4 distinct, passes G-4 | rotation uses +, −, × only; the reader refuses rather than rounds a cocked die flat (GBC-73, GBC-76) | TM-17 | AE-c19 annotates (α, T_f assumed) |
| E-18 | P-11 | every S-min value | κ = assumed, source "ui/gaps.md G-1 worked example"; no value claims "measured" | provenance is stated, not defaulted | TM-18 | AE-c27 not encountered |
| E-19 | (the gap's example, re-derived) | ω₀ = 12 and 12.3 rad/s, s0 = 0 | Θ = 36.0 rad, T = 6.0 s, rest 4.5841, sector 5; Θ = 37.8225 rad, rest 0.1234, sector 0; skill index (2π/8)·τ/(Iω₀) = 0.1309 rad/s at 12 rad/s | matches the gap's figures exactly | TM-19 | — |

The die's unsettled and escaped refusals (G-2, G-3) are exercised only as gates over a given state: a world still moving
at step N gives REFUSE(unsettled); a rest position outside the tray's bounds gives REFUSE(escaped). Their numbers need
the engine.

## 4. Assumption exposure log

| ID | Assumption | Belongs to | Class | Handling |
|---|---|---|---|---|
| LA-1 | The component's stream is named after the component (`rand:<component id>` here) | P-5, GX-42 | latent | Added to step 3's log; the name is Phase 3's |
| LA-2 | The jitter's claim (GX-48b) is measured as an **aim-advantage bound**, A = N_s · max_i p_i(x) maximised over admissible inputs, not as a χ² uniformity test. E-15 shows uniformity from the jitter alone is out of reach for a physical spinner at ε = 0.05 (χ² 499.5 even symmetric), while the bound is meaningful (1.42 to 1.73 × fair at 12 rad/s) | P-10, GX-48 | latent (GX-48b's purpose was a bound; the test's form was unstated) | Added to step 3's log; the owner sets the acceptable A with ε (R5) |
| LA-3 | The hand's claim depends on the start policy. *As first written:* the chained start's χ² of 7.52 was offered as evidence. *Corrected after the adversarial pass (F-2):* under R-a the start is public, so the claim tests the outcome relative to the start (here χ² 35.8, which fails for this assumed population); a chained χ² is vacuous | P-10, P-4 | latent | Added to step 3's log, corrected there |
| LA-4 | A fixed-step integrator's Θ differs from the closed form by about ω_eff·dt/2 (E-14), so GX-50's vector compares Θ within a tolerance of at least that order and never compares sectors | P-6, GX-50 | latent | Added to step 3's log; AE-c26 |
| LA-5 | A refused attempt's trajectory is shown (GX-52), so under R-a the next spin starts at the refused attempt's rest; R-a and R-b give A2 different sectors (3 and 0) | P-4 | latent | Added to step 3's log; AE-c18 |
| LA-6 | The die's face labels are preset data (+y = 1, −y = 6, +x = 2, −x = 5, +z = 3, −z = 4) | P-2 | benign | — |
| LA-7 | The no-throw floor, α and T_f are preset values; this example used x ≤ 0, α = 10°, T_f = 3, all assumed | P-2, P-7 | benign | — |

**Conflicting assumptions:** none.

## 5. AmbiguityElement status (none resolved here)

| AE | Encountered | Status |
|---|---|---|
| AE-c13 async load | yes (E-1) | annotating |
| AE-c14 refused-roll logging | yes (E-7, E-8, E-12) | annotating: both readings executed; "not logged" diverges |
| AE-c15 jitter form | yes (E-4, E-15) | annotating |
| AE-c16 pin location | no | not encountered (the pin's contents were used, not its location) |
| AE-c17 rest pose location | yes (E-7, E-10) | annotating |
| AE-c18 start state | yes (E-9, E-16) | annotating |
| AE-c19 settle numbers | yes (E-17) | annotating (assumed values) |
| AE-c20 units | yes (E-3, E-4) | annotating (mrad/s used) |
| AE-c21 dyno pass rule | yes (E-2, E-16) | annotating |
| AE-c22 trajectory delivery | no | not encountered |
| AE-c23 "seeded result" | no | not encountered |
| AE-c24 effect or own mutation | yes (E-10) | annotating (Spinner.sector written by the attempt's apply) |
| AE-c25 trust model | no | not encountered |
| AE-c26 τ, b mapping and tolerance | yes (E-14) | annotating |
| AE-c27 third-party footage | no | not encountered |
| AE-c28 several dice | no | not encountered |
| AE-c29 on-the-line | yes (E-9) | annotating (not near a line) |

## 6. Traceability update

| TM | Primitive → BCR definition → MWE step → Theoretical object → Concept element |
|---|---|
| TM-1 | P-1 → step 3 §5 P-1 → E-1 → EnginePin π → "the engine's version is pinned and recorded" |
| TM-2 | P-2 → P-2 → E-2 → Preset P → "a spinner with no friction is refused at admission" |
| TM-3 | P-3 → P-3 → E-3 → RollInput x, IntentRefusal → "no throw … gives re-roll" (as an intent refusal) |
| TM-4 | P-5 → P-5 → E-4, E-8 → Jitter → "the seed supplies only a jitter u" |
| TM-5 | P-6 → P-6 → E-5, E-9 → Roll, Φ (stand-in) → "the simulation of the logged input decides" |
| TM-6 | P-7 → P-7 → E-6 → OutcomeReader → "less than one turn … re-spin" |
| TM-7, TM-10 | P-8 → P-8 → E-7, E-10 → SettleRecord → "record that input so (seed, seats, log) replays" |
| TM-8 | P-5 → P-5 → E-8 → Jitter, GBC-85 → "replay is exact" |
| TM-9 | P-4, P-7 → P-4, P-7 → E-9 → StartState, OutcomeReader → "the Spinner's sector and resting angle" |
| TM-11 | P-6 → P-6 → E-11 → EnergyBooks → plan §3 "the energy books balance" |
| TM-12, TM-13 | P-9 → P-9 → E-12, E-13 → ReplayCheck → "the settled world's snapshot hash … is the replay check" |
| TM-14 | P-6 → P-6 → E-14 → Φ, GX-50 → plan §3 "Rapier's spin against the formula, within a stated tolerance" |
| TM-15, TM-16 | P-10 → P-10 → E-15, E-16 → Dyno → "fairness is measured, not assumed … chi-square" |
| TM-17 | P-7 → P-7 → E-17 → OutcomeReader (die) → "a die cocked against a wall … re-roll" |
| TM-18 | P-11 → P-11 → E-18 → Provenance → "measured, published or assumed" |
| TM-19 | P-6, P-7 → — → E-19 → Φ → G-1's worked example |

**Chain breaks:** none.

## 7. Determination

**PASS WITH LATENT ASSUMPTIONS.** The base-case primitive set operates correctly on the minimal instance: every
primitive was invoked; every step held PD at 1.0 with a stated reason; no conflicting assumption arose; no AE blocked
(AE-c14 and AE-c18 change results, so both readings were executed and reported, not chosen); traceability is intact.
Seven assumptions were exposed: five latent (LA-1 to LA-5), now added to step 3's assumption log, and two benign. Proceed
to the Consistency Gate with the updated log.

What was proven at the base case: the gap's example re-derives exactly; the two refusal classes behave differently
(no draw against a draw); one draw per attempt makes replay exact when every drawing attempt is in the log, and the
sealed streams make it diverge otherwise; tampering is detected; the jitter's claim and the hand's claim are distinct
and measurable; and the die's reader refuses a cocked or untumbled die rather than repairing it.

What was not proven: anything about Rapier itself (determinism across platforms, the closed form's agreement, the die's
behaviour). Those are deferred vectors with discharge conditions (Implementation Specification).

## 8. Quality check

- Minimal: one degree of freedom, three submissions, the fewest that reach every primitive and both refusal classes.
- Every primitive invoked at least once (§3, column 2).
- No new primitive, axiom or object introduced. The stand-ins are labelled and decide nothing.
- No AE resolved: both readings of AE-c14 and AE-c18 executed side by side.
- Assumptions classified; the latent ones are appended to step 3.
- Traceability intact (§6).
- Determination stated with justification (§7).

## 9. Owner's approval

Approved by the owner, 2026-11-08, live at the gate: **"Approve, go on"** (to the Consistency Gate). R2 spend at the
gate: 1.91M of 8M weighted.

## 10. Addendum after the adversarial pass (the owner: "Apply all")

The determination stands: the example executed the primitive set approved at the time correctly, apart from E-12's
comparison and E-15's floors, corrected above (F-3, F-13), and E-16's chained χ², withdrawn (F-2). The owner's later
rulings change three things in how the same log runs. The symmetric jitter applies (AE-c15). The spinner's floor sits on
the input before the draw (F-1). A refused attempt that never simulated moves nothing. Re-executed under those final
rules by `rerun_final_rules` in the script (the least floor at which every u clears one turn, x_min = 5278 mrad/s, is
used here; the real x_min is the owner's at R5):

| # | Submission | Result |
|---|---|---|
| A0 | x = 0 | intent refusal "no flick"; no draw |
| A1 | x = 3000 < x_min | intent refusal "re-spin"; no draw; not logged; nothing moves |
| A2 | x = 12000 | the first draw, u₁ = 0.557480385992676, at draw index 1; ω_eff = 12·(1 + 0.05·(2u₁ − 1)) = 12.0690 rad/s; s0 = 0; Θ = 36.4150 rad; rest 4.9991 rad; **VALUE(sector 6)** |

The draw-index property (GBC-85) and the replay of logged outcome refusals are unchanged in mechanism: an outcome
refusal (non-finite, unsettled, escaped, no-tumble, cocked, or the spinner's defect hook) still consumes its draw and is
logged, exactly as E-7, E-8 and E-12 showed for A1.
