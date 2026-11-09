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

### Extension G-1 · Phase 1 · Step 2 — Theoretical Design

Source: `step-1-intake.md` (batched under standing approval). Notation: Appendix A of the Phase 1 roster, cited by
section (A.2 objects, A.3 registers, A.4 values and prohibited forms). Sealed objects are cited by identifier and never
re-derived (E-1).

#### 1. Restated informal concept

A Die or Spinner's roll outcome is the settled state of a deterministic simulation of the seat's own logged input,
lightly jittered by the seed, on a pinned engine with pinned presets, in a fresh world at a fixed step. The outcome,
the snapshot hash and the record of the attempt are game state. A throw that does not settle cleanly gives a refused
outcome, never a repaired one. Fairness and every parameter's source are measured or declared, never assumed silently.

#### 2. Purpose of the theoretical model

To state, as checkable objects and axioms, the conditions under which "physics decides" is (a) **exact on replay on
any machine**, (b) **the only decider** (no seed-chosen outcome, no steering), (c) **refusal-first** at its edges,
and (d) **measurably fair**, while adding nothing to and changing nothing in the sealed library.

#### 3. Axiomatic set

New axioms continue above the sealed GX-39.

**GX-40 · Physics decides.**
*Statement.* For a roll of component c (kind Die or Spinner), the outcome is
O = read_c(settle_π(simulate_π(build_π(P, x_eff, s0)))), a function of the pin π, the preset P, the logged input x,
the jitter draw u (through x_eff) and the start state s0, and of nothing else.
*Explanation.* No animation, offset, second draw or view computation enters O.
*Trace.* I-260 ("physics decides, for the die and the spinner"); G-1 rule 1 ("the simulation of the logged input
decides").
*Why it matters.* It is the reversal of I-82(e); every other axiom serves it.

**GX-41 · Inputs are integers; starting values use basic operations only.**
*Statement.* x ∈ ℤᵏ in declared units (AE-c20). Every binary64 value handed to the engine is produced, by a fixed
finite sequence of +, −, ×, ÷ (ECMA-262 Number operations, IEEE 754 round-ties-to-even) and the exactly specified
`Math` functions only (`abs`, `ceil`, `clz32`, `floor`, `fround`, `imul`, `max`, `min`, `round`, `sign`, `trunc`), from
integers, pinned literals, and *a prior attempt's recorded engine output* (the rest pose in σ). No other `Math`
function, no `Math.random`, clock or locale-dependent operation enters the construction or a decision. A pinned literal,
in source or in preset JSON, has at most 17 significant digits. *(Revised after the adversarial pass, F-5a and F-12.)*
*Explanation.* ECMA-262 specifies Number's four operations and those `Math` functions exactly and leaves the rest of
the `Math` library implementation-approximated; it also allows implementation latitude when a decimal number has more
than 20 significant digits, in a literal or in `JSON.parse`. Seventeen are enough for any binary64 value.
*Trace.* G-1 "rounded to integers in the intent", "starting values come from deterministic operations only"; Rapier's
determinism page (A-1): `Math.sin` and `Math.cos` are named as not cross-platform deterministic.
*Why it matters.* Rapier's guarantee is conditional on identical starting values; this axiom is how they are made
identical.

**GX-42 · The seed jitters, never decides.**
*Statement.* Each roll attempt draws exactly one value u from the component's named stream (GX-5, MOD-04). The input in
effect is x_eff = x ⊙ (1 + ε·g(u)) on the jittered components, with ε > 0 per component. If x is below the floor, no
draw is made and there is no roll. *(Owner's rulings: g(u) = 2u − 1, symmetric (AE-c15); for the die, one factor scales
the velocity and the spin, and the release position is not jittered ("Velocity and spin only", F-6).)*
*Trace.* G-1 Inputs ("the seed supplies only a jitter u … with ε > 0 no player can aim"); GX-5 (human inputs are
arguments, never entropy).
*Why it matters.* It keeps GX-5 and GX-14 true as written: the only entropy is still a stream draw.

**GX-43 · The pin is recorded with the ruleset and checked before simulating.**
*Statement.* Every roll is simulated on exactly the pin π = (engine package, version, build hash, integration
parameters, dt) and preset hash recorded for the game, where (packRef, seed, seats, log) covers it (AE-c16). If the
loaded engine is not π, the roll is not simulated: the outcome is UNCOMPUTABLE(π), never a substitute engine and never
a seeded fallback.
*Trace.* G-1 "the physics engine's version is pinned and recorded with the ruleset"; plan §3 "an old game replays on its
own version"; A-1 (the claim is per version only).
*Why it matters.* Rapier claims nothing across versions; an unpinned roll is a different game.

**GX-44 · A fresh world per roll, at a fixed step.**
*Statement.* Each roll attempt builds a new world from (P, x_eff, s0), inserting bodies, colliders and joints in one
fixed order; steps it at the pinned dt with the pinned integration parameters; and frees it. No world state crosses
attempts. The number of steps is decided by the settle rule over the simulated state alone, never by wall-clock time or
frame rate.
*Trace.* G-1 "the time step is fixed; each roll gets a fresh world"; A-1 (insertion order).
*Why it matters.* It makes each attempt a pure function of its own record.

**GX-45 · Settle or refuse; never repair.**
*Statement.* An attempt's outcome is VALUE(o) only if the world comes to rest within N steps and the reader finds an
unambiguous outcome that the motion earned (the die tumbled at least the floor and rests flat). Otherwise it is
REFUSE(reason) with reason ∈ {non-finite, unsettled, no-tumble, cocked, escaped, on-line (if adopted, AE-c29)}, shown as
"re-roll" or "re-spin". No pose is nudged, rounded or re-dropped. **The spinner's floor is tested on the logged input,
before the draw** (x ≥ x_min, preset data set so that every u clears M_min ≥ one turn with an engine margin): below it
is an intent refusal, "re-spin". The simulated turn test stays only as a defect hook. *(Revised after the adversarial
pass, F-1, on the owner's word "Adopt the fix": a floor tested after the draw lets refusals select on u; and F-10.)*
*Trace.* G-1 "refuse, never repair, a throw that does not settle cleanly"; GX-2 (the library's own refusal-not-repair).
*Why it matters.* A repaired pose is an outcome nobody's input produced.

**GX-46 · The snapshot hash is the replay check.**
*Statement.* The settled world's snapshot is hashed by a pinned, synchronous, pure-JS hash (the applier is synchronous;
WebCrypto's digest is not; the sealed FNV-1a-64 is the candidate, F-11), and the hash H is recorded with the outcome. Replay recomputes the
attempt from its record and compares: equal is the replay; different is a DIVERGENCE, refused whole (GX-4, REF-09),
never patched.
*Trace.* G-1 Outputs; A-1 (Rapier: equal snapshots give equal hashes on every machine after the same number of steps).
*Why it matters.* It turns a silent determinism failure into a loud one; without it the axioms above are unfalsifiable.

**GX-47 · Two refusals, kept apart.**
*Statement.* An *intent refusal* is the Guard's: malformed, out of turn, out of range, below the no-throw floor or the
spinner's flick floor, or unpinned. The state is byte-unchanged, nothing is drawn, nothing is logged (GX-2, REF-01). An *outcome refusal* is the
physics': the throw was made and simulated and did not settle cleanly. The two never collapse (EV-5: both are REFUSE,
with different names and different records). Whether an outcome refusal is logged is AE-c14.
*Trace.* G-1 Rules ("refusal, never repair") with the sealed GX-2; Intake CF-4.

**GX-48 · Fairness is measured, in two claims.**
*Statement.* A preset is fit for play only with a dyno record naming π and the preset hash: (a) *the hand's claim*:
N simulated rolls whose inputs are drawn from a stated population of throws (from the dataset), chi-square against the
target distribution (faces equal; sectors in proportion to width) at a stated significance; (b) *the jitter's claim*:
for fixed admissible inputs, the outcome distribution over u alone, which bounds how much any input can aim, measured
as the aim advantage A = N_s · max_i p_i(x) over admissible x (LA-2). Both claims are measured on **the outcome a seat
finally gets**, conditional on acceptance, with the acceptance rate reported, so no refusal can select on u (F-1). Where
starts chain (AE-c18), the hand's claim tests the outcome **relative to the start** (Θ mod 2π), or conditions on s0;
an unconditioned χ² over chained starts is vacuous (F-2).
*Trace.* G-1 "fairness is measured, not assumed: 10,000 simulated throws per preset, chi-square"; plan §3 (Poincaré's
argument; the skill index); G-1 "with ε > 0 no player can aim".
*Why it matters.* A single chi-square over an unstated population proves nothing about aiming.

**GX-49 · Every parameter states its provenance.**
*Statement.* Each preset parameter carries κ ∈ {measured, published, assumed} and its source. "Measured" requires a fit
from a source with a known time base and length scale, and a held-out check. An assumed value is reported as assumed
wherever the preset is.
*Trace.* G-1 "each parameter says where it came from: measured, published or assumed".

**GX-50 · The spinner proves the engine.**
*Statement.* Before any die outcome relies on the engine, the engine's peg-free spinner must match the closed form
(§10) within a derived tolerance, and its energy books must balance within tolerance.
*Trace.* Plan §3 "The spinner proves the engine".

**GX-51 · A Randomizer preset must be able to stop.**
*Statement.* A spinner preset with bearing friction τ ≤ 0 is refused at admission; so is a die preset whose surface has
no friction or no energy loss (μ ≤ 0 or restitution e ≥ 1).
*Trace.* G-1 "A spinner with no friction is refused at admission (it must stop)". The die's half follows from the same
reason: without loss, rest is never reached.

**GX-52 · Shown ≡ decided.**
*Statement.* The outcome a view displays, and the final pose of the trajectory it plays, equal the decided outcome and
the recorded rest pose. A mismatch is flagged, and the decided outcome wins.
*Trace.* G-1 "what the view shows equals the decided outcome (HOOK-11; truth wins)"; GX-38 read under I-260 (AE-c23).

#### 4. Defined theoretical objects

Symbols in brackets. "Sealed" marks a cited dependency.

| Object [sym] | Plain definition | Formal definition | Role | Depends on | Preservation note | Conflicts |
|---|---|---|---|---|---|---|
| EnginePin [π] | The exact engine a game's rolls run on | (package, version, build SHA-256, integration parameters ι, dt) | Pins determinism's "same version" | A-1, A-4 | Must include the build hash: a version string alone does not identify the WASM bytes | AE-c16 |
| Preset [P] | A component's physical description | Die: (edge, mass, corner radius, faces' labels, materials (μ, e) per contact pair, tray geometry, ε, settle numbers). Spinner: (I, τ, b, pegs, ΔE, sector widths, grab radius, ε, settle numbers). Each value with κ | The ruleset's physical half | κ | A preset is data (cf. GX-33's spirit); its hash is part of the pin record | GX-51 |
| Provenance [κ] | Where a number came from | κ ∈ {measured, published, assumed} with a source citation | Honesty of the dataset | Dataset | Never defaulted to "measured" | AE-c27 |
| RollInput [x] | The seat's logged throw or flick | Die: x_D = (p, v, w) ∈ ℤ⁹ (position, velocity, spin). Spinner: x_S = (ω0) ∈ ℤ, plus anything AE-c18 adds | The human's argument (GX-5) | units s (AE-c20) | Logged exactly as given; never rounded again inside the engine | AE-c18, AE-c20 |
| StartState [s0] | Where the roll starts | The component's last recorded rest pose, carried as the engine's own quaternion (never re-derived from an angle, which needs sin/cos); the preset's canonical pose for the first roll (AE-c18 ruling; F-5b) | Continuity between rolls | AE-c18 | A start the player chooses freely is an aiming lever | — |
| Jitter [u, g, ε] | The seed's small perturbation | u = stream(`<component>`).next() ∈ [0,1); g(u) per AE-c15; x_eff = x ⊙ (1 + ε·g(u)) | Defeats the hand's aim | MOD-04 (sealed), GX-5 | One draw per attempt, in a fixed order | AE-c14, AE-c15 |
| WorldBuild [W₀] | The fresh world for one attempt | W₀ = build_π(P, x_eff, s0), fixed insertion order, GX-41 values | Initial condition | π, P, x_eff, s0 | Built only from recorded values | CF-8 |
| Step [step_π] | One fixed-dt engine step | W_{n+1} = step_π(W_n) | Dynamics | π (EXTERNAL @Rapier) | Never variable dt | — |
| SettleRule [ρ] | When the attempt ends | ρ(W_n) ∈ {MOVING, AT_REST}; at rest when every body's squared linear and angular speeds are below pinned thresholds for K consecutive steps (or the engine's own sleep state, AE-c19); n* = first AT_REST step ≤ N, else UNSETTLED | Termination | P's settle numbers | Squared magnitudes avoid `Math.sqrt` (GX-41) | AE-c19 |
| OutcomeReader [read_c] | Turns a rest world into an outcome | First: any non-finite value refuses (F-10). Die: face f maximising (R(q)·n_f)·ŷ; cocked if that value < cos α (cos α a pinned literal); no-tumble if fewer than T_f distinct faces were up during the motion; escaped if outside the tray. Spinner: the pointer direction d = R(q_rest)·p̂ against pinned boundary directions b_i, sector i where b_i × d ≥ 0 and d × b_{i+1} < 0 (sign tests only, no angle recovered); Θ = Σ ω_n·dt accumulated per step from the engine's angular velocity about the hinge axis; Θ < 2π is a defect (F-5c, F-1) | Maps physics to the kind's outcome | ρ, P | Only + − × and comparisons; no `acos`, no `atan2` | AE-c19, AE-c29 |
| RollOutcome [O] | The attempt's result | O ∈ VALUE(face ∣ sector) ∪ REFUSE(reason) | The decision | read_c | EV-5: REFUSE is never rendered as a value, nor a value as REFUSE | GX-47 |
| SettleRecord [σ] | The record of one attempt | (component, attempt k, x, u, x_eff, s0, O, rest pose, n*, H, pin ref) | The replayable fact | all above | Holds the resting angle and full rest pose without changing a sealed kind (AE-c17) | AE-c17 |
| SnapshotHash [H] | Fingerprint of the settled world | H = hash(snapshot_π(W_{n*})) | Replay check | π | Hashes the whole settled world, not just the outcome | — |
| ReplayCheck [χ] | Re-run and compare | χ(σ) = (recompute(σ).H = σ.H) ? replay : DIVERGENCE | Detector for GX-46 | σ, π | Divergence is refused whole (GX-4) | — |
| Trajectory [𝒯] | What the view plays | 𝒯(σ) = (pose(W₀), …, pose(W_{n*})), derived per read from σ, never stored | Theater from truth | σ, π | EV-3: lazy, per read | AE-c22, CF-5 |
| SolverLoader / ReadySolver [ℒ, S] | The async load and its result | ℒ: π → Promise⟨S⟩; S is a solver whose module is initialised | Meets the async engine | π | A solver either exists ready or not at all | AE-c13 |
| IntentRefusal / OutcomeRefusal | The two refusals | see GX-47 | Base cases | Guard (sealed MOD-02) | Never collapse | AE-c14 |
| SpinnerClosedForm [Φ] | The spinner's exact motion without pegs | §10 equations | Oracle for GX-50 and for the jitter's claim | P_S | It is a model of the same physics the engine integrates, not a second decider | AE-c26 |
| EnergyBooks [E] | Energy conservation as a ledger | ½Iω₀² = τΘ + b∫ω²dt + ΣΔE_peg | Invariant | Φ | Checked like the Ledger's balance | — |
| SkillIndex [δω] | The flick precision one sector needs | δω = (2π/N_s)·(τ + bω₀)/(Iω₀) | Measures aimability by hand | Φ | Compared with the measured hand spread | — |
| Dyno [Δ] | Many simulated rolls | Δ(P, π, population, N) → counts per outcome, χ², p | GX-48 | π, P, dataset | Two populations: the hand's and fixed inputs under u | AE-c21 |
| Dataset [𝒟] | Sources, fits and held-out checks | sources (own films, third-party, published), fits per parameter, residuals | GX-49 | κ | A slowed clip has no time base | AE-c27 |

**Sealed dependencies (EXTERNAL in A.2's sense: referenced, never defined here).** EngineCore.registerIntent and
submit (MOD-02, GX-1, GX-2), IntentLog (MOD-03, GX-3), RNGStreams and RNGStream.next (MOD-04, GX-5), the Die and Spinner
kinds (MOD-10, `kinds.ts:138,141`), RoleBinder's Randomizer→RNGStreams (MOD-11, GX-14, SEAM-23), rebuild (GX-4,
REF-09), LockstepController.host and resume with their `wire` argument (MOD-27), TierCriterion (MOD-29, HOOK-06),
SeatProjector (MOD-33, SEAM-39), TheaterSync (MOD-34, HOOK-11, SEAM-44), and Rapier (EXTERNAL @rapier.rs).

#### 5. Ambiguity register

AE-c13 to AE-c28 carry from Intake unchanged. One more surfaced here:

| ID | Ambiguity | Why it stays visible |
|---|---|---|
| AE-c29 | A peg-free spinner whose arrow rests within a small δ of a sector line: decided by the half-open convention, or refused as "on the line" (as many printed rules say) | A result on the line is decided by the engine but may look ambiguous to players; pegs remove the case physically |

#### 6. Conflict register

CF-1 to CF-9 carry from Intake. Their theoretical status:

| ID | Status after design |
|---|---|
| CF-1 | Preserved. GX-40 makes the measured gesture decide through the engine; the S1 v2.0 do-not's second half ("an animation carry game meaning") is kept as GX-52. Whether I-260 supersedes the first half for the Die and the Spinner is the owner's (Consistency Gate) |
| CF-2 | Preserved as AE-c23; GX-52 states the reading |
| CF-3 | Shown not to be a conflict: by GX-42 the only entropy is a stream draw, and the solver is a deterministic function (GX-40), so GX-5 and GX-14 hold as written. Registered as `INTERP benign` |
| CF-4 | Preserved; analysed in §8 below. It forces AE-c14's answer unless a sealed object changes |
| CF-5 | Preserved as a dependency (K7-1-11) |
| CF-6 | Preserved as a dependency (K7-1-3) |
| CF-7 | Preserved as a dependency (K7-1-1, K7-1-10), with AE-c24 |
| CF-8 | Resolved by GX-41 and GX-44 (the bench's construction is the counterexample) |
| CF-9 | Preserved; quantified in §10 (the coverage condition) |

#### 7. Set-theoretic construction

- Components: C_R = {c ∈ components(state) : kind(c) ∈ {Die, Spinner}}.
- Pins Π, presets 𝒫; the game's pin record pin(game) ∈ Π × hash(𝒫) (location: AE-c16).
- Inputs: X_D = ℤ⁹ with box bounds B_D; X_S = ℤ with bounds B_S. The no-throw floor F_c ⊂ X_c: x ∈ F_c ⟹ intent refusal.
- Attempts: A = {(c, k)}: component and attempt index. Each attempt has exactly one u: u(c, k) = the k-th draw of
  stream(c) counted over *every logged attempt* of c (this is what AE-c14 must make true).
- The roll function: roll: Π × 𝒫 × X × [0,1) × S0 → O × Pose × ℕ × Hash.
- Outcome sets: O_D = VALUE({1..6}) ∪ REFUSE(R_D), R_D = {non-finite, unsettled, escaped, no-tumble, cocked};
  O_S = VALUE({0..N_s−1}) ∪ REFUSE(R_S), R_S = {non-finite, unsettled, under-floor (a defect only), on-line?}. A flick
  below x_min never reaches the roll (F-1).
- Membership rules: a VALUE outcome writes the kind's sealed state field (Die.face; Spinner.sector) and the settle
  record; a REFUSE outcome writes only the settle record (and leaves the seat owing the roll).

#### 8. Structural and mathematical embedding

**The determinism theorem (D).** Let the attempt's record be σ = (π, P, x, u, s0). Suppose GX-41, GX-43 and GX-44 hold,
and suppose A-1 (EXTERNAL): for a fixed version and build, step_π maps bit-identical worlds to bit-identical worlds on
every platform. Then O, the rest pose, n* and H are bit-identical on every platform.

*Proof.* By induction over the component's logged attempts (F-5a). *Base:* the first attempt starts from the preset's
canonical pose, a pinned literal. *Step:* attempt k starts from attempt k−1's recorded rest pose, which by the
hypothesis is bit-identical on every platform. Within one attempt: (1) x and the preset's literals are exact on every
platform (integers below 2⁵³; literals of at most 17 significant digits, in source and in JSON). (2) u is identical:
MOD-04's stream is mulberry32 over an FNV-1a fold, built from `Math.imul`,
`^` and `>>>` (exactly specified integer operations) and a division by 2³², which is exact (`rng-stream.ts:9-28`),
*provided the draw index is the same* (§7, AE-c14). (3) Hence x_eff, built by GX-41's basic operations, is identical.
(4) W₀ is identical: identical values inserted in an identical order (GX-44, A-1's "constructed the same way, added in
the same order"). (5) By induction with A-1, W_n is identical for every n. (6) ρ compares identical binary64 values with
pinned thresholds, so n* is identical. (7) read_c uses only +, −, × and comparisons on identical values (the spinner's
Θ accumulated per step and its sector by sign tests, F-5c), so O is identical; a non-finite value, whose bit pattern
WebAssembly does not fix, is refused before anything is recorded (F-10). (8) The snapshot is a serialisation of an
identical world, and H is a pinned pure-JS hash of it (F-11), so H is identical. ∎

**Each condition is necessary (counterexamples).**

| Condition | Without it |
|---|---|
| Pinned version and build (GX-43) | The claim is per version (A-1). A game resumed on another release re-simulates its logged throws on a different solver; a tumbling die amplifies any difference, so faces can change. Without GX-46 the change is silent |
| Integer inputs (GX-41) | Within JavaScript alone a float input also round-trips exactly (Number-to-string is shortest round-trip), so integers are not strictly required there. They are required for the row to be exact under any other reader (a verifier in another language, a JSON tool that does not round-trip binary64), and they make the guard's range checks exact. Stated so, and no stronger |
| No transcendental starting values (GX-41) | `Math.sin`/`Math.cos` may differ in the last bit between engines (Rapier's page; ECMA-262 leaves them approximated). The bench builds its rails and launch velocity with them (`die-physics.ts:87-88,140`), so two browsers can start the same throw from different worlds |
| Fixed step (GX-44) | A frame-rate-driven dt integrates differently on a 60 Hz and a 144 Hz display: same throw, different face |
| Fresh world (GX-44) | A reused world carries contact caches, sleeping islands and handle order from earlier attempts; an attempt is then a function of the whole history, a refused attempt included, and no attempt can be re-checked or dyno-tested alone |
| Fixed insertion order (GX-44) | Rapier's own condition: the same bodies added in another order give another world (handles, solver order), so the same throw can settle differently (F-12) |
| Hash check (GX-46) | Not a condition of determinism but its detector. Without it, every failure above is silent |

**CF-4, the refused attempt and the shared stream.** The sealed apply context is `{ rng: RNGStreams }` (`core.ts:31-33`),
and RNGStreams caches one advancing RNGStream per name (`rng.ts:18-27`); nothing rolls a stream back. An applier that
draws u and then throws leaves the live stream advanced while `rebuild` (`core.ts:171-195`), which replays only logged
intents, never makes that draw. The next attempt then draws a different u live and on replay: divergence. So an
outcome refusal decided *in the applier* after the draw must be a succeeded, logged apply. **It is not forced overall**
(corrected after the adversarial pass, F-4): a route exists that changes no sealed file. RNGStream is exported with a
public constructor (`index.ts:7`), the seed is in the `wire` caller's hands (`host`'s argument, `row.seed`), and a Guard
`RuleCheck` is a closure registered through `wire` (`guard.ts:12`); the sealed genesis already builds its own streams
from the seed (`packloader.ts:297-298`). Such a Guard could rebuild the k-th draw from a fresh stream, simulate, and
refuse, logging nothing and touching no shared stream. The owner ruled "Log it" on the grounds that remain: under
AE-c18's ruling a refused attempt's rest must enter state; GX-47 keeps the two classes apart; re-roll telemetry
(XPC-08); and an unlogged refusal would reuse u, so refusals would probe it.

**The state space.** Spinner (peg-free): one rotational degree of freedom, state (θ, ω), dynamics I·ω̇ = −τ·sgn(ω) − b·ω.
Die: a rigid body, state (position, orientation quaternion, linear and angular velocity) ∈ ℝ³ × S³ × ℝ³ × ℝ³, with
contacts against the tray. The die has no closed form; it is chaotic after a few bounces (small input changes change
the face), which is the physical basis of its fairness and the reason determinism must be bit-exact.

#### 9. Operational definitions

| Object | Operational meaning | Indicator or test | Boundary conditions | Ambiguity |
|---|---|---|---|---|
| π | The engine the roll ran on | The build's SHA-256 equals the pin's | Unavailable build: UNCOMPUTABLE(π) | AE-c16 |
| x | The logged throw | Integers within bounds | Below the floor: intent refusal | AE-c20 |
| u | One stream draw per attempt | Draw count equals logged attempts | — | AE-c14, AE-c15 |
| ρ | At rest | Squared speeds under thresholds for K steps | N reached: REFUSE(unsettled) | AE-c19 |
| read_D | The face up | max (R(q)·n_f)·ŷ ≥ cos α | Below: REFUSE(cocked) | AE-c19 |
| read_S | The sector | sign tests of the pointer direction against pinned boundary directions | x < x_min: intent refusal before the draw; simulated Θ < 2π: a defect, recorded and flagged | AE-c29 |
| H | Fingerprint | hash of the settled snapshot | — | — |
| Δ | Fairness | χ² against the target at significance α_sig | A failed dyno: AE-c21 | AE-c21 |
| κ | Provenance | Every parameter tagged with a source | Untagged: inadmissible | AE-c27 |

#### 10. Equations and parameterised relationships

**Spinner, peg-free, ω > 0** (I moment of inertia, τ bearing friction torque, b drag coefficient, all > 0 except b ≥ 0):

- ω(t) = (ω₀ + τ/b)·e^(−bt/I) − τ/b
- Time to stop: T = (I/b)·ln(1 + bω₀/τ)
- Angle turned: Θ = (I/b)·(ω₀ − (τ/b)·ln(1 + bω₀/τ))
- No drag (b → 0): T = Iω₀/τ, Θ = Iω₀²/(2τ)
- Monotone: dΘ/dω₀ = Iω₀/(τ + bω₀) > 0 for ω₀ > 0, so Θ rises strictly with ω₀ (an invariant)
- Energy books: ½Iω₀² = τΘ + b∫₀ᵀω²dt (+ ΣΔE over pegs passed, when pegs exist)
- Skill index: δω = (2π/N_s)·(τ + bω₀)/(Iω₀), the change in ω₀ that moves the result one sector (N_s equal sectors)
- Rest angle: θ_rest = s0 + Θ; sector = the i with θ_rest mod 2π in [a_i, a_{i+1})

These use `exp` and `ln`. They are the *oracle* for vectors and the dyno's analysis, computed outside the decision;
they never enter a decision path (GX-41 binds starting values and decisions, not test oracles).

**Jitter coverage (the jitter's claim for the spinner, no drag).** With x_eff = ω₀(1 + ε·g(u)):
- one-sided, g(u) = u ∈ [0,1): Θ ranges over [Θ₀, Θ₀(1+ε)²), a span of Θ₀(2ε + ε²) ≈ 2εΘ₀;
- symmetric, g(u) = 2u − 1: a span of Θ₀((1+ε)² − (1−ε)²) = 4εΘ₀.
Every sector is reachable from every admissible flick, at any alignment, exactly when the span exceeds 2π − W (W one
sector's width): an arc that long cannot fit inside any one sector's complement. So Θ₀ > (2π − W)/(2ε+ε²) one-sided, or
Θ₀ > (2π − W)/(4ε) symmetric; for 8 sectors at ε = 0.05, 53.6 rad and 27.5 rad. *(Corrected after the adversarial pass,
F-13: the first draft required a whole turn, which is sufficient but not necessary.)* Below that, the hand chooses which
part of the wheel the jitter spreads over (CF-9).

**Die face reader.** Faces f with body-frame unit normals n_f (±x̂, ±ŷ, ±ẑ, labelled so opposite faces sum to 7).
up(q) = argmax_f (R(q)·n_f)·ŷ, computed as the y-component of the rotated normal, which needs only +, −, ×.

**Chi-square.** χ² = Σ_i (O_i − E_i)²/E_i over outcomes, with E_i = N·p_i (p_i = 1/6, or w_i/2π), compared with the
critical value at k − 1 degrees of freedom and α_sig (AE-c21).

**Limitations.** The closed form is for a rigid wheel on a bearing with Coulomb friction and linear drag; real bearings
may add a term in ω² (air drag at speed) or stick-slip at the end. The fit (dataset plan) tests the model on held-out
flicks before the model is trusted.

#### 11. Preservation notes

- **Preserved:** every element of G-1 (inputs, outputs, rules, the worked example's spinner), the plan's §3 conditions,
  I-260's scope (die and spinner only; cards, tokens, pieces and boards stay theater), and every sealed object
  (cited, unchanged).
- **Made explicit:** the build hash in the pin (a version string does not identify bytes); the two refusal classes;
  the logging argument (CF-4); the two fairness claims; the jitter's coverage condition; "no-tumble" and
  "escaped" as die refusals, which follow from G-1's "nothing steers the result" (a die slid flat without tumbling
  shows the face its thrower placed) and from the tray's bounds; the die's half of GX-51.
- **Not to simplify yet:** the jitter's form (AE-c15) and the start state (AE-c18), which decide how much the hand
  controls; the location of the pin, the rest pose and the trajectory (AE-c16, AE-c17, AE-c22), which touch sealed
  interfaces.

#### 12. Theoretical Design quality check

- Key entities represented: the gap's inputs, outputs and rules each map to an axiom or object (traceability in the
  table's Trace column and §4).
- Ambiguity documented: AE-c13 to AE-c29, none resolved.
- Conflicts visible: CF-1 to CF-9 with statuses.
- No concept collapsed: the two refusals and the two fairness claims are kept apart; no sealed object is merged.
- Every object has a preservation note (§4).

Under standing approval this gate batches. Audit note: the design adds two die refusals (no-tumble, escaped) and the
die's half of GX-51, each traced to a G-1 rule; and it derives what the sealed apply context implies for AE-c14. Both
are presented to the owner at the Consistency Gate.

**Revised after the adversarial pass** (`step-8-adversarial-pass.md`), on the owner's directions "Adopt the fix",
"Both stand", "Velocity and spin only" and "Apply all": GX-41 (F-5a, F-12), GX-42 (F-6), GX-45 (F-1, F-10), GX-46
(F-11), GX-47 and GX-48 (F-1, F-2), §4 StartState and OutcomeReader (F-5b, F-5c), §8 theorem D (F-5a, F-5c, F-10,
F-11), the necessity table (F-12), the CF-4 paragraph (F-4) and §10's coverage bound (F-13).

## 3. Base Case Reduction deliverable

### Extension G-1 · Phase 1 · Step 3 — Base Case Reduction

Source: `step-2-theoretical-design.md` (batched under standing approval). Circuit simplification comes first,
mathematical simplification after it. Tautology tests touch new objects only; no sealed object is a removal
candidate (E-1). Notation: Appendix A §A.5 (circuit), §A.7 (tautology), §A.2 (object classes).

#### 1. Summary of the full theoretical model

Thirteen axioms (GX-40 to GX-52) over 22 objects (step 2 §4). One deterministic roll function decides; two refusal
classes bound it; a pin, a fresh world and a fixed step make it exact; a snapshot hash detects any failure of
exactness; a dyno in two claims and a provenance tag on every number keep fairness and data honest. Seventeen
ambiguities (AE-c13 to AE-c29) and nine conflicts (CF-1 to CF-9) stay open.

#### 2. Conflict and preservation risk review

| Risk | Objects | Why it matters |
|---|---|---|
| False merge of the two refusals | IntentRefusal, OutcomeRefusal | Same EV-5 symbol, different records and different logging (GX-47) |
| False merge of "escaped" into "unsettled" | read_D's escaped test, ρ | An escaped die in a world without outside ground never settles, so "unsettled" would eventually catch it |
| False removal of the post-simulation turn test | read_S's under-one-turn test, Φ | Φ predicts Θ before simulating; using it would make the closed form a decider (GX-40) |
| False merge of the two fairness claims | Dyno (hand), Dyno (jitter) | One χ² over an unstated population cannot bound aiming |
| Constraints that limit preservation | the sealed apply context (CF-4), the sealed SeatView (CF-5), the tier checker (CF-6), REF-24's test (CF-7) | Each is cited, not changed |
| Ambiguities that must stay visible | AE-c14 to AE-c29 | Several decide how much the hand controls (AE-c15, AE-c18) |

#### 3. Logic-circuit map (A.5)

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

#### 4. Circuit simplification steps

| # | Original form | Simplified form | Reason and proof | Objects | Traceability | Meaning | Conflict impact |
|---|---|---|---|---|---|---|---|
| S-1 | A "solver ready?" gate inside every submit | An invariant inside submit plus G-H at the host boundary | The sealed applier is synchronous (`core.ts:35`); *this module's* only applier constructor takes a ready solver, so if G-H passes, every roll applier this module makes has S. **Corrected after the adversarial pass (F-8):** the module's doors are not the engine's. `registerIntent` and `supersedeIntent` are public (`core.ts:79-111`) and `rebuild` returns a bare core, so another module could supersede a roll intent with an applier holding no solver or another build. The inner condition is therefore kept as a load-bearing hook (XH-03), with its own refusal test, not as defence in depth | ℒ, S, G-1 | G-H carries the old gate's ON_FAIL; the hook carries its condition | Kept: no roll is ever simulated without S | Resolves the circuit half of CF-4's neighbour AE-c13 only as a *shape*; AE-c13 is still the owner's |
| S-2 | G-2..G-5 as four independent gates, each able to fire | One ordered chain with a fixed precedence | Two gates can fail on one attempt (an escaped die is usually also unsettled). Unordered gates would name the refusal by evaluation order, which is unstated. Fixing the order makes the refusal's name a function of the attempt | G-2..G-6 | Each gate keeps its own name and test | Kept; made deterministic | None |
| S-3 | Spinner turn test predicted by Φ before simulating | Unchanged: the test reads the simulated Θ | **Not simplified.** Using Φ would make the oracle a decider, which GX-40 forbids | read_S, Φ | — | Preserved | — |

**Deleted circuit elements:** none.

#### 5. Minimal primitive set

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

#### 6. Preserved theoretical objects, classified (A.2)

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

#### 7. Removed or merged objects

**None.** Three candidates were tested (§8) and all three were preserved.

#### 8. Tautology tests (A.7.1)

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

#### 9. Mathematical simplification notes

Only after the circuit: the spinner's dynamics depend on τ/I and b/I alone. Dividing by I, ω̇ = −a − cω with
a = τ/I and c = b/I, so Θ = (1/c)(ω₀ − (a/c)·ln(1 + cω₀/a)), T = (1/c)·ln(1 + cω₀/a), and with no drag Θ = ω₀²/(2a).
The skill index becomes δω = (2π/N_s)·(a + cω₀)/ω₀. **Consequence for the dataset:** a and c are identifiable from a
filmed decay alone (dω/dt is linear in ω, so a straight-line fit of dω/dt against ω gives −c as slope and −a as
intercept); I and τ need only be known separately where the engine needs them (τ = a·I with I from mass and geometry).

#### 10. Value-expression reduction

- Spinner preset: P_S = (I, a, c, d, widths, r_grab, ε, ρ-numbers, N) with τ := a·I, b := c·I, ΔE := d·I.
- Die preset: P_D = (edge, mass, corner radius, labels, {(μ, e)} per contact pair, tray, ε, ρ-numbers, N, α, T_f).
- Outcome: O ∈ VALUE(ℤ) ∪ REFUSE(name). The kind's sealed field takes the VALUE; σ takes O whole.

#### 11. Base cases, refusals first

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

#### 12. Open decision gates

| Gate | Decision | Blocking | Owner | Resolves when |
|---|---|---|---|---|
| ODG-g1 (AE-c14) | Is an outcome refusal logged? A refusal decided in the applier after the draw must be a succeeded, logged apply, or GBC-85 fails; a Guard-side route could keep it unlogged without a sealed change (step 2 §8, corrected after the adversarial pass, F-4) | yes, for the Consistency Gate | owner | Consistency Gate (ruled "Log it") |
| ODG-g2 (AE-c13) | The async load rule: G-H at the host boundary (S-1) | yes, for the Consistency Gate | owner | Consistency Gate |
| ODG-g3 (CF-1) | Does I-260 supersede the S1 v2.0 do-not's first half for the Die and the Spinner? | yes, for the Consistency Gate | owner | Consistency Gate |
| ODG-g4 (AE-c17) | The rest pose in a settle record, or the Spinner kind superseded (a sealed change: E-1, blocking and a redesign) | no, if the settle record is chosen | owner | Consistency Gate |
| Others | AE-c15, c16, c18 to c29 | no | see the Consistency Gate | — |

#### 13. Base Case Reduction quality check

- Circuit simplification came first (§3, §4); mathematics after (§9, §10).
- No object was removed by similarity; the three candidates failed their tautology tests and were preserved (§8).
- No removal was made, so no removal proof is owed; the load-bearing "proposed object removal" gate does not fire.
- Conflicts were not silently resolved: CF-4's answer is argued, not adopted (ODG-g1).
- Traceability: every primitive traces to an axiom (§5 column "Meaning preserved") and every base case to a gate.

Under standing approval this gate batches. Audit note: S-1 changes a gate into an invariant plus a hook on a proof that
the inner condition is always true; S-2 fixes the refusal precedence. Neither drops a test.

#### 14. Assumption log (appended at the Minimal Worked Example, as its rule requires)

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

## 4. Minimal Worked Example deliverable

### Extension G-1 · Phase 1 · Step 4 — Minimal Worked Example

Sources: `step-1-intake.md` and `step-3-base-case-reduction.md` only. Seeded by G-1's own worked example (E-1), which
this step re-derives. **Load-bearing gate: halts for the owner.**

Every number below is computed by `mwe/mwe_g1.py` (SHA-256 `f6dadd37…e7c81b66`, revised after the adversarial pass
and set to write LF line endings so its output re-derives byte-for-byte on any platform; first run `71747afa…952e2c`),
whose output is `mwe/mwe-results.json` (`06ae05dc…5aa4bee7`; first run `770cad1f…c8f997`). The jitter draws come from the **sealed** RNGStream
(`packages/engine/src/kernel/rng-stream.ts`), run by node from the sealed source, with seed `sigma-7` (the seed of the
sealed V-1 and V-9) and stream `rand:spinner-1`. No implementation of the extension exists, so the spinner's closed
form stands in for the engine and a SHA-256 of the closed-form rest state stands in for the snapshot hash. Both are
labelled stand-ins wherever they appear.

#### 1. The approved primitive set (under test, unmodified)

P-1 EnginePin π · P-2 Preset P (values with κ) · P-3 RollInput x · P-4 StartState s0 · P-5 JitterDraw u · P-6 Roll
roll_π (fresh world, fixed dt, ρ, N) · P-7 OutcomeReader read_c (gates G-2..G-5) · P-8 SettleRecord σ · P-9 ReplayCheck χ
· P-10 Dyno Δ (two claims) · P-11 Provenance κ with Dataset 𝒟. (Definitions: step 3 §5.)

#### 2. Selection rationale

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

#### 3. Step-by-step worked execution

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

#### 4. Assumption exposure log

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

#### 5. AmbiguityElement status (none resolved here)

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

#### 6. Traceability update

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

#### 7. Determination

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

#### 8. Quality check

- Minimal: one degree of freedom, three submissions, the fewest that reach every primitive and both refusal classes.
- Every primitive invoked at least once (§3, column 2).
- No new primitive, axiom or object introduced. The stand-ins are labelled and decide nothing.
- No AE resolved: both readings of AE-c14 and AE-c18 executed side by side.
- Assumptions classified; the latent ones are appended to step 3.
- Traceability intact (§6).
- Determination stated with justification (§7).

#### 9. Owner's approval

Approved by the owner, 2026-11-08, live at the gate: **"Approve, go on"** (to the Consistency Gate). R2 spend at the
gate: 1.91M of 8M weighted.

#### 10. Addendum after the adversarial pass (the owner: "Apply all")

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

## 5. Consistency Gate — consistency audit and AE Resolution Protocol

### Extension G-1 · Phase 1 · Step 5 — Consistency Gate

Audit of `step-2-theoretical-design.md`, `step-3-base-case-reduction.md` (with its §14 appended at Step 4) and
`step-4-minimal-worked-example.md` (owner-approved, "Approve, go on"). **Load-bearing: it halts while any AE is open.**
Design rulings are the owner's (SR-3), so every disposition below that decides a design is put to the owner; the
lead's recommendation is marked as a recommendation.

#### 1. Audit summary

The Theoretical Design, the Base Case Reduction and the Minimal Worked Example are consistent with one another and
with the sealed library at `seal-1`, with eight issues, none of which reverses a prior step (§2). The framework is
**ready for the Logic Stress-Test once the owner rules on the escalated AEs** (§5).

#### 2. Issue register

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

#### 3. Object preservation review

All 22 Theoretical Design objects are accounted for. EnginePin, Preset, RollInput, OutcomeReader, ReplayCheck and
Provenance are primitives. PinRecord, StartState, JitterDraw, Roll, SettleRecord, Dyno and Dataset are hybrids, each
with its open AE. InputInEffect, SnapshotHash, Trajectory, EnergyBooks, SkillIndex and JitterCoverage are derived.
SolverLoader, ReadySolver and ClosedForm are contextual. IntentRefusal and OutcomeRefusal are preserved as named
outcomes (I-8). Every object the worked example invoked is in the primitive set or derived from it; nothing was
invoked from outside it.

#### 4. Traceability review

TM-1 to TM-19 (step 4 §6) link each primitive to its reduction, its worked step, its theoretical object and the G-1
element it serves. No break. The stand-ins (closed form, stand-in hash) decide nothing and are traced as Φ, a
contextual object.

#### 5. AE Resolution Protocol

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

#### 6. Conflict review

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

#### 7. Proof quality review

- Tautology claims (step 3 §8): each INVALID result names a failing dimension; none is weak.
- Theorem D: sound given A-1 and AE-c14; necessity is shown per condition, and the integer condition is stated no more
  strongly than it holds (step 2 §8).
- PD 1.0 in the worked example: each of E-1 to E-19 gives its reason; none is asserted bare.

#### 8. Recommendation

Before the rulings: blocked pending AE resolution (AE-c13, AE-c14, AE-c15, AE-c17, AE-c18, AE-c23 with CF-1, AE-c24,
AE-c27 and I-6).

**After the rulings: Approved with minor revisions** (I-1, I-2 and I-8 corrected above) **for the Logic Stress-Test.**

#### 9. The owner's rulings (2026-11-08, live at this gate)

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

## 6. Logic Stress-Test summary

### Extension G-1 · Phase 1 · Step 6 — Logic Stress-Test

Sources: steps 2 to 5, with the owner's rulings at the Consistency Gate (step 5 §9) in force: outcome refusals logged,
load before hosting, starts chain from the last rest, the symmetric jitter, the settle record, own mutation, and the
footage rule. The arithmetic is `stress/stress_g1.py` (SHA-256 `9358dd79…d58fe71b`, revised after the adversarial
pass and set to write LF line endings; first run `02fbb64e…94f129e`), output `stress/stress-results.json`
(`bfc355ab…68803a9b1ee`), with the closed form standing in for the engine as before.

#### 1. Stress-test summary

**All three scenarios failed as first tested** (Scenario 1 was first recorded as a pass; the adversarial pass, F-1,
showed the pass was wrong). Each failure has a correction that belongs to a named stage, and none needs a sealed object
changed. No blocking decision gate was produced: the corrections set constraints whose numbers are already the owner's
at R5 (ε, the dyno pass rule). Scenario 1 (a constraint collision) shows the spinner's floor must be a preset value
tested on the input before the draw. Scenario 2 (missing information) fails: a wrong time base passes
every check the dataset plan had. Scenario 3 (adversarial interpretation) fails: a dyno fed a convenient population
proves "fair" for players who do not exist.

#### 2. Scenario 1 — Constraint collision

**Input.** Preset S-min (I = 0.002 kg·m², τ = 0.004 N·m, 8 sectors, ε = 0.05, symmetric jitter). A flick of
x = 5300 mrad/s. Θ₀ = 7.02 rad; over every u, Θ lies in [6.338, 7.742] rad, all at least 2π.

**The collision.** G-4 (GX-45) admits every attempt from this flick: it always turns more than once, so it is VALUE,
never REFUSE(under-one-turn). GX-48(b), as LA-2 measures it, requires that no admissible input lets an aimer do much
better than fair. This input lets one: the jitter spreads the result over 1.40 rad (0.22 turn), so an aimer who picks
the flick for the sector they want, given the public last rest, lands it with probability 0.57, **A = 4.57 × fair**.
Following G-4 accepts an aimed result; following GX-48(b) forbids it.

**The decision.** The input must be refused as too weak to be fair, not accepted. The framework already has the rule
that decides: G-0 admits a preset only with a dyno record, and LA-2 takes the jitter's claim as a maximum over *all
admissible inputs*. A preset whose admissible inputs start at one turn fails its own jitter claim, so it is never
admitted, and no game reaches this input. The rule is deterministic and keeps PD: nothing is repaired or reinterpreted.

**What the scenario exposes, first.** The rule works only if the floor can move: with one turn hard-coded, *no*
spinner with a small ε could be admitted. The floor must be preset data, chosen with ε so that A ≤ A_max over every
admissible flick. For S-min at ε = 0.05, the smallest flicks above which every stronger flick stays within the bound,
*with every u accepted*, are:

| A_max | Flick floor ω₀ (x_min) | Θ₀ at that flick | Turns |
|---|---|---|---|
| 2.0 | 8.18 rad/s | 16.7 rad | 2.66 |
| 1.5 | 13.08 rad/s | 42.8 rad | 6.80 |
| 1.25 | 20.08 rad/s | 100.8 rad | 16.0 |

**What the adversarial pass exposed (F-1).** As first written, the floor was tested on the *simulated* turn, after the
draw, and a refused spin is a free re-spin. An aimer then picks a flick just under the point where every u clears the
floor, so only a thin slice of u is accepted, and given acceptance the sector is nearly fixed. With the floor at
42.75 rad: at ω₀ = 12.514 rad/s only 5.0% of u is accepted and **A given acceptance = 8.0** (the aimer's sector is
certain); at 12.758 rad/s, 25% accepted and A = 3.0. The first "PASS" measured A only where every u was accepted, so
it missed this. The same selection works on any refusal that depends on u.

**Result: FAIL as first tested; corrected** (the owner: "Adopt the fix"). The spinner's floor is tested on **the
logged input, before the draw**: x ≥ x_min (integer preset data, the table's flick floor, plus a margin for the
engine), an intent refusal ("re-spin") that draws nothing. The simulated turn test stays as a defect hook. Both dyno
claims and A are measured on accepted outcomes with the acceptance rate reported, which covers the die's u-dependent
refusals. This belongs to the Implementation Specification (the preset, G-0, G-1, G-4, X8). ε, x_min and A_max are one
decision, the owner's at R5.

#### 3. Scenario 2 — Missing information at a gate

**The gate and the missing input.** The dataset plan's fit of the spinner's a = τ/I and c = b/I (GX-49: "measured"
needs a known time base). The owner films on a phone in slow motion: the phone captures 240 fps and exports a file
whose stream says 30 fps, as D-3's metadata shows for its own clip. The capture rate is missing from the file, and the
fit reads the playback rate.

**What happens.** Every time is read 8 times too long. The fit returns a = 0.031 rad/s² against a true 2.0 (64 times too
small) and ω₀ 8 times too small. **The predicted angle turned is unchanged** (36.0 rad both ways), because Θ is a
geometric property of the motion and is invariant under rescaling time. Only the time to stop shows it: 48 s read
against 6 s true. The held-out third, filmed the same way, agrees with the fit on Θ. The preset is admitted as
"measured". In play, a real 12 rad/s flick would turn 2304 rad (367 turns) over 384 s.

**Is the fallback enough?** No. GX-49 requires a "known" time base, but a declared one passes. The footage rule
(AE-c27) covers third-party clips, not the owner's own. The Consistency Gate could not see it: it is a data fault, not a
logic fault.

**Result: FAIL.** The error passes through undetected and changes every spin.

**Mechanism to add (dataset plan and GX-49's operational definition, Implementation Specification):** a source's time
base counts as known only when it is **verified inside the clip**, by a time reference in frame (a running stopwatch,
or a blinking light of known period) or by a free fall timed against g in the same clip. A held-out check must include
a **time-dependent prediction** (T, the time to stop, or ω at a fixed time), not only the angle.

#### 4. Scenario 3 — Adversarial interpretation

**The interpretation.** "A preset is fair if its dyno passes." The preset's author feeds the hand's-claim dyno a broad
population of flicks, ω₀ uniform on [8, 80] rad/s. Real players flick between 9 and 11 rad/s. The dyno passes, the
record names its population as GX-48(a) asks, and the preset is admitted as fair.

**Why it is technically valid.** GX-48(a) asks for "inputs drawn from a stated population of throws (from the
dataset)" and GX-49 asks that the population carry its κ. A population tagged "assumed" is stated and tagged. The
pass rule is open (AE-c21), so nothing requires the population to be the measured one.

**Why it is wrong in intent.** G-1 asks that fairness be measured, not assumed. A dyno proves fairness only for the
throws it simulates, and the step-4 worked example showed a dyno's χ² swing from fail to pass on the population and the
start policy alone (35.8 and 7.52; the 7.52 was later shown vacuous, F-2, which only strengthens the point). "Fair" over imaginary flicks says nothing about the people at the table.

**What should catch it.** The provenance tag flags the population as assumed, but only to a reader. No gate refuses it.

**Result: FAIL.** The interpretation passes the framework unchallenged.

**Mechanism to add (GX-48's operational definition and G-0, Implementation Specification):** for admission *for play*,
the hand's-claim population must be the dataset's **measured** flick or throw distribution (κ = measured), named by
hash in the dyno record. A dyno on an assumed population is allowed for development only, and its record says so. The
pass rule's numbers stay the owner's (AE-c21).

#### 5. Conflict-handling review

| Gap | Correction | Stage |
|---|---|---|
| The one-turn floor is hard-coded, and a floor tested after the draw lets refusals select on u (Scenario 1, F-1) | x_min as integer preset data, tested at G-1 before the draw; the turn test a defect hook; fairness on accepted outcomes | Implementation Specification (preset, G-0, G-1, G-4, X8) |
| A declared time base passes as known (Scenario 2) | Time base verified in clip; a time-dependent held-out check | Implementation Specification (dataset plan); GX-49's operational definition |
| An assumed population can admit a preset (Scenario 3) | Admission for play needs the measured population, named by hash | Implementation Specification (G-0); GX-48's operational definition |

**Already flagged, not blocked: the scripted aimer.** A modified client that knows the seed (every lockstep peer does)
can search for a throw that lands a chosen outcome; every axiom holds while it does. AE-c25 carries this as an owner gate
and a production concern (step 5 §5). This scenario was checked and is recorded as passing *by flag*: the framework
names it and does not hide it.

#### 6. Traceability under stress

All three scenarios kept the TraceabilityMap intact. Scenario 2 is the one whose failure would have been
undetectable in play: the wrong preset would trace correctly to its fit and its sources, and only a wrong number would
travel. Its correction adds a traceable check (a time-dependent residual) to the chain from source to preset.

#### 7. Open decision gates

| Gate | Decision | Blocking |
|---|---|---|
| ODG-g5 | ε, x_min and A_max per component, as one decision (with AE-c21's pass rule) | non-blocking: owner at R5 |
| ODG-g6 (AE-c25) | The trust model for networked play: whether a defence against scripted aimers is needed, and where it goes (it changes the sealed seed model) | non-blocking: owner, at Phase 5's security review or the first networked game |

No blocking gate was produced.

#### 8. Recommendation

**Approved for Implementation Specification — two non-blocking open decision gates carried forward** (ODG-g5,
ODG-g6), with the three corrections in §5 carried into the specification.

Under standing approval this gate batches (it produced no blocking gate). Audit note: the three corrections tighten a
floor, a data rule and an admission rule; none adds a primitive or changes a sealed object. *Revised after the
adversarial pass (F-1, F-13 via the scripts), on the owner's "Adopt the fix" and "Apply all".*

## 7. Implementation Specification deliverable

### Extension G-1 · Phase 1 · Step 7 — Implementation Specification

Sources: steps 1 to 6 with the owner's rulings (step 5 §9) and the stress test's three corrections (step 6 §5).
Language-agnostic; logic that prose cannot carry is in Appendix A notation, cited by section and never extended. No
executable code. New identifiers are local to this extension (X-, SX-, RX-, SC-x, EL-, VC-, XP-, XR-, XV-, XH-, XPC-);
Phase 3 mints the library's MOD, SEAM, REF, VEC, HOOK and PC numbers from them, continuing above the sealed record's.

#### 1. Implementation summary

The extension adds a library-tier physics module that registers two roll intents with the sealed engine
(`die:throw`, `spinner:spin`). A roll intent's applier draws one jitter value from the component's own seeded stream,
builds a fresh world on a pinned Rapier build from integer inputs and pinned literals, steps it at a fixed dt until the
settle rule ends it, reads the outcome through ordered refusal gates, and returns a next state carrying a settle record
(and, on a VALUE, the kind's sealed field). Everything happens synchronously inside the sealed `submit`; the only
asynchronous act, loading the engine, happens before the game is hosted. Offline tools fit presets from filmed data and
run the dyno that admits a preset for play.

**The most important structural constraint:** there is exactly one roll function, and every attempt that draws from a
stream is a logged, succeeded apply (the owner's ruling, AE-c14), while every refusal that can be decided from the
input alone, the spinner's flick floor included, is decided by the Guard before any draw. Together they make (seed,
seats, log) replay every outcome bit-for-bit, because the sealed engine lends appliers only shared, advancing streams
that cannot be rolled back, and they leave no refusal that an aimer can use to select on the jitter. **Before reading on, a
developer must understand** the two refusal classes (an intent refusal is the Guard's, unlogged and drawless; an
outcome refusal is the physics', drawn and logged) and that the library is sealed: this extension reaches every sealed
object only through its existing interface.

#### 2. Module decomposition

| Module | Purpose | Responsible for | Not responsible for | Public interface | Internal state | Dependencies (logic flow) | Trace | Status |
|---|---|---|---|---|---|---|---|---|
| X1 PhysicsHost | Meets the async engine before hosting | the pin, loading the pinned build, the ready solver, the `wire` factory | simulating; game rules | `loadPinned(π) → Promise⟨ReadySolver⟩` (UNCOMPUTABLE(π) on a mismatched or missing build); `wirePhysics(S, presets) → (core) ⇒ void` | none (the solver is passed, not held globally) | Rapier (hard); then MOD-27 `host`/`resume` or MOD-02 `rebuild` (hard), each called synchronously after the promise resolves | P-1; E-1; AE-c13 ruling | ready for design |
| X2 Presets | Ruleset physics as data | preset values, κ per value, preset hash; admission in two parts: **G-0a structural** (κ present, GX-51) and **G-0b for play** (a dyno record on the measured population) | fitting (X9); running the dyno (X8) | `validate(P) → ValidPreset ∣ REFUSE(preset-inadmissible: reason)` (G-0a); `admitForPlay(ValidPreset, dynoRecord) → AdmittedPreset ∣ REFUSE(…)` (G-0b) | none | X8's record (hard, for G-0b only) | P-2, P-11; E-2; step 6 S-1, S-3; F-7 | ready for design |
| X3 RollIntents | The two intents | Guard specs (G-1, including the spinner's x ≥ x_min before any draw); appliers: draw → X4 → X5 → state; the start pose (last rest quaternion or canonical); the jitter on the die's velocity and spin only | the simulation's internals; effects (none) | registered through `wire` only: `die:throw {component, throw}`, `spinner:spin {component, flick}` | none | MOD-02 Guard (hard) → MOD-04 one draw (hard) → X4 (hard) → X5 (hard) → X6 (hard) → returns next state; MOD-10 kind field (hard, VALUE only) | P-3, P-4, P-5; E-3..E-10; F-1, F-6 | ready for design (units AE-c20, pin location AE-c16 implementation-dependent) |
| X4 Simulator | The one roll function | fresh world build (fixed insertion order, GX-41 values), the fixed-step loop, the settle rule, the snapshot hash (a pinned synchronous pure-JS hash, F-11), the motion summary (the spinner's Θ accumulated per step from its angular velocity about the hinge; the die's up-face sequence) | reading outcomes; state | `roll(π, P, x_eff, s0) → RollRun {restWorld summary, n* ∣ UNSETTLED, H, motion summary}`; `poses(π, P, x_eff, s0) → pose sequence` (the same run, sampled) | none (each call frees its world) | Rapier (hard) | P-6; E-5, E-9, E-14; F-5c | ready for design (numbers AE-c19, mapping AE-c26) |
| X5 OutcomeReaders | Physics to outcome | gates G-F, G-2 to G-5 in fixed order; die reader; spinner reader by sign tests of the pointer direction against pinned boundary directions; the spinner's turn test as a defect hook | simulating | `read(kind, RollRun, P) → VALUE(o) ∣ REFUSE(outcome: name)` | none | X4's output (hard) | P-7; E-6, E-9, E-17; F-5c, F-10 | ready for design |
| X6 SettleRecords | The replayable fact | σ's shape; the last σ per component in state, its rest pose kept as the engine's quaternion; the replay comparison | where the reference hash is kept (ODG-g11) | `record(attempt) → σ`; `lastRest(state, component) → s0 (quaternion) ∣ canonical`; `compare(σ_rebuilt, H_ref) → equal ∣ DIVERGENCE` | the last σ per component, in the module's own state record | X4, X5 (hard) | P-8, P-9; E-7, E-10, E-12, E-13; F-5b | ready for design |
| X7 Trajectory | What a view plays | deriving poses from σ per read | storing them; delivering σ to a view (sealed SeatView) | `trajectory(σ, π, P) → poses` (pure; final pose ≡ σ.rest) | none | X4 (hard); MOD-33 SeatView carrying σ (hard for any view: K7-1-11) | GX-52; AE-c22 | requires human review (K7-1-11) |
| X8 Dyno | Fairness evidence | the hand's claim (measured population, start policy, χ² of the outcome relative to the start) and the jitter's claim (A over admissible inputs), both on accepted outcomes with the acceptance rate | deciding pass numbers (owner) | `dyno(P, π, population, startPolicy, N) → record`; `aim(P, π) → A_max over x ≥ floor` | none | X4, X5 (hard); X9's population (hard, for play) | P-10; E-15, E-16; step 6 S-1, S-3 | ready for design |
| X9 Dataset | Sources, fits, provenance | sources by hash; time base verified in clip; fits; held-out checks with a time-dependent residual | the engine at run time (offline only) | `fit(sources, model) → values with κ = measured ∣ refused`; `population(sources) → distribution` | none | none at run time | P-11; E-18; step 6 S-2 | conceptual (until the owner's films) |
| X10 ClosedFormOracle | The spinner's exact model | Θ, T, energy books, skill index, coverage, A for vectors and analysis | any decision | `Φ(P_S, ω₀) → {Θ, T, …}` | none | none | Φ; E-11, E-14, E-19 | quasi-coded (`mwe_g1.py`, `stress_g1.py`) |

**Placement.** X1 to X7 live in a library-tier package that no platform file imports (CF-6, K7-1-3). X8 to X10 are
tooling and tests, outside the runtime. Package boundaries are Phase 2 and 3's to draw.

#### 3. Object interfaces and seams

Each seam: source → target; what transfers; dependency requirement; validation rule; traceability requirement; flow.
"Sealed" targets are reached only through the interface named.

| Seam | Source → Target | Transferred value or meaning | Dependency requirement | Validation rule | Traceability | Flow |
|---|---|---|---|---|---|---|
| SX-01 | X1 → Rapier (EXTERNAL) | the pinned build's bytes, initialised | the build's SHA-256 equals π's; no other build is ever loaded for this game | XH-02; XR-01, XR-02 | GX-43, A-1, A-4 | implementation-dependent |
| SX-02 | X1 → MOD-27 `host`/`resume`, MOD-02 `rebuild` (sealed) | a `wire` that closes over the ready solver | called only after `loadPinned` resolves; never before, never with a stand-in | G-H; XP-01, XR-27 | AE-c13 ruling; S-1 | logical |
| SX-03 | X1 → MOD-02 `registerIntent` (sealed) | X3's guard specs and appliers for the two intents | one registration per type (supersede, never respec) | sealed `registerIntent` rules | GX-1 | logical |
| SX-04 | X3 → MOD-02 Guard (sealed) | the roll intent → LEGAL or an intent refusal | the spec is pure (state, intent, seats); no draw, no simulation | XR-09, XR-10, XR-11, XR-28; REF-01 semantics | GX-2, GX-47 | logical |
| SX-05 | X3 → MOD-04 `RNGStreams.stream(name).next()` (sealed) | u ∈ [0, 1), one per attempt, after LEGAL | the stream is the component's own (LA-1); exactly one draw | XH-04; XP-04, XR-12 | GX-42, GBC-85 | mathematical |
| SX-06 | X3 → X4 | (π, P, x_eff, s0) | x_eff = x ⊙ (1 + ε·(2u − 1)) by RX-2 and RX-6, on the spinner's flick and on the die's velocity and spin (its release position unjittered); s0 from X6 as a quaternion | XH-01; XP-10, XR-23 | GX-41, AE-c15 ruling, F-6 | quasi-coded |
| SX-07 | X4 → Rapier (EXTERNAL) | build, step, snapshot, free | a fresh world per call, fixed insertion order, fixed dt, pinned integration parameters | XH-05; XP-11, XR-24 | GX-44 | implementation-dependent |
| SX-08 | X4 → X5 | the RollRun (rest summary, n* or UNSETTLED, H, motion summary: Θ accumulated per step for a spinner, the up-face sequence for a die) | X5 reads only the RollRun | gate order G-F → G-2 → G-3 → G-4 → G-5 | GX-45, S-2, F-10 | quasi-coded |
| SX-09 | X5 → X6 | O with the rest pose (a quaternion), n*, H (a pinned synchronous pure-JS hash, F-11) | σ is complete, and finite, before any state is returned | XP-08, XR-32 | GX-46 | logical |
| SX-10 | X3 → MOD-01 state, via the sealed apply return (MOD-02) | VALUE: the kind's field (Die.face, Spinner.sector) and σ; REFUSE: σ only | no effect-owned field is written (cash, favor, assets, sueRights, windows, deck inject) | XH-06; XP-08, XR-19, XR-20 | AE-c24 ruling; AE-c17 ruling | logical |
| SX-11 | X3 → MOD-03 IntentLog, via `submit` (sealed) | the attempt, logged after its succeeded apply, VALUE or REFUSE | HOOK-02 (sealed) | XP-04 | AE-c14 ruling; GX-3 | logical |
| SX-12 | X6 → X3 | s0 = the component's last σ rest pose, or the preset's canonical pose for the first roll | never from the intent's arguments | XP-15, XR-28 | AE-c18 ruling | logical |
| SX-13 | MOD-02 `rebuild` (sealed) → X6 | the rebuilt σ, to compare with the original run's reference H | the reference comes from the original run (ODG-g11); between live peers the sealed lockstep already hands each peer every move's post-move state hash (`MoveListener`), which covers σ.H (F-15) | XH-07; XP-09, XR-21 | GX-46; VEC-02's method | implementation-dependent |
| SX-14 | X7 → X4 | σ re-simulated to poses | the same roll function (RX-1) | XH-10; XP-12 | GX-52, EV-3 | quasi-coded |
| SX-15 | X7 → MOD-33 SeatView (sealed) | σ visible to a seat's view | the sealed SeatView carries no component state today (`projector.ts:173-197`); needs K7-1-11's fix by `seal.py reopen` (ODG-g9) | REF-19, HOOK-10 (sealed) | CF-5; AE-c22 | implementation-dependent |
| SX-16 | MOD-34 TheaterSync (sealed) ← X7 | displayed ≡ decided; the trajectory's last pose ≡ σ.rest | HOOK-11 read as "engine-decided" (AE-c23 ruling) | XH-10; XR-25; REF-20 | GX-52, GX-38 | logical |
| SX-17 | the physics package → MOD-29 TierCriterion (sealed) | imports point down only; Rapier only at library tier | HOOK-06 decides by path containment (K7-1-3), and `tools/check-tiers.mjs` gains RULES rows naming the physics package and Rapier, whatever the placement (ODG-g8, F-9) | XH-08; XR-26 | CF-6, GX-34 | implementation-dependent |
| SX-18 | X3 ⇸ MOD-09 EffectEngine (sealed) | **no transfer**: rolls apply no effect | REF-24's detector, once built (K7-1-1, K7-1-10), sees X3's writes and names them by register row (ODG-g10) | XR-20 | AE-c24 ruling, CF-7 | logical |
| SX-19 | X2 → X8 | the preset, for both claims | for play: the hand's population is X9's measured one, named by hash | XR-07; XP-02 | step 6 S-3; GX-48 | logical |
| SX-20 | X9 → X2 | fitted values with κ and source hashes; the measured population | κ = measured only with a time base verified in clip and a time-dependent held-out residual | XR-29; XP-16 | step 6 S-2; GX-49; AE-c27 ruling | mathematical |
| SX-21 | X10 → X4 (test only) | Θ_closed against Θ_engine for peg-free flicks | tolerance at least of order ω_eff·dt/2, on Θ, never on sectors | XV-01, XV-02 | GX-50, LA-4 | mathematical |
| SX-22 | X2 → X3, X4 | the admitted preset, its hash in the pin record | only presets admitted for play (G-0b) are wired; the pin record is covered by the row (AE-c16) | XH-09; XR-03 to XR-08, XR-31 | GX-43, GX-51, F-7 | logical |

#### 4. Reusability contracts

| Contract | Logic | Modules served (otherwise duplicated) | PD basis | Must handle / must reject | On failure |
|---|---|---|---|---|---|
| RX-1 RollFunction | build ∘ step-loop ∘ settle ∘ hash | X3 (live), MOD-02 rebuild through X3, X7, X8, vectors | function equivalence of live and replay (theorem D) | handles any structurally valid (G-0a) (π, P, x_eff, s0); rejects only a structurally invalid preset or a solver whose build ≠ π, so the dyno can run before admission for play (F-7) | HookViolation (engine defect), never a fallback |
| RX-2 UnitsToBinary64 | integer and unit scale → binary64 by ÷ of exact integers | X3, X8, X2 (literals) | GX-41 | handles integers below 2⁵³; rejects non-integers | MALFORMED_ARGS at G-1 |
| RX-3 OutcomeReaders | G-F, G-2..G-5 in order | X3, X8, X7's check, vectors | meaning equivalence of a roll in play and in the dyno | handles every RollRun; never maps a REFUSE to a value | returns REFUSE(outcome: name) |
| RX-4 PinMatch | loaded build = π | X1 (host, resume, rebuild), X3's hook | GX-43 | rejects a missing or different build hash | UNCOMPUTABLE(π) at the host; HookViolation inside |
| RX-5 SettleRule | at-rest test, K, N | inside RX-1 | GX-44, GX-45 | squared magnitudes only | REFUSE(unsettled) at N |
| RX-6 JitterApply | x_eff = x ⊙ (1 + ε·(2u − 1)) on the spinner's flick and the die's velocity and spin | X3, X8 | GX-42 | handles u ∈ [0, 1); leaves the die's release position unjittered (F-6) | — |
| RX-7 ProvenanceCheck | κ present; measured ⇒ verified time base and held-out residual | X2, X9 | GX-49 | rejects untagged or unverifiable "measured" values | REFUSE(preset-inadmissible) |
| RX-8 FairnessStatistics | χ² against the target, of the outcome relative to the start where starts chain; A over admissible inputs; both on accepted outcomes, with the acceptance rate | X8, vectors | GX-48 | rejects an unnamed population or start policy, and a χ² over chained starts (F-1, F-2) | record marked invalid |

Any logic not covered by a contract may be inline; the omission is intentional.

#### 5. Scalability constraints

| Constraint | Not hard-coded, and why | Stateless or stateful | Idempotent | Decision it prevents | Trace |
|---|---|---|---|---|---|
| SC-x1 Presets are data | sector widths, boundary directions, face labels, floors (x_min, T_f, the no-throw floor), α, thresholds, ε, dt: they differ per component and per dataset | stateless | — | a spinner or die shaped by code edits | GX-49, step 6 S-1 |
| SC-x2 One attempt, one world | — | stateless per attempt | replaying an attempt gives the same σ | a shared world whose history leaks between rolls | GX-44, RX-1 |
| SC-x3 Bounded work per submit | N is preset data; the step cost is the engine's | — | — | an unbounded loop inside a synchronous submit | RX-5, XPC-01 |
| SC-x4 State grows by one σ per component | only the last σ per component is held (s0 and display); earlier σ derive from the log by replay | stateful (last σ only) | yes | storing every attempt's record or trajectory in state | GX-6 (sealed), EV-3 |
| SC-x5 Versions side by side | the pin is per game; a newer engine never replaces an older game's | — | — | silently upgrading old games | GX-43 |
| SC-x6 The dyno is offline | N and populations are inputs; the dyno's own seeds are recorded | stateless | yes (same seeds, same record) | fairness computed at play time | GX-48 |

#### 6. Elegance rules

| Rule | Statement | Derivation | Violation looks like | Correction |
|---|---|---|---|---|
| EL-1 | One roll function | RX-1, theorem D | a second simulation path for the view, the dyno or replay | call RX-1 |
| EL-2 | In building inputs or deciding, only the exactly specified `Math` functions (`abs`, `ceil`, `clz32`, `floor`, `fround`, `imul`, `max`, `min`, `round`, `sign`, `trunc`); no other `Math` function, no clock, no `random` (F-12) | GX-41, A.4 `ASSERT_ABSENT` | `Math.sin` in a rail position (the bench, `die-physics.ts:87-88`); `Math.sqrt` for a speed | pinned literals, integer arithmetic, squared magnitudes |
| EL-3 | No world outlives an attempt | GX-44 | a module-level world, or a world cached between rolls | create and free inside RX-1 |
| EL-4 | No wall-clock or frame-driven step | GX-44 | dt from a frame callback | the pinned dt |
| EL-5 | Inputs are logged as integers and never re-rounded | GX-41 | a float in intent args | integers in declared units |
| EL-6 | Refuse, never repair | GX-45 | nudging a cocked die flat, re-dropping, rounding Θ up to a turn | return REFUSE(outcome: name) |
| EL-7 | No kind field without a σ; no σ without a logged attempt | AE-c14, AE-c17 rulings | writing Die.face from a view or a dyno | the roll intent's applier only |
| EL-8 | No physics import below library tier | GX-34 (sealed), CF-6 | a kernel file importing the physics package | move the code up a tier |
| EL-9 | The seed never chooses an outcome | GX-40, GX-42 | `nextInt(6)` for a face; a seed-generated throw | one u applied to the seat's x |
| EL-10 | No stored trajectory | EV-3, SC-x4 | trajectory frames in state | X7 derives per read |
| EL-11 | A solver exists ready or not at all | AE-c13 ruling, S-1 | a "loading" branch inside an applier | load before hosting |

#### 7. Validation checkpoints

| Checkpoint | Purpose | Question | Pass | Fail | Revision if failed |
|---|---|---|---|---|---|
| VC-1 Determinism | theorem D in fact | do two platforms rebuild the same row to the same σ and state hash? | XV-03 equal | any difference | find the GX-41/43/44 breach; never patch |
| VC-2 The spinner proves the engine | GX-50 | does the engine's peg-free spinner match Φ within tolerance, energy balanced? | XV-01, XV-02 within | outside | fix the τ/b mapping (AE-c26), not the tolerance |
| VC-3 Refusals | every guard refuses | do the XR tests of §10.1 (XR-01 to XR-17, XR-19 to XR-21, XR-23 to XR-33; XR-18 is reserved for AE-c29's on-the-line rule if adopted, XR-22 is folded into XR-01) pass, and fail under mutation? | all | any | the guard's own code |
| VC-4 Fairness | GX-48 | does each preset for play hold a dyno record on the measured population, within the owner's pass rule and A_max? | yes | no | refit, or change ε/M_min (owner) |
| VC-5 Data | GX-49 | is every "measured" value backed by a verified time base and a time-dependent held-out residual? | yes | no | re-film with a time reference |
| VC-6 The seal | E-1 | does `seal.py verify` pass and no sealed file change? | yes | no | revert; a sealed change is the owner's |
| VC-7 Tiers | GX-34 | does XR-26 fail the build? | yes | no (K7-1-3 unfixed) | ODG-g8 |
| VC-8 Theater | GX-52 | is shown ≡ decided checked on the real path? | yes | blocked by K7-1-11 | ODG-g9 |

#### 8. Open decision gates

| Gate | Decision | Why not resolvable here | Resolves with | Impact one way / the other | Blocking |
|---|---|---|---|---|---|
| ODG-g5 | ε, x_min, A_max and the dyno pass rule (AE-c21), per component | numbers need the dataset and the owner | the owner at R5 | larger ε: lower floors, less hand control; smaller: higher floors | no (Phase 2/3); yes for admitting a preset for play |
| ODG-g6 (AE-c25) | trust model against scripted aimers | changes the sealed seed model | the owner (Phase 5 security review, or the first networked game) | defend: commit-reveal or a host secret (a sealed change); accept: local/honest play only | no |
| ODG-g7 (AE-c16, A-4) | the pinned build (0.19.3 installed, or another) and where the pin record lives (inside the pack, or a setup intent) | an install is the owner's; placement needs PackLoader's schema rules | the owner (version); Phase 2 (placement) | in the pack: SUP-1 refuses a mismatch for free; as an intent: no pack change | no (Phase 2/3); yes for Phase 4 |
| ODG-g8 (K7-1-3) | HOOK-06 decides tiers by path containment, **and** `tools/check-tiers.mjs` gains RULES rows naming the physics package and Rapier, before the physics module merges. Placement alone cannot discharge it: the checker forbids only `@tabletop/patterns` and `@tabletop/presentation` (F-9) | a sealed file (MOD-29) | the owner (`seal.py reopen`) | without it, a platform import of physics or Rapier passes silently | yes for Phase 4's merge |
| ODG-g9 (K7-1-11, AE-c22) | the SeatView carries component state and σ | a sealed defect (SEAM-44 unbuilt) | the owner (`seal.py reopen`) | without it no view can show a decided outcome lawfully | yes for X7's view use, HOOK-11's extension and R6; no for R3, R4 |
| ODG-g10 (K7-1-1, K7-1-10) | REF-24's write-resolving detector, naming X3's writes by register row | a sealed defect | the owner | without it, XR-20 is the only guard on X3's writes | no (XR-20 covers X3); recorded |
| ODG-g11 | where the replay check's reference hash is held: beside the persisted row (PC-01), by lockstep peers (PC-02: the sealed `MoveListener` already hands each peer every move's post-move state hash, so this option needs no new object, F-15), or otherwise | the sealed row carries no state hash and `resume` takes none | Phase 2/3 with the developer | without a reference, GX-46 detects only within one session | no (Phase 2/3); yes for VC-1 in production |
| AE-c19 | settle numbers, floors, α, T_f | data | the dataset, R5 | — | no |
| AE-c20 | units of x | object design | Phase 2 | — | no |
| AE-c26 | τ and b in the engine; tolerance | needs the engine | Phase 4's first vector | — | no |
| AE-c28 | several dice per throw | no content needs it yet | the first such content | one world per throw | no |
| AE-c29 | on-the-line rule for peg-free spinners | a game-rule choice | the owner at R5 | refuse within δ, or the half-open rule | no |

#### 9. Traceability map update

| Concept element (G-1) | Theoretical object | Primitive | MWE step | Module | Seam | Contract | Scalability |
|---|---|---|---|---|---|---|---|
| "physics decides … the seat's own logged throw or flick" | Roll, RollInput | P-6, P-3 | E-5, E-9 | X4, X3 | SX-06, SX-07 | RX-1 | SC-x2 |
| "the seed supplies only a jitter u" | Jitter | P-5 | E-4, E-8 | X3 | SX-05 | RX-6 | — |
| "replay is exact … pinned … fixed … fresh world … deterministic operations" | EnginePin, WorldBuild, Step | P-1, P-6 | E-1, E-12 | X1, X4 | SX-01, SX-02, SX-07 | RX-2, RX-4 | SC-x5 |
| "the snapshot hash … is the replay check" | SnapshotHash, ReplayCheck | P-8, P-9 | E-12, E-13 | X6 | SX-13 | RX-1 | — |
| "refuse, never repair" | OutcomeReader, the two refusals | P-7 | E-3, E-6, E-17 | X3, X5 | SX-04, SX-08 | RX-3 | — |
| "a spinner with no friction is refused at admission" | Preset | P-2 | E-2 | X2 | SX-22 | RX-7 | SC-x1 |
| "fairness is measured … chi-square" | Dyno | P-10 | E-15, E-16 | X8 | SX-19 | RX-8 | SC-x6 |
| "measured, published or assumed" | Provenance, Dataset | P-11 | E-18 | X9, X2 | SX-20 | RX-7 | — |
| "what the view shows equals the decided outcome" | Trajectory, GX-52 | (derived) | — | X7 | SX-14, SX-15, SX-16 | RX-1 | SC-x4 |
| "the Spinner's sector and resting angle" | SettleRecord, OutcomeReader | P-8, P-7 | E-9, E-10 | X6, X5 | SX-09, SX-10, SX-12 | — | SC-x4 |
| plan §3 "the spinner proves the engine" | ClosedForm, EnergyBooks | (contextual) | E-11, E-14, E-19 | X10 | SX-21 | — | — |

Stress-test records: step 6 S-1 → X2, X8 (SX-19, SX-22); S-2 → X9 (SX-20); S-3 → X2, X8 (SX-19). **Chain breaks:**
none. No module exists without a theoretical object.

#### 10. Verification handoff

##### 10.1 Conformance tests (input → expected result; positive XP, refusal XR)

| Test | Guard or invariant | Input | Expected |
|---|---|---|---|
| XP-01 | G-H | host a game whose pin's build is loaded | hosted; rolls can be submitted |
| XR-01 | G-H, GX-43 | host or resume with a different build loaded | UNCOMPUTABLE(π); not hosted; no roll simulated; no seeded fallback |
| XR-02 | G-H | a pin with no build hash | UNCOMPUTABLE(π) |
| XP-02 | G-0 | a preset with κ on every value and a passing dyno on the measured population | admitted for play |
| XR-03 | G-0, GX-51 | spinner τ ≤ 0 | refused: "a spinner must stop" |
| XR-04 | G-0, GX-51 | die μ ≤ 0 or e ≥ 1 | refused |
| XR-05 | G-0, GX-49 | a value without κ | refused |
| XR-06 | G-0 | no dyno record | not admitted |
| XR-07 | G-0, step 6 S-3 | a dyno on an assumed population | development only; not admitted for play |
| XR-08 | G-0, step 6 S-1 | a spinner x_min at which some u falls under one turn, or one whose admissible inputs give A > A_max on accepted outcomes | refused |
| XP-03 | G-1 | a legal throw or flick | LEGAL |
| XR-09 | G-1, GX-2 | non-integer, out-of-bounds or missing input | MALFORMED_ARGS; state byte-unchanged; not logged; stream count unchanged |
| XR-10 | G-1 | input at or below the no-throw floor (zero) | RULE_REFUSED "no throw" / "no flick"; no draw; not logged |
| XR-11 | G-1 (sealed turn discipline) | a non-Randomizer component, or out of turn | refused (REF-01) |
| XR-28 | G-1, AE-c18 ruling | an intent that carries a start pose | MALFORMED_ARGS |
| XP-04 | draw, GBC-85 | three attempts, one refused | three draws; each draw index equals the count of earlier logged attempts on that component |
| XR-12 | XH-04 | an applier drawing twice, or before LEGAL | HookViolation |
| XP-05 | G-2 | an attempt at rest before N | continues to G-3 |
| XR-13 | G-2 | not at rest by N | REFUSE(unsettled); logged; kind unchanged |
| XR-14 | G-3 | die at rest outside the tray | REFUSE(escaped) |
| XP-06 | G-4 | an admitted flick (Θ ≥ 2π for every u); a die with ≥ T_f distinct up-faces | continues to G-5 |
| XR-15 | G-1, F-1 | a flick x < x_min | intent refusal "re-spin"; no draw; not logged; nothing moves |
| XR-33 | G-4 defect hook | an admitted flick whose simulated Θ is under 2π (the preset's margin is wrong) | REFUSE(under-floor), recorded, flagged as a preset defect |
| XR-16 | G-4 | die with fewer than T_f distinct up-faces | REFUSE(no-tumble), "re-roll" |
| XP-07 | G-5 | die flat, best dot ≥ cos α | VALUE(face) |
| XR-17 | G-5 | die tilted 20° against a wall (α = 10°) | REFUSE(cocked), "re-roll" |
| XP-08 | XH-06 | a VALUE attempt | kind field and σ written; σ complete |
| XR-19 | XH-06 | a REFUSE attempt | kind field byte-unchanged; σ written; the roll still owed |
| XR-20 | XH-06, AE-c24 ruling | the module writing cash, favor, assets, sueRights, windows or a deck | blocked |
| XP-09 | G-7 | rebuild of a row with roll attempts | σ and state hash equal the original run's |
| XR-21 | G-7, GX-46 | the row with one x changed by 1 | DIVERGENCE, refused whole |
| XP-10 | XH-01 | world build from integers and pinned literals | builds |
| XR-23 | XH-01, EL-2 | `Math.sin` (or any `Math.*`, clock, `random`) in the build or decision code | build fails |
| XP-11 | XH-05 | the same attempt run first and after ten others in one process | equal H |
| XR-24 | XH-05 | a world reused across attempts | HookViolation |
| XP-12 | XH-10 | a trajectory from σ | last pose ≡ σ.rest; outcome ≡ O |
| XR-25 | XH-10, HOOK-11 | a displayed outcome ≠ decided | flagged; decided wins |
| XR-26 | XH-08 | a platform file importing the physics package | build fails (needs ODG-g8) |
| XR-27 | EL-11 | wiring the roll intents without a ready solver | refused at construction |
| XP-13 | GBC-82 | ω₀ < ω₀′, same u and preset | Θ rises |
| XP-14 | F-5c | a spinner attempt | the sector by sign tests equals the sector of Θ mod 2π from s0, and no angle is recovered by `atan2` |
| XP-17 | GBC-87, F-1, F-2 | a dyno on a preset with u-dependent refusals and chained starts | both claims on accepted outcomes, acceptance rate reported; the hand's χ² on the outcome relative to the start |
| XR-30 | XH-03, F-8 | another module supersedes `spinner:spin` with an applier over a solver whose build ≠ π | HookViolation before any simulation |
| XR-31 | XH-09, F-7 | wiring a preset not admitted for play, or one whose hash is not in the pin record | refused |
| XR-32 | XH-11, G-F, F-10 | a RollRun holding NaN or ±∞ | REFUSE(non-finite); σ recorded without the value; no state hash throws |
| XP-15 | AE-c18 ruling | the attempt after a refused one | s0 = the refused attempt's rest |
| XP-16 | step 6 S-2 | a fit with a verified time base | κ = measured, with Θ and T residuals on the held-out third |
| XR-29 | step 6 S-2 | a source with no in-clip time reference | its time-dependent fits cannot be κ = measured |

##### 10.2 Golden vectors

| Vector | Pinned value | Rule | Input | State | Discharge condition |
|---|---|---|---|---|---|
| XV-01 | Θ_engine against Θ_closed, peg-free spinner | GX-50, LA-4 | S-min, flicks 8, 12 and 16 rad/s, s0 = 0, u = 0.5 (symmetric jitter zero) | oracle side COMPUTED (`mwe_g1.py`, `oracle_xv01`): Θ = 16.0, 36.0, 64.0 rad; T = 4.0, 6.0, 8.0 s; engine side DEFERRED | compute from X4 at first implementation; re-derive; within the tolerance AE-c26 sets |
| XV-02 | energy books on the engine's spinner | GX-50 | as XV-01 | DEFERRED | compute from X4; re-derive |
| XV-03 | cross-platform replay | theorem D, GBC-80 | a row with die and spinner attempts, one refused | DEFERRED | compute on two different JavaScript engines or operating systems with the pinned build; σ and state hashes equal; re-derive. **No die module counts complete without it** (I-4) |
| XV-04 | a die roll | GX-40 | fixed (π, P_D, x, u, s0) | DEFERRED | compute from X3/X4/X5; re-derive |
| XV-05 | dyno records per preset | GX-48 | each admitted preset, the measured population, both claims | DEFERRED | compute after the dataset (X9); re-derive with the recorded seeds |
| XV-06 | fit residuals | GX-49 | the owner's films, held-out third | DEFERRED | compute from X9; Θ and T residuals |
| XV-07 | the component stream's draws | GX-42, LA-1 | seed `sigma-7`, stream `rand:spinner-1`, draws 1 and 2 | COMPUTED from the sealed RNGStream: 0.557480385992676, 0.5018962631002069 | re-derive from MOD-04 under the stream name Phase 3 fixes |
| XV-08 | the closed-form oracle on G-1's example | Φ | ω₀ = 12 and 12.3 rad/s, S-min, s0 = 0 | COMPUTED by the oracle script: Θ 36.0 → sector 5; 37.8225 → sector 0; skill index 0.1309 rad/s | re-derive from X10's own implementation |
| XV-09 | x_eff's bits | GX-41, RX-2, RX-6 | (x = 12000, u = XV-07's second draw, ε = 0.05) | DEFERRED | compute from X3 in two runtimes; equal bits |
| XV-10 | the die reader's decisions | RX-3 | rest q = identity; 20° about z; α = 10° | DEFERRED (the reference script gives VALUE(1) and REFUSE(cocked) as the cross-check) | compute from X5; re-derive |

**Every deferred vector is computed from the implementation and re-derived before its module counts complete.**

##### 10.3 Hook manifest (load-bearing invariants only)

```
HOOK XH-01 @before-commit (scanner over X1, X3, X4, X5 source) { condition: in input construction and decisions, no Math function outside abs, ceil, clz32, floor, fround, imul, max, min, round, sign, trunc; ASSERT_ABSENT Math.random, Date, performance, BLOCK: fail commit }
HOOK XH-02 @before-host-or-resume-or-rebuild { condition: loaded build SHA-256 = π.build, BLOCK: UNCOMPUTABLE(π), not hosted }
HOOK XH-03 @before-roll-simulate { condition: the closed-over solver's build = π.build, BLOCK: HookViolation }   -- load-bearing (F-8): registerIntent and supersedeIntent are public
HOOK XH-04 @at-stream-draw { condition: Guard verdict LEGAL ∧ first draw of this attempt, BLOCK: HookViolation }
HOOK XH-05 @after-attempt { condition: the attempt's world is freed ∧ no world existed before it began, BLOCK: HookViolation }
HOOK XH-06 @before-apply-return { condition: VALUE ⇒ kind field ∧ σ; REFUSE ⇒ σ only, kind field unchanged; no effect-owned field changed, BLOCK: block }
HOOK XH-07 @after-rebuild { condition: rebuilt σ.H and state hash = the original run's reference (ODG-g11), BLOCK: DivergenceError }
HOOK XH-08 @ci-import-boundary { condition: no file under the platform directories imports the physics package or Rapier (by resolved path), BLOCK: fail build }   -- needs ODG-g8
HOOK XH-09 @before-preset-wire { condition: preset admitted (G-0) ∧ its hash in the pin record, BLOCK: refuse }
HOOK XH-10 @at-animation-complete { condition: displayed ≡ decided ∧ last pose ≡ σ.rest, BLOCK: flag mismatch, decided wins }   -- extends HOOK-11's reading; needs ODG-g9
HOOK XH-11 @before-apply-return { condition: every value in the RollRun and σ is finite, BLOCK: REFUSE(non-finite), recorded without the value }   -- F-10
```

Test map: XH-01 → XR-23; XH-02 → XR-01, XR-02; XH-03 → XR-30; XH-04 → XR-12; XH-05 → XR-24; XH-06 → XR-19, XR-20;
XH-07 → XR-21; XH-08 → XR-26; XH-09 → XR-31; XH-10 → XR-25; XH-11 → XR-32.

##### 10.4 Production concerns (developer-owned carried gates)

| ID | Concern | Owner | Discharge |
|---|---|---|---|
| XPC-01 | Latency: a synchronous die simulation (up to N steps) inside `submit` blocks the caller's thread | developer | Phase 5 review: measure per roll; budget |
| XPC-02 | The WASM bundle's size and load time before hosting | developer | Phase 5 review |
| XPC-03 | Packaging several pinned builds so old games replay on their own | developer | Phase 5 review |
| XPC-04 | Security: scripted aimers (ODG-g6); the hash detects inconsistency, not cheating | developer, with the owner's ODG-g6 | Phase 5 security review |
| XPC-05 | Dyno compute (10,000 runs × two claims per preset) off the play path | developer | Phase 4 tooling |
| XPC-06 | Dataset storage: films are large and must not sit in the synced repo; cite by hash | developer | before the films are fitted |
| XPC-07 | Accessibility: a fine gesture is not everyone's input; an accessible path must still be the seat's own input (for example a hold-to-set strength, logged as an integer), never a throw the seed generates (EL-9) | developer, with the owner | Phase 5 review |
| XPC-08 | Telemetry of re-roll rates per preset for fairness audits | developer | Phase 5 review |

#### 11. Handoff checklist and quality check

- Every component the approved logic requires has a module (§2: X1 to X10).
- §3 is in full as source and target seam records (SX-01 to SX-22), including every crossing into a sealed object.
- Every reusability contract is named and justified (RX-1 to RX-8).
- Every scalability constraint is named and traced (SC-x1 to SC-x6).
- Every elegance rule derives from an axiom, a ruling or Appendix A (EL-1 to EL-11).
- Every open gate is classified with its impact (§8).
- Every guard has a refusal test; every pinned value a vector, computed or deferred with a discharge condition; every
  load-bearing invariant a hook; the production concerns are carried (§10).
- Traceability is intact (§9). No executable code appears. No design decision lacks a prior-step trace: the three
  stress-test corrections and the owner's rulings are the only additions, each cited.
- Appendix A cited (A.2, A.3, A.4, A.5, A.7), never extended.
- A developer can begin X4 or X5 (ready for design) from this file alone; X7 waits on ODG-g9 and X9 on the films.
- Not overbuilt: package boundaries, names, units and numbers are left to Phase 2, Phase 3, the dataset and the owner.
- No AE silently resolved: every resolved AE cites the owner's ruling.

#### 12. Approval

Under standing approval this gate batches (no blocking decision gate arises for Phase 1; ODG-g8 and ODG-g9 block parts
of Phase 4 and R6 and are carried). Audit note: the specification adds ODG-g11 (the replay reference), found while
writing SX-13: the sealed row carries no state hash, so GX-46's comparison needs a reference the sealed objects do not
hold. It decides nothing; it names where Phase 2/3 must decide.

**Revised after the adversarial pass** (`step-8-adversarial-pass.md`), on the owner's "Adopt the fix", "Velocity and
spin only" and "Apply all": §1; X2 to X6 and X8 (F-1, F-5, F-6, F-7, F-10, F-11); SX-06, SX-08, SX-09, SX-13, SX-17,
SX-22; RX-1, RX-3, RX-6, RX-8; EL-2; VC-3; ODG-g5, ODG-g8, ODG-g11; XR-15 rewritten; XP-14, XP-17, XR-30 to XR-33
added; XV-01's oracle values; XH-01, XH-03, XH-11 and the hook-to-test map.

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

### Extension G-1 · Phase 1 · Step 8a — The independent adversarial pass (TE-6)

One independent reviewer (a fresh agent, read-only, given the step files and the sealed code, not this run's
conclusions) attacked what the run judged or changed. It re-ran both scripts (outputs byte-identical to the cited
hashes). Fifteen findings: 1 blocking, 8 major, 6 minor. **The lead re-checked each against the cited code or by
computation; all fifteen hold.** Because several touch approved steps, Final Package Assembly stops here for the
owner's direction (roster, Step 8: "If a contradiction is found, stop and request user direction").

| F | Sev. | Where | Finding (verified) | Proposed correction | Owner? |
|---|---|---|---|---|---|
| F-1 | blocking | step 6 §2; step 7 G-4, XR-08, XR-15 | The spinner floor is tested on the jittered, simulated Θ, after the draw. A refused spin is a free re-spin, so an aimer can pick a flick that clears the floor only for a thin slice of u. Given acceptance, the sector is then nearly fixed. Verified: at ω₀ = 12.514 rad/s with the floor at 42.75 rad, only u ≥ 0.95 clears it, and the accepted Θ spans 0.42 rad, less than one sector (A → 8). The same selection effect applies to every u-dependent refusal, the die's included | Move the spinner floor onto the logged input, before the draw: x ≥ x_min, an integer preset value set offline so that every u clears M_min with an engine margin. It becomes an intent refusal ("re-spin": unlogged, no draw). G-4's turn test stays as a defect hook. Both dyno claims, and A, are measured on the outcome a seat finally gets after its refusals (P(outcome given acceptance), with the acceptance rate reported) | **yes** |
| F-2 | major | step 4 E-16, LA-3; step 5 AE-c18's evidence | Under chained starts the hand's-claim χ² is vacuous. The start is random to the dyno but public to the player, and consecutive samples are dependent. Verified by argument: one constant flick with no jitter rotates the rest by a fixed angle each time, which equidistributes, so it "passes" while a repeatable hand aims perfectly | Withdraw 7.52 as fairness evidence. Under R-a the hand's claim tests the outcome *relative to the start* (Θ mod 2π) or conditions on s0. The ruling's remaining grounds are continuity of what is shown (GX-52) and never taking the start from the intent | **yes** (the evidence behind the ruling changed) |
| F-3 | major | step 4 E-12; step 5 AE-c14 | The "not logged" replay was compared with the wrong live run. Unlogged, A1 writes nothing, so A2 starts at 0 live. Verified: live rest 0.1304 rad (sector 0); replay rest 0.3358 rad (sector 0). Same sector; the rest angle and H diverge | Restate as "same sector; the rest angle and H diverge". The divergence still holds through σ and the state hash | **yes** (shown at both gates) |
| F-4 | major | step 2 §8; step 3 ODG-g1; step 5 AE-c14; step 7 §1 | "Logging is forced" is false. RNGStream is exported with a public constructor (`index.ts:7`). The seed is in the wire's caller's hands (`host`'s argument; `row.seed`). A Guard `RuleCheck` is a closure registered through `wire` (`guard.ts:12`). The sealed genesis already builds its own RNGStreams from the seed (`packloader.ts:297-298`). A Guard could rebuild the k-th draw from a fresh stream (k from state), simulate, and refuse, touching no shared stream and logging nothing | Record the route. Replace "forced" with the real grounds for "Log it": under R-a a refused spin's rest must enter state; GX-47 keeps the classes apart; re-roll telemetry (XPC-08); an unlogged refusal would reuse u, so refusals would probe it | **yes** (shown at the gate) |
| F-5 | major | step 2 GX-41, theorem D steps (4), (7); §4 | (a) Under R-a, s0 is an earlier engine output, not integers and literals, and theorem D never argues it. (b) Turning a start *angle* into a body rotation needs sin/cos of θ/2, the bench's own pattern (`die-physics.ts:88`). (c) The engine returns a unit quaternion, which loses the turn count, and recovering an angle needs atan2 | GX-41 admits "a prior attempt's recorded engine output"; theorem D adds an induction over the component's logged attempts from a pinned canonical pose; s0 is carried as the rest quaternion; Θ is accumulated per step from the engine's angular velocity about the hinge axis (+, −, ×); the spinner's sector is read by sign tests of the pointer direction against pinned boundary direction literals, with no angle recovered | no (a proof repair) |
| F-6 | major | step 5 AE-c15; step 7 RX-6 | The die half of AE-c15 (which input components the jitter scales) was neither ruled nor carried. One scalar multiplies all of (p, v, w), so positional jitter depends on where the origin is | Ask the owner: jitter v and w only, one scalar draw, position unjittered (recommended); or carry it to Phase 2 | **yes** |
| F-7 | major | step 7 RX-1, X2, SX-19 | Circular: RX-1 refuses unadmitted presets, but admission needs a dyno record, and the dyno runs on RX-1 | Split admission: G-0a structural (κ present, GX-51), which RX-1 checks; G-0b for play (the dyno record on the measured population), checked at wiring (XH-09) | no |
| F-8 | major | step 3 S-1; step 7 §10.3, §11 | "`wire` is the only place appliers are made" is false: `registerIntent` and `supersedeIntent` are public (`core.ts:79-111`), and `rebuild` returns a bare core. So XH-03 is load-bearing. XH-03 and XH-09 have no test; VC-3 claims a range with gaps (XR-18, XR-22, XP-14 absent) | Restate S-1's proof as covering this module's own doors only; XH-03 becomes load-bearing; add XR-30 (a superseded roll applier over a solver whose build ≠ π gives HookViolation) and XR-31 (wiring an unadmitted preset, or one whose hash is not in the pin record, is refused); VC-3 lists its tests explicitly | no |
| F-9 | major | step 5 CF-6; step 7 ODG-g8, XH-08 | `tools/check-tiers.mjs` (sealed, MOD-29) forbids only `@tabletop/patterns` and `@tabletop/presentation` (lines 11-15). No rule names Rapier or a new package, so even after K7-1-3's path fix a kernel file importing Rapier passes, and "a package the checker resolves" does not exist | ODG-g8 states that XH-08 needs new RULES rows in `tools/check-tiers.mjs` (a sealed file: the owner's `seal.py reopen`) whatever the placement | no (restates a gate already the owner's) |
| F-10 | minor | theorem D; step 7 §10 | No guard on non-finite values. WebAssembly NaN bit patterns are not deterministic, and the sealed `canonicalJson` throws on non-finite values (`statetree.ts:22-27`), *after* `submit` has appended | A finite-values gate first in X5's order: any non-finite value in the RollRun gives REFUSE(non-finite), recorded without the NaN; XH-11, XR-32 | no |
| F-11 | minor | GX-46; step 7 SX-09, XH-07 | H must be computed inside the synchronous applier, but no hash is named; the browser's WebCrypto digest is asynchronous | H is a pinned, synchronous, pure-JS hash over the snapshot bytes; the sealed FNV-1a-64 (`statetree.ts`) is the candidate; Phase 3 fixes it | no |
| F-12 | minor | step 2 GX-41; step 7 EL-2, XH-01 | Banning every `Math` function also bans exact ones (`Math.imul`, on which the sealed stream relies). The necessity table lacks Rapier's insertion-order row | Allow only the exactly specified Math functions (`abs`, `ceil`, `clz32`, `floor`, `fround`, `imul`, `max`, `min`, `round`, `sign`, `trunc`); ban the rest, `random`, clocks; add the insertion-order row. The 17-digit rule also covers preset JSON (JSON parsing has the same latitude) | no |
| F-13 | minor | step 2 §10; step 4 E-15 | "Every sector reachable only if the span ≥ one turn" is wrong: an arc longer than 2π − W meets every sector at any alignment | Use 2π − W: floors become 53.6 rad (one-sided) and 27.5 rad (symmetric), 7/8 of those printed | no |
| F-14 | minor | step 7 XV-01; step 4; `mwe_g1.py` | XV-01 claims oracle values at 8, 12 and 16 rad/s at a fixed u; the script computes only 12 and 12.3 with no fixed u. E-12's ω_eff = 12.3345 is in no results file. The COS_ALPHA comment says 17 significant digits; it has 15 | Compute the missing oracle values and E-12's replay figures in the script; fix the comment | no |
| F-15 | minor | step 7 ODG-g11 | The sealed lockstep already hands every peer each move's post-move state hash (`MoveListener`, `lockstep.ts`), which covers σ.H | Cite it: the peer option needs no new object | no |

**The owner's directions (2026-11-08, live):** F-1 "Adopt the fix (Recommended)"; F-2, F-3, F-4 "Both stand
(Recommended)" (the logging and start rulings stand on the corrected grounds); F-6 "Velocity and spin only
(Recommended)"; the other twelve "Apply all (Recommended)". All fifteen corrections are applied in steps 2 to 7, the
scripts and the handoff file, each logged in the package's revision history (r8 to r12).

Area checks the reviewer passed: the ECMA-262 and Rapier claims are stated correctly (the build-hash pin is the run's
own sound addition); every sealed-code claim is true at its cited line; apart from F-3 and F-14, every number quoted
in steps 4 and 6 matches the scripts.

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

### TABLETOP · Extension G-1 — physics decides a Randomizer's outcome (S1, Phase 1)

> **Extension of the sealed TABLETOP library (`seal-1`, `fca9e10`).** This file is the Phase 1 handoff for gap G-1
> only (`ui/gaps.md`). It never merges with `governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md` or with any other concept's
> file. Sealed objects are cited by identifier and reached only through their existing interfaces; nothing present at
> `seal-1` is written. The owner's ruling behind it: I-260 ("physics decides, for the die and the spinner"). The full
> package is `S1-G1-final-package.md` beside this file; the step files are its record.

#### What this project does

Adds a library-tier physics module to the sealed engine. Two new intents, `die:throw` and `spinner:spin`, carry the
seat's measured throw or flick as integers. The Guard refuses, before any draw and without logging, every throw it can
judge from the input alone: malformed, out of turn, below the no-throw floor, or a flick below the spinner's floor
x_min, which is set so that every jitter value clears it. Inside the sealed synchronous `submit`, the roll's applier
draws one value from the component's own seeded stream, applies it symmetrically (to the spinner's flick; to the die's
velocity and spin, never its release position), builds a fresh world on a pinned Rapier build from integers, pinned
literals and the component's last recorded rest pose, steps it at a fixed dt until it settles or hits the step cap,
and reads the outcome through ordered refusal gates. A VALUE writes the kind's sealed field (Die.face, Spinner.sector)
and a settle record (rest pose as a quaternion, input, jitter, step count, a pure-JS snapshot hash). A refused outcome
("re-roll", "re-spin") writes the settle record only, is logged, and leaves the roll owed. (seed, seats, log) replays
every outcome bit-for-bit on any machine. The engine is loaded before the game is hosted. Offline tools fit presets
from filmed data, each value tagged measured, published or assumed, and a dyno on the measured population admits a
preset for play.

#### Architecture

- X1 PhysicsHost — load the pinned build; give `host`/`resume`/`rebuild` a `wire` closing over the ready solver — ready for design
- X2 Presets — physical values with provenance; G-0a structural admission, G-0b admission for play (the dyno record); preset hash — ready for design
- X3 RollIntents — Guard specs (G-1, with the spinner's x_min); appliers: one draw → X4 → X5 → state; start from the last rest quaternion — ready for design (units, pin location implementation-dependent)
- X4 Simulator — the one roll function: fresh world, fixed insertion order, fixed dt, settle rule, Θ accumulated per step, pure-JS snapshot hash — ready for design
- X5 OutcomeReaders — gates G-F non-finite → G-2 unsettled → G-3 escaped → G-4 no-tumble (die) or the spinner's defect hook → G-5 cocked; the spinner's sector by sign tests — ready for design
- X6 SettleRecords — σ; the last σ per component; the replay comparison — ready for design
- X7 Trajectory — poses derived per read from σ, never stored — requires human review (needs ODG-g9)
- X8 Dyno — the hand's claim (measured population, outcome relative to the start, χ²) and the jitter's claim (aim advantage A), both on accepted outcomes with the acceptance rate — ready for design
- X9 Dataset — sources by hash, time base verified in clip, fits, held-out Θ and T residuals — conceptual (until the owner's films)
- X10 ClosedFormOracle — the spinner's exact model for vectors and analysis, never a decider — quasi-coded

Logic flow of one roll: Guard (G-1, no draw) → one draw (MOD-04) → x_eff → X4 roll → X5 gates → X6 σ → the apply returns
the next state → `submit` logs it (HOOK-02).

#### Interfaces and seams

- SX-01 X1 → Rapier — the pinned build, initialised — build SHA-256 = π.build
- SX-02 X1 → MOD-27 `host`/`resume`, MOD-02 `rebuild` — a `wire` closing over the ready solver — only after the load resolves
- SX-03 X1 → MOD-02 `registerIntent` — the two intents' specs and appliers — one registration per type
- SX-04 X3 → MOD-02 Guard — intent → LEGAL or intent refusal — pure; no draw; REF-01 semantics; the spinner's x ≥ x_min here
- SX-05 X3 → MOD-04 stream(component).next() — u, one per attempt, after LEGAL — XH-04
- SX-06 X3 → X4 — (π, P, x_eff, s0) — x_eff = x ⊙ (1 + ε·(2u − 1)) on the flick, or the die's velocity and spin; s0 a quaternion
- SX-07 X4 → Rapier — build, step, snapshot, free — fresh world, fixed order, fixed dt
- SX-08 X4 → X5 — the RollRun (rest summary, n* or UNSETTLED, H, Θ accumulated or the up-face sequence) — gate order fixed, G-F first
- SX-09 X5 → X6 — O, rest quaternion, n*, H — σ complete and finite before return
- SX-10 X3 → state via the apply return — VALUE: kind field + σ; REFUSE: σ only — no effect-owned field written
- SX-11 X3 → MOD-03 via `submit` — every attempt that drew, logged after success — HOOK-02
- SX-12 X6 → X3 — s0 = last σ rest quaternion, or the canonical pose — never from intent args
- SX-13 MOD-02 `rebuild` → X6 — rebuilt σ against the original run's reference H — ODG-g11; live peers already get each move's state hash (`MoveListener`)
- SX-14 X7 → X4 — σ re-simulated to poses — RX-1; last pose ≡ σ.rest
- SX-15 X7 → MOD-33 SeatView — σ visible to a view — needs K7-1-11's fix (ODG-g9)
- SX-16 MOD-34 TheaterSync ← X7 — displayed ≡ decided — HOOK-11 read as "engine-decided"
- SX-17 physics package → MOD-29 — imports point down; Rapier at library tier only — needs K7-1-3's path fix and new RULES rows in `tools/check-tiers.mjs` (ODG-g8)
- SX-18 X3 ⇸ MOD-09 — no effects — REF-24's detector, once built, names X3's writes (ODG-g10)
- SX-19 X2 → X8 — the preset for both claims — the measured population for play
- SX-20 X9 → X2 — fitted values with κ — κ = measured only with an in-clip time base and a time-dependent residual
- SX-21 X10 → X4 (tests) — Θ_closed against Θ_engine — tolerance on Θ, at least ω_eff·dt/2
- SX-22 X2 → X3, X4 — presets admitted for play, hashed into the pin record — XH-09

#### Reusability contracts

- RX-1 RollFunction — build, step loop, settle, hash — live roll, rebuild, X7, X8, vectors (rejects only structurally invalid presets, so the dyno can run before admission for play)
- RX-2 UnitsToBinary64 — integers ÷ exact unit scales — X3, X8, X2
- RX-3 OutcomeReaders — G-F, G-2..G-5 in order — X3, X8, X7's check, vectors
- RX-4 PinMatch — loaded build = π — X1, X3's hook
- RX-5 SettleRule — squared speeds under thresholds for K steps; cap N — inside RX-1
- RX-6 JitterApply — x ⊙ (1 + ε·(2u − 1)) on the flick, or the die's velocity and spin — X3, X8
- RX-7 ProvenanceCheck — κ present; measured needs a verified time base and held-out residuals — X2, X9
- RX-8 FairnessStatistics — χ² (relative to the start where starts chain) and aim advantage A, on accepted outcomes — X8, vectors

#### Scalability constraints

- SC-x1 Presets are data — sector widths, boundary directions, face labels, floors (x_min, T_f, no-throw), α, thresholds, ε, dt — they vary per component and dataset
- SC-x2 One attempt, one world — no shared world — history must not leak between rolls
- SC-x3 Bounded work per submit — N is preset data — `submit` is synchronous
- SC-x4 One σ per component in state — earlier σ derive from the log — derived values are never stored
- SC-x5 Versions side by side — the pin is per game — old games replay on their own build
- SC-x6 The dyno is offline — N, populations and its seeds are inputs — fairness is never computed at play time

#### Elegance rules

- EL-1 One roll function — a second simulation path for the view, dyno or replay
- EL-2 Only the exactly specified `Math` functions (`abs`, `ceil`, `clz32`, `floor`, `fround`, `imul`, `max`, `min`, `round`, `sign`, `trunc`) in building inputs or deciding; no clock, no `random` — `Math.sin` in a rail position; `Math.sqrt` for a speed
- EL-3 No world outlives an attempt — a module-level or cached world
- EL-4 No wall-clock or frame-driven step — dt from a frame callback
- EL-5 Inputs logged as integers, never re-rounded — a float in intent args
- EL-6 Refuse, never repair — nudging a cocked die flat; rounding Θ up to a turn
- EL-7 No kind field without σ; no σ without a logged attempt — Die.face written by a view or the dyno
- EL-8 No physics import below library tier — a kernel file importing the physics package
- EL-9 The seed never chooses an outcome — `nextInt(6)` for a face; a seed-generated throw
- EL-10 No stored trajectory — trajectory frames in state
- EL-11 A solver exists ready or not at all — a "loading" branch inside an applier

#### Verification obligations

- **Refusal and positive tests** (step 7 §10.1, carried in full in the package): XP-01 to XP-17 and XR-01 to XR-33 (XR-18
  reserved for an on-the-line rule if adopted; XR-22 folded into XR-01). At least one refusal per guard: G-H (XR-01,
  XR-02), G-0 (XR-03 to XR-08), G-1 (XR-09 to XR-11, XR-15, XR-28), the draw (XR-12), G-F (XR-32), G-2 (XR-13), G-3
  (XR-14), G-4 (XR-16, XR-33), G-5 (XR-17), the write (XR-19, XR-20), replay (XR-21), construction (XR-23), the world
  (XR-24), theater (XR-25), tiers (XR-26), the solver (XR-27, XR-30), preset wiring (XR-31), data (XR-29). Mutation-test
  each guard: delete the guarded call and the named test must fail.
- **Golden vectors:** XV-07 (the component stream's draws, computed from the sealed RNGStream) and XV-08 (the closed-form
  oracle on G-1's example, computed) are pinned; XV-01's oracle side is computed (Θ 16.0, 36.0, 64.0 rad at 8, 12,
  16 rad/s). DEFERRED, each with its discharge condition: XV-01 engine side, XV-02, XV-03 (cross-platform replay on two
  JavaScript engines or operating systems; no die module counts complete without it), XV-04, XV-05, XV-06, XV-09,
  XV-10. **Every deferred vector is computed from the implementation and re-derived before its module counts
  complete.** None is hand-written.
- **Hooks:** XH-01 (only exact `Math` functions; no clock or `random`; fail commit), XH-02 (build = pin at
  host/resume/rebuild; UNCOMPUTABLE), XH-03 (solver = pin inside the applier; load-bearing, since `registerIntent` and
  `supersedeIntent` are public), XH-04 (one draw, after LEGAL), XH-05 (world freed per attempt), XH-06 (write shape; no
  effect-owned field), XH-07 (rebuilt σ.H = reference; DivergenceError), XH-08 (tier boundary by resolved path, with
  RULES rows for the physics package and Rapier; needs ODG-g8), XH-09 (only presets admitted for play are wired), XH-10
  (displayed ≡ decided, last pose ≡ σ.rest; needs ODG-g9), XH-11 (no non-finite value recorded).
- **Production concerns (developer-owned):** XPC-01 latency of a synchronous simulation in `submit`; XPC-02 WASM size and
  load time; XPC-03 several pinned builds side by side; XPC-04 scripted aimers (with ODG-g6); XPC-05 dyno compute;
  XPC-06 films kept out of the synced repo, cited by hash; XPC-07 an accessible input that is still the seat's own,
  never seed-generated; XPC-08 re-roll telemetry.

#### Open decision gates

- ODG-g5 ε, x_min, A_max and the dyno pass rule per component — non-blocking for Phases 2–3; blocking for admitting a preset for play — the owner at R5
- ODG-g6 trust model against scripted aimers (a sealed seed-model change) — non-blocking — the owner, at Phase 5's security review or the first networked game
- ODG-g7 the pinned build and where the pin record lives (in the pack, or a setup intent) — non-blocking for Phases 2–3; blocking for Phase 4 — the owner (version), Phase 2 (placement)
- ODG-g8 K7-1-3: HOOK-06 by path containment, plus RULES rows naming the physics package and Rapier in `tools/check-tiers.mjs` (sealed) — blocking for Phase 4's merge — the owner (`seal.py reopen`); placement alone cannot discharge it
- ODG-g9 K7-1-11: the SeatView carries component state and σ — blocking for X7's view use, HOOK-11's extension and R6; not for R3–R4 — the owner (`seal.py reopen`)
- ODG-g10 K7-1-1/K7-1-10: REF-24's write-resolving detector names X3's writes — non-blocking (XR-20 guards X3) — the owner
- ODG-g11 where the replay check's reference hash is held (beside the row, or the peers' `MoveListener` hashes) — non-blocking for Phases 2–3; blocking for VC-1 in production — Phase 2/3 with the developer
- AE-c19 settle numbers and floors (dataset, R5) · AE-c20 input units (Phase 2) · AE-c26 τ/b mapping and tolerance (Phase 4's first vector) · AE-c28 several dice per throw (first such content) · AE-c29 the on-the-line rule (the owner at R5) — all non-blocking

#### Traceability

- X1 → SX-01, SX-02, SX-03 → P-1 EnginePin
- X2 → SX-19, SX-22 → P-2 Preset, P-11 Provenance
- X3 → SX-04, SX-05, SX-06, SX-10, SX-11, SX-12 → P-3 RollInput, P-4 StartState, P-5 JitterDraw
- X4 → SX-07, SX-08, SX-21 → P-6 Roll
- X5 → SX-08, SX-09 → P-7 OutcomeReader
- X6 → SX-09, SX-12, SX-13 → P-8 SettleRecord, P-9 ReplayCheck
- X7 → SX-14, SX-15, SX-16 → (derived) Trajectory, GX-52
- X8 → SX-19 → P-10 Dyno
- X9 → SX-20 → P-11 Provenance with Dataset
- X10 → SX-21 → (contextual) ClosedForm Φ

Axioms GX-40 to GX-52; base cases GBC-65 to GBC-87 (`step-3-base-case-reduction.md` §11).

#### Do not

- Do not write any file present at `seal-1`; a sealed object that must change is the owner's (`seal.py reopen`), never this extension's.
- Do not let the seed choose an outcome, and do not steer a result toward one (the bench's replay-plus-offset retires).
- Do not simulate on any build but the game's pin; never fall back to another build or to a seeded roll.
- Do not use a `Math` function outside the exact list, a clock or `random` to build inputs or decide; do not log a float input.
- Do not recover an angle with `atan2` or `acos` to decide; read sectors by sign tests and accumulate Θ per step.
- Do not reuse a world across attempts, or step by wall-clock or frame rate.
- Do not repair a throw: no nudging, re-dropping or rounding; refuse it.
- Do not test a floor the input can decide after the draw: a refusal that depends on u lets an aimer select on u.
- Do not draw more than once per attempt, or before the Guard's LEGAL; do not let an applier throw after its draw.
- Do not collapse the two refusals: an intent refusal is unlogged and drawless; an outcome refusal is drawn and logged.
- Do not write an effect-owned field from a roll, and do not route a roll through EFX.
- Do not record a non-finite value; refuse it.
- Do not store a trajectory; derive it from σ.
- Do not import the physics package or Rapier from the platform tier.
- Do not take a start pose from the intent; start where the component last rested.
- Do not jitter the die's release position.
- Do not admit a preset for play on an assumed population, judge fairness by a χ² over chained starts, or call a value measured without an in-clip time base.
- Do not let a closed form decide; it is an oracle for tests.
- Do not hand-write a golden vector; compute it or defer it with its discharge condition.

---

**Approval request.** This gate always halts. The owner is asked to approve the assembled package as the S1 for
extension G-1, so that R3 (Phase 2) may start fresh from these files.

**Approved by the owner, 2026-11-08, live at the gate: "Approve and commit (Recommended)".** R2 spend at the gate:
4.83M of 8M weighted (`.metaframework/spend-ledger.md`, rows "phase1:… G-1 (R2)").
