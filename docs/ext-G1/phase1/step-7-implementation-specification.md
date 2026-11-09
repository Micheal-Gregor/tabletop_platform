# Extension G-1 · Phase 1 · Step 7 — Implementation Specification

Sources: steps 1 to 6 with the owner's rulings (step 5 §9) and the stress test's three corrections (step 6 §5).
Language-agnostic; logic that prose cannot carry is in Appendix A notation, cited by section and never extended. No
executable code. New identifiers are local to this extension (X-, SX-, RX-, SC-x, EL-, VC-, XP-, XR-, XV-, XH-, XPC-);
Phase 3 mints the library's MOD, SEAM, REF, VEC, HOOK and PC numbers from them, continuing above the sealed record's.

## 1. Implementation summary

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

## 2. Module decomposition

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

## 3. Object interfaces and seams

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

## 4. Reusability contracts

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

## 5. Scalability constraints

| Constraint | Not hard-coded, and why | Stateless or stateful | Idempotent | Decision it prevents | Trace |
|---|---|---|---|---|---|
| SC-x1 Presets are data | sector widths, boundary directions, face labels, floors (x_min, T_f, the no-throw floor), α, thresholds, ε, dt: they differ per component and per dataset | stateless | — | a spinner or die shaped by code edits | GX-49, step 6 S-1 |
| SC-x2 One attempt, one world | — | stateless per attempt | replaying an attempt gives the same σ | a shared world whose history leaks between rolls | GX-44, RX-1 |
| SC-x3 Bounded work per submit | N is preset data; the step cost is the engine's | — | — | an unbounded loop inside a synchronous submit | RX-5, XPC-01 |
| SC-x4 State grows by one σ per component | only the last σ per component is held (s0 and display); earlier σ derive from the log by replay | stateful (last σ only) | yes | storing every attempt's record or trajectory in state | GX-6 (sealed), EV-3 |
| SC-x5 Versions side by side | the pin is per game; a newer engine never replaces an older game's | — | — | silently upgrading old games | GX-43 |
| SC-x6 The dyno is offline | N and populations are inputs; the dyno's own seeds are recorded | stateless | yes (same seeds, same record) | fairness computed at play time | GX-48 |

## 6. Elegance rules

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

## 7. Validation checkpoints

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

## 8. Open decision gates

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

## 9. Traceability map update

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

## 10. Verification handoff

### 10.1 Conformance tests (input → expected result; positive XP, refusal XR)

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

### 10.2 Golden vectors

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

### 10.3 Hook manifest (load-bearing invariants only)

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

### 10.4 Production concerns (developer-owned carried gates)

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

## 11. Handoff checklist and quality check

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

## 12. Approval

Under standing approval this gate batches (no blocking decision gate arises for Phase 1; ODG-g8 and ODG-g9 block parts
of Phase 4 and R6 and are carried). Audit note: the specification adds ODG-g11 (the replay reference), found while
writing SX-13: the sealed row carries no state hash, so GX-46's comparison needs a reference the sealed objects do not
hold. It decides nothing; it names where Phase 2/3 must decide.

**Revised after the adversarial pass** (`step-8-adversarial-pass.md`), on the owner's "Adopt the fix", "Velocity and
spin only" and "Apply all": §1; X2 to X6 and X8 (F-1, F-5, F-6, F-7, F-10, F-11); SX-06, SX-08, SX-09, SX-13, SX-17,
SX-22; RX-1, RX-3, RX-6, RX-8; EL-2; VC-3; ODG-g5, ODG-g8, ODG-g11; XR-15 rewritten; XP-14, XP-17, XR-30 to XR-33
added; XV-01's oracle values; XH-01, XH-03, XH-11 and the hook-to-test map.
