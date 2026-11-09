# S2 · TABLETOP Extension G-1 — Final Package (Phase 2)

*Assembled by `assemble_package.py` from this frame and the stage files, each carried whole with its headings shifted
down two levels. Run R3, 2026-11-08. Library sealed at `seal-1` (`fca9e10`). S1: `docs/ext-G1/phase1/` (sha256 in
§6, A1 §1).*

## 1. Executive summary

- **Spine.** ∀ node ∈ OCH: trace_back(node) ⊆ proven(S1). Held: 49 of 49 nodes trace into S1, and every GX, P, X,
  RX and XTM id is named by a node (QG1 §1, by script).
- **The model.** 49 new nodes, OBJ-01 to OBJ-49, all ACTIVE: the pin, its record and the record's source, the host and the ready solver;
  presets in two forms with structural validation and admission for play; the integer inputs (Throw, Flick), the
  jitter and the effective input; the one roll function (Simulator) with its settle rule and snapshot hash; the
  ordered outcome readers (die, spinner); the outcome, the settle record and the module's last-σ store; the replay
  check and its reference; the guard spec and the applier the sealed engine registers; the trajectory; the dyno's two
  claims, its record and statistics; the dataset, its sources and fits; the closed-form oracle and the energy books.
- **Hierarchy.** 8 is-a edges, each stated in S1; 4 abstractions (Preset, RollInput, OutcomeReader, DynoClaim); 2
  sealed interfaces realised (MOD-02's `IntentSpec` and `Applier`); 9 is-a edges and 9 abstractions refused, each
  preserved. Decides: 6 YES, each handed in.
- **Admission.** PS_OOP = 1.0 on all five dimensions; RSI pass against the sealed model; AFG pass: ADMIT.
- **Worked example.** PASS WITH LATENT ASSUMPTIONS: two flicks refused by the Guard with no draw, two accepted with
  draws 1 and 2, the replay equal and a tampered replay divergent, the die jittered on velocity and spin only and its
  reader refusing a cocked rest (`a4b/a4b_g1.py`).
- **QG1 and ST.** Coverage complete; the AE register closed with one item for the owner (AE-c20, the input units) and
  twelve carried; all three stress scenarios pass.
- **TE-6.** 18 findings (0 blocking, 10 major, 8 minor), each re-checked by the lead and applied (§10): the replay
  check's caller, XH-03 in the roll function, the composition root, the dyno's seeds, one Decides reading, the sealed
  `onTurnRule`, a source for the pin record (OBJ-49), one is-a edge refused, XH-01's full scope, placement left to
  Phase 3, and eight bookkeeping fixes.
- **The sealed nodes have no `OBJ` ids** (the sealed Phase 2 predates the emission contract); 14 are carried by S2 name
  and `MOD-nn`. Logged as a plugin finding.
- **Kept open, as Phase 1 carried them:** ODG-g5, ODG-g6, ODG-g7, ODG-g8, ODG-g9, AE-c29; also ODG-g10, ODG-g11,
  AE-c19, AE-c26, AE-c28.
- **Next.** The owner's verdict at this gate; then R4, Phase 3 of the extension, in a fresh session from
  `CLAUDE_TABLETOP_G1_Phase2.md`.

## 2. Stage digest

| Stage | Result |
|---|---|
| A1 Intake | Guard AND[all_proven, all_directed] passes; proven-open items behind fixed interfaces; 14 sealed nodes registered ACTIVE; XTM-01 to XTM-12; payload registered (17 XP, 31 XR, 10 XV, 11 XH, 8 XPC); TS-6 dedupe not taken |
| A2 Hierarchy | 48 nodes with Decides and declared inputs (49 after TE-6); 9 is-a edges (8 after TE-6); 8 refused edges (9); one declared input found (I2-03, ∫ω²dt) |
| A3 Abstraction | 4 bases surfaced; 9 refused; 25 nodes tagged (26 after TE-6) |
| A4 Admission | PS_OOP 1.0; RSI pass; AFG pass; ADMIT |
| A4b Worked example | PASS WITH LATENT ASSUMPTIONS; 10 assumptions, none conflicting |
| QG1 | coverage complete; AE-c20 escalated; register CLOSED |
| ST | ST-1, ST-2, ST-3 pass |
| A5 Contract | the bundle; every carried item has an owner node |
| TE-6 | 18 findings (0 blocking, 10 major, 8 minor), all applied (§10) |
| Emission | `CLAUDE_TABLETOP_G1_Phase2.md`: `emission-check.py` conforms |

## 3. The expressed object model

### Extension G-1 · Phase 2 · A2 — Hierarchy

Source: S1 (A1 §1). Every node traces into proven(S1) (A1 §2); sealed nodes are cited by their sealed identifiers
(A1 §3) and never changed. The sealed spine's rule "is-a in the catalog, has-a in the engine" (S2-TABLETOP-v2.0)
governs: inside the engine an edge is is-a only where S1 states the subtype; everything else is composition.

#### 1. Candidate nodes

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

#### 2. Declared inputs (OS-1)

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

#### 3. Refused edges, preserved as composition

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

#### 4. Gate

49 nodes (OBJ-49 added after TE-6), 8 admitted is-a edges, 2 sealed interfaces realised, 9 is-a edges refused and
preserved as composition. Decides: 6 YES (OBJ-03, 12, 24, 33, 34, 49), 43 NO. Batches under standing approval.

### Extension G-1 · Phase 2 · A3 — Abstraction

Source: A2. An abstraction is surfaced only where S1 proves the grouping; property-based (tag-like) and build-status
groupings are refused. Tagging expresses S1's load-bearing invariants and open gates; it generates nothing.

#### 1. Abstractions surfaced (4)

| Base | Subtypes | The grouping S1 proves | What the base holds once |
|---|---|---|---|
| OBJ-07 Preset | OBJ-08 DiePreset, OBJ-09 SpinnerPreset | one primitive P-2 with two value forms (step 3 §10); one admission gate G-0 (GX-49, GX-51); one hash in the pin record (GX-43) | κ on every value, the canonical pose, ε, the settle numbers, N, the hash |
| OBJ-15 RollInput | OBJ-16 Throw, OBJ-17 Flick | one primitive P-3 with two forms (step 2 §4); GX-41 (integers in declared units); EL-5 (logged as given) | integer-ness, bounds and the no-throw floor against the preset; conversion by UnitsToBinary64; the jitter applied to the kind's jittered components (the die's velocity and spin, the spinner's flick; F-6) |
| OBJ-26 OutcomeReader | OBJ-27 DieReader, OBJ-28 SpinnerReader | one primitive P-7, read_c over c ∈ {Die, Spinner} (GX-40); one ordered chain with a fixed precedence (S-2); RX-3 | the order G-F → G-2 → the kind's gates; the first failing gate names the refusal; a REFUSE is never mapped to a value (EV-5) |
| OBJ-37 DynoClaim | OBJ-38 HandClaim, OBJ-39 JitterClaim | one dyno record, two claims (GX-48); both on accepted outcomes with the acceptance rate (F-1, GBC-87); both name π and the preset hash (GBC-83) | running N rolls through the one Simulator and the kind's reader; conditioning on acceptance; reporting the acceptance rate |

ValidPreset (OBJ-11) and AdmittedPreset (OBJ-14) are concrete witnesses, not abstractions; AdmittedPreset holds a
ValidPreset by composition (RE-09, after TE-6 F2-08).

#### 2. Abstractions refused

| ID | Refused abstraction | Kind | Reason | Preserved as |
|---|---|---|---|---|
| RA-01 | One Refusal base over the intent refusal and the outcome refusal | merge | GX-47 keeps them apart; tautology test INVALID (step 3 §8); I-8 preserves them as named outcomes, not objects | The Guard's sealed Refusal (MALFORMED_ARGS, RULE_REFUSED; unlogged, drawless) and RollOutcome's REFUSE(reason) (drawn, logged) |
| RA-02 | REFUSE(escaped) folded into REFUSE(unsettled) | merge | tautology test INVALID (step 3 §8): different meaning, function and trace | two reasons in RollOutcome |
| RA-03 | The hand's claim and the jitter's claim as one claim | merge | tautology test INVALID (step 3 §8): neither bounds the other | two subtypes of DynoClaim, which shares only the acceptance rule |
| RA-04 | A per-kind bundle (a "DieModel" holding the die's preset, input and reader) | property-based | it groups by kind alone; S1 proves no such object, and each part already has its proven base | three proven bases with per-kind subtypes |
| RA-05 | A physical-Randomizer base over the sealed Die and Spinner | rewrite | it changes sealed nodes (E-1); the sealed spine keeps is-a in the catalog and has-a in the engine | presets, inputs and readers keyed by component; the kinds untouched |
| RA-06 | One RollIntent class owning both the guard spec and the applier | merge | GX-47 (the guard never draws, the applier always draws once); XH-04 (the draw only after LEGAL); the sealed `registerIntent` takes them as two | RollGuard (OBJ-34) and RollApplier (OBJ-35), paired at registration (SX-03) |
| RA-07 | A base for the offline tools (X8 to X10), or for the modules "ready for design" | build-status | placement and readiness are not object structure; step 7 leaves package boundaries to Phases 2 and 3, and the boundary is Phase 3's | each node in its own right; placement carried to Phase 3 |
| RA-08 | Separate StartPose and RestPose types | split | s0 is by ruling a prior rest pose (AE-c18), carried as the engine's own quaternion and never re-derived from an angle (F-5b; GX-41 forbids sin and cos) | one Pose (OBJ-21) |
| RA-09 | One Gate base over G-H, G-0a, G-0b, G-1, G-F to G-5 and G-7 | property-based | they share only "refuses"; their deciders, outcomes and records differ (UNCOMPUTABLE, preset-inadmissible, an intent refusal, an outcome refusal, DIVERGENCE) | each gate in the node that owns it |

#### 3. Tags

`LB` is a load-bearing invariant carried from S1 (a hook XH-nn, an elegance rule EL-nn, or a gate). `open` names a
proven-open gate behind the node's fixed interface.

| ID | Node | Tag |
|---|---|---|
| OBJ-02 | PinRecord | open: ODG-g7 (placement and version) |
| OBJ-03 | PhysicsHost | LB GX-43 (G-H, XH-02); LB EL-11; LB XH-07 (after `rebuild`) |
| OBJ-04 | ReadySolver | LB EL-11 |
| OBJ-05 | PinMatch | LB XH-02, XH-03 |
| OBJ-10 | PresetValidation | LB GX-51 |
| OBJ-12 | PlayAdmission | open: ODG-g5 |
| OBJ-13 | DynoPassRule | open: ODG-g5 (AE-c21) |
| OBJ-14 | AdmittedPreset | LB XH-09 |
| OBJ-15 | RollInput | LB EL-5; AE-c20 ruled: mm, mm/s, mrad/s |
| OBJ-19 | Jitter | LB EL-9 |
| OBJ-22 | SettleRule | open: AE-c19 (numbers) |
| OBJ-23 | SnapshotHasher | LB GX-46 (synchronous, F-11) |
| OBJ-24 | Simulator | LB EL-1, EL-2 (XH-01), EL-3 (XH-05), EL-4, XH-03 |
| OBJ-26 | OutcomeReader | LB S-2 (gate order), EL-6, XH-11 (G-F) |
| OBJ-28 | SpinnerReader | open: AE-c29 |
| OBJ-30 | SettleRecord | LB EL-7 |
| OBJ-31 | SettleRecords | LB SC-x4 |
| OBJ-32 | ReplayCheck | LB XH-07 |
| OBJ-33 | ReplayReference | open: ODG-g11 |
| OBJ-34 | RollGuard | LB GX-47; LB F-1 (the spinner's floor before the draw) |
| OBJ-35 | RollApplier | LB XH-04, XH-06, XH-11 |
| OBJ-36 | Trajectory | LB XH-10, EL-10; open: ODG-g9 |
| OBJ-37 | DynoClaim | LB F-1 (accepted outcomes) |
| OBJ-45 | Dataset | open: the owner's films (X9's status; XV-06) |
| OBJ-47 | ClosedFormOracle | LB GX-40 (never a decider) |
| OBJ-49 | PinRecordSource | open: ODG-g7 |

Every other node is untagged ("—").

#### 4. Gate

4 abstractions surfaced, each proven; 9 refused with reasons; 26 nodes tagged (after TE-6). Batches under standing approval.

## 4. Admission verdict detail

### Extension G-1 · Phase 2 · A4 — Admission

Computed after A2 and A3 mapped the whole structure (49 nodes, 8 is-a edges, 4 abstractions; revised after TE-6). Tri-valued: any UNKNOWN
halts to investigate. RSI is checked separately against the sealed model and never folded into the MIN.

#### 1. PS_OOP, five dimensions

| Dimension | Question | Evidence | Value |
|---|---|---|---|
| Meaning | Does every node keep the meaning of the S1 element it expresses? | Each node's Kind cell restates S1's definition (step 2 §4, step 7 §2); the two refusals, the two claims and the escaped and unsettled reasons stay apart (RA-01 to RA-03); the kinds keep `{face}` and `{sector}` (RE-01, RE-02) | 1.0 |
| Function | Does every S1 operation have exactly one home? | X1 to X10's public interfaces map onto OBJ-03, 10, 12, 24, 26, 31, 32, 36, 40, 44, 45, 47; RX-1 to RX-8 onto OBJ-24, 18, 26, 05, 22, 19, 46, 42 (QG1 §1); after TE-6 (F2-01 to F2-04) every node is handed what it uses: OBJ-03 calls the replay check after `rebuild`, XH-03 runs in OBJ-24, OBJ-03 composes and registers the pairs, the dyno's claims are handed their seeds | 1.0 |
| ExpressivePower | Can the model express every S1 base case? | §2: GBC-65 to GBC-87, each at a named node | 1.0 |
| Traceability | Does every node trace into proven(S1)? | 49 of 49 non-empty `Traces to` cells (QG1 §1, by script) | 1.0 |
| AbstractionFidelity | Is every abstraction proven, and nothing flattened? | 4 bases, each with S1's grouping (A3 §1); 9 refused (A3 §2); no subtype collapsed into its base | 1.0 |

**PS_OOP = MIN(1.0, 1.0, 1.0, 1.0, 1.0) = 1.0.** No dimension is UNKNOWN.

#### 2. Base cases at their nodes (ExpressivePower)

| Base case | Node |
|---|---|
| GBC-65 malformed input; GBC-66 no throw; GBC-67 not a Randomizer or out of turn | OBJ-34 RollGuard with OBJ-15 RollInput; its rules include the sealed `onTurnRule` (MOD-02) and read the kind from the state |
| GBC-68 unloadable pin | OBJ-03 PhysicsHost, OBJ-05 PinMatch |
| GBC-69 τ ≤ 0, μ ≤ 0, e ≥ 1; GBC-70 a value without κ | OBJ-10 PresetValidation, OBJ-46 ProvenanceCheck |
| GBC-71 no dyno record, or a failing one | OBJ-12 PlayAdmission, OBJ-13 DynoPassRule (UNDETERMINED until ODG-g5) |
| GBC-72 a flick under x_min (intent refusal); an admitted flick under a turn (defect) | OBJ-34 RollGuard; OBJ-28 SpinnerReader |
| GBC-73 cocked; GBC-75 escaped; GBC-76 no-tumble | OBJ-27 DieReader |
| GBC-74 unsettled | OBJ-22 SettleRule, OBJ-26 OutcomeReader (G-2) |
| GBC-77 DIVERGENCE | OBJ-03 `replay` → OBJ-32 ReplayCheck with OBJ-33 ReplayReference |
| GBC-78 a sector; GBC-79 a face | OBJ-28, OBJ-27 → OBJ-35 RollApplier → OBJ-30 SettleRecord |
| GBC-80 identical on two platforms | OBJ-24 Simulator, OBJ-23 SnapshotHasher (XV-03) |
| GBC-81 engine against Φ, energy balanced | OBJ-24 against OBJ-47 ClosedFormOracle and OBJ-48 EnergyBooks |
| GBC-82 Θ rises with ω₀ | OBJ-24 (XP-13) |
| GBC-83 the dyno record | OBJ-40 Dyno, OBJ-41 DynoRecord |
| GBC-84 last pose ≡ rest | OBJ-36 Trajectory |
| GBC-85 one draw, indexed by earlier drawn attempts | OBJ-35 RollApplier |
| GBC-86 non-finite | OBJ-26 (G-F) |
| GBC-87 accepted outcomes; relative to the start | OBJ-37 DynoClaim, OBJ-38 HandClaim |

#### 3. RSI: extension, not rewrite (against the sealed model)

| Check | Result |
|---|---|
| A sealed node's parent, members or tags changed | none: the 14 sealed nodes of A1 §3 are cited and reached only through their interfaces |
| A new subtype of a sealed node | none; two sealed interfaces are realised (MOD-02's `IntentSpec`, `Applier`), which is extension |
| A sealed kind's state | unchanged: Die `{face}`, Spinner `{sector}` (AE-c17 ruling; RE-01, RE-02) |
| A governed vocabulary grows | none: EFX v1.1.1 (AE-c24 ruling: a roll is its own mutation), HookPoints v1.0, VerbSets v1.0 (`roll` and `spin` are already members) |
| The Randomizer binding (SEAM-23) | unchanged: the stream supplies u only (GX-42) |
| A sealed ODG designed around | none: the SeatView (ODG-g9) and `tools/check-tiers.mjs` (ODG-g8) are left as they are, and the nodes that need them carry `open` tags |
| A file present at `seal-1` written | none |

**RSI: PASS.**

#### 4. AFG: no flatten without equivalence

No node was flattened. The only merges considered (RA-01, RA-02, RA-03, RA-06) were refused: three on S1's own
tautology tests (INVALID), one on GX-47 and XH-04. **AFG: PASS.**

#### 5. Verdict

PS_OOP = 1.0 ∧ RSI pass ∧ AFG pass: **ADMIT** all 49 nodes, status ACTIVE. The verdict goes to the owner at the final
gate; under standing approval this gate batches.

### Extension G-1 · Phase 2 · A4b — Worked example

The smallest instance that walks the admitted model end to end: S1's spinner preset S-min (step 4 §2: I = 0.002
kg·m², τ = 0.004 N·m, b = 0, 8 equal sectors, ε = 0.05, every value κ = assumed), one seat's four flicks, their replay,
a tampered replay, the die's input and reader on given rest poses, and the admission chain. Numbers are computed by
`a4b/a4b_g1.py` (sha256 `6492e51d627267e19c622ba8f286beb4059ca79d9d1ebe2b0cc1cdb4803b8c5f`) into `a4b/a4b-results.json`
(sha256 `3e54558db39fc276330196fa0877e5b34a7245680296aa2add297827f9d5974c`). The closed form stands in for the Simulator
because Phase 2 has no engine; it is labelled a stand-in and decides nothing in the model.

#### 1. Steps

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

#### 2. Assumptions

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

## 5. Quality gate and stress test

### Extension G-1 · Phase 2 · QG1 and ST — Quality gate and stress test

#### 1. Coverage (by script)

`qg1_coverage.py` over `a2-hierarchy.md`:

```
nodes 48; backward gaps 0 []
S1 ids 54; forward gaps in node traces 0 []
theoretical objects 27; not named anywhere in a2 0 []
```

The first run found one forward gap (X5, named by no trace) and four objects named nowhere (WorldBuild, Step,
IntentRefusal, OutcomeRefusal). Each was already expressed: X5 is OBJ-26's module, WorldBuild and Step are OBJ-24's
build and step loop, and the two refusals are the named outcomes of OBJ-34 and OBJ-29 (I-8). The traces were added to
those rows; no node changed. **Backward coverage: complete. Forward: every GX, P, X, RX and XTM id is named by a node** (the ids the script
checks; SX, SC-x, EL and GBC ids are expressed in the sealed table, the tags, the refused rows and A4 §2, by reading;
the claim was first wider, corrected after TE-6, F2-18).

Function mapping (A4 §1): X1 → OBJ-03; X2 → OBJ-10, OBJ-12; X3 → OBJ-34, OBJ-35; X4 → OBJ-24; X5 → OBJ-26 to OBJ-28;
X6 → OBJ-31, OBJ-32; X7 → OBJ-36; X8 → OBJ-40; X9 → OBJ-44, OBJ-45; X10 → OBJ-47. RX-1 → OBJ-24; RX-2 → OBJ-18;
RX-3 → OBJ-26; RX-4 → OBJ-05; RX-5 → OBJ-22; RX-6 → OBJ-19; RX-7 → OBJ-46; RX-8 → OBJ-42.

#### 2. AE Resolution Protocol

| Item | Question | Disposition |
|---|---|---|
| AE-c20 | The integer inputs' units (S1: "Phase 2, the Throw and Flick objects") | **ESCALATE to the owner** at the final gate; **ruled 2026-11-08, live: "mm, mm/s, mrad/s (Recommended)"**. Recommended: lengths in mm, speeds in mm/s, angular speeds in mrad/s, fixed by the input type (OBJ-16, OBJ-17), not preset data, so a logged integer means the same in every game; each component divided by the exact integer 1000 (correctly rounded), then the jitter's factor applied, the order XV-09's bits depend on. Resolution: 0.0005 rad/s on ω₀ against S1's skill index of 0.13 rad/s; for the die 0.5 mm and 0.5 mm/s, against which S1 states no bound |
| AE-c16, ODG-g7 | The pinned build; where the pin record lives | **CARRY FORWARD**, open as Phase 1 carried it (the lead session's instruction): OBJ-02 is handed to the host and the Guard; its home is not chosen (I2-02) |
| ODG-g11 | Where the replay reference hash is held | **CARRY FORWARD** to Phase 3 with the developer, behind OBJ-33's interface; options stay S1's (beside the row; the peers' `MoveListener` hashes) |
| ODG-g5, AE-c21 | ε, x_min, A_max, the dyno pass rule | **CARRY FORWARD** to the owner at R5 (OBJ-12, OBJ-13) |
| ODG-g6, AE-c25 | The trust model against scripted aimers | **CARRY FORWARD** to the owner |
| ODG-g8 | K7-1-3 and the sealed `tools/check-tiers.mjs` | **CARRY FORWARD** to the owner; blocks Phase 4's merge |
| ODG-g9, AE-c22 | The sealed SeatView carries no component state | **CARRY FORWARD** to the owner; OBJ-36's view delivery waits on it |
| ODG-g10 | REF-24's detector names X3's writes | **CARRY FORWARD**; XR-20 guards meanwhile |
| AE-c19 | Settle numbers, floors, α, T_f | **CARRY FORWARD** to the dataset and R5 (OBJ-22) |
| AE-c26 | τ and b in the engine; XV-01's tolerance | **CARRY FORWARD** to Phase 4's first vector |
| AE-c28 | Several dice per throw | **CARRY FORWARD** to the first such content |
| AE-c29 | The on-the-line rule | **CARRY FORWARD** to the owner at R5 (OBJ-28) |
| I2-01 | The sealed nodes have no `OBJ` ids | **RESOLVE NOW**, the lead's method (SR-3, how to carry out a listed step): carried by S2 name and `MOD-nn`; new ids from `OBJ-01`; reported, and a plugin finding |
| I2-03 | EnergyBooks needs ∫ω²dt when b > 0 | **RESOLVE NOW**: GX-50's own formula; the spinner's motion summary carries it for drag presets. No element added |

No admitted exception (`AE-nn`) arises: no rule is excepted for any node. **The register is CLOSED.** An ambiguity found
after this point is an ODG.

**Self-reliance points** (I-02 pattern): I2-01 (the sealed ids), the realisation of MOD-02's `IntentSpec` and
`Applier` read from the sealed code (`kernel/guard.ts`, `kernel/core.ts`) rather than from S1's prose, and the sealed
FNV-1a 64 located in `kernel/statetree.ts` as `hashState`.

#### 3. Stress test

##### ST-1 Constraint collision: the generative mandate against fidelity

**Pressure.** Phase 2 must emit a complete model, and three pulls ask it to generate: the re-entry plan's draft class
list (`docs/reentry-2026-11-08.md` §3: "PhysicsWorld … Throw and Flick … Jitter, Settle … DieBody and DieSolver,
SpinnerGeometry, SpinnerBody and SpinSolver"); S1's open items (the pin record's home, the units, the replay
reference); and the temptation to add tests for the new nodes (UNDETERMINED at G-0b has none of its own).

**Outcome.** The draft is not S1. Throw, Flick and Jitter are expressed because S1 proves them (P-3, P-5). DieSolver and
SpinSolver contradict EL-1 (one roll function); DieBody, SpinnerBody and SpinnerGeometry are what WorldBuild makes inside
the Simulator from a preset, not proven objects, so none becomes a node. PhysicsWorld is OBJ-24's fresh world, never an
object that outlives an attempt (EL-3). The open items stay behind their interfaces (OBJ-02, OBJ-33) or go to the owner
(AE-c20). No test is generated: GBC-71's UNDETERMINED is carried as S1 has it. **PASS.** Protection: the spine,
proven-open gates behind fixed interfaces, and "preserve inherited, create none".

##### ST-2 Missing information: an undirected dependency

**Probe.** Each node's declared inputs (A2 §2) were read against what its sources hand it. A node that needs an input
nobody hands it, or a dependency whose direction S1 leaves open, halts A1 with a blocking AE.

**Outcome.** One input was missing from S1's prose: EnergyBooks's ∫ω²dt for a drag preset (I2-03). GX-50's formula
names it, so it is expressed, not invented; S1's vectors (b = 0) do not need it. Every dependency is directed: the replay path runs PhysicsHost's `replay` → the sealed `rebuild` (the appliers re-run) → each rebuilt σ and H_ref
from OBJ-33 → ReplayCheck (SX-13, XH-07 after `rebuild`; the caller was first left unnamed, corrected after TE-6,
F2-01); the
kind's field name reaches RollApplier at construction from the sealed kind (MOD-10). Had S1 left the rebuild-to-X6
direction open, A1 would have halted, reject-not-repair. **PASS.** Protection: A1's guard and OS-1's declared inputs.

##### ST-3 Adversarial interpretation: flattening that stays traceable

| Attack | Why it traces | Why it fails |
|---|---|---|
| One Roll class doing X3 to X6 | every member traces to P-6 or XTM-01 | no god class: σ, the gate chain and the guard are proven-structured; GX-47 and XH-04 keep the guard and the applier apart (RA-06); EL-1 needs the Simulator shared with X7 and X8 (RE-04) |
| Subclass the sealed Spinner to carry its rest angle | XTM-10 "the Spinner's sector and resting angle" | RSI fails: a sealed member changes; the owner ruled a settle record (AE-c17, RE-02) |
| One OutcomeReader with a kind switch | P-7 is one primitive | AFG: not equivalent (G-3 is the die's only; dot products against sign tests), so flattening is refused |
| Let the closed form skip the spinner's simulation | XTM-11, "the spinner proves the engine" | GX-40: the oracle never decides (RE-05, S-3) |

**PASS.** Protection: no-god-class, RSI against the sealed model, and AFG.

#### 4. Gate

QG1 passes with coverage complete, the register closed, one item escalated to the owner (AE-c20) and twelve carried.
ST passes all three scenarios. Batches under standing approval.

## 6. Intake and the consolidated traceability map

### Extension G-1 · Phase 2 · A1 — Intake

Run R3 (`docs/reentry-2026-11-08.md` §5), the Phase 2 leg of extension G-1 (Amendment E-1). Library sealed at
`seal-1` (`fca9e10`). Started fresh from S1's files (TE-3). Gate handling: standing approval (SR-3); the final gate
is the owner's, live. Budget: 4M weighted, measured as the ledger total at the start (25,661,063) plus 4,000,000:
`spend.py status --budget 29661063 --measure tokens`.

#### 1. Inputs, by hash

| Input | sha256 | Standing |
|---|---|---|
| `docs/ext-G1/phase1/S1-G1-final-package.md` | `143b5a1635c0fffae787153d9d68a36e4df18669fb6cb19169e0dc3c5f5b4e72` | S1, approved by the owner 2026-11-08, live: "Approve and commit (Recommended)"; commit `10dea4a` |
| `docs/ext-G1/phase1/CLAUDE_TABLETOP_G1.md` | `15fbe9409bfd3cfcda34de78a13b83252819f9df3f9412ae0a0b225300d23cf1` | same gate |
| `governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md` | `9b10495ba53a391d6c0201328f3a8e728a92a9859aad48acf18f1e4dc85485f4` | the sealed S3 (v1.3); the record of the sealed nodes' modules |
| `governance/upstream/CLAUDE_TABLETOP_v2.md` | `408c52da9c64432aba4c4e8057970aba2b9d61abd028a58fdc0e8a05092e3eb5` | the sealed Phase 1/2 anchor (S2-TABLETOP-v2.0), read-only |

The step files (`step-1` to `step-8`) are the S1 package's own sections, carried whole by `assemble_package.py`; they
are read as the package, not as separate inputs.

#### 2. Entry guard: AND[all_proven, all_directed]

**all_proven: PASS.** Every element Phase 2 expresses is proven in S1:

- axioms GX-40 to GX-52 (step 2 §3), each with its trace to I-260, G-1 or a sealed axiom;
- primitives P-1 to P-11 (step 3 §5) and the 22 theoretical objects (step 2 §4), classified in step 3 §6
  (primitive, hybrid, derived, contextual, external), none removed (step 3 §7, three tautology tests INVALID);
- base cases GBC-65 to GBC-87, refusals first (step 3 §11);
- modules X1 to X10, seams SX-01 to SX-22, contracts RX-1 to RX-8, constraints SC-x1 to SC-x6, rules EL-1 to EL-11
  (step 7), with the owner's rulings at the Consistency Gate (step 5 §9) and after the adversarial pass (step 8).

**Proven-open, not unproven** (each behind the fixed interface S1 gives it; Phase 2 expresses the interface, never the
body):

| Open item | Fixed interface S1 gives | Stays open with |
|---|---|---|
| ODG-g5 (ε, x_min, A_max, the dyno pass rule, AE-c21) | preset data (SC-x1); `admitForPlay(ValidPreset, dynoRecord)` | the owner at R5 |
| ODG-g6 (AE-c25, scripted aimers) | XPC-04; the seed model unchanged | the owner |
| ODG-g7 (AE-c16: the pinned build; where the pin record lives) | the pin record is covered by (packRef, seed, seats, log) and checked before any roll (GX-43) | the owner (version); placement also kept open in this run, on the lead session's instruction |
| ODG-g8 (K7-1-3, the sealed `tools/check-tiers.mjs`) | SX-17, XH-08, XR-26 | the owner (`seal.py reopen`) |
| ODG-g9 (K7-1-11, the sealed SeatView) | X7 `trajectory(σ, π, P)`; SX-15 blocked | the owner (`seal.py reopen`) |
| ODG-g10 (REF-24's detector) | XR-20 guards X3's writes | the owner |
| ODG-g11 (where the replay reference hash is held) | `compare(σ_rebuilt, H_ref)`; H_ref from the original run (SX-13) | Phase 2/3 with the developer |
| AE-c19, AE-c26, AE-c28, AE-c29 | preset data; XV-01's tolerance; one world per throw; the half-open rule by default | the dataset and R5; Phase 4's first vector; first such content; the owner at R5 |
| X9 Dataset ("conceptual until the owner's films") | `fit(sources, model)`, `population(sources)`, RX-7 | the films |

**all_directed: PASS.** Every module dependency in step 7 §2 names its direction and strength (hard). Every seam
SX-01 to SX-22 names source and target; SX-16 (`MOD-34 ← X7`) and SX-18 (`X3 ⇸ MOD-09`, no transfer) are directed. No
dependency is undirected. **A1 does not halt.**

#### 3. Sealed nodes referenced (Amendment E-1)

The sealed Phase 2 (S2-TABLETOP-v2.0) minted no `OBJ` ids: the sealed S3 v1.3 says so in its §2 and §3 ("Phase 2 ...
minted no OBJ ids, so no row is keyed here"). The sealed nodes therefore have no `OBJ-nn` to carry. Each is carried
here with the identifiers the sealed record does give it, its S2 node name and its `MOD-nn`, status ACTIVE, proven by
the sealed run and not re-admitted. No `OBJ` id is minted for a sealed node: that would give a sealed entity a second
key in a record that is not sealed. New ids start at `OBJ-01`, above the highest sealed `OBJ` id (none). Recorded as a
self-reliance point (§6) and a plugin finding.

| Sealed node (S2 name) | MOD | What the extension reaches, and only through | Status |
|---|---|---|---|
| M1 StateTree; kernel types (State, Intent, Refusal, Verdict, GameRow); `hashState` (FNV-1a 64) | MOD-01 | the next state an applier returns; the sealed FNV-1a 64 as the snapshot hash's candidate (GX-46, F-11) | ACTIVE |
| M2 Guard, with EngineCore (`registerIntent`, `supersedeIntent`, `submit`, `rebuild`), `IntentSpec`, `Applier`, `ApplyContext`, `HookViolation`; the shared `onTurnRule` (`kernel/discipline.ts`) | MOD-02 | registration (SX-03), the guard spec (SX-04), the apply return (SX-10), `rebuild` (SX-13); turn discipline (HOOK-01, REF-01) | ACTIVE |
| M3 IntentLog | MOD-03 | the log, through `submit` (SX-11, HOOK-02) | ACTIVE |
| M4 RNGStreams, `RNGStream.next` | MOD-04 | `ctx.rng.stream(name).next()`, one draw per attempt (SX-05) | ACTIVE |
| M8 PackLoader | MOD-08 | nothing yet: one candidate home of the pin record (ODG-g7, open) | ACTIVE |
| M9 EffectEngine | MOD-09 | nothing: rolls apply no effect (SX-18, AE-c24 ruling) | ACTIVE |
| ME1 KindRegistry and the Component family: Die `{face}`, Spinner `{sector}` | MOD-10 | the kind's sealed field, written by the apply return on a VALUE only | ACTIVE |
| ME2 RoleBinder: Randomizer → RNGStreams (SEAM-23) | MOD-11 | unchanged: the Randomizer's stream supplies u (GX-42) | ACTIVE |
| GovernedVocabulary: EFX v1.1.1, HookPoints v1.0, VerbSets v1.0 (`roll`, `spin` already members) | MOD-21 | nothing: no vocabulary grows | ACTIVE |
| M16 Transport: LockstepController `host`/`resume` with `wire`; `MoveListener` | MOD-27 | `wire` (SX-02); `MoveListener`'s state hash as one ODG-g11 option (F-15) | ACTIVE |
| TierCriterion (`tools/check-tiers.mjs`) | MOD-29 | SX-17, needing ODG-g8 | ACTIVE |
| MP5 SeatProjector | MOD-33 | SX-15, blocked by ODG-g9 | ACTIVE |
| MP8 TheaterSync (HOOK-11, read "engine-decided", AE-c23 ruling) | MOD-34 | SX-16 | ACTIVE |
| Rapier (EXTERNAL @rapier.rs) | — | build, step, snapshot, free (SX-01, SX-07) | external |

#### 4. Traceability Map anchor

S1's traceability map (package §9) has twelve rows and no ids; they are keyed here, in S1's order, so nodes can cite
them. Each row's content is S1's.

| XTM | S1 concept element | Theoretical object | Primitive | Module | Seam | Contract |
|---|---|---|---|---|---|---|
| XTM-01 | the seat's own logged throw or flick decides | Roll, RollInput | P-6, P-3 | X4, X3 | SX-06, SX-07 | RX-1 |
| XTM-02 | the seed supplies only a jitter | Jitter | P-5 | X3 | SX-05 | RX-6 |
| XTM-03 | replay is exact on any machine | EnginePin, WorldBuild, Step | P-1, P-6 | X1, X4 | SX-01, SX-02, SX-07 | RX-2, RX-4 |
| XTM-04 | the snapshot hash is the replay check | SnapshotHash, ReplayCheck | P-8, P-9 | X6 | SX-13 | RX-1 |
| XTM-05 | refuse, never repair | OutcomeReader; the two refusals | P-7 | X3, X5 | SX-04, SX-08 | RX-3 |
| XTM-06 | a spinner with no friction is refused | Preset | P-2 | X2 | SX-22 | RX-7 |
| XTM-07 | fairness is measured | Dyno | P-10 | X8 | SX-19 | RX-8 |
| XTM-08 | measured, published or assumed | Provenance, Dataset | P-11 | X9, X2 | SX-20 | RX-7 |
| XTM-09 | the view shows the decided outcome | Trajectory | derived | X7 | SX-14, SX-15, SX-16 | RX-1 |
| XTM-10 | the Spinner's sector and resting angle | SettleRecord | P-8, P-7 | X6, X5 | SX-09, SX-10, SX-12 | — |
| XTM-11 | the spinner proves the engine | ClosedForm, EnergyBooks | contextual | X10 | SX-21 | — |
| XTM-12 | the async engine meets the sync submit | SolverLoader, ReadySolver | contextual | X1 | SX-02 | RX-4 |

#### 5. Verification payload registered for carry-through (never generated)

Carried from S1 step 7 §10 and the package's handoff file, unchanged. Phase 2 creates none and names the owning node
for Phase 3 at A5.

| Payload | Items | Count |
|---|---|---|
| Positive conformance tests | XP-01 to XP-17 | 17 |
| Refusal tests | XR-01 to XR-33; XR-18 reserved for AE-c29's on-the-line rule if adopted; XR-22 folded into XR-01 | 31 active |
| Golden vectors | XV-01 (oracle side COMPUTED, engine side DEFERRED), XV-07 and XV-08 COMPUTED; XV-02 to XV-06, XV-09, XV-10 DEFERRED with discharge conditions | 10 |
| Hooks | XH-01 to XH-11 (XH-03 load-bearing, F-8; XH-08 needs ODG-g8; XH-10 needs ODG-g9) | 11 |
| Production concerns | XPC-01 to XPC-08 | 8 |
| Validation checkpoints | VC-1 to VC-8 | 8 |
| Load-bearing rules | EL-1 to EL-11; the gate order G-F → G-2 → G-3 → G-4 → G-5 (S-2) | 11 + 1 |
| Base cases | GBC-65 to GBC-87 | 23 |

**TS-6 (one dedupe the lead may approve): not taken.** Two pairs observe one outcome at one owning node, XR-01/XR-02
(UNCOMPUTABLE at the host) and XR-09/XR-28 (MALFORMED_ARGS at the Guard), but each test in a pair guards a different
condition (a different build against no build hash; a malformed input against a start pose in the intent, AE-c18). All
31 are carried.

#### 6. Issues log (self-reliance points)

| ID | Point | Handling |
|---|---|---|
| I2-01 | E-1 assumes the sealed nodes carry `OBJ` ids; this library's sealed Phase 2 predates the emission contract and minted none | Carried by S2 name and `MOD-nn` (§3), outside the §2 `OBJ` table; new ids from `OBJ-01`. Reported to the owner; one row in `_metaframework/docs/plugin-findings.md` |
| I2-02 | S1 names ODG-g7's placement as Phase 2's; the lead session's brief keeps ODG-g7 open in this run | The pin record is expressed behind its fixed interface (handed to the host and the Guard); its home is not chosen. Reported to the owner |

#### 7. Gate

A1 passes: S1 is proven and directed; 14 sealed nodes are registered ACTIVE by their sealed identifiers; the TM is
anchored (XTM-01 to XTM-12); the payload is registered. Under standing approval this gate batches to the final gate.

## 7. Verification payload carried from S1

### Extension G-1 · Phase 2 · A5 — Contract

The minimal handoff bundle for Phase 3 (R4). Stubbed against the downstream input contract as the roster says
(ODG-SE-02): the emission contract's `CLAUDE_<Concept>_Phase2.md` is that contract here.

| Part | Where |
|---|---|
| HierarchyModel | `a2-hierarchy.md` §1 (48 nodes, 9 is-a edges, 2 sealed interfaces realised) and §3 (8 refused edges); `a3-abstraction.md` §1, §2 |
| Declared inputs and Decides | `a2-hierarchy.md` §1, §2 |
| Traceability Map | `a1-intake.md` §4 (XTM-01 to XTM-12) and every node's `Traces to` |
| Tags | `a3-abstraction.md` §3 |
| Sealed nodes carried | `a1-intake.md` §3 |
| AE dispositions | `qg1-and-stress-test.md` §2 |
| Verification payload, with owners | below |

#### Verification payload: owners named for Phase 3

Carried from S1 step 7 §10 unchanged; Phase 2 adds no test, vector or hook and changes none. The owner is the node
whose code the item guards; Phase 3 mints REF, VEC, HOOK and PC ids from these, above the sealed record's.

**Positive tests (17)**

| Owner | Tests |
|---|---|
| OBJ-03 PhysicsHost | XP-01 |
| OBJ-12 PlayAdmission | XP-02 |
| OBJ-34 RollGuard | XP-03 |
| OBJ-35 RollApplier | XP-04, XP-08 |
| OBJ-26 OutcomeReader | XP-05 |
| OBJ-27 DieReader, OBJ-28 SpinnerReader | XP-06 |
| OBJ-27 DieReader | XP-07 |
| OBJ-32 ReplayCheck | XP-09 |
| OBJ-24 Simulator | XP-10, XP-11, XP-13 |
| OBJ-36 Trajectory | XP-12 |
| OBJ-28 SpinnerReader | XP-14 |
| OBJ-31 SettleRecords | XP-15 |
| OBJ-44 ParameterFit | XP-16 |
| OBJ-37 DynoClaim | XP-17 |

**Refusal tests (31 active; XR-18 reserved for AE-c29, XR-22 folded into XR-01)**

| Owner | Tests | Guard element (S1) |
|---|---|---|
| OBJ-03 PhysicsHost | XR-01, XR-02, XR-27, XR-31 | G-H; EL-11; XH-09 |
| OBJ-10 PresetValidation | XR-03, XR-04, XR-05 | G-0a (GX-51, GX-49) |
| OBJ-12 PlayAdmission | XR-06, XR-07, XR-08 | G-0b |
| OBJ-34 RollGuard | XR-09, XR-10, XR-11, XR-15, XR-28 | G-1 |
| OBJ-35 RollApplier | XR-12, XR-19, XR-20 | XH-04; XH-06 |
| OBJ-26 OutcomeReader | XR-13, XR-32 (with OBJ-35's XH-11) | G-2; G-F |
| OBJ-27 DieReader | XR-14, XR-16, XR-17 | G-3, G-4, G-5 |
| OBJ-28 SpinnerReader | XR-33 | G-4 defect hook |
| OBJ-32 ReplayCheck | XR-21 | G-7 |
| OBJ-24 Simulator | XR-23 (over the source of OBJ-01 to OBJ-05, OBJ-15 to OBJ-29, OBJ-34, OBJ-35, OBJ-49), XR-24, XR-30 | XH-01; XH-05; XH-03 |
| OBJ-36 Trajectory | XR-25 | XH-10 (needs ODG-g9) |
| OBJ-44 ParameterFit | XR-29 | step 6 S-2 |
| the physics package (Phase 3 draws it) | XR-26 | XH-08 (needs ODG-g8) |

**Golden vectors (10)**

| Vector | Owner | State |
|---|---|---|
| XV-01 | OBJ-24 against OBJ-47 | oracle side COMPUTED (Θ 16.0, 36.0, 64.0 rad; T 4.0, 6.0, 8.0 s); engine side DEFERRED |
| XV-02 | OBJ-48 on OBJ-24's run | DEFERRED |
| XV-03 | OBJ-24 with OBJ-23, through OBJ-35 | DEFERRED (no die module complete without it) |
| XV-04 | OBJ-35 (a die roll) | DEFERRED |
| XV-05 | OBJ-40 | DEFERRED |
| XV-06 | OBJ-44 | DEFERRED |
| XV-07 | sealed MOD-04, under the stream name OBJ-35 uses | COMPUTED (0.557480385992676, 0.5018962631002069) |
| XV-08 | OBJ-47 | COMPUTED (Θ 36.0 → sector 5; 37.8225 → sector 0; δω 0.1309) |
| XV-09 | OBJ-19 with OBJ-18 | DEFERRED |
| XV-10 | OBJ-27 | DEFERRED |

**Hooks (11):** XH-01 → OBJ-24, scanning the source of every X1, X3, X4 and X5 node (OBJ-01 to OBJ-05, OBJ-15 to
OBJ-29, OBJ-34, OBJ-35, OBJ-49: S1's "X1, X3, X4, X5", restored after TE-6 F2-09); XH-02 → OBJ-03; XH-03 → OBJ-24,
inside `roll`, which every applier reaching the one roll function passes (RX-1; moved from OBJ-35 after TE-6 F2-02);
XH-04 → OBJ-35; XH-05 → OBJ-24; XH-06 → OBJ-35; XH-07 → OBJ-32, run by OBJ-03's `replay` after `rebuild`; XH-08 →
the physics package (needs ODG-g8); XH-09 → OBJ-03; XH-10 → OBJ-36 (needs ODG-g9); XH-11 → OBJ-35.

**Production concerns (8):** XPC-01 → OBJ-24, OBJ-35; XPC-02, XPC-03 → OBJ-03; XPC-04 → OBJ-19 (with ODG-g6);
XPC-05 → OBJ-40; XPC-06 → OBJ-43; XPC-07 → OBJ-15 (the seat's own input, never seed-generated); XPC-08 → OBJ-30.

**Validation checkpoints:** VC-1 → OBJ-24 with OBJ-23 (XV-03); VC-2 → OBJ-24 against OBJ-47 and OBJ-48 (XV-01,
XV-02); VC-3 → each refusal test's owner above; VC-4 → OBJ-12; VC-5 → OBJ-44; VC-6 → no node (the run's `seal.py
verify`); VC-7 → the physics package (ODG-g8); VC-8 → OBJ-36 (ODG-g9). **Elegance rules EL-1 to EL-11 and base cases
GBC-65 to GBC-87:** carried whole (S1 step 7 §6; step 3 §11).

## 8. Ambiguity and assumption dispositions

The AE Resolution Protocol is §5 (QG1 §2); the assumption log is §4 (A4b §2); the issues log is §6 (A1 §6) with I2-03
in §3 (A2 §2). No admitted exception.

## 9. Open decision gates

As `CLAUDE_TABLETOP_G1_Phase2.md` §7: ODG-g5 to ODG-g11, AE-c19, AE-c26, AE-c28, AE-c29. None blocks Phase 3; ODG-g7
and ODG-g8 block Phase 4 (the pinned build; the tier check), ODG-g9 blocks the trajectory's view use and R6, ODG-g5
blocks admitting a preset for play.

## 10. The independent adversarial pass (TE-6)

### Extension G-1 · Phase 2 · TE-6 — Independent adversarial pass

One pass over what Phase 2 judged or added (run R3), against S1 (`S1-G1-final-package.md` sha256 `143b5a16…`,
`CLAUDE_TABLETOP_G1.md` sha256 `15fbe940…`, both re-hashed and equal to A1 §1) and, for realisation claims only, the
sealed `packages/engine/src/kernel/core.ts`, `guard.ts` and `discipline.ts`. Read-only; nothing else was edited. The
worked example was re-run from a copy (`a4b_g1.py`, sha256 `6492e51d…`): its output is byte-equal to
`a4b/a4b-results.json` (`3e54558d…`). Paths below are relative to `docs/ext-G1/` unless they start `packages/`.

**Result: 0 blocking, 10 major, 8 minor.** No finding stops the S2 going to Phase 3 by itself, but F2-01 to F2-04 are
nodes that need something they are not handed, which A2 §2 says no node is left as ("none is left so",
`phase2/a2-hierarchy.md:85`), so A4's Function = 1.0 does not stand as computed. Each fix is local to a row.

| ID | Severity | Where | Finding | Evidence | Proposed fix |
|---|---|---|---|---|---|
| F2-01 | major | OBJ-32 ReplayCheck, OBJ-33 ReplayReference; ST-2; W-12 | The replay check has no caller. No node is handed OBJ-32 or OBJ-33 (§6 says only "the reference into whoever calls ReplayCheck"). ST-2 and W-12 route it through OBJ-35 RollApplier, and the sealed Applier cannot carry it: its context is the streams only and the row holds no H. A DIVERGENCE raised inside the applier would also be an applier throwing after its draw, which S1 forbids. S1 places XH-07 after rebuild, and puts the call to `rebuild` on X1. ST-2's "Every dependency is directed" is therefore false for SX-13. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:155-156,158,226`; `phase2/qg1-and-stress-test.md:70-72` ("sealed `rebuild` → RollApplier → σ → ReplayCheck"); `phase2/a4b-worked-example.md:27`; `packages/engine/src/kernel/core.ts:30-35` ("Applier context: streams only"), `:158`, `:171-193` (row = packRef, seed, seats, moves); `phase1/step-7-implementation-specification.md:247` (`XH-07 @after-rebuild`), `:53` (SX-02: X1 → MOD-02 `rebuild`); `phase1/CLAUDE_TABLETOP_G1.md:161` ("do not let an applier throw after its draw") | Name the after-rebuild owner. By SX-02 that is OBJ-03, which calls `rebuild`. Give it a declared operation (rebuild, then compare) and hand it OBJ-32 and OBJ-33. Correct ST-2 and W-12 so the applier is not on the comparison path. |
| F2-02 | major | OBJ-35 RollApplier (owner of XH-03, XR-30); OBJ-24 Simulator; OBJ-05 PinMatch | XH-03's owner is not handed what XH-03 checks. OBJ-35's declared inputs include neither PinMatch nor the loaded build's hash, and OBJ-05 is held only by OBJ-03. RX-4 serves "X3's hook", and RX-1 must itself reject "a solver whose build ≠ π", so OBJ-24 needs the same check. XR-30's attack also bypasses OBJ-35 entirely: another module supersedes `spinner:spin` with its own applier, so the HookViolation "before any simulation" can only fire inside the one roll function. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:126,128,147,158` (OBJ-35: "Simulator; the kind's OutcomeReader; SettleRecords; AdmittedPreset per component; EnginePin; the kind's sealed field name"), `:262,282` (XR-30 → OBJ-35); `phase1/step-7-implementation-specification.md:79` (RX-1 rejects "a solver whose build ≠ π … HookViolation"), `:82` (RX-4: "X1 …, X3's hook"), `:214` (XR-30), `:243` (XH-03 `@before-roll-simulate`) | Hand PinMatch and the solver's build hash to the node that runs XH-03. State that it runs in OBJ-24's `roll`, which already takes EnginePin per call, as RX-1 requires, with OBJ-35 also holding it if X3's own hook is kept. Name XR-30's owner to match. |
| F2-03 | major | OBJ-03 PhysicsHost `wirePhysics` | SX-03 makes X1 register X3's guard specs and appliers. OBJ-03's declared inputs (a build source, PinMatch) and its `wirePhysics(ReadySolver, AdmittedPreset per component, PinRecord)` are handed none of what that registration needs: OBJ-34, OBJ-35, OBJ-24, OBJ-23, OBJ-26 to OBJ-28, OBJ-31, or the kinds' field names. No other node is declared to put them together. So either OBJ-03 constructs four Decides-YES nodes internally, against §6's "Deciders are handed in … INJECTED seams only", or its row is incomplete. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:126`, `:223-227`; `phase1/step-7-implementation-specification.md:54` (SX-03: "X3's guard specs and appliers for the two intents"), `:31` (X1 `wirePhysics(S, presets)`) | Declare what OBJ-03 is handed to wire: the two (RollGuard, RollApplier) pairs, or the Simulator, readers, SnapshotHasher and SettleRecords it composes them from. Or name the composing node and trace it to SX-03. |
| F2-04 | major | OBJ-37 to OBJ-40 (the dyno) | The dyno claims have no source of u. JitterClaim's operation `(preset, admissible inputs, N)` has no seeds. No claim and not the Dyno is handed a seeded stream, Jitter (RX-6 serves X8) or UnitsToBinary64 (RX-2 serves X8), so no claim can form x_eff. HandClaim's "start policy" also has no source of s0 for chained starts. XV-05 must re-derive "with the recorded seeds", and OBJ-41 records seeds that only one claim is ever given. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:160-164`; `phase1/step-7-implementation-specification.md:80` (RX-2: "X3, X8, X2"), `:84` (RX-6: "X3, X8"), `:229` (XV-05 "re-derive with the recorded seeds"); `phase1/CLAUDE_TABLETOP_G1.md:84` (SC-x6: "N, populations and its seeds are inputs") | Add seeds to JitterClaim's operation. Declare the u source (the sealed MOD-04 RNGStreams or a seeded equivalent, named), plus Jitter and UnitsToBinary64, as inputs of the claims or of OBJ-40. Add the s0 source a start policy uses. |
| F2-05 | major | Decides: OBJ-35 against OBJ-36 to OBJ-40 | B-1 is applied on opposite readings of one fact. OBJ-35 is YES because it "consults the Simulator (the active version) …, both handed". OBJ-36 is NO because it "re-runs σ through the Simulator it is handed". OBJ-37 to OBJ-40 are NO while holding or running the same Simulator. One mechanical test cannot give both answers, and Phase 3 reads the tag for injection. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:158` vs `:159-163`; `phase2/a2-hierarchy.md:48-53` | Pick one reading and apply it. Either a node that is handed a decider is NO and OBJ-35's YES rests only on what it consults itself (the state's last rest, the draw), or every holder of the Simulator is YES. Restate each basis to match. |
| F2-06 | major | OBJ-34 RollGuard (realises MOD-02 `IntentSpec`); A4 §2 GBC-67; §6 "sealed doors, and only these" | The sealed Guard does not enforce turn order. It checks type, seat, `args` and the spec's own `rules`, nothing else. Out of turn (XR-11, GBC-67) is refused only if RollGuard's `rules` include the sealed `onTurnRule` (MOD-02's `kernel/discipline.ts`). A4's "turn discipline sealed (MOD-02)" reads as if the engine does it, and §6's closed list of doors omits `onTurnRule`. The Randomizer test (component ∈ C_R, kind from state) is likewise RollGuard's own. Its Decides basis is also wrong: it calls preset data "a policy", against SC-x1 and the preset nodes' own "data" (NO). The ambient things it really consults are the caller's identity against the active seat and the component's kind. | `packages/engine/src/kernel/guard.ts:50-68`; `packages/engine/src/kernel/discipline.ts:4-11`; `phase2/a4-admission.md:22`; `phase2/CLAUDE_TABLETOP_G1_Phase2.md:157,229-232,130-132`; `phase1/step-2-theoretical-design.md:196` (C_R); `phase1/step-7-implementation-specification.md:185` (XR-11) | Add `onTurnRule` to the sealed doors in §6 and to OBJ-34's description, its rules including it. Say that C_R is checked from state. Restate the basis as the caller's identity and the component's kind, which keeps YES. |
| F2-07 | major | OBJ-34 RollGuard's construction-time PinRecord; ODG-g7 | Handing the PinRecord to the Guard at construction makes G-1's conjunct "pin record present" and GX-47's intent refusal "unpinned" impossible to express: a constructed guard always has one. That fits only a pin record that exists before wiring. Under ODG-g7's other option, a setup intent, the Guard must read the state to refuse a roll made before the setup intent is logged. Phase 2 states the hand-off openly (QG1 §2), but it narrows an ODG the run must keep open, and it drops an S1 refusal. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:157`; `phase2/qg1-and-stress-test.md:27`; `phase1/step-3-base-case-reduction.md:40-43` ("∧ pin record present"); `phase1/step-2-theoretical-design.md:94-95` (GX-47 "… or unpinned"); `phase1/CLAUDE_TABLETOP_G1.md:129` (ODG-g7 "in the pack, or a setup intent") | Express the pin record to the Guard behind an interface that works under both options (present or absent in the state the Guard is handed), keep "unpinned" as a named intent refusal, and leave the placement open. |
| F2-08 | major | is-a AdmittedPreset (OBJ-14) → ValidPreset (OBJ-11) | S1 does not state this subtype. It states one gate split into two parts and two interface types. The cited source is also wrong: step 3 §3 has a single G-0, and the split into G-0a and G-0b is step 7 X2. OBJ-14's own construction ("ValidPreset; DynoRecord") is composition, so the edge also makes a concrete witness inherit from another concrete witness. The rule admits is-a only where S1 states the subtype. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:65,137,178`; `phase2/a2-hierarchy.md:68`; `phase2/a3-abstraction.md:15`; `phase1/step-3-base-case-reduction.md:36-39` (one `GATE G-0 ADMIT`); `phase1/step-7-implementation-specification.md:32` | Refuse the edge (add an RE row) and keep it as composition: AdmittedPreset has-a ValidPreset and its DynoRecord, and the held ValidPreset is what the Simulator is handed. Correct the citation to step 7 §2 X2. |
| F2-09 | major | Payload: XH-01's scope | Phase 2 narrows a load-bearing hook. XH-01 runs "over X1, X3, X4, X5 source" on "input construction and decisions". Phase 2 scopes it to OBJ-03, 24, 26 to 28, 34 and 35. That leaves out the nodes that construct inputs and decide: OBJ-15 to OBJ-17 (`scale`), OBJ-18 UnitsToBinary64, OBJ-19 Jitter, OBJ-20, OBJ-21, OBJ-22 SettleRule, OBJ-23 SnapshotHasher, OBJ-29, and X1's OBJ-01, 02, 04 and 05. XV-09 (x_eff's bits) and XR-23 depend on exactly that code. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:307-308`, `phase2/a5-contract.md:73-74`; `phase1/step-7-implementation-specification.md:241` (XH-01), `:204` (XR-23), `:233` (XV-09) | Scope XH-01 to every node of X1, X3, X4 and X5: OBJ-01 to OBJ-05, OBJ-15 to OBJ-29, OBJ-34 and OBJ-35. Or scope it to the runtime physics package's source as a whole. |
| F2-10 | major | §6 Placement; RA-07 | §6 draws a package boundary by id range (OBJ-01 to OBJ-36 in the runtime library, OBJ-37 to OBJ-48 in offline tooling), while RA-07 says placement is carried to Phase 3. The boundary also puts types that runtime nodes hold on the tooling side. OBJ-10 is constructed with OBJ-46 ProvenanceCheck (RX-7 serves X2), and OBJ-12 and OBJ-14 take OBJ-41 DynoRecord (S1: X2 depends on "X8's record (hard, for G-0b only)"). OBJ-46's operation needs OBJ-43 DataSource, and X9 is "none at run time". | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:234-236`, `:133,135,137,169`; `phase2/a3-abstraction.md:28`; `phase1/step-7-implementation-specification.md:32,39,42-43,85` | Do one or the other. Either carry placement to Phase 3 as RA-07 says, deleting the id-range rule, or draw it so that OBJ-41, OBJ-46 and any DataSource view OBJ-10 needs sit in the runtime package, or in a shared value package the runtime may import. |
| F2-11 | minor | OBJ-10 PresetValidation | OBJ-10 is constructed with ProvenanceCheck, whose operation needs a DataSource, yet `validate(Preset)` is handed none. Its own basis also lists only "κ on every value", not RX-7's "measured ⇒ verified time base and held-out residual". Either the input is missing or RX-7's X2 use is unexpressed. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:133,169`; `phase1/step-7-implementation-specification.md:85` (RX-7 serves "X2, X9") | Either hand OBJ-10 the dataset lookup it needs, or state that G-0a checks κ presence and the measured clause runs at X9's fit (SX-20), and drop ProvenanceCheck from OBJ-10's inputs. |
| F2-12 | minor | Decides: OBJ-04 ReadySolver, OBJ-13 DynoPassRule | Both are tagged YES for being the ambient thing ("it is the active engine build"; "it is the owner's rule"), not for consulting one. B-1's test is "consults", and the run was told not to tag broadly. Their consumers (OBJ-24, OBJ-12) already carry the YES. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:127,136` | Mark them NO, as an external handle and a policy value, or record why B-1 tags the ambient thing itself. |
| F2-13 | minor | A4b worked example | (a) W-11 proves nothing. The stand-in Θ = ω²/(2τ/I) makes ½Iω² − τΘ ≡ 0 by construction. (b) "Every admitted node is exercised except OBJ-43 to OBJ-45" is not true. OBJ-14, 22, 23, 37, 38, 39, 42 and 46 appear in no step, and W-1 to W-3 and W-15's "σ written, …, logged, the next throw starting from that rest quaternion" are asserted, not computed. (c) The die is jittered with the spinner's own stream draw and ε. (d) The reader and pose stand-ins (angle arithmetic, `rest // W`) are unlabelled: AS-1 and AS-5 label only the Simulator and H. Every number checked is reproduced exactly. | `phase2/a4b/a4b_g1.py:31-32,38-39,44,79-83`; `phase2/a4b-worked-example.md:26,30,32-34,40,44` | Label W-11 as a consistency check of the stand-in, not of GX-50. Correct the coverage sentence to list what was not exercised. Label the reader and pose stand-ins. Give the die its own stream draw, or say it borrows u₁ and ε. |
| F2-14 | minor | AE-c20 recommendation (QG1 §2, AS-3) | S1's constraint holds for ω₀: integer mrad/s moves ω₀ by at most 0.0005 rad/s, against a skill index of 0.1309 rad/s (verified), which is consistent with step 5's "≤ 0.001 against 0.13". But "UnitsToBinary64 divides by 1000 exactly" is wrong: x/1000 is correctly rounded (GX-41 allows ÷), not exact; 50/1000 = 0.05, for one, is not representable. The order of RX-2 and RX-6 (scale then jitter, as the script does, or jitter then scale) is fixed nowhere, and XV-09's bits depend on it. The mm and mm/s units for the die are checked against nothing. | `phase2/qg1-and-stress-test.md:26`; `phase2/a4b-worked-example.md:21,42`; `phase2/a4b/a4b_g1.py:36`; `phase1/step-5-consistency-gate.md:58`; `phase1/step-2-theoretical-design.md:34-37`; `phase1/step-7-implementation-specification.md:233` | Reword to "divides by the exact integer 1000, correctly rounded". Fix the operation order in OBJ-15's `scale` and name it for XV-09. State the die's resolution in the escalation to the owner. |
| F2-15 | minor | §7 Open questions | AE-c20 is missing, although OBJ-15 carries "open: AE-c20" and QG1 escalates it to the owner at the final gate. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:66,322-336`; `phase2/qg1-and-stress-test.md:26` | Add an AE-c20 row: the units, the owner at the final gate. |
| F2-16 | minor | Payload: XV-01 | The payload is carried as "unchanged", but XV-01 drops S1's pinned oracle values T = 4.0, 6.0, 8.0 s. All other counts and IDs match step 7 §10: XP 17; XR 31 with XR-18 reserved and XR-22 folded; XV 10; XH 11; XPC 8. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:296`; `phase1/step-7-implementation-specification.md:225` | Carry XV-01 whole: Θ = 16.0, 36.0, 64.0 rad; T = 4.0, 6.0, 8.0 s. |
| F2-17 | minor | Traces and tags | The S2 cites "G-0 = G-0a ∧ G-0b (step 3 §3)", but step 3 §3 has one G-0 (see F2-08). OBJ-45's tag is "open: the owner's films (AE-c19)", but AE-c19 is the settle numbers, floors, α and T_f; S1 ties the films to X9's status and XV-06. | `phase2/CLAUDE_TABLETOP_G1_Phase2.md:96,178`; `phase1/step-7-implementation-specification.md:39,141,230` | Cite step 7 §2 X2. Retag OBJ-45 "open: the owner's films (X9 status; XV-06)". |
| F2-18 | minor | QG1 coverage | The script checks forward coverage over 54 ids (GX, P, X, RX, XTM) but reports "every proven S1 element is expressed". SX-07, 09, 15 to 18 and 21, and SC-x2, x3 and x5, appear in no node's trace. Each is expressed elsewhere (the sealed table, tags, RE-05), so this is bookkeeping only. VC-1 to VC-8 are "carried whole" with no owner node, unlike the rest of the payload. | `phase2/qg1_coverage.py:12-13`; `phase2/qg1-and-stress-test.md:16`; `phase2/CLAUDE_TABLETOP_G1_Phase2.md:314-315` | Limit the claim to what the script checks, or extend the script to SX, SC-x, EL and GBC. Name an owner for each VC, or say why VCs need none. |

#### Areas checked and found clean

- **The other eight is-a edges.** DiePreset/SpinnerPreset, Throw/Flick and DieReader/SpinnerReader are each stated in
  S1 as "Die: … Spinner: …" forms (step 2 §4 Preset, RollInput, OutcomeReader). HandClaim/JitterClaim rest on GX-48,
  "Fairness is measured, in two claims", (a) and (b). The eight refused edges (RE-01 to RE-08) and the nine refused
  abstractions (RA-01 to RA-09) are correctly refused. Three of them rest on S1's own tautology tests, which are
  verified at step 3 §8.
- **The sealed realisations.** `IntentSpec` is `{args, rules}` (`guard.ts:14-19`). `Applier` is
  `(state, intent, ctx) => JsonObject` with `ctx.rng` (`core.ts:31-35,158`). `registerIntent` takes spec and applier
  together, and `supersedeIntent` is public (`core.ts:79-111`), which bears out XH-03's load-bearing note. Die
  `{face}`, Spinner `{sector}` and the Randomizer role match (`kinds.ts:138,141`). VerbSets holds `roll` and `spin`
  (`rules/vocabularies.ts:35`). F2-06 is the one gap.
- **RSI.** No sealed node gains a parent, member or tag. No vocabulary grows. ODG-g8, ODG-g9, ODG-g5, ODG-g6 and
  AE-c29 stay open and are not designed around: the tier check is left to ODG-g8, OBJ-36's view use waits on ODG-g9,
  and the half-open sector rule is S1's own sign test. The worked example's x_min = 6000 is labelled as its own value.
  ODG-g7 has one narrowing (F2-07).
- **Carrying the sealed nodes by S2 name and `MOD-nn`.** This is sound. The sealed S3 v1.3 keys its modules only by
  `MOD-nn` and minted no OBJ ids, and S1 itself cites the sealed nodes by `MOD-nn`. `kernel/discipline.ts` is MOD-02's
  (sealed S3 §2 row MOD-02), so the 14-node list is complete for what the model reaches. Starting new ids at OBJ-01
  collides with nothing in the sealed record.
- **The payload's IDs and owners,** apart from F2-02, F2-09 and F2-16: every XP, XR, XV, XH and XPC ID is present
  once, with no invention and no state change.
- **The worked example's numbers.** It re-ran byte-identical. Every figure was checked by hand: the factors, ω_eff,
  Θ, the rest angles, the sectors 6 and 4, Θ = 8.1225 rad at x_min·(1 − ε) ≥ 2π, the die's v_eff and w_eff, and
  cos 20° = 0.9397 < cos 10° → REFUSE(cocked). All are correct for the stand-ins.

#### The lead's re-check and the fixes (appended by the lead)

Each finding was re-checked by the lead: F2-06 against the sealed `kernel/guard.ts:50-68` and `kernel/discipline.ts`
(the Guard checks the type, the seat, `args` and the spec's own `rules`; turn order is the shared `onTurnRule`), the rest
against the stage lines they cite. All eighteen hold, and all were applied by one script (`te6_fixes.py`, run once from the
session's scratchpad and not kept in the repository, whose code gates refuse its repeated blocks; the table below is
its record, and it changed only these stage files), after which `qg1_coverage.py` reports 49 nodes and no gap and
`emission-check.py` passes. No fix changes S1, a sealed node or an open gate. A re-attack was not run; the coverage
script and emission-check were re-run on the fixed files.

| Finding | Fix | Where |
|---|---|---|
| F2-01 | OBJ-03 gains `replay(row, genesis)`: the sealed `resume` or `rebuild` with its `wire`, then ReplayCheck against ReplayReference (XH-07 after `rebuild`); ST-2 and W-12 corrected | a2 OBJ-03; a3; a4 GBC-77; a4b W-12; qg1 ST-2; a5 XH-07 |
| F2-02 | XH-03 runs inside OBJ-24's `roll` (PinMatch handed); XH-03 and XR-30 owned by OBJ-24 | a2 OBJ-24, OBJ-35; a3; a5 |
| F2-03 | OBJ-03 named the one composition root: it builds and hands the Simulator, readers, SettleRecords and the (RollGuard, RollApplier) pairs, then registers them (SX-03) | a2 OBJ-03; emission §6 |
| F2-04 | The claims are handed Jitter's rule, UnitsToBinary64 and seeds (each opening a sealed `RNGStreams`); a start policy's s0 source named | a2 OBJ-37 to OBJ-40 |
| F2-05, F2-12 | One Decides reading: a node handed a decider, a handle or a policy value is NO. OBJ-04, OBJ-13, OBJ-35 → NO; YES: OBJ-03, 12, 24, 33, 34, 49 | a2; emission §6 |
| F2-06 | RollGuard's `rules` include the sealed `onTurnRule`; the kind read from the state; basis restated (the caller's seat, the kind, pinned) | a1 §3; a2 OBJ-34; a4 GBC-67; emission §6 |
| F2-07 | OBJ-49 PinRecordSource (open: ODG-g7): `pin(state)` → PinRecord or absent, handed to RollGuard and the host; "unpinned" kept as a named intent refusal; placement still open | a2, a3; emission §6 note |
| F2-08 | AdmittedPreset is-a ValidPreset refused (RE-09), kept as composition; citations to step 7 §2 X2 | a2, a3; emission §3 |
| F2-09 | XH-01 and XR-23 scoped to every X1, X3, X4, X5 node (OBJ-01 to OBJ-05, OBJ-15 to OBJ-29, OBJ-34, OBJ-35, OBJ-49) | a5 |
| F2-10 | The id-range boundary withdrawn; placement is Phase 3's, with the constraints it must meet | emission §6 |
| F2-11 | ProvenanceCheck gains `present` (X2) and `measured` (X9); G-0a uses `present` | a2 OBJ-10, OBJ-46 |
| F2-13 | W-11 labelled a stand-in check; the coverage sentence lists what was not exercised; AS-11 labels the reader and pose stand-ins; the die's borrowed u₁ and ε stated | a4b |
| F2-14 | "Divided by the exact integer 1000, correctly rounded"; the order fixed (scale, then the jitter's factor) in OBJ-15's `scale` and in the AE-c20 question, with the die's resolution | a2 OBJ-15 to OBJ-17; qg1 AE-c20; a4b W-6 |
| F2-15 | AE-c20 added to §7 | emission §7 |
| F2-16 | XV-01 carries T = 4.0, 6.0, 8.0 s | a5 |
| F2-17 | Citations corrected; OBJ-45 retagged "open: the owner's films (X9's status; XV-06)" | a2, a3 |
| F2-18 | The forward-coverage claim limited to the ids the script checks; an owner named for each VC | qg1 §1; a5 |

## 11. Handoff note and final statement

**Build order if taken to a build** (for Phase 3 to partition; Phase 2 fixes no module): the values and utilities first
(OBJ-01, 05, 06, 18, 19 to 23); the presets and their gates (OBJ-07 to OBJ-14); the Simulator and the readers (OBJ-24 to
OBJ-29), with XV-01 proving the engine before any die outcome relies on it (GX-50); σ and replay (OBJ-30 to OBJ-33);
the guard spec and applier (OBJ-34, OBJ-35); the pin record's source and the host last (OBJ-49, OBJ-03, OBJ-04); then the offline tools (OBJ-37 to OBJ-48)
and the trajectory (OBJ-36), whose view use waits on ODG-g9.

**Rules most easily lost:** A1's halt, never assuming S1 arrives clean; A3's tags; S1's verification payload carried
unchanged, with its owners; and for this extension, one roll function, the Guard that never draws, the floor before the
draw, and no sealed file written.

**Final statement.** The S2 for extension G-1 expresses the approved S1 in full, adds nothing S1 does not prove, and
changes no sealed node. 

**Approved by the owner, 2026-11-08, live at the gate: "Approve and commit (Recommended)"; AE-c20 ruled "mm, mm/s,
mrad/s (Recommended)".** R3 spend at the gate: 3.18M of 4M weighted (`.metaframework/spend-ledger.md`, rows
"phase2:… G-1 (R3)").

## 12. The emitted document

### CLAUDE_TABLETOP_G1_Phase2 — Expressed Object Model (S2) for TABLETOP, extension G-1

> **Extension of the sealed TABLETOP library (`seal-1`, `fca9e10`), gap G-1 only** (`ui/gaps.md`: physics decides a
> Randomizer's outcome, I-260). Run R3, the Phase 2 leg (Amendment E-1). Never merge with
> `governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md`, with `governance/upstream/CLAUDE_TABLETOP_v2.md`, or with any other
> concept's file. Generated by `emit_phase2.py` from `emission-frame.md` and the stage files in this folder (a1-intake,
> a2-hierarchy, a3-abstraction, a4-admission, a4b-worked-example, qg1-and-stress-test, a5-contract); the record is
> `S2-G1-final-package.md`. The sealed nodes are carried, never re-admitted, and nothing present at `seal-1` is written.

#### 1. Concept and S1 provenance

**Concept.** A Die's face and a Spinner's sector are decided by a deterministic simulation of the seat's logged integer
throw or flick, jittered symmetrically by one seeded draw, on a pinned Rapier build, in a fresh world at a fixed step;
refused, never repaired, when the throw does not settle cleanly; replayed bit for bit from (seed, seats, log); fair by
measurement, with every number's source stated. Phase 2 expresses the approved S1 as **49 new nodes (OBJ-01 to OBJ-49), 8 admitted is-a edges, 4 abstractions, 2 sealed interfaces realised (MOD-02's `IntentSpec` and `Applier`) and
no admitted exceptions**. No sealed node changes.

**S1 files and approval.**

| File | sha256 | Approval |
|---|---|---|
| `docs/ext-G1/phase1/S1-G1-final-package.md` | `143b5a1635c0fffae787153d9d68a36e4df18669fb6cb19169e0dc3c5f5b4e72` | the owner, 2026-11-08, live: "Approve and commit (Recommended)"; commit `10dea4a` |
| `docs/ext-G1/phase1/CLAUDE_TABLETOP_G1.md` | `15fbe9409bfd3cfcda34de78a13b83252819f9df3f9412ae0a0b225300d23cf1` | same gate |

**Spine.** ∀ node: trace_back(node) ⊆ proven(S1). Every node cites an S1 axiom (GX-40 to GX-52), primitive (P-1 to
P-11), module (X1 to X10), seam (SX-nn), contract (RX-n), base case (GBC-nn), ruling, or a Traceability Map row
XTM-01 to XTM-12 (`a1-intake.md` §4, keyed in S1 §9's order). An is-a edge is admitted only where S1 states the
subtype; the sealed rule "is-a in the catalog, has-a in the engine" holds.

**The sealed nodes have no `OBJ` ids.** The sealed Phase 2 (S2-TABLETOP-v2.0) minted none (sealed S3 v1.3 §2, §3), so
§2's second table carries each referenced sealed node by its S2 name and `MOD-nn`. New ids start at `OBJ-01`.

**The owner's rulings carried from Phase 1** (S1 step 5 §9, step 8): refused rolls are logged (AE-c14); the engine
loads before hosting (AE-c13); each roll starts where the component last rested (AE-c18); I-260 supersedes the S1 v2.0
do-not's first half for the Die and the Spinner, and "seeded result" reads "engine-decided" (CF-1, AE-c23); the rest
pose lives in a settle record (AE-c17); a roll is its own mutation, not an effect (AE-c24); the jitter is symmetric
(AE-c15), on the die's velocity and spin only (F-6); the die refuses no-tumble and escaped, admits μ > 0 and e < 1, and
footage of unknown time base gives time-free quantities only (I-6, AE-c27); the spinner's floor is tested on the input
before the draw, and fairness is measured on accepted outcomes relative to the start (F-1, F-2).

**The owner's rulings this phase:** S2 approved, 2026-11-08, live: "Approve and commit (Recommended)". AE-c20, live: "mm, mm/s, mrad/s (Recommended)": lengths in mm, speeds in mm/s, angular speeds in mrad/s, fixed by the input type (OBJ-16, OBJ-17); each value divided by the exact integer 1000, correctly rounded, then the jitter's factor applied.

#### 2. Expressed Object Model

Kind spells out the node; `is-a OBJ-nn` marks an admitted edge. Tag: `LB` a load-bearing invariant carried from S1,
`open` a proven-open gate behind the node's fixed interface (`a3-abstraction.md` §3). Decides (Amendment B-1): YES where
the node consults something ambient; its basis is in the third table.

| ID | Node | Kind | Tag | Traces to | Status | Decides |
|---|---|---|---|---|---|---|
| OBJ-01 | EnginePin | Value (π: package, version, build SHA-256, ι, dt) | — | P-1, GX-43, XTM-03 | ACTIVE | NO |
| OBJ-02 | PinRecord | Value (π and the admitted presets' hashes) | open: ODG-g7 (placement and version) | P-1 (PinRecord, hybrid), GX-43, AE-c16 | ACTIVE | NO |
| OBJ-03 | PhysicsHost | Host service and composition root (X1: `loadPinned`, `wirePhysics`, `replay`; the SolverLoader ℒ) | LB GX-43 (G-H, XH-02); LB EL-11; LB XH-07 (after `rebuild`) | X1, SX-01, SX-02, SX-03, SX-13, XTM-12, AE-c13 ruling | ACTIVE | YES |
| OBJ-04 | ReadySolver | Engine handle (S, contextual) | LB EL-11 | ReadySolver (contextual), XTM-12, EL-11 | ACTIVE | NO |
| OBJ-05 | PinMatch | Utility (RX-4) | LB XH-02, XH-03 | RX-4, GX-43 | ACTIVE | NO |
| OBJ-06 | Provenance | Value (κ: measured, published or assumed, with its source) | — | P-11, GX-49, XTM-08 | ACTIVE | NO |
| OBJ-07 | Preset | Abstract value (a component's physical values, each with κ; canonical pose; ε; settle numbers; N; floors) | — | P-2, GX-49, GX-51, SC-x1, XTM-06 | ACTIVE | NO |
| OBJ-08 | DiePreset | Value (P_D: edge, mass, corner radius, face normals and labels, (μ, e) per contact pair, tray, α, T_f, bounds, no-throw floor); is-a OBJ-07 | — | P-2, step 3 §10 (P_D), step 2 §4 Preset | ACTIVE | NO |
| OBJ-09 | SpinnerPreset | Value (P_S: I, a = τ/I, c = b/I, d = ΔE/I, sector widths and boundary directions, grab radius, x_min, bounds); is-a OBJ-07 | — | P-2, step 3 §10 (P_S), step 2 §4 Preset | ACTIVE | NO |
| OBJ-10 | PresetValidation | Gate (G-0a, structural) | LB GX-51 | X2 (step 7 §2), RX-7, GX-49, GX-51, GBC-69, GBC-70, F-7 | ACTIVE | NO |
| OBJ-11 | ValidPreset | Value (a preset that passed G-0a) | — | X2 `validate(P) → ValidPreset`, RX-1 | ACTIVE | NO |
| OBJ-12 | PlayAdmission | Gate (G-0b, for play) | open: ODG-g5 | X2 (step 7 §2), GBC-71, step 6 S-1, S-3, F-7 | ACTIVE | YES |
| OBJ-13 | DynoPassRule | Policy interface (α_sig, A_max, the rule) | open: ODG-g5 (AE-c21) | GBC-71, AE-c21, ODG-g5 | ACTIVE | NO |
| OBJ-14 | AdmittedPreset | Value (a ValidPreset and its passing dyno record, held by composition; its hash enters the pin record) | LB XH-09 | X2 (step 7 §2) `admitForPlay → AdmittedPreset`, SX-22, XH-09 | ACTIVE | NO |
| OBJ-15 | RollInput | Abstract value (integers in declared units; logged as given) | LB EL-5; AE-c20 ruled: mm, mm/s, mrad/s | P-3, GX-41, GX-5, XTM-01, AE-c20 | ACTIVE | NO |
| OBJ-16 | Throw | Value (x_D = (p, v, w) ∈ ℤ⁹); is-a OBJ-15 | — | P-3, step 2 §4 RollInput (die) | ACTIVE | NO |
| OBJ-17 | Flick | Value (x_S = ω₀ ∈ ℤ); is-a OBJ-15 | — | P-3, step 2 §4 RollInput (spinner) | ACTIVE | NO |
| OBJ-18 | UnitsToBinary64 | Utility (RX-2: integer ÷ exact unit scale) | — | RX-2, GX-41 | ACTIVE | NO |
| OBJ-19 | Jitter | Value with its rule (u, ε; factor 1 + ε·(2u − 1); RX-6 on the flick, or the die's velocity and spin) | LB EL-9 | P-5, GX-42, RX-6, AE-c15 ruling, F-6, XTM-02 | ACTIVE | NO |
| OBJ-20 | EffectiveInput | Value (x_eff, binary64, the input's shape) | — | InputInEffect (derived), GX-42, SX-06 | ACTIVE | NO |
| OBJ-21 | Pose | Value (the engine's own rotation quaternion, and translation where the body moves) | — | P-4, StartState, F-5b, AE-c18 ruling | ACTIVE | NO |
| OBJ-22 | SettleRule | Rule (ρ: squared linear and angular speeds under thresholds for K steps; cap N) | open: AE-c19 (numbers) | RX-5, SettleRule [ρ], GX-44, GX-45, AE-c19 | ACTIVE | NO |
| OBJ-23 | SnapshotHasher | Utility (a pinned synchronous pure-JS hash; the sealed FNV-1a 64 is the candidate) | LB GX-46 (synchronous, F-11) | SnapshotHash (derived), GX-46, F-11 | ACTIVE | NO |
| OBJ-24 | Simulator | Service (X4: the one roll function, RX-1; `roll`, `poses`) | LB EL-1, EL-2 (XH-01), EL-3 (XH-05), EL-4, XH-03 | X4, P-6, WorldBuild, Step, GX-40, GX-41, GX-44, RX-1, RX-4, XTM-01, XTM-03 | ACTIVE | YES |
| OBJ-25 | RollRun | Value (rest summary, n* or UNSETTLED, H, motion summary) | — | X4 interface, SX-08 | ACTIVE | NO |
| OBJ-26 | OutcomeReader | Abstract (the fixed gate order G-F → G-2 → the kind's gates) | LB S-2 (gate order), EL-6, XH-11 (G-F) | X5, P-7, RX-3, S-2, F-10, XTM-05 | ACTIVE | NO |
| OBJ-27 | DieReader | Reader (read_D: G-3 escaped, G-4 no-tumble, G-5 cocked; the face of greatest (R(q)·n_f)·ŷ); is-a OBJ-26 | — | P-7, step 2 §4 OutcomeReader (die), GBC-73, GBC-75, GBC-76 | ACTIVE | NO |
| OBJ-28 | SpinnerReader | Reader (read_S: sector by sign tests; Θ accumulated; G-4 under-floor a defect hook; G-5 on-line if adopted); is-a OBJ-26 | open: AE-c29 | P-7, step 2 §4 OutcomeReader (spinner), F-1, F-5c, AE-c29 | ACTIVE | NO |
| OBJ-29 | RollOutcome | Value (O: VALUE(face ∣ sector) or REFUSE(outcome reason), reason ∈ {non-finite, unsettled, escaped, no-tumble, cocked, under-floor, on-line if adopted}) | — | RollOutcome [O], OutcomeRefusal (a named outcome, I-8), GX-45, GX-47, EV-5 | ACTIVE | NO |
| OBJ-30 | SettleRecord | Value (σ: component, attempt k, x, u, x_eff, s0, O, rest pose, n*, H, pin ref) | LB EL-7 | P-8, AE-c17 ruling, XTM-10 | ACTIVE | NO |
| OBJ-31 | SettleRecords | Module state (the last σ per component; `record`, `lastRest`) | LB SC-x4 | X6, SC-x4, AE-c18 ruling, SX-12 | ACTIVE | NO |
| OBJ-32 | ReplayCheck | Comparator (χ: `compare(σ_rebuilt, H_ref)` → equal or DIVERGENCE) | LB XH-07 | P-9, GX-46, XTM-04 | ACTIVE | NO |
| OBJ-33 | ReplayReference | Reference interface (the original run's H, wherever it is held) | open: ODG-g11 | SX-13, ODG-g11 | ACTIVE | YES |
| OBJ-34 | RollGuard | Guard spec (G-1; realises MOD-02's `IntentSpec`; its `rules` include the sealed `onTurnRule`) | LB GX-47; LB F-1 (the spinner's floor before the draw) | X3, IntentRefusal (a named outcome, I-8), SX-04, GX-2, GX-43, GX-45, GX-47, GBC-65 to GBC-67, GBC-72, F-1 | ACTIVE | YES |
| OBJ-35 | RollApplier | Applier (realises MOD-02's `Applier`: one draw → jitter → roll → read → σ → next state) | LB XH-04, XH-06, XH-11 | X3, SX-05, SX-06, SX-10, SX-11, SX-12, AE-c14 ruling, AE-c24 ruling | ACTIVE | NO |
| OBJ-36 | Trajectory | Derivation (X7: poses from σ per read; never stored) | LB XH-10, EL-10; open: ODG-g9 | X7, GX-52, EV-3, SX-14, XTM-09 | ACTIVE | NO |
| OBJ-37 | DynoClaim | Abstract (N simulated rolls through the one roll function and reader; accepted outcomes; the acceptance rate; names π and the preset hash) | LB F-1 (accepted outcomes) | P-10, GX-48, GBC-83, GBC-87, F-1 | ACTIVE | NO |
| OBJ-38 | HandClaim | Claim (a population of inputs and a start policy; χ² of the outcome relative to the start); is-a OBJ-37 | — | GX-48(a), LA-3, F-2 | ACTIVE | NO |
| OBJ-39 | JitterClaim | Claim (fixed admissible inputs; the outcome over u; aim advantage A); is-a OBJ-37 | — | GX-48(b), LA-2 | ACTIVE | NO |
| OBJ-40 | Dyno | Offline runner (X8: `dyno`, `aim`) | — | X8, P-10, SC-x6, XTM-07 | ACTIVE | NO |
| OBJ-41 | DynoRecord | Value (π, preset hash, both claims' results, acceptance rate, seeds, population hash) | — | GBC-83, SX-19, SC-x6 | ACTIVE | NO |
| OBJ-42 | FairnessStatistics | Utility (RX-8: χ², A, acceptance rate; refuses an unnamed population or a χ² over chained starts) | — | RX-8, GX-48 | ACTIVE | NO |
| OBJ-43 | DataSource | Value (a source by hash: own film, third-party or published; time base verified in clip or not; length scale) | — | X9, Dataset [𝒟], AE-c27 ruling, XPC-06 | ACTIVE | NO |
| OBJ-44 | ParameterFit | Derivation (a, c, d and other values with κ; Θ and T residuals on the held-out third) | — | X9 `fit`, P-11, step 6 S-2 | ACTIVE | NO |
| OBJ-45 | Dataset | Collection (sources, fits, the measured population) | open: the owner's films (X9's status; XV-06) | X9, P-11 (𝒟), XTM-08 | ACTIVE | NO |
| OBJ-46 | ProvenanceCheck | Utility (RX-7: κ present; measured ⇒ verified time base and held-out residual) | — | RX-7, GX-49, SX-20 | ACTIVE | NO |
| OBJ-47 | ClosedFormOracle | Oracle (Φ: Θ, T, skill index, coverage, A; tests and analysis only) | LB GX-40 (never a decider) | X10, Φ (contextual), SkillIndex, JitterCoverage, XTM-11 | ACTIVE | NO |
| OBJ-48 | EnergyBooks | Derivation (E = ½Iω₀² − τΘ − b∫ω²dt − ΣΔE) | — | EnergyBooks (derived), GX-50, XTM-11 | ACTIVE | NO |
| OBJ-49 | PinRecordSource | Reference interface (the game's pin record, or its absence, wherever it is held) | open: ODG-g7 | GX-43, GX-47 ("unpinned"), step 3 §3 G-1, AE-c16 | ACTIVE | YES |

##### Sealed nodes referenced (carried ACTIVE, by their sealed identifiers)

| Sealed node (S2 name) | MOD | Reached only through | Status |
|---|---|---|---|
| M1 StateTree; kernel types (State, Intent, Refusal, Verdict, GameRow); `hashState` (FNV-1a 64) | MOD-01 | the next state an applier returns; the sealed FNV-1a 64 as the snapshot hash's candidate (GX-46, F-11) | ACTIVE |
| M2 Guard, with EngineCore (`registerIntent`, `supersedeIntent`, `submit`, `rebuild`), `IntentSpec`, `Applier`, `ApplyContext`, `HookViolation`; the shared `onTurnRule` (`kernel/discipline.ts`) | MOD-02 | registration (SX-03), the guard spec (SX-04), the apply return (SX-10), `rebuild` (SX-13); turn discipline (HOOK-01, REF-01) | ACTIVE |
| M3 IntentLog | MOD-03 | the log, through `submit` (SX-11, HOOK-02) | ACTIVE |
| M4 RNGStreams, `RNGStream.next` | MOD-04 | `ctx.rng.stream(name).next()`, one draw per attempt (SX-05) | ACTIVE |
| M8 PackLoader | MOD-08 | nothing yet: one candidate home of the pin record (ODG-g7, open) | ACTIVE |
| M9 EffectEngine | MOD-09 | nothing: rolls apply no effect (SX-18, AE-c24 ruling) | ACTIVE |
| ME1 KindRegistry and the Component family: Die `{face}`, Spinner `{sector}` | MOD-10 | the kind's sealed field, written by the apply return on a VALUE only | ACTIVE |
| ME2 RoleBinder: Randomizer → RNGStreams (SEAM-23) | MOD-11 | unchanged: the Randomizer's stream supplies u (GX-42) | ACTIVE |
| GovernedVocabulary: EFX v1.1.1, HookPoints v1.0, VerbSets v1.0 (`roll`, `spin` already members) | MOD-21 | nothing: no vocabulary grows | ACTIVE |
| M16 Transport: LockstepController `host`/`resume` with `wire`; `MoveListener` | MOD-27 | `wire` (SX-02); `MoveListener`'s state hash as one ODG-g11 option (F-15) | ACTIVE |
| TierCriterion (`tools/check-tiers.mjs`) | MOD-29 | SX-17, needing ODG-g8 | ACTIVE |
| MP5 SeatProjector | MOD-33 | SX-15, blocked by ODG-g9 | ACTIVE |
| MP8 TheaterSync (HOOK-11, read "engine-decided", AE-c23 ruling) | MOD-34 | SX-16 | ACTIVE |
| Rapier (EXTERNAL @rapier.rs) | — | build, step, snapshot, free (SX-01, SX-07) | external |

##### Declared inputs and the Decides basis

| OBJ | Declared inputs (construction) | Operation inputs | Decides | Decides basis |
|---|---|---|---|---|
| OBJ-01 | package, version, build SHA-256, integration parameters ι, dt | — | NO | a record of values |
| OBJ-02 | EnginePin; the admitted presets' hashes | — | NO | a record of values; where it lives is ODG-g7, open |
| OBJ-03 | a build source (the pinned build's bytes, from the host); PinMatch; PinRecordSource; ReplayCheck; ReplayReference | `loadPinned(PinRecord)` → Promise⟨ReadySolver⟩ or UNCOMPUTABLE(π); `wirePhysics(ReadySolver, AdmittedPreset per component)` → `wire(core)`: as the one composition root it builds SnapshotHasher, the Simulator (with the solver and PinMatch), the kinds' readers, SettleRecords and one (RollGuard, RollApplier) pair per intent type, hands each its collaborators and registers each pair (SX-03); `replay(row, genesis)`: the sealed `resume` or `rebuild` with that `wire`, then each rebuilt σ and the state hash against ReplayReference through ReplayCheck (SX-13, XH-07) | YES | consults the build source for the pinned build, the active engine version (GX-43): it decides whether a game may be hosted |
| OBJ-04 | the initialised Rapier module; EnginePin | — | NO | an external engine handle, handed to the Simulator, which carries the YES |
| OBJ-05 | — | (loaded build hash, EnginePin) | NO | compares a loaded build hash with π, both handed |
| OBJ-06 | class, source citation | — | NO | a record of values |
| OBJ-07 | the values, each with its Provenance; canonical Pose | — | NO | data |
| OBJ-08 | the values, each with its Provenance; canonical Pose | — | NO | data |
| OBJ-09 | the values, each with its Provenance; canonical Pose | — | NO | data |
| OBJ-10 | ProvenanceCheck | `validate(Preset)` → ValidPreset or REFUSE(preset-inadmissible: reason), with ProvenanceCheck's `present` on every value | NO | computes from the preset alone: complete, κ on every value (a measured κ citing its fit), τ > 0, μ > 0, e < 1 |
| OBJ-11 | Preset | — | NO | a witness |
| OBJ-12 | DynoPassRule | `admitForPlay(ValidPreset, DynoRecord)` → AdmittedPreset, REFUSE, or UNDETERMINED until the rule exists | YES | consults the owner's dyno pass rule, a policy (ODG-g5) |
| OBJ-13 | the owner's rule (ODG-g5) | `judge(DynoRecord)` → pass, fail | NO | the policy value itself, handed to PlayAdmission, which carries the YES |
| OBJ-14 | ValidPreset; DynoRecord (held, not inherited) | — | NO | a witness |
| OBJ-15 | the integers in declared units (AE-c20) | `scale(Jitter)` → EffectiveInput: each component divided by its exact integer unit scale through UnitsToBinary64 (correctly rounded), then the jittered components multiplied by the jitter's factor, in that order (XV-09) | NO | data |
| OBJ-16 | the integers in declared units (AE-c20) | `scale(Jitter)` → EffectiveInput: each component divided by its exact integer unit scale through UnitsToBinary64 (correctly rounded), then the jittered components multiplied by the jitter's factor, in that order (XV-09) | NO | data |
| OBJ-17 | the integers in declared units (AE-c20) | `scale(Jitter)` → EffectiveInput: each component divided by its exact integer unit scale through UnitsToBinary64 (correctly rounded), then the jittered components multiplied by the jitter's factor, in that order (XV-09) | NO | data |
| OBJ-18 | — | (integer, unit scale) | NO | computes from its arguments |
| OBJ-19 | u (the attempt's one draw), ε (the preset's) | `factor()`; applied by the input to its jittered components | NO | computes from u and ε, both handed |
| OBJ-20 | binary64 components | — | NO | a derived value |
| OBJ-21 | the engine's quaternion and translation | — | NO | a record of the engine's output |
| OBJ-22 | thresholds, K, N (preset data) | `atRest(world summary)` | NO | computes from the world state and the preset's numbers |
| OBJ-23 | — | (snapshot bytes) → H | NO | computes from the snapshot bytes |
| OBJ-24 | ReadySolver; SnapshotHasher; PinMatch | `roll(EnginePin, ValidPreset, EffectiveInput, Pose)` → RollRun, or HookViolation before any step when the solver's build ≠ π (XH-03); `poses(…)` the same run, sampled (the preset supplies the SettleRule) | YES | consults the engine build through the solver it is handed, and checks that build against π on every call (RX-1, XH-03); physics decides through it (GX-40) |
| OBJ-25 | rest summary, n* or UNSETTLED, H, motion summary | — | NO | a record of the run |
| OBJ-26 | — | `read(RollRun, Preset)` → RollOutcome | NO | computes from the RollRun and preset it is handed |
| OBJ-27 | — | `read(RollRun, Preset)` → RollOutcome | NO | as OBJ-26; α, T_f and the tray are preset data |
| OBJ-28 | — | `read(RollRun, Preset)` → RollOutcome | NO | as OBJ-26; boundary directions are preset data |
| OBJ-29 | VALUE or REFUSE(reason) | — | NO | a value |
| OBJ-30 | component, k, x, u, x_eff, s0, O, rest Pose, n*, H, pin ref | — | NO | a record |
| OBJ-31 | — | `record(attempt)` → SettleRecord; `lastRest(state, component, canonical Pose)` → Pose | NO | reads the state it is handed |
| OBJ-32 | — | `compare(rebuilt SettleRecord, H_ref)` | NO | compares two values it is handed |
| OBJ-33 | the holder (ODG-g11) | `reference(game, attempt)` → H_ref | YES | a lookup of a stored reference; the holder is ODG-g11, open |
| OBJ-34 | AdmittedPreset per component; PinRecordSource | the sealed `IntentSpec` (state, intent): `args` (the input's shape, integers, bounds, no start pose); `rules`, which include the sealed `onTurnRule`, the component's kind ∈ {Die, Spinner} read from the state, pinned (else RULE_REFUSED "unpinned"), the no-throw floor and the spinner's x_min | YES | answers who may roll: the caller's seat against the active seat (the sealed `onTurnRule`), the component's kind read from the state (C_R), and whether the game is pinned (OBJ-49); bounds and floors are preset data; never draws |
| OBJ-35 | Simulator; the kind's OutcomeReader; SettleRecords; AdmittedPreset per component; EnginePin; the kind's sealed field name | the sealed `Applier`: (state, intent, ApplyContext) | NO | decides the next state from what it is handed: the Simulator, the kind's reader, the state and the sealed `ApplyContext`'s stream |
| OBJ-36 | Simulator | `trajectory(SettleRecord, EnginePin, Preset)` → poses | NO | re-runs σ through the Simulator it is handed |
| OBJ-37 | Simulator; the kind's OutcomeReader; FairnessStatistics; Jitter's rule; UnitsToBinary64 | HandClaim: (preset, population, start policy, N, seeds); JitterClaim: (preset, admissible inputs, N, seeds). Each seed opens a sealed `RNGStreams` (MOD-04), the source of u; a start policy is the canonical pose, or the previous attempt's rest Pose from its RollRun (the rule OBJ-31 applies in play) | NO | computes from what it is handed |
| OBJ-38 | Simulator; the kind's OutcomeReader; FairnessStatistics; Jitter's rule; UnitsToBinary64 | HandClaim: (preset, population, start policy, N, seeds); JitterClaim: (preset, admissible inputs, N, seeds). Each seed opens a sealed `RNGStreams` (MOD-04), the source of u; a start policy is the canonical pose, or the previous attempt's rest Pose from its RollRun (the rule OBJ-31 applies in play) | NO | as OBJ-37 |
| OBJ-39 | Simulator; the kind's OutcomeReader; FairnessStatistics; Jitter's rule; UnitsToBinary64 | HandClaim: (preset, population, start policy, N, seeds); JitterClaim: (preset, admissible inputs, N, seeds). Each seed opens a sealed `RNGStreams` (MOD-04), the source of u; a start policy is the canonical pose, or the previous attempt's rest Pose from its RollRun (the rule OBJ-31 applies in play) | NO | as OBJ-37 |
| OBJ-40 | HandClaim; JitterClaim | `dyno(ValidPreset, EnginePin, population, start policy, N, seeds)` → DynoRecord; `aim(ValidPreset, EnginePin, N, seeds)` → A_max | NO | runs both claims on what it is handed; the pass rule is not its (OBJ-13) |
| OBJ-41 | the fields listed | — | NO | a record |
| OBJ-42 | — | (counts, target, start policy) → χ², p; (outcome probabilities per input) → A | NO | computes from its arguments |
| OBJ-43 | hash, origin, time-base status, length scale | — | NO | a record |
| OBJ-44 | ProvenanceCheck | `fit(DataSource set, model)` → values with κ, or refused | NO | computes from the sources it is handed |
| OBJ-45 | DataSource set; ParameterFit results | `population(DataSource set)` → a distribution named by hash | NO | holds what it is given |
| OBJ-46 | — | `present(value, Provenance)` (X2: κ present; a measured κ cites its fit); `measured(value, Provenance, DataSource, residuals)` (X9: a verified time base and a held-out residual) | NO | computes from its arguments |
| OBJ-47 | — | `Φ(SpinnerPreset, ω₀)` → {Θ, T, δω, coverage, A} | NO | computes from P_S and ω₀ |
| OBJ-48 | — | (SpinnerPreset, ω_eff, Θ, ∫ω²dt, ΣΔE) | NO | computes from what it is handed |
| OBJ-49 | the holder (ODG-g7: the pack, or a setup intent in the state) | `pin(state)` → PinRecord or absent | YES | a lookup of the game's pin; where it is held is ODG-g7, open |

#### 3. Admitted family

| Subtype | Is-a | S1 statement |
|---|---|---|
| OBJ-08 DiePreset, OBJ-09 SpinnerPreset | OBJ-07 Preset | step 2 §4 Preset ("Die: … Spinner: …"); step 3 §10 P_D, P_S; one primitive P-2, one gate G-0 |
| OBJ-16 Throw, OBJ-17 Flick | OBJ-15 RollInput | step 2 §4 RollInput (die x_D ∈ ℤ⁹, spinner x_S ∈ ℤ); one primitive P-3 |
| OBJ-27 DieReader, OBJ-28 SpinnerReader | OBJ-26 OutcomeReader | read_c over c ∈ {Die, Spinner} (GX-40); one ordered chain (S-2); RX-3 |
| OBJ-38 HandClaim, OBJ-39 JitterClaim | OBJ-37 DynoClaim | GX-48: two claims of one record, both on accepted outcomes with the acceptance rate; GBC-83, GBC-87 |

**Sealed interfaces realised (extension, not rewrite):** OBJ-34 RollGuard realises MOD-02's `IntentSpec`; OBJ-35
RollApplier realises MOD-02's `Applier`; both reach the engine only through `registerIntent` (SX-03).

**Abstractions surfaced:** OBJ-07 Preset, OBJ-15 RollInput, OBJ-26 OutcomeReader, OBJ-37 DynoClaim, each on a grouping
S1 proves (`a3-abstraction.md` §1).

**Admission** (`a4-admission.md`): PS_OOP = MIN(Meaning 1.0, Function 1.0, ExpressivePower 1.0, Traceability 1.0,
AbstractionFidelity 1.0) = 1.0; RSI pass against the sealed model; AFG pass. ADMIT, all 49 ACTIVE (revised after TE-6: OBJ-49 added, one is-a edge refused as RE-09).

#### 4. Refused edges and abstractions

| ID | Refused item | Kind | Reason | Preserved as |
|---|---|---|---|---|
| RE-01 | DiePreset is-a Die, SpinnerPreset is-a Spinner (a preset as a sealed kind) | is-a | The kinds are sealed `{face}`, `{sector}`; a preset is ruleset data about a component, not the component | A preset per component, keyed by component, handed by `wire` |
| RE-02 | SettleRecord is-a Spinner or Die state (the kind extended with the rest pose) | is-a | The owner ruled the rest pose into a settle record (AE-c17); a sealed kind cannot change (E-1) | σ in the module's own record, keyed by component (OBJ-31) |
| RE-03 | RollGuard is-a M2 Guard | is-a | The sealed Guard is the engine's one guard; a subclass would respecify it | A spec registered through `registerIntent` (SX-03), realising `IntentSpec` |
| RE-04 | RollApplier, Trajectory or Dyno is-a Simulator (each with its own simulation path) | is-a | EL-1: one roll function serves play, replay, the view and the dyno (RX-1, theorem D) | Each has-a Simulator, handed in |
| RE-05 | ClosedFormOracle is-a OutcomeReader or Simulator | is-a | GX-40: the closed form never decides; S-3 kept the turn test on the simulated Θ | A test-time comparison against the Simulator (SX-21) |
| RE-06 | PlayAdmission is-a PresetValidation | is-a | G-0b consults the owner's rule and G-0a does not; RX-1 must accept a G-0a-valid preset so the dyno runs before admission for play (F-7) | PlayAdmission takes a ValidPreset |
| RE-07 | EffectiveInput is-a RollInput | is-a | x is integers and logged (EL-5); x_eff is binary64 and never logged as an input | A value the input produces under a Jitter |
| RE-08 | ReplayCheck is-a Simulator (recompute inside the check) | is-a | The sealed `rebuild` re-runs the appliers (SX-13); the check only compares | ReplayCheck takes the rebuilt σ and H_ref |
| RE-09 | AdmittedPreset is-a ValidPreset | is-a | S1 states one gate in two parts and two witness types (step 7 §2 X2), not a subtype; AdmittedPreset is built from a ValidPreset and a DynoRecord (refused after TE-6, F2-08) | AdmittedPreset has-a ValidPreset and its DynoRecord; the held ValidPreset is what the Simulator is handed |
| RA-01 | One Refusal base over the intent refusal and the outcome refusal | abstraction (merge) | GX-47 keeps them apart; tautology test INVALID (step 3 §8); I-8 preserves them as named outcomes, not objects | The Guard's sealed Refusal (MALFORMED_ARGS, RULE_REFUSED; unlogged, drawless) and RollOutcome's REFUSE(reason) (drawn, logged) |
| RA-02 | REFUSE(escaped) folded into REFUSE(unsettled) | abstraction (merge) | tautology test INVALID (step 3 §8): different meaning, function and trace | two reasons in RollOutcome |
| RA-03 | The hand's claim and the jitter's claim as one claim | abstraction (merge) | tautology test INVALID (step 3 §8): neither bounds the other | two subtypes of DynoClaim, which shares only the acceptance rule |
| RA-04 | A per-kind bundle (a "DieModel" holding the die's preset, input and reader) | abstraction (property-based) | it groups by kind alone; S1 proves no such object, and each part already has its proven base | three proven bases with per-kind subtypes |
| RA-05 | A physical-Randomizer base over the sealed Die and Spinner | abstraction (rewrite) | it changes sealed nodes (E-1); the sealed spine keeps is-a in the catalog and has-a in the engine | presets, inputs and readers keyed by component; the kinds untouched |
| RA-06 | One RollIntent class owning both the guard spec and the applier | abstraction (merge) | GX-47 (the guard never draws, the applier always draws once); XH-04 (the draw only after LEGAL); the sealed `registerIntent` takes them as two | RollGuard (OBJ-34) and RollApplier (OBJ-35), paired at registration (SX-03) |
| RA-07 | A base for the offline tools (X8 to X10), or for the modules "ready for design" | abstraction (build-status) | placement and readiness are not object structure; step 7 leaves package boundaries to Phases 2 and 3, and the boundary is Phase 3's | each node in its own right; placement carried to Phase 3 |
| RA-08 | Separate StartPose and RestPose types | abstraction (split) | s0 is by ruling a prior rest pose (AE-c18), carried as the engine's own quaternion and never re-derived from an angle (F-5b; GX-41 forbids sin and cos) | one Pose (OBJ-21) |
| RA-09 | One Gate base over G-H, G-0a, G-0b, G-1, G-F to G-5 and G-7 | abstraction (property-based) | they share only "refuses"; their deciders, outcomes and records differ (UNCOMPUTABLE, preset-inadmissible, an intent refusal, an outcome refusal, DIVERGENCE) | each gate in the node that owns it |

#### 5. Admitted exceptions

| ID | Exception | Scope | Justification | Status |
|---|---|---|---|---|

None. No rule is excepted for any node (`qg1-and-stress-test.md` §2).

#### 6. Carried judgment for Phase 3

**Deciders are handed in.** The six YES nodes (OBJ-03, 12, 24, 33, 34, 49) are reached by INJECTED seams only. OBJ-03
is the one composition root (S1's `wirePhysics(S, presets)`): it builds the Simulator over the ready solver and
PinMatch, the kinds' readers, SettleRecords and one (RollGuard, RollApplier) pair per intent type, hands each its
collaborators, and registers the pairs through `registerIntent` (SX-03). The Simulator reaches RollApplier, Trajectory
and the dyno's claims only as a handed collaborator (one roll function, EL-1); PinRecordSource reaches RollGuard and the
host; the pass rule reaches PlayAdmission; ReplayReference and ReplayCheck reach OBJ-03's `replay`. One Decides reading
throughout (TE-6 F2-05): a node handed a decider, a handle (ReadySolver) or a policy value (DynoPassRule) is NO; the
node that consults it is YES.

**The sealed doors, and only these:** `registerIntent` (one registration per type; supersede, never respec); the
shared `onTurnRule` (MOD-02, `kernel/discipline.ts`) among RollGuard's rules, since the sealed Guard checks only the
type, the seat, `args` and the spec's own `rules`;
`LockstepController.host`/`resume` and `rebuild` with `wire`; `ApplyContext.rng.stream(name).next()` for the one draw;
the apply return for the next state (VALUE: the kind's field and σ; REFUSE: σ only). `supersedeIntent` is public, which
is why XH-03 is load-bearing (F-8).

**Placement is Phase 3's** (RA-07; step 7 left package boundaries to Phases 2 and 3). The constraints it must meet: no
platform file imports the physics package or Rapier (CF-6; enforcing it needs ODG-g8); the runtime that admits and wires
presets holds OBJ-06, OBJ-41 and OBJ-46's `present` check, so those sit where it may import them; X9's fitting and the
dyno's runs stay off the play path (SC-x6); no decision path imports the closed form (GX-40). A first draft drew the
boundary by id range; it was withdrawn after TE-6 (F2-10).

**Names Phase 3 fixes:** the component's stream name (S1 LA-1; XV-07 re-derives under it); σ's key in the state tree
(SC-x4: the last σ per component only); the two intent types `die:throw {component, throw}` and
`spinner:spin {component, flick}`. VerbSets v1.0 already holds `roll` and `spin`; which verb emits which intent is the
view's (Phase 5).

**Declared input found here (I2-03):** EnergyBooks needs ∫ω²dt when b > 0; the spinner's motion summary carries it,
accumulated per step like Θ with GX-41's operations only. S1's vectors (S-min, b = 0) do not need it.

**"Unpinned" has no S1 refusal test of its own.** G-1's "pin record present" and GX-47's "unpinned" intent refusal
are expressed (OBJ-34 with OBJ-49); S1's XR rows do not name the case, and Phase 2 creates no test. Phase 3's CT-4
decides whether a REF row covers it.

**The worked example** (`a4b-worked-example.md`, `a4b/a4b_g1.py`): two flicks refused by the Guard with no draw, two
accepted (VALUE(6), VALUE(4)) with draws 1 and 2, a replay equal and a tampered replay divergent; the die's input
jittered on velocity and spin only, and its reader refusing a cocked rest. PASS WITH LATENT ASSUMPTIONS.

##### Verification payload: owners named for Phase 3

Carried from S1 step 7 §10 unchanged; Phase 2 adds no test, vector or hook and changes none. The owner is the node
whose code the item guards; Phase 3 mints REF, VEC, HOOK and PC ids from these, above the sealed record's.

**Positive tests (17)**

| Owner | Tests |
|---|---|
| OBJ-03 PhysicsHost | XP-01 |
| OBJ-12 PlayAdmission | XP-02 |
| OBJ-34 RollGuard | XP-03 |
| OBJ-35 RollApplier | XP-04, XP-08 |
| OBJ-26 OutcomeReader | XP-05 |
| OBJ-27 DieReader, OBJ-28 SpinnerReader | XP-06 |
| OBJ-27 DieReader | XP-07 |
| OBJ-32 ReplayCheck | XP-09 |
| OBJ-24 Simulator | XP-10, XP-11, XP-13 |
| OBJ-36 Trajectory | XP-12 |
| OBJ-28 SpinnerReader | XP-14 |
| OBJ-31 SettleRecords | XP-15 |
| OBJ-44 ParameterFit | XP-16 |
| OBJ-37 DynoClaim | XP-17 |

**Refusal tests (31 active; XR-18 reserved for AE-c29, XR-22 folded into XR-01)**

| Owner | Tests | Guard element (S1) |
|---|---|---|
| OBJ-03 PhysicsHost | XR-01, XR-02, XR-27, XR-31 | G-H; EL-11; XH-09 |
| OBJ-10 PresetValidation | XR-03, XR-04, XR-05 | G-0a (GX-51, GX-49) |
| OBJ-12 PlayAdmission | XR-06, XR-07, XR-08 | G-0b |
| OBJ-34 RollGuard | XR-09, XR-10, XR-11, XR-15, XR-28 | G-1 |
| OBJ-35 RollApplier | XR-12, XR-19, XR-20 | XH-04; XH-06 |
| OBJ-26 OutcomeReader | XR-13, XR-32 (with OBJ-35's XH-11) | G-2; G-F |
| OBJ-27 DieReader | XR-14, XR-16, XR-17 | G-3, G-4, G-5 |
| OBJ-28 SpinnerReader | XR-33 | G-4 defect hook |
| OBJ-32 ReplayCheck | XR-21 | G-7 |
| OBJ-24 Simulator | XR-23 (over the source of OBJ-01 to OBJ-05, OBJ-15 to OBJ-29, OBJ-34, OBJ-35, OBJ-49), XR-24, XR-30 | XH-01; XH-05; XH-03 |
| OBJ-36 Trajectory | XR-25 | XH-10 (needs ODG-g9) |
| OBJ-44 ParameterFit | XR-29 | step 6 S-2 |
| the physics package (Phase 3 draws it) | XR-26 | XH-08 (needs ODG-g8) |

**Golden vectors (10)**

| Vector | Owner | State |
|---|---|---|
| XV-01 | OBJ-24 against OBJ-47 | oracle side COMPUTED (Θ 16.0, 36.0, 64.0 rad; T 4.0, 6.0, 8.0 s); engine side DEFERRED |
| XV-02 | OBJ-48 on OBJ-24's run | DEFERRED |
| XV-03 | OBJ-24 with OBJ-23, through OBJ-35 | DEFERRED (no die module complete without it) |
| XV-04 | OBJ-35 (a die roll) | DEFERRED |
| XV-05 | OBJ-40 | DEFERRED |
| XV-06 | OBJ-44 | DEFERRED |
| XV-07 | sealed MOD-04, under the stream name OBJ-35 uses | COMPUTED (0.557480385992676, 0.5018962631002069) |
| XV-08 | OBJ-47 | COMPUTED (Θ 36.0 → sector 5; 37.8225 → sector 0; δω 0.1309) |
| XV-09 | OBJ-19 with OBJ-18 | DEFERRED |
| XV-10 | OBJ-27 | DEFERRED |

**Hooks (11):** XH-01 → OBJ-24, scanning the source of every X1, X3, X4 and X5 node (OBJ-01 to OBJ-05, OBJ-15 to
OBJ-29, OBJ-34, OBJ-35, OBJ-49: S1's "X1, X3, X4, X5", restored after TE-6 F2-09); XH-02 → OBJ-03; XH-03 → OBJ-24,
inside `roll`, which every applier reaching the one roll function passes (RX-1; moved from OBJ-35 after TE-6 F2-02);
XH-04 → OBJ-35; XH-05 → OBJ-24; XH-06 → OBJ-35; XH-07 → OBJ-32, run by OBJ-03's `replay` after `rebuild`; XH-08 →
the physics package (needs ODG-g8); XH-09 → OBJ-03; XH-10 → OBJ-36 (needs ODG-g9); XH-11 → OBJ-35.

**Production concerns (8):** XPC-01 → OBJ-24, OBJ-35; XPC-02, XPC-03 → OBJ-03; XPC-04 → OBJ-19 (with ODG-g6);
XPC-05 → OBJ-40; XPC-06 → OBJ-43; XPC-07 → OBJ-15 (the seat's own input, never seed-generated); XPC-08 → OBJ-30.

**Validation checkpoints:** VC-1 → OBJ-24 with OBJ-23 (XV-03); VC-2 → OBJ-24 against OBJ-47 and OBJ-48 (XV-01,
XV-02); VC-3 → each refusal test's owner above; VC-4 → OBJ-12; VC-5 → OBJ-44; VC-6 → no node (the run's `seal.py
verify`); VC-7 → the physics package (ODG-g8); VC-8 → OBJ-36 (ODG-g9). **Elegance rules EL-1 to EL-11 and base cases
GBC-65 to GBC-87:** carried whole (S1 step 7 §6; step 3 §11).

**Rules most easily lost:** one roll function; the Guard never draws and the applier draws exactly once, after LEGAL;
the spinner's floor on the input, before the draw; refuse, never repair; the gate order G-F → G-2 → G-3 → G-4 → G-5;
start from the last rest quaternion, never from the intent; no world outlives an attempt; only the exact `Math`
functions; the closed form never decides; no trajectory stored; no sealed file written.

#### 7. Open questions

| Item | Question | Blocking | Resolves with |
|---|---|---|---|
| ODG-g5 (AE-c21) | ε, x_min, A_max and the dyno pass rule, per component | no for Phase 3; yes for admitting a preset for play | the owner at R5 |
| ODG-g6 (AE-c25) | the trust model against scripted aimers | no | the owner (Phase 5 security review, or the first networked game) |
| ODG-g7 (AE-c16) | the pinned build, and where the pin record lives (in the pack, or a setup intent) | no for Phase 3; yes for Phase 4 | the owner (version); placement kept open in R3 |
| ODG-g8 (K7-1-3) | HOOK-06 by path containment, and RULES rows for the physics package and Rapier in the sealed `tools/check-tiers.mjs` | yes for Phase 4's merge | the owner (`seal.py reopen`) |
| ODG-g9 (K7-1-11, AE-c22) | the sealed SeatView carries component state and σ | yes for OBJ-36's view use, HOOK-11's extension and R6; no for R4 | the owner (`seal.py reopen`) |
| ODG-g10 (K7-1-1, K7-1-10) | REF-24's detector names RollApplier's writes | no (XR-20 guards meanwhile) | the owner |
| ODG-g11 | where the replay reference hash is held (OBJ-33) | no for Phase 3; yes for VC-1 in production | Phase 3 with the developer |
| AE-c19 | settle numbers, floors, α, T_f | no | the dataset, R5 |
| AE-c26 | τ and b in the engine; XV-01's tolerance | no | Phase 4's first vector |
| AE-c28 | several dice per throw | no | the first such content |
| AE-c29 | the on-the-line rule (OBJ-28) | no | the owner at R5 |
