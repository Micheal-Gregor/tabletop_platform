# Extension G-1 · Phase 1 · Step 2 — Theoretical Design

Source: `step-1-intake.md` (batched under standing approval). Notation: Appendix A of the Phase 1 roster, cited by
section (A.2 objects, A.3 registers, A.4 values and prohibited forms). Sealed objects are cited by identifier and never
re-derived (E-1).

## 1. Restated informal concept

A Die or Spinner's roll outcome is the settled state of a deterministic simulation of the seat's own logged input,
lightly jittered by the seed, on a pinned engine with pinned presets, in a fresh world at a fixed step. The outcome,
the snapshot hash and the record of the attempt are game state. A throw that does not settle cleanly gives a refused
outcome, never a repaired one. Fairness and every parameter's source are measured or declared, never assumed silently.

## 2. Purpose of the theoretical model

To state, as checkable objects and axioms, the conditions under which "physics decides" is (a) **exact on replay on
any machine**, (b) **the only decider** (no seed-chosen outcome, no steering), (c) **refusal-first** at its edges,
and (d) **measurably fair**, while adding nothing to and changing nothing in the sealed library.

## 3. Axiomatic set

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

## 4. Defined theoretical objects

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

## 5. Ambiguity register

AE-c13 to AE-c28 carry from Intake unchanged. One more surfaced here:

| ID | Ambiguity | Why it stays visible |
|---|---|---|
| AE-c29 | A peg-free spinner whose arrow rests within a small δ of a sector line: decided by the half-open convention, or refused as "on the line" (as many printed rules say) | A result on the line is decided by the engine but may look ambiguous to players; pegs remove the case physically |

## 6. Conflict register

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

## 7. Set-theoretic construction

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

## 8. Structural and mathematical embedding

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

## 9. Operational definitions

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

## 10. Equations and parameterised relationships

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

## 11. Preservation notes

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

## 12. Theoretical Design quality check

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
