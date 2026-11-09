# Extension G-1 · Phase 1 · Step 3 — Base Case Reduction

Source: `step-2-theoretical-design.md` (batched under standing approval). Circuit simplification comes first,
mathematical simplification after it. Tautology tests touch new objects only; no sealed object is a removal
candidate (E-1). Notation: Appendix A §A.5 (circuit), §A.7 (tautology), §A.2 (object classes).

## 1. Summary of the full theoretical model

Thirteen axioms (GX-40 to GX-52) over 22 objects (step 2 §4). One deterministic roll function decides; two refusal
classes bound it; a pin, a fresh world and a fixed step make it exact; a snapshot hash detects any failure of
exactness; a dyno in two claims and a provenance tag on every number keep fairness and data honest. Seventeen
ambiguities (AE-c13 to AE-c29) and nine conflicts (CF-1 to CF-9) stay open.

## 2. Conflict and preservation risk review

| Risk | Objects | Why it matters |
|---|---|---|
| False merge of the two refusals | IntentRefusal, OutcomeRefusal | Same EV-5 symbol, different records and different logging (GX-47) |
| False merge of "escaped" into "unsettled" | read_D's escaped test, ρ | An escaped die in a world without outside ground never settles, so "unsettled" would eventually catch it |
| False removal of the post-simulation turn test | read_S's under-one-turn test, Φ | Φ predicts Θ before simulating; using it would make the closed form a decider (GX-40) |
| False merge of the two fairness claims | Dyno (hand), Dyno (jitter) | One χ² over an unstated population cannot bound aiming |
| Constraints that limit preservation | the sealed apply context (CF-4), the sealed SeatView (CF-5), the tier checker (CF-6), REF-24's test (CF-7) | Each is cited, not changed |
| Ambiguities that must stay visible | AE-c14 to AE-c29 | Several decide how much the hand controls (AE-c15, AE-c18) |

## 3. Logic-circuit map (A.5)

**Inputs:** intent {type ∈ {`die:throw`, `spinner:spin`}, seat, args {component, x}}; state; the wired solver S; the
apply context's streams. **Outputs:** next state (kind field and/or settle record) or an intent refusal; at the host
boundary, a hosted game or UNCOMPUTABLE(π).

```
GATE G-H HOST      { condition: ℒ(π) resolved to S with S.build = π.build,
                     closed_by: DERIVATION, proposals_in: none,
                     records: the wire function closes over S,
                     ON_FAIL: UNCOMPUTABLE(π) }                       -- before host/resume/rebuild; outside submit
GATE G-0 ADMIT     { condition: preset complete ∧ κ on every value ∧ τ > 0 (spinner) ∧ μ > 0 ∧ e < 1 (die)
                     ∧ dyno record present (pass rule: AE-c21),
                     closed_by: DERIVATION, records: preset hash in the pin record,
                     ON_FAIL: REFUSE(preset-inadmissible) }
GATE G-1 GUARD     { condition: turn discipline (sealed) ∧ component ∈ C_R ∧ x ∈ ℤᵏ within bounds ∧ x ∉ floor
                     ∧ (spinner: x ≥ x_min, set so every u clears M_min ≥ one turn — F-1) ∧ pin record present,
                     closed_by: DERIVATION (Guard, pure), records: nothing,
                     ON_FAIL: REFUSE(intent: MALFORMED_ARGS | RULE_REFUSED) }   -- REF-01: not logged, no draw
EDGE G-1 → DRAW    [precondition]
DRAW               u ← stream(component).next()                       -- exactly one draw per attempt
EDGE DRAW → BUILD  [precondition]
BUILD              x_eff := x ⊙ (1 + ε·g(u)); W₀ := build_π(P, x_eff, s0)   -- GX-41 operations only
LOOP L-1 STEP      { edge: W_n → W_{n+1} while ρ(W_n) = MOVING ∧ n < N, monotone: yes }   -- bounded by N
GATE G-F FINITE    { condition: every value in the RollRun is finite, closed_by: DERIVATION,
                     ON_FAIL: REFUSE(non-finite) }                     -- F-10: first in the order; nothing non-finite is recorded
GATE G-2 SETTLED   { condition: ∃ n* ≤ N with ρ(W_{n*}) = AT_REST, closed_by: DERIVATION,
                     ON_FAIL: REFUSE(unsettled) }
GATE G-3 INSIDE    { condition: die within tray bounds at n* (die only), closed_by: DERIVATION,
                     ON_FAIL: REFUSE(escaped) }
GATE G-4 EARNED    { condition: die distinct up-faces during motion ≥ T_f; spinner Θ ≥ 2π (a defect hook only: G-1's
                     x_min makes it true for every u, so a failure means the preset's margin is wrong — F-1),
                     closed_by: DERIVATION, ON_FAIL: REFUSE(no-tumble | under-floor, flagged as a preset defect) }
GATE G-5 CLEAR     { condition: die max_f (R(q)·n_f)·ŷ ≥ cos α; spinner on-line rule (AE-c29),
                     closed_by: DERIVATION, ON_FAIL: REFUSE(cocked | on-line) }
GATE G-6 RECORD    { condition: G-F, G-2..G-5 evaluated in that fixed order; the first failing gate names the refusal,
                     closed_by: DERIVATION,
                     records: σ = (component, k, x, u, x_eff, s0, O, rest pose, n*, H, pin ref);
                              on VALUE also the kind's sealed field (Die.face | Spinner.sector),
                     ON_FAIL: — (always records) }
EDGE G-6 → LOG     [precondition]  -- logging of a REFUSE outcome: AE-c14 (ruled "Log it": see §12)
GATE G-7 REPLAY    { condition: recompute(σ).H = σ.H, closed_by: DERIVATION,
                     ON_FAIL: REFUSE(divergence) — refused whole (GX-4, REF-09) }
↯(GX-2)  G-1 → intent refusal
↯(GX-45) G-2..G-5 → outcome refusal
↯(GX-43) G-H → UNCOMPUTABLE(π)
↯(GX-46) G-7 → DIVERGENCE
```

**Control points:** G-1 (the Guard), G-6 (the only write), G-7 (replay). **Feedback loops:** L-1 only, monotone and
bounded; no loop crosses attempts (GX-44). **Recursion:** none. **Decision gates for humans:** none inside a roll
(EV-7's human gates are the owner's rulings on presets, ε and the pass rule, made before play).

## 4. Circuit simplification steps

| # | Original form | Simplified form | Reason and proof | Objects | Traceability | Meaning | Conflict impact |
|---|---|---|---|---|---|---|---|
| S-1 | A "solver ready?" gate inside every submit | An invariant inside submit plus G-H at the host boundary | The sealed applier is synchronous (`core.ts:35`); *this module's* only applier constructor takes a ready solver, so if G-H passes, every roll applier this module makes has S. **Corrected after the adversarial pass (F-8):** the module's doors are not the engine's. `registerIntent` and `supersedeIntent` are public (`core.ts:79-111`) and `rebuild` returns a bare core, so another module could supersede a roll intent with an applier holding no solver or another build. The inner condition is therefore kept as a load-bearing hook (XH-03), with its own refusal test, not as defence in depth | ℒ, S, G-1 | G-H carries the old gate's ON_FAIL; the hook carries its condition | Kept: no roll is ever simulated without S | Resolves the circuit half of CF-4's neighbour AE-c13 only as a *shape*; AE-c13 is still the owner's |
| S-2 | G-2..G-5 as four independent gates, each able to fire | One ordered chain with a fixed precedence | Two gates can fail on one attempt (an escaped die is usually also unsettled). Unordered gates would name the refusal by evaluation order, which is unstated. Fixing the order makes the refusal's name a function of the attempt | G-2..G-6 | Each gate keeps its own name and test | Kept; made deterministic | None |
| S-3 | Spinner turn test predicted by Φ before simulating | Unchanged: the test reads the simulated Θ | **Not simplified.** Using Φ would make the oracle a decider, which GX-40 forbids | read_S, Φ | — | Preserved | — |

**Deleted circuit elements:** none.

## 5. Minimal primitive set

| # | Primitive [sym] | Definition | Why primitive | Depends on it | Meaning preserved |
|---|---|---|---|---|---|
| P-1 | EnginePin [π] | (package, version, build SHA-256, ι, dt) | Nothing else names the exact engine | G-H, roll, χ | "the same version" (A-1) |
| P-2 | Preset [P] | the component's physical values, each with κ | Ruleset data; not derivable | roll, G-0, Δ | the physical description |
| P-3 | RollInput [x] | integers in declared units | The human's argument (GX-5) | x_eff | "the seat's own throw" |
| P-4 | StartState [s0] | start angle / start orientation | Not derivable from x | build | continuity between rolls |
| P-5 | JitterDraw [u] | one stream draw per attempt, with ε and g | The only entropy | x_eff | "the seed jitters" |
| P-6 | Roll [roll_π] | settle_π ∘ simulate_π ∘ build_π with ρ and N | The decider | P-7, P-8 | "physics decides" |
| P-7 | OutcomeReader [read_c] | rest world → VALUE or REFUSE, gates G-F, G-2..G-5 | The only map from physics to outcome | P-8 | "refuse, never repair" |
| P-8 | SettleRecord [σ] | the attempt's full record, including O and H | The replayable fact | χ, 𝒯 | "record that input so (seed, seats, log) replays" |
| P-9 | ReplayCheck [χ] | recompute σ and compare H | The only detector of a determinism failure | GX-46 | "the snapshot hash is the replay check" |
| P-10 | Dyno [Δ] | simulated rolls from a stated population, χ² | The only fairness evidence | G-0 | "fairness is measured" |
| P-11 | Provenance [κ] with the Dataset [𝒟] | sources, fits, held-out checks per parameter | The only honesty about numbers | P-2 | "measured, published or assumed" |

## 6. Preserved theoretical objects, classified (A.2)

```
PRIMITIVE   EnginePin    :: π   { def: (package, version, buildSha256, ι, dt), deps: [], preserves: "same version", cites: [A-1, GX-43] }
HYBRID      PinRecord    :: πr  { settled: contents = (π, preset hashes); open: AE-c16 (where it is recorded) }
PRIMITIVE   Preset       :: P   { def: physical values with κ, deps: [κ], preserves: ruleset's physics, cites: [GX-49, GX-51] }
PRIMITIVE   RollInput    :: x   { def: ℤᵏ in units s, deps: [], preserves: the seat's throw, cites: [GX-41, GX-5] }
HYBRID      StartState   :: s0  { settled: exists and is recorded in σ; open: AE-c18 (its source) }
HYBRID      JitterDraw   :: u   { settled: one draw per attempt from the component's stream; open: AE-c15 (g, jittered components) }
DERIVED     InputInEffect :: x_eff = x ⊙ (1 + ε·g(u))   { trace: [GX-42] }
HYBRID      Roll         :: roll_π { settled: fresh world, fixed dt, fixed order, bounded loop; open: AE-c19 (ρ's numbers, N) }
PRIMITIVE   OutcomeReader :: read_c { def: gates G-2..G-5 in order, deps: [roll_π, P], preserves: refuse-never-repair }
HYBRID      SettleRecord :: σ   { settled: contents; open: AE-c17 (location), AE-c14 (logging of a REFUSE) }
DERIVED     SnapshotHash :: H = hash(snapshot_π(W_{n*}))   { trace: [GX-46] }
PRIMITIVE   ReplayCheck  :: χ   { def: recompute and compare H, deps: [σ, π], preserves: replay exactness }
DERIVED     Trajectory   :: 𝒯 ⇐ derive(poses of roll_π(σ))   { trace: [GX-52, EV-3]; open delivery: AE-c22 }
HYBRID      Dyno         :: Δ   { settled: two claims, χ²; open: AE-c21 (α_sig, population, consequence) }
PRIMITIVE   Provenance   :: κ   { def: measured | published | assumed + source, deps: [𝒟] }
HYBRID      Dataset      :: 𝒟   { settled: sources, fits, held-out third; open: AE-c27 (third-party footage) }
CONTEXTUAL  SolverLoader :: ℒ   [scope: the host boundary, before host/resume/rebuild]  { def: π → Promise⟨S⟩ }
CONTEXTUAL  ReadySolver  :: S   [scope: inside the wire closure]  { def: an initialised engine whose build = π.build }
CONTEXTUAL  ClosedForm   :: Φ   [scope: vectors and analysis only; never a decision path]  { def: step 2 §10 }
DERIVED     EnergyBooks  :: E = ½Iω₀² − τΘ − b∫ω²dt − ΣΔE   { trace: [GX-50] }   -- = 0 in the model
DERIVED     SkillIndex   :: δω = (2π/N_s)·(τ + bω₀)/(Iω₀)   { trace: [GX-48] }
DERIVED     JitterCoverage :: span(Θ over u) / 2π   { trace: [GX-48, CF-9] }
EXTERNAL    Rapier       :: R   @rapier.rs   -- step, snapshot, build; never defined here
EXTERNAL    sealed: MOD-02 submit/registerIntent, MOD-03, MOD-04 RNGStream.next, MOD-10 Die/Spinner, MOD-11 Randomizer,
            MOD-27 host/resume(wire), MOD-29, MOD-33 project, MOD-34 HOOK-11   @seal-1
```

Intent refusal and outcome refusal are not objects of their own: they are the ON_FAIL outcomes of G-1 and of G-2..G-5,
whose names and records keep them apart (GX-47).

## 7. Removed or merged objects

**None.** Three candidates were tested (§8) and all three were preserved.

## 8. Tautology tests (A.7.1)

```
TAUTOLOGY_TEST <REFUSE(escaped), REFUSE(unsettled)> {
  meaning_equivalence:      NO  — "left the tray" vs "never came to rest"; players are told different things
  function_equivalence:     NO  — escaped ends the attempt at once; unsettled only after N steps
  expressive_power_equivalence: NO — a world with ground outside the tray lets an escaped die settle
  traceability_equivalence: NO  — escaped traces to the tray's bounds; unsettled to the step cap
  theoretical_relevance_equivalence: yes
  operational_usefulness_equivalence: NO — the dataset counts escapes to size the tray
  reversibility_or_dependency_equivalence: NO
  result: INVALID ⇒ preserve both
}
TAUTOLOGY_TEST <IntentRefusal, OutcomeRefusal> {
  meaning_equivalence: NO (an illegal request vs a legal throw that did not settle) · function: NO (not logged, no draw vs
  drawn and recorded) · expressive_power: NO · traceability: NO (GX-2 vs GX-45) · theoretical_relevance: yes ·
  operational_usefulness: NO (re-rolls are counted for fairness audits only if recorded)
  result: INVALID ⇒ preserve both
}
TAUTOLOGY_TEST <Dyno(hand), Dyno(jitter)> {
  meaning_equivalence: NO (fair for a population vs aim-proof for any input) · function: NO (different input sets) ·
  expressive_power: NO (neither bounds the other) · traceability: NO (GX-48a vs GX-48b) · theoretical_relevance: yes ·
  operational_usefulness: NO
  result: INVALID ⇒ preserve both
}
```

## 9. Mathematical simplification notes

Only after the circuit: the spinner's dynamics depend on τ/I and b/I alone. Dividing by I, ω̇ = −a − cω with
a = τ/I and c = b/I, so Θ = (1/c)(ω₀ − (a/c)·ln(1 + cω₀/a)), T = (1/c)·ln(1 + cω₀/a), and with no drag Θ = ω₀²/(2a).
The skill index becomes δω = (2π/N_s)·(a + cω₀)/ω₀. **Consequence for the dataset:** a and c are identifiable from a
filmed decay alone (dω/dt is linear in ω, so a straight-line fit of dω/dt against ω gives −c as slope and −a as
intercept); I and τ need only be known separately where the engine needs them (τ = a·I with I from mass and geometry).

## 10. Value-expression reduction

- Spinner preset: P_S = (I, a, c, d, widths, r_grab, ε, ρ-numbers, N) with τ := a·I, b := c·I, ΔE := d·I.
- Die preset: P_D = (edge, mass, corner radius, labels, {(μ, e)} per contact pair, tray, ε, ρ-numbers, N, α, T_f).
- Outcome: O ∈ VALUE(ℤ) ∪ REFUSE(name). The kind's sealed field takes the VALUE; σ takes O whole.

## 11. Base cases, refusals first

New identifiers continue above the sealed GBC-64. "Not logged" means GX-2 and REF-01 hold as written.

**Intent refusals (the Guard; nothing drawn, nothing logged):**
- **GBC-65 —** *Given* a roll intent whose input is not all integers, is out of bounds, or misses a field, *when*
  submitted, *then* MALFORMED_ARGS; state byte-unchanged; nothing logged; the component's stream not advanced.
- **GBC-66 —** *Given* an input below the no-throw floor (all zero is the smallest), *then* RULE_REFUSED "no throw" or
  "no flick"; not logged; no draw.
- **GBC-67 —** *Given* a roll of a component that is not a Die or Spinner, or out of turn, *then* refused under the
  sealed turn discipline (cited: HOOK-01, REF-01).
- **GBC-68 —** *Given* a game whose pin names an engine build that is not loadable here, *when* hosting or resuming,
  *then* UNCOMPUTABLE(π): the game is not hosted, and no roll is simulated on a substitute or replaced by a seeded draw.

**Admission refusals:**
- **GBC-69 —** *Given* a spinner preset with τ ≤ 0, or a die preset with μ ≤ 0 or e ≥ 1, *then* refused at admission:
  "a spinner must stop" (GX-51).
- **GBC-70 —** *Given* a preset with any value lacking a provenance tag, *then* refused at admission (GX-49).
- **GBC-71 —** *Given* a preset with no dyno record, *then* not admitted for play; with a failing record,
  UNDETERMINED(AE-c21) until the owner's pass rule.

**Outcome refusals (the physics; never repaired):**
- **GBC-72 —** *Given* a flick below the preset's x_min, *when* submitted, *then* an intent refusal, "re-spin"; no
  draw; not logged; Spinner.sector unchanged; nothing moves. *(Revised after the adversarial pass, F-1: the floor sits on
  the input, before the draw, so no refusal can select on u.)* *Given* an admitted flick whose simulated turn is
  nonetheless under 2π, *then* REFUSE(under-floor), recorded and flagged as a preset defect.
- **GBC-73 —** *Given* a throw whose die rests with max_f (R(q)·n_f)·ŷ < cos α (cocked against a wall), *then*
  REFUSE(cocked), "re-roll"; Die.face unchanged.
- **GBC-74 —** *Given* an attempt not at rest within N steps, *then* REFUSE(unsettled).
- **GBC-75 —** *Given* a die outside the tray's bounds at rest, *then* REFUSE(escaped).
- **GBC-76 —** *Given* a die that showed fewer than T_f distinct up-faces while moving, *then* REFUSE(no-tumble): a die
  slid flat keeps the face its thrower placed.
- **GBC-77 —** *Given* a logged attempt whose recomputed hash differs from its recorded H, *then* DIVERGENCE, refused
  whole (GX-4, REF-09), never patched.

**Positive base cases:**
- **GBC-78 —** *Given* a valid flick with Θ ≥ 2π, *then* VALUE(sector) in Spinner.sector, σ with rest angle and H, the
  intent in the log.
- **GBC-79 —** *Given* a valid throw that tumbles, stays inside, settles flat within N, *then* VALUE(face) in Die.face
  and σ recorded.
- **GBC-80 —** *Given* a row with roll attempts, *when* rebuilt on two platforms, *then* identical outcomes and hashes
  (theorem D, falsifiable).
- **GBC-81 —** *Given* the peg-free spinner preset, *then* the engine's Θ matches Φ within the derived tolerance and the
  energy books balance within tolerance (GX-50).
- **GBC-82 —** *Given* ω₀ < ω₀′ on one preset and one u, *then* Θ(ω₀) < Θ(ω₀′).
- **GBC-83 —** *Given* a preset, *then* both dyno claims yield a record naming π and the preset hash, with χ² and p.
- **GBC-84 —** *Given* σ, *then* the derived trajectory's last pose equals σ's rest pose, and its outcome equals O
  (GX-52).
- **GBC-85 —** *Given* any attempt, *then* exactly one draw is made, and its draw index equals the number of earlier
  drawn attempts on that component in the log (the property AE-c14 must secure).
- **GBC-86 —** *Given* an attempt whose RollRun holds a non-finite value, *then* REFUSE(non-finite), recorded without
  the value (added after the adversarial pass, F-10).
- **GBC-87 —** *Given* a preset's dyno, *then* both claims are computed on accepted outcomes with the acceptance rate
  reported, and, where starts chain, the hand's claim tests the outcome relative to the start (added after the
  adversarial pass, F-1, F-2).

## 12. Open decision gates

| Gate | Decision | Blocking | Owner | Resolves when |
|---|---|---|---|---|
| ODG-g1 (AE-c14) | Is an outcome refusal logged? A refusal decided in the applier after the draw must be a succeeded, logged apply, or GBC-85 fails; a Guard-side route could keep it unlogged without a sealed change (step 2 §8, corrected after the adversarial pass, F-4) | yes, for the Consistency Gate | owner | Consistency Gate (ruled "Log it") |
| ODG-g2 (AE-c13) | The async load rule: G-H at the host boundary (S-1) | yes, for the Consistency Gate | owner | Consistency Gate |
| ODG-g3 (CF-1) | Does I-260 supersede the S1 v2.0 do-not's first half for the Die and the Spinner? | yes, for the Consistency Gate | owner | Consistency Gate |
| ODG-g4 (AE-c17) | The rest pose in a settle record, or the Spinner kind superseded (a sealed change: E-1, blocking and a redesign) | no, if the settle record is chosen | owner | Consistency Gate |
| Others | AE-c15, c16, c18 to c29 | no | see the Consistency Gate | — |

## 13. Base Case Reduction quality check

- Circuit simplification came first (§3, §4); mathematics after (§9, §10).
- No object was removed by similarity; the three candidates failed their tautology tests and were preserved (§8).
- No removal was made, so no removal proof is owed; the load-bearing "proposed object removal" gate does not fire.
- Conflicts were not silently resolved: CF-4's answer is argued, not adopted (ODG-g1).
- Traceability: every primitive traces to an axiom (§5 column "Meaning preserved") and every base case to a gate.

Under standing approval this gate batches. Audit note: S-1 changes a gate into an invariant plus a hook on a proof that
the inner condition is always true; S-2 fixes the refusal precedence. Neither drops a test.

## 14. Assumption log (appended at the Minimal Worked Example, as its rule requires)

Carried from Intake: A-1 to A-7 (`step-1-intake.md` §3). Added from `step-4-minimal-worked-example.md` §4:

| ID | Assumption | Primitive | Class |
|---|---|---|---|
| LA-1 | The component's stream is named after the component | P-5 | latent |
| LA-2 | The jitter's claim is measured as an aim-advantage bound A = N_s · max_i p_i(x) over admissible inputs, not a χ² uniformity test | P-10 | latent |
| LA-3 | The hand's claim depends on the start policy; a dyno states it. *Corrected after the adversarial pass (F-2):* under R-a the start is public, so the claim tests the outcome relative to the start (Θ mod 2π) or conditions on s0; a χ² over chained starts is vacuous (a perfectly repeatable flick with no jitter scores 0.04) | P-10, P-4 | latent |
| LA-4 | GX-50's vector compares Θ within a tolerance of at least the integrator's order (≈ ω_eff·dt/2), never sectors | P-6 | latent |
| LA-5 | A refused attempt's trajectory is shown, so under R-a the next spin starts at its rest | P-4 | latent |

**Revised after the adversarial pass** (`step-8-adversarial-pass.md`, owner: "Adopt the fix", "Apply all"): G-1 gains
the spinner's input floor and G-4's spinner test becomes a defect hook (F-1); G-F added (F-10); S-1's proof narrowed
(F-8); GBC-72 rewritten, GBC-86 and GBC-87 added; ODG-g1's wording (F-4); LA-3 (F-2).
