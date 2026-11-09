# Extension G-1 · Phase 2 · A2 — Hierarchy

Source: S1 (A1 §1). Every node traces into proven(S1) (A1 §2); sealed nodes are cited by their sealed identifiers
(A1 §3) and never changed. The sealed spine's rule "is-a in the catalog, has-a in the engine" (S2-TABLETOP-v2.0)
governs: inside the engine an edge is is-a only where S1 states the subtype; everything else is composition.

## 1. Candidate nodes

`Decides` (Amendment B-1): YES where the node consults something ambient (a policy, the active engine build, a stored
reference); NO where it computes from what it is handed. One reading throughout (TE-6 F2-05): a node handed a decider is not a decider by that alone, nor is a handle or a policy value; the node that consults it carries the YES. Guard: the S1 gate or hook the node carries.

| ID | Node | Kind | Is-a | Decides | Decides basis | Guard | Traces to |
|---|---|---|---|---|---|---|---|
| OBJ-01 | EnginePin | Value (π: package, version, build SHA-256, ι, dt) | — | NO | a record of values | — | P-1, GX-43, XTM-03 |
| OBJ-02 | PinRecord | Value (π and the admitted presets' hashes) | — | NO | a record of values; where it lives is ODG-g7, open | — | P-1 (PinRecord, hybrid), GX-43, AE-c16 |
| OBJ-03 | PhysicsHost | Host service and composition root (X1: `loadPinned`, `wirePhysics`, `replay`; the SolverLoader ℒ) | — | YES | consults the build source for the pinned build, the active engine version (GX-43): it decides whether a game may be hosted | G-H, XH-02, XH-07 | X1, SX-01, SX-02, SX-03, SX-13, XTM-12, AE-c13 ruling |
| OBJ-04 | ReadySolver | Engine handle (S, contextual) | — | NO | an external engine handle, handed to the Simulator, which carries the YES | EL-11 | ReadySolver (contextual), XTM-12, EL-11 |
| OBJ-05 | PinMatch | Utility (RX-4) | — | NO | compares a loaded build hash with π, both handed | XH-02, XH-03 | RX-4, GX-43 |
| OBJ-06 | Provenance | Value (κ: measured, published or assumed, with its source) | — | NO | a record of values | — | P-11, GX-49, XTM-08 |
| OBJ-07 | Preset | Abstract value (a component's physical values, each with κ; canonical pose; ε; settle numbers; N; floors) | — | NO | data | — | P-2, GX-49, GX-51, SC-x1, XTM-06 |
| OBJ-08 | DiePreset | Value (P_D: edge, mass, corner radius, face normals and labels, (μ, e) per contact pair, tray, α, T_f, bounds, no-throw floor) | OBJ-07 | NO | data | — | P-2, step 3 §10 (P_D), step 2 §4 Preset |
| OBJ-09 | SpinnerPreset | Value (P_S: I, a = τ/I, c = b/I, d = ΔE/I, sector widths and boundary directions, grab radius, x_min, bounds) | OBJ-07 | NO | data | — | P-2, step 3 §10 (P_S), step 2 §4 Preset |
| OBJ-10 | PresetValidation | Gate (G-0a, structural) | — | NO | computes from the preset alone: complete, κ on every value (a measured κ citing its fit), τ > 0, μ > 0, e < 1 | G-0a | X2 (step 7 §2), RX-7, GX-49, GX-51, GBC-69, GBC-70, F-7 |
| OBJ-11 | ValidPreset | Value (a preset that passed G-0a) | — | NO | a witness | — | X2 `validate(P) → ValidPreset`, RX-1 |
| OBJ-12 | PlayAdmission | Gate (G-0b, for play) | — | YES | consults the owner's dyno pass rule, a policy (ODG-g5) | G-0b | X2 (step 7 §2), GBC-71, step 6 S-1, S-3, F-7 |
| OBJ-13 | DynoPassRule | Policy interface (α_sig, A_max, the rule) | — | NO | the policy value itself, handed to PlayAdmission, which carries the YES | — | GBC-71, AE-c21, ODG-g5 |
| OBJ-14 | AdmittedPreset | Value (a ValidPreset and its passing dyno record, held by composition; its hash enters the pin record) | — | NO | a witness | XH-09 | X2 (step 7 §2) `admitForPlay → AdmittedPreset`, SX-22, XH-09 |
| OBJ-15 | RollInput | Abstract value (integers in declared units; logged as given) | — | NO | data | EL-5 | P-3, GX-41, GX-5, XTM-01, AE-c20 |
| OBJ-16 | Throw | Value (x_D = (p, v, w) ∈ ℤ⁹) | OBJ-15 | NO | data | — | P-3, step 2 §4 RollInput (die) |
| OBJ-17 | Flick | Value (x_S = ω₀ ∈ ℤ) | OBJ-15 | NO | data | — | P-3, step 2 §4 RollInput (spinner) |
| OBJ-18 | UnitsToBinary64 | Utility (RX-2: integer ÷ exact unit scale) | — | NO | computes from its arguments | — | RX-2, GX-41 |
| OBJ-19 | Jitter | Value with its rule (u, ε; factor 1 + ε·(2u − 1); RX-6 on the flick, or the die's velocity and spin) | — | NO | computes from u and ε, both handed | — | P-5, GX-42, RX-6, AE-c15 ruling, F-6, XTM-02 |
| OBJ-20 | EffectiveInput | Value (x_eff, binary64, the input's shape) | — | NO | a derived value | — | InputInEffect (derived), GX-42, SX-06 |
| OBJ-21 | Pose | Value (the engine's own rotation quaternion, and translation where the body moves) | — | NO | a record of the engine's output | — | P-4, StartState, F-5b, AE-c18 ruling |
| OBJ-22 | SettleRule | Rule (ρ: squared linear and angular speeds under thresholds for K steps; cap N) | — | NO | computes from the world state and the preset's numbers | — | RX-5, SettleRule [ρ], GX-44, GX-45, AE-c19 |
| OBJ-23 | SnapshotHasher | Utility (a pinned synchronous pure-JS hash; the sealed FNV-1a 64 is the candidate) | — | NO | computes from the snapshot bytes | — | SnapshotHash (derived), GX-46, F-11 |
| OBJ-24 | Simulator | Service (X4: the one roll function, RX-1; `roll`, `poses`) | — | YES | consults the engine build through the solver it is handed, and checks that build against π on every call (RX-1, XH-03); physics decides through it (GX-40) | XH-01, XH-03, XH-05 | X4, P-6, WorldBuild, Step, GX-40, GX-41, GX-44, RX-1, RX-4, XTM-01, XTM-03 |
| OBJ-25 | RollRun | Value (rest summary, n* or UNSETTLED, H, motion summary) | — | NO | a record of the run | — | X4 interface, SX-08 |
| OBJ-26 | OutcomeReader | Abstract (the fixed gate order G-F → G-2 → the kind's gates) | — | NO | computes from the RollRun and preset it is handed | G-F, G-2 | X5, P-7, RX-3, S-2, F-10, XTM-05 |
| OBJ-27 | DieReader | Reader (read_D: G-3 escaped, G-4 no-tumble, G-5 cocked; the face of greatest (R(q)·n_f)·ŷ) | OBJ-26 | NO | as OBJ-26; α, T_f and the tray are preset data | G-3, G-4, G-5 | P-7, step 2 §4 OutcomeReader (die), GBC-73, GBC-75, GBC-76 |
| OBJ-28 | SpinnerReader | Reader (read_S: sector by sign tests; Θ accumulated; G-4 under-floor a defect hook; G-5 on-line if adopted) | OBJ-26 | NO | as OBJ-26; boundary directions are preset data | G-4 (defect hook), G-5 | P-7, step 2 §4 OutcomeReader (spinner), F-1, F-5c, AE-c29 |
| OBJ-29 | RollOutcome | Value (O: VALUE(face ∣ sector) or REFUSE(outcome reason), reason ∈ {non-finite, unsettled, escaped, no-tumble, cocked, under-floor, on-line if adopted}) | — | NO | a value | — | RollOutcome [O], OutcomeRefusal (a named outcome, I-8), GX-45, GX-47, EV-5 |
| OBJ-30 | SettleRecord | Value (σ: component, attempt k, x, u, x_eff, s0, O, rest pose, n*, H, pin ref) | — | NO | a record | EL-7 | P-8, AE-c17 ruling, XTM-10 |
| OBJ-31 | SettleRecords | Module state (the last σ per component; `record`, `lastRest`) | — | NO | reads the state it is handed | — | X6, SC-x4, AE-c18 ruling, SX-12 |
| OBJ-32 | ReplayCheck | Comparator (χ: `compare(σ_rebuilt, H_ref)` → equal or DIVERGENCE) | — | NO | compares two values it is handed | G-7, XH-07 | P-9, GX-46, XTM-04 |
| OBJ-33 | ReplayReference | Reference interface (the original run's H, wherever it is held) | — | YES | a lookup of a stored reference; the holder is ODG-g11, open | — | SX-13, ODG-g11 |
| OBJ-34 | RollGuard | Guard spec (G-1; realises MOD-02's `IntentSpec`; its `rules` include the sealed `onTurnRule`) | — | YES | answers who may roll: the caller's seat against the active seat (the sealed `onTurnRule`), the component's kind read from the state (C_R), and whether the game is pinned (OBJ-49); bounds and floors are preset data; never draws | G-1 | X3, IntentRefusal (a named outcome, I-8), SX-04, GX-2, GX-43, GX-45, GX-47, GBC-65 to GBC-67, GBC-72, F-1 |
| OBJ-35 | RollApplier | Applier (realises MOD-02's `Applier`: one draw → jitter → roll → read → σ → next state) | — | NO | decides the next state from what it is handed: the Simulator, the kind's reader, the state and the sealed `ApplyContext`'s stream | XH-04, XH-06, XH-11 | X3, SX-05, SX-06, SX-10, SX-11, SX-12, AE-c14 ruling, AE-c24 ruling |
| OBJ-36 | Trajectory | Derivation (X7: poses from σ per read; never stored) | — | NO | re-runs σ through the Simulator it is handed | XH-10 | X7, GX-52, EV-3, SX-14, XTM-09 |
| OBJ-37 | DynoClaim | Abstract (N simulated rolls through the one roll function and reader; accepted outcomes; the acceptance rate; names π and the preset hash) | — | NO | computes from what it is handed | — | P-10, GX-48, GBC-83, GBC-87, F-1 |
| OBJ-38 | HandClaim | Claim (a population of inputs and a start policy; χ² of the outcome relative to the start) | OBJ-37 | NO | as OBJ-37 | — | GX-48(a), LA-3, F-2 |
| OBJ-39 | JitterClaim | Claim (fixed admissible inputs; the outcome over u; aim advantage A) | OBJ-37 | NO | as OBJ-37 | — | GX-48(b), LA-2 |
| OBJ-40 | Dyno | Offline runner (X8: `dyno`, `aim`) | — | NO | runs both claims on what it is handed; the pass rule is not its (OBJ-13) | — | X8, P-10, SC-x6, XTM-07 |
| OBJ-41 | DynoRecord | Value (π, preset hash, both claims' results, acceptance rate, seeds, population hash) | — | NO | a record | — | GBC-83, SX-19, SC-x6 |
| OBJ-42 | FairnessStatistics | Utility (RX-8: χ², A, acceptance rate; refuses an unnamed population or a χ² over chained starts) | — | NO | computes from its arguments | — | RX-8, GX-48 |
| OBJ-43 | DataSource | Value (a source by hash: own film, third-party or published; time base verified in clip or not; length scale) | — | NO | a record | — | X9, Dataset [𝒟], AE-c27 ruling, XPC-06 |
| OBJ-44 | ParameterFit | Derivation (a, c, d and other values with κ; Θ and T residuals on the held-out third) | — | NO | computes from the sources it is handed | — | X9 `fit`, P-11, step 6 S-2 |
| OBJ-45 | Dataset | Collection (sources, fits, the measured population) | — | NO | holds what it is given | — | X9, P-11 (𝒟), XTM-08 |
| OBJ-46 | ProvenanceCheck | Utility (RX-7: κ present; measured ⇒ verified time base and held-out residual) | — | NO | computes from its arguments | — | RX-7, GX-49, SX-20 |
| OBJ-47 | ClosedFormOracle | Oracle (Φ: Θ, T, skill index, coverage, A; tests and analysis only) | — | NO | computes from P_S and ω₀ | — | X10, Φ (contextual), SkillIndex, JitterCoverage, XTM-11 |
| OBJ-48 | EnergyBooks | Derivation (E = ½Iω₀² − τΘ − b∫ω²dt − ΣΔE) | — | NO | computes from what it is handed | — | EnergyBooks (derived), GX-50, XTM-11 |
| OBJ-49 | PinRecordSource | Reference interface (the game's pin record, or its absence, wherever it is held) | — | YES | a lookup of the game's pin; where it is held is ODG-g7, open | G-1 (pin record present) | GX-43, GX-47 ("unpinned"), step 3 §3 G-1, AE-c16 |

**Admitted is-a edges: 8.** Each is stated as a subtype in S1 (a ninth, AdmittedPreset is-a ValidPreset, was refused after TE-6 F2-08: RE-09):

| Edge | S1 statement |
|---|---|
| DiePreset, SpinnerPreset is-a Preset | step 2 §4 Preset: "Die: (...). Spinner: (...)"; step 3 §10 P_D and P_S; one primitive P-2, admitted by one gate G-0 |
| Throw, Flick is-a RollInput | step 2 §4 RollInput: "Die: x_D = (p, v, w) ∈ ℤ⁹. Spinner: x_S = (ω₀) ∈ ℤ"; one primitive P-3 |
| DieReader, SpinnerReader is-a OutcomeReader | read_c over c ∈ {Die, Spinner} (GX-40); one ordered chain with a fixed precedence (step 3 S-2); RX-3 |
| HandClaim, JitterClaim is-a DynoClaim | GX-48: one dyno record, two claims, "both measured on the outcome a seat finally gets, conditional on acceptance, with the acceptance rate reported"; GBC-83, GBC-87 |

**Sealed interfaces realised (extension, not rewrite):** RollGuard realises `IntentSpec` and RollApplier realises
`Applier`, both MOD-02's, as SX-03 requires ("X3's guard specs and appliers", through `registerIntent`). No sealed node
gains a parent, a member or a tag.

**No god class.** Every proven-structured element keeps a node: the gate chain (OBJ-26 to OBJ-28), the two claims
(OBJ-38, OBJ-39), σ (OBJ-30), the pin (OBJ-01, OBJ-02). Derived scalars with no structure of their own are operations of
the node that owns their inputs: the skill index δω and the jitter coverage are OBJ-47's; x_eff is OBJ-19's product
(OBJ-20); H is OBJ-23's.

## 2. Declared inputs (OS-1)

Construction: what the node is handed once. Operation: what each call is handed. A node needing something it is not
handed is not finished; none is left so. (TE-6 F2-01 to F2-04 found four rows short; completed: OBJ-03, OBJ-24, OBJ-37 to OBJ-40, and OBJ-49 added.)

| ID | Construction | Operation |
|---|---|---|
| OBJ-01 | package, version, build SHA-256, integration parameters ι, dt | — |
| OBJ-02 | EnginePin; the admitted presets' hashes | — |
| OBJ-03 | a build source (the pinned build's bytes, from the host); PinMatch; PinRecordSource; ReplayCheck; ReplayReference | `loadPinned(PinRecord)` → Promise⟨ReadySolver⟩ or UNCOMPUTABLE(π); `wirePhysics(ReadySolver, AdmittedPreset per component)` → `wire(core)`: as the one composition root it builds SnapshotHasher, the Simulator (with the solver and PinMatch), the kinds' readers, SettleRecords and one (RollGuard, RollApplier) pair per intent type, hands each its collaborators and registers each pair (SX-03); `replay(row, genesis)`: the sealed `resume` or `rebuild` with that `wire`, then each rebuilt σ and the state hash against ReplayReference through ReplayCheck (SX-13, XH-07) |
| OBJ-04 | the initialised Rapier module; EnginePin | — |
| OBJ-05 | — | (loaded build hash, EnginePin) |
| OBJ-06 | class, source citation | — |
| OBJ-07 to OBJ-09 | the values, each with its Provenance; canonical Pose | — |
| OBJ-10 | ProvenanceCheck | `validate(Preset)` → ValidPreset or REFUSE(preset-inadmissible: reason), with ProvenanceCheck's `present` on every value |
| OBJ-11 | Preset | — |
| OBJ-12 | DynoPassRule | `admitForPlay(ValidPreset, DynoRecord)` → AdmittedPreset, REFUSE, or UNDETERMINED until the rule exists |
| OBJ-13 | the owner's rule (ODG-g5) | `judge(DynoRecord)` → pass, fail |
| OBJ-14 | ValidPreset; DynoRecord (held, not inherited) | — |
| OBJ-15 to OBJ-17 | the integers in declared units (AE-c20) | `scale(Jitter)` → EffectiveInput: each component divided by its exact integer unit scale through UnitsToBinary64 (correctly rounded), then the jittered components multiplied by the jitter's factor, in that order (XV-09) |
| OBJ-18 | — | (integer, unit scale) |
| OBJ-19 | u (the attempt's one draw), ε (the preset's) | `factor()`; applied by the input to its jittered components |
| OBJ-20 | binary64 components | — |
| OBJ-21 | the engine's quaternion and translation | — |
| OBJ-22 | thresholds, K, N (preset data) | `atRest(world summary)` |
| OBJ-23 | — | (snapshot bytes) → H |
| OBJ-24 | ReadySolver; SnapshotHasher; PinMatch | `roll(EnginePin, ValidPreset, EffectiveInput, Pose)` → RollRun, or HookViolation before any step when the solver's build ≠ π (XH-03); `poses(…)` the same run, sampled (the preset supplies the SettleRule) |
| OBJ-25 | rest summary, n* or UNSETTLED, H, motion summary | — |
| OBJ-26 to OBJ-28 | — | `read(RollRun, Preset)` → RollOutcome |
| OBJ-29 | VALUE or REFUSE(reason) | — |
| OBJ-30 | component, k, x, u, x_eff, s0, O, rest Pose, n*, H, pin ref | — |
| OBJ-31 | — | `record(attempt)` → SettleRecord; `lastRest(state, component, canonical Pose)` → Pose |
| OBJ-32 | — | `compare(rebuilt SettleRecord, H_ref)` |
| OBJ-33 | the holder (ODG-g11) | `reference(game, attempt)` → H_ref |
| OBJ-34 | AdmittedPreset per component; PinRecordSource | the sealed `IntentSpec` (state, intent): `args` (the input's shape, integers, bounds, no start pose); `rules`, which include the sealed `onTurnRule`, the component's kind ∈ {Die, Spinner} read from the state, pinned (else RULE_REFUSED "unpinned"), the no-throw floor and the spinner's x_min |
| OBJ-35 | Simulator; the kind's OutcomeReader; SettleRecords; AdmittedPreset per component; EnginePin; the kind's sealed field name | the sealed `Applier`: (state, intent, ApplyContext) |
| OBJ-36 | Simulator | `trajectory(SettleRecord, EnginePin, Preset)` → poses |
| OBJ-37 to OBJ-39 | Simulator; the kind's OutcomeReader; FairnessStatistics; Jitter's rule; UnitsToBinary64 | HandClaim: (preset, population, start policy, N, seeds); JitterClaim: (preset, admissible inputs, N, seeds). Each seed opens a sealed `RNGStreams` (MOD-04), the source of u; a start policy is the canonical pose, or the previous attempt's rest Pose from its RollRun (the rule OBJ-31 applies in play) |
| OBJ-40 | HandClaim; JitterClaim | `dyno(ValidPreset, EnginePin, population, start policy, N, seeds)` → DynoRecord; `aim(ValidPreset, EnginePin, N, seeds)` → A_max |
| OBJ-41 | the fields listed | — |
| OBJ-42 | — | (counts, target, start policy) → χ², p; (outcome probabilities per input) → A |
| OBJ-43 | hash, origin, time-base status, length scale | — |
| OBJ-44 | ProvenanceCheck | `fit(DataSource set, model)` → values with κ, or refused |
| OBJ-45 | DataSource set; ParameterFit results | `population(DataSource set)` → a distribution named by hash |
| OBJ-46 | — | `present(value, Provenance)` (X2: κ present; a measured κ cites its fit); `measured(value, Provenance, DataSource, residuals)` (X9: a verified time base and a held-out residual) |
| OBJ-47 | — | `Φ(SpinnerPreset, ω₀)` → {Θ, T, δω, coverage, A} |
| OBJ-48 | — | (SpinnerPreset, ω_eff, Θ, ∫ω²dt, ΣΔE) |
| OBJ-49 | the holder (ODG-g7: the pack, or a setup intent in the state) | `pin(state)` → PinRecord or absent |

**One input found while declaring:** EnergyBooks needs ∫ω²dt from an engine run whenever b > 0 (GX-50's own formula),
and X4's motion summary lists only Θ. For the vectors S1 specifies (XV-01, XV-02 on S-min, b = 0, peg-free) the term is
zero and nothing is missing. For a drag preset, the spinner's motion summary carries ∫ω²dt, accumulated per step like
Θ with GX-41's operations only. This expresses GX-50 as written; it adds no element. Issue I2-03.

## 3. Refused edges, preserved as composition

| ID | Refused is-a | Reason | Preserved as |
|---|---|---|---|
| RE-01 | DiePreset is-a Die, SpinnerPreset is-a Spinner (a preset as a sealed kind) | The kinds are sealed `{face}`, `{sector}`; a preset is ruleset data about a component, not the component | A preset per component, keyed by component, handed by `wire` |
| RE-02 | SettleRecord is-a Spinner or Die state (the kind extended with the rest pose) | The owner ruled the rest pose into a settle record (AE-c17); a sealed kind cannot change (E-1) | σ in the module's own record, keyed by component (OBJ-31) |
| RE-03 | RollGuard is-a M2 Guard | The sealed Guard is the engine's one guard; a subclass would respecify it | A spec registered through `registerIntent` (SX-03), realising `IntentSpec` |
| RE-04 | RollApplier, Trajectory or Dyno is-a Simulator (each with its own simulation path) | EL-1: one roll function serves play, replay, the view and the dyno (RX-1, theorem D) | Each has-a Simulator, handed in |
| RE-05 | ClosedFormOracle is-a OutcomeReader or Simulator | GX-40: the closed form never decides; S-3 kept the turn test on the simulated Θ | A test-time comparison against the Simulator (SX-21) |
| RE-06 | PlayAdmission is-a PresetValidation | G-0b consults the owner's rule and G-0a does not; RX-1 must accept a G-0a-valid preset so the dyno runs before admission for play (F-7) | PlayAdmission takes a ValidPreset |
| RE-07 | EffectiveInput is-a RollInput | x is integers and logged (EL-5); x_eff is binary64 and never logged as an input | A value the input produces under a Jitter |
| RE-08 | ReplayCheck is-a Simulator (recompute inside the check) | The sealed `rebuild` re-runs the appliers (SX-13); the check only compares | ReplayCheck takes the rebuilt σ and H_ref |
| RE-09 | AdmittedPreset is-a ValidPreset | S1 states one gate in two parts and two witness types (step 7 §2 X2), not a subtype; AdmittedPreset is built from a ValidPreset and a DynoRecord (refused after TE-6, F2-08) | AdmittedPreset has-a ValidPreset and its DynoRecord; the held ValidPreset is what the Simulator is handed |

## 4. Gate

49 nodes (OBJ-49 added after TE-6), 8 admitted is-a edges, 2 sealed interfaces realised, 9 is-a edges refused and
preserved as composition. Decides: 6 YES (OBJ-03, 12, 24, 33, 34, 49), 43 NO. Batches under standing approval.
