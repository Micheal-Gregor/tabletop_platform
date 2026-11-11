# Facet FA — Play runtime (extension G-1, R4, Phase 3)

Facet agent FA. Modules MOD-36, 39, 40, 41, 42, 43, 44, 45, 49 (fixed by C0 §6; no object moved). Inputs read: the FA slice
(`briefs/FA-slice.md`), C0 (`C0-partition.md` §3, §4, §5, §6, §7, §8), and the sealed signatures `index.ts`, `kernel/types.ts`,
`guard.ts`, `core.ts`, `rng.ts`, `rng-stream.ts`, `discipline.ts`, `hook-violation.ts` (plus the one-line
`kernel/divergence-error.ts` and the roster lines for Die and Spinner in `ontology/kinds.ts`, for exact names). Nothing else
was read; nothing was run; no file other than this one was written.

Conventions. Paths are relative to `packages/physics/src/` unless a path begins `packages/`. One class per file. Local ids
(`FA.S`, `FA.R`, `FA.V`, `FA.H`, `FA.P`) are S5's to remint. Findings are numbered F1…F19 in part 10 and cited as (F-n).
Assumptions about FB's values are numbered FB-A1…FB-A6 in part 10 and cited as (FB-An).

---

## 1. Modules

| MOD | Module | File | Owns OBJ | Status | Decides |
|---|---|---|---|---|---|
| MOD-36 | Engine values | `packages/physics/src/engine/engine-pin.ts`, `packages/physics/src/engine/pin-record.ts`, `packages/physics/src/engine/pin-match.ts`, `packages/physics/src/engine/pose.ts`, `packages/physics/src/engine/settle-rule.ts`, `packages/physics/src/engine/snapshot-hasher.ts`, `packages/physics/src/engine/roll-run.ts` | OBJ-01, OBJ-02, OBJ-05, OBJ-21, OBJ-22, OBJ-23, OBJ-25 | ACTIVE | NO |
| MOD-39 | Roll inputs and jitter | `packages/physics/src/input/roll-input.ts`, `packages/physics/src/input/throw.ts`, `packages/physics/src/input/flick.ts`, `packages/physics/src/input/units-to-binary64.ts`, `packages/physics/src/input/jitter.ts`, `packages/physics/src/input/effective-input.ts` | OBJ-15, OBJ-16, OBJ-17, OBJ-18, OBJ-19, OBJ-20 | ACTIVE | NO |
| MOD-40 | Reference ports | `packages/physics/src/ports/replay-reference.ts`, `packages/physics/src/ports/pin-record-source.ts` | OBJ-33, OBJ-49 | ACTIVE | YES |
| MOD-41 | Roll core: host, solver, Simulator, RollGuard | `packages/physics/src/core/physics-host.ts`, `packages/physics/src/core/ready-solver.ts`, `packages/physics/src/core/simulator.ts`, `packages/physics/src/core/roll-guard.ts` | OBJ-03, OBJ-04, OBJ-24, OBJ-34 | ACTIVE | YES |
| MOD-42 | Outcome readers | `packages/physics/src/read/outcome-reader.ts`, `packages/physics/src/read/die-reader.ts`, `packages/physics/src/read/spinner-reader.ts`, `packages/physics/src/read/roll-outcome.ts` | OBJ-26, OBJ-27, OBJ-28, OBJ-29 | ACTIVE | NO |
| MOD-43 | Settle records and replay check | `packages/physics/src/record/settle-record.ts`, `packages/physics/src/record/settle-records.ts`, `packages/physics/src/record/replay-check.ts` | OBJ-30, OBJ-31, OBJ-32 | ACTIVE | NO |
| MOD-44 | Roll applier | `packages/physics/src/intents/roll-applier.ts` | OBJ-35 | ACTIVE | NO |
| MOD-45 | Trajectory | `packages/physics/src/view/trajectory.ts` | OBJ-36 | ACTIVE | NO |
| MOD-49 | Physics package boundary | `packages/physics/src/index.ts`, `packages/physics-lab/src/index.ts` | none (owns XR-26 and XH-08, S2 §6) | ACTIVE | NO |

---

## 2. Interfaces

### 2.0 What every class below shares

- **OS-1.** Every decider and provider a class uses is a constructor input. A utility or a value in the same module is reached
  by name. Nothing is read from the clock, a random source, a module-level variable or a cache (EL-2, EL-3, EL-4). The `Math`
  functions allowed in input construction and deciding are exactly `abs, ceil, clz32, floor, fround, imul, max, min, round,
  sign, trunc` (EL-2, XH-01).
- **Sealed types by name** (engine barrel unless stated): `State`, `Intent`, `JsonObject`, `JsonValue`, `GameRow`, `Genesis`
  (MOD-01); `EngineCore`, `Applier`, `ApplyContext`, `IntentSpec`, `ArgsCheck`, `RuleCheck`, `HookViolation`, `rebuild`
  (MOD-02); `DivergenceError` (the sealed log's error, reached through the barrel and carried under MOD-02 as C0 §3 does);
  `RNGStreams` (MOD-04). `onTurnRule` by its file: `@tabletop/engine/src/kernel/discipline.js` (C0 §3, the one import past
  the barrel).
- **Types owned by FB (MOD-37)** that FA reads and does not define: `ValidPreset`, `AdmittedPreset`. FA's assumptions about
  them are FB-A1…FB-A6 (part 10).
- **Kinds and fields** (sealed roster): kind `Die` writes `face`; kind `Spinner` writes `sector`; a component is
  `state.components[id]` carrying `kind`. Intent types `die:throw {component, throw}` and `spinner:spin {component, flick}`;
  the component's stream is `rand:<component id>`; σ lives at the state key `settle` (component id → last σ) (C0 §7).
- **Rapier crossings are external** (SX-01, SX-07). They are notes in MOD-41's interface below, not seam rows.

### 2.1 MOD-36 Engine values (Decides NO)

All seven classes are values, utilities or a rule. Everything a value holds is plain data (numbers, strings, arrays, plain
objects), so an instance can sit inside σ in the state tree (F-19).

**`engine/engine-pin.ts` — `EnginePin` (OBJ-01, value).**
```ts
class EnginePin {
  constructor(
    readonly packageName: string,
    readonly version: string,
    readonly buildSha256: string,                       // the pinned build's SHA-256 (π.build)
    readonly integration: Readonly<Record<string, number>>, // ι, the pinned integration parameters
    readonly dt: number,                                // the fixed step
  )
}
```
No operation. Invariants: immutable; a record of values that refuses nothing at construction, so a pin "with no build hash"
(XR-02) can exist and is refused by its consumer. Open: the version, the hash and ι's keys belong to the pinned build
(ODG-g7); the interface fixes only the shape.

**`engine/pin-record.ts` — `PinRecord` (OBJ-02, value).**
```ts
class PinRecord {
  constructor(readonly pin: EnginePin, readonly presetHashes: readonly string[]) // π and the admitted presets' hashes
}
```
No operation (a consumer reads the two members). Open: where a PinRecord lives is the holder's (`PinRecordSource`,
ODG-g7); the class is the same wherever it lives.

**`engine/pin-match.ts` — `PinMatch` (OBJ-05, utility).**
```ts
class PinMatch {
  constructor()
  matches(loadedBuildSha256: string, pin: EnginePin): boolean // exact string equality with pin.buildSha256
}
```
Returns false when `pin.buildSha256` is empty (XR-02). Pure; compares two values it is handed (F-8 on the name).

**`engine/pose.ts` — `Pose` (OBJ-21, value).**
```ts
class Pose {
  constructor(
    readonly q: readonly [number, number, number, number],        // the engine's own rotation quaternion
    readonly t?: readonly [number, number, number],               // translation, where the body moves (a die)
  )
}
```
No operation. The component order of `q` is the pinned build's (F-18). Holds what the engine reported; finiteness is the
reader's gate G-F, not the Pose's.

**`engine/settle-rule.ts` — `SettleRule` (OBJ-22, rule).**
```ts
class SettleRule {
  constructor(
    readonly linearSpeedSqBelow: number,   // threshold on the squared linear speed
    readonly angularSpeedSqBelow: number,  // threshold on the squared angular speed
    readonly steps: number,                // K: consecutive steps under both thresholds
    readonly cap: number,                  // N: the step cap
  )
  atRest(summary: WorldSummary): boolean   // true iff both squared speeds have stayed under the thresholds for K steps
}
type WorldSummary = /* the squared linear and angular speeds the Simulator measured over the run so far: shape Phase 4's (F-18) */;
```
Pure; constructed by FB's preset from preset data (FB-A4). Open: the numbers (AE-c19).

**`engine/snapshot-hasher.ts` — `SnapshotHasher` (OBJ-23, utility).**
```ts
class SnapshotHasher {
  constructor()
  hash(snapshot: Uint8Array): string       // H
}
```
Synchronous, pure JavaScript, a pure function of the bytes (same bytes, same H on every runtime); never throws on any
bytes. The sealed FNV-1a 64 is the candidate algorithm (GX-46, F-11); the algorithm is pinned at Phase 4's first vector and
the interface does not change with it (F-17).

**`engine/roll-run.ts` — `RollRun` (OBJ-25, value).**
```ts
type RestSummary = { readonly pose: Pose /* + the final squared speeds and any other field G-2/G-3 read: Phase 4's (F-18) */ };
type MotionSummary =
  | { readonly kind: 'Die';     readonly upFaces: readonly number[] }          // the up-face sequence
  | { readonly kind: 'Spinner'; readonly theta: number; readonly omegaSquaredIntegral: number }; // Θ and ∫ω²dt (I2-03)
class RollRun {
  constructor(
    readonly rest: RestSummary,
    readonly settledAt: number | 'UNSETTLED',   // n*, or UNSETTLED at the cap
    readonly hash: string,                      // H, from SnapshotHasher
    readonly motion: MotionSummary,
  )
}
```
No operation. Θ and ∫ω²dt are accumulated per step by the Simulator with GX-41's operations only; S1's vectors (b = 0) do not
need ∫ω²dt.

### 2.2 MOD-39 Roll inputs and jitter (Decides NO)

Preconditions the Guard already enforced (RollGuard G-1 is the one check; these classes do not re-check): every component an
integer (EL-5), within the preset's bounds; `u ∈ [0, 1)` (a draw of the sealed stream); `ε` finite and ≥ 0 (an admitted
preset). Inputs are logged as integers and never re-rounded (EL-5). Unit scale: mm, mm/s, mrad/s, each ÷ the exact integer
1000 (AE-c20).

**`input/roll-input.ts` — `RollInput` (OBJ-15, abstract value).**
```ts
type InputShape = 'Throw' | 'Flick';
type InputComponent = { readonly integer: number; readonly unitScale: number; readonly jittered: boolean };
abstract class RollInput {
  scale(jitter: Jitter): EffectiveInput                      // concrete: the one place the order lives
  protected abstract shape(): InputShape
  protected abstract components(): readonly InputComponent[] // declared order
}
```
`scale`: for each component in declared order, `UnitsToBinary64.toBinary64(integer, unitScale)`; then each `jittered`
component × `jitter.factor()`; divide first, multiply second (XV-09). Returns `EffectiveInput(shape(), results)`. Pure.

**`input/throw.ts` — `Throw` (OBJ-16, is-a `RollInput`).**
```ts
type IntVec3 = readonly [number, number, number];
class Throw extends RollInput {
  constructor(readonly p: IntVec3 /* mm */, readonly v: IntVec3 /* mm/s */, readonly w: IntVec3 /* mrad/s */)
}
```
x_D = (p, v, w) ∈ ℤ⁹. Declared component order p0 p1 p2 v0 v1 v2 w0 w1 w2; all unit scale 1000; `v` and `w` jittered, `p`
never (F-6, SX-06). Layout in an intent's args: `args.throw = { p: [i,i,i], v: [i,i,i], w: [i,i,i] }`.

**`input/flick.ts` — `Flick` (OBJ-17, is-a `RollInput`).**
```ts
class Flick extends RollInput { constructor(readonly omega0: number /* mrad/s */) }
```
x_S = ω₀ ∈ ℤ; unit scale 1000; jittered (RX-6). Layout in an intent's args: `args.flick` is the single integer.

**`input/units-to-binary64.ts` — `UnitsToBinary64` (OBJ-18, utility).**
```ts
class UnitsToBinary64 { static toBinary64(integer: number, unitScale: number): number } // integer ÷ unitScale, correctly rounded
```
RX-2: one IEEE-754 binary64 division of two exactly represented integers; no other operation.

**`input/jitter.ts` — `Jitter` (OBJ-19, value with its rule).**
```ts
class Jitter {
  constructor(readonly u: number, readonly epsilon: number)  // u: the attempt's one draw; ε: the preset's
  factor(): number                                           // 1 + ε·(2u − 1), evaluated in that order in binary64
}
```
The input applies the factor to its own jittered components (the flick; the die's velocity and spin, never its release
position). Open: the trust model against scripted aimers (ODG-g6, XPC-04) does not change this interface.

**`input/effective-input.ts` — `EffectiveInput` (OBJ-20, value).**
```ts
class EffectiveInput {
  constructor(readonly shape: InputShape, readonly components: readonly number[]) // binary64, the input's declared order
}
```
No operation. A Throw yields nine numbers (p, v, w in m, m/s, rad/s); a Flick yields one (ω₀ in rad/s).

### 2.3 MOD-40 Reference ports (Decides YES)

Two ports. Each is a TypeScript `interface` (one per file), implemented by whatever holds the data, and always handed in
(Binding INJECTED).

**`ports/pin-record-source.ts` — `PinRecordSource` (OBJ-49).**
```ts
interface PinRecordSource { pin(state: State): PinRecord | undefined } // the game's pin, or absent
```
Consulted by RollGuard's "pinned" rule and available to the host. Open: where the pin is held, the pack or a setup intent in
the state (ODG-g7). The interface is the same either way.

**`ports/replay-reference.ts` — `ReplayReference` (OBJ-33).**
```ts
type ReplayKey = { readonly component: string; readonly k: number } | 'FINAL';
interface ReplayReference { reference(game: GameRow, key: ReplayKey): string | undefined } // H_ref, or none held
```
`{component, k}` asks for that attempt's original σ.H; `'FINAL'` asks for the original run's final state hash (F-4). Open: where
the reference is held, and what a replay does when none is held (ODG-g11). The interface is the same wherever it is held:
beside the persisted row, or from the sealed `MoveListener`'s post-move hashes (F-15 of S1), or otherwise.

### 2.4 MOD-41 Roll core (Decides YES)

Types shared by the root:
```ts
type LoadedBuild = { readonly bytes: Uint8Array; readonly sha256: string };       // the host's loader digests what it loads (F-6)
type BuildSource = (pin: EnginePin) => Promise<LoadedBuild>;                       // the pinned build's bytes, from the host
type Uncomputable = { readonly uncomputable: true; readonly pin: EnginePin };     // UNCOMPUTABLE(π) (F-6)
type Wire = (core: EngineCore) => void;                                            // the sealed host/resume/rebuild's `wire`
type RapierModule = typeof import('@dimforge/rapier3d-compat').default;            // external; the pinned build stays ODG-g7
```

**`core/ready-solver.ts` — `ReadySolver` (OBJ-04, engine handle).**
```ts
class ReadySolver {
  constructor(readonly rapier: RapierModule, readonly pin: EnginePin) // the initialised module, and the pin of the build it was initialised from
}
```
No operation. The solver's build identity is `pin.buildSha256`; the Simulator compares it with the π it is called with.
Exists ready or not at all (EL-11): there is no loading state. Decides NO: an external handle; the Simulator carries the YES.

**`core/simulator.ts` — `Simulator` (OBJ-24, service: the one roll function, RX-1).**
```ts
class Simulator {
  constructor(solver: ReadySolver, hasher: SnapshotHasher, pinMatch: PinMatch)
  roll(pin: EnginePin, preset: ValidPreset, input: EffectiveInput, start: Pose): RollRun // throws HookViolation (XH-03) before any step
  poses(pin: EnginePin, preset: ValidPreset, input: EffectiveInput, start: Pose): readonly Pose[] // the same run, sampled per step
}
```
- `roll` and `poses` call one private run function (RX-1, EL-1); a second simulation path for the view, the dyno or replay
  is the defect EL-1 names.
- **XH-03 first.** Before any world exists, `pinMatch.matches(solver.pin.buildSha256, pin)` must hold, else the sealed
  `HookViolation` naming XH-03 (F-1). Load-bearing: `registerIntent` and `supersedeIntent` are public (F-8 of S1).
- **No world outlives an attempt** (EL-3, XH-05): a fresh world is built, stepped and freed inside the call, freed on every
  exit including a throw; no world exists before it begins. XH-05 throws the sealed `HookViolation` naming XH-05 (F-1) if
  either half fails.
- Fixed insertion order, `dt = pin.dt`, ι = `pin.integration`; no frame or wall-clock step (EL-4). The world is built from
  the preset's integers and pinned literals only (EL-2, XH-01). The preset supplies the SettleRule (`preset.settleRule`,
  FB-A2); the run stops at rest or at `cap`, then `settledAt` is n* or `'UNSETTLED'` (RX-5).
- Never reads the state, σ, an intent or a stream; the start pose is whatever the caller hands (never from an intent,
  SX-12). Returns a `RollRun` whose motion summary matches the preset's kind; `poses`' last element equals the rest pose of
  `roll`'s run for the same arguments.
- **External notes (not seams): SX-01, SX-07.** The Simulator calls the pinned Rapier build to build, step, snapshot and free
  a world, and passes the snapshot bytes to `hasher.hash`. The step integration, damping τ and b and the XV-01 tolerance are
  open (AE-c26); several dice per throw would need a different world per throw (AE-c28); this interface is one body per call.

**`core/roll-guard.ts` — `RollGuard` (OBJ-34, guard spec realising the sealed `IntentSpec`).**
```ts
type RollIntentType = 'die:throw' | 'spinner:spin';
class RollGuard implements IntentSpec {
  constructor(intentType: RollIntentType, presets: ReadonlyMap<string, AdmittedPreset>, pins: PinRecordSource)
  readonly args: ArgsCheck                 // true, or a defect description → MALFORMED_ARGS
  readonly rules: readonly RuleCheck[]     // evaluated in this order → RULE_REFUSED
}
```
`args` and every rule are closures fixed at construction (the sealed Guard calls rules as free functions).
- **`args` (G-1, GX-2).** `args` holds exactly `component` (a string naming a wired component) and the intent's one input key
  (`throw` for `die:throw`, `flick` for `spinner:spin`); every input value a safe integer within the preset's bounds
  (FB-A2); nothing else, so an intent carrying a start pose or any extra key is refused (XR-28). Otherwise MALFORMED_ARGS.
- **`rules`, in order:** (1) the sealed `onTurnRule` (`M5/turn-order`); (2) the component's kind read from the state
  (`state.components[component].kind`) equals the intent type's kind (`Die` for `die:throw`, `Spinner` for `spinner:spin`),
  else `{rule: 'G-1', detail: 'not a Randomizer'}`; (3) `pins.pin(state)` is not absent, else
  `{rule: 'GX-47', detail: 'unpinned'}`; (4) the floor, on integers (squared magnitudes, no `Math.sqrt`, EL-2): a die throw at
  or below the preset's no-throw floor `{rule: 'G-1', detail: 'no throw'}`; a spinner flick at or below the floor
  `{rule: 'G-1', detail: 'no flick'}`, or above it but below the preset's `x_min` `{rule: 'F-1', detail: 're-spin'}`. The
  floor is checked here, before the draw (F-1 of S1).
- Pure on (state, intent): holds no stream, no Simulator and no clock, so it can neither draw nor simulate (SX-04). The
  quantity the die's floor measures is fixed by S1 step 3's G-1; the interface fixes only that it is an integer comparison.
- Open: the pin's holder (ODG-g7); the numbers it reads (ODG-g5).

**`core/physics-host.ts` — `PhysicsHost` (OBJ-03, host service and the one composition root; Decides YES).**
```ts
class PhysicsHost {
  constructor(
    buildSource: BuildSource,
    pinMatch: PinMatch,
    pins: PinRecordSource,
    check: ReplayCheck,
    references: ReplayReference,
  )
  loadPinned(record: PinRecord): Promise<ReadySolver | Uncomputable>
  wirePhysics(solver: ReadySolver, presets: ReadonlyMap<string, AdmittedPreset>): Wire
  replay(row: GameRow, genesis: Genesis): EngineCore
}
```
- **`loadPinned` (the SolverLoader ℒ; SX-01 note).** (1) If `record.pin.buildSha256` is empty: resolve `Uncomputable` without
  asking for bytes (XR-02). (2) `await buildSource(record.pin)`; (3) `pinMatch.matches(loaded.sha256, record.pin)` false:
  resolve `Uncomputable` (XR-01; XH-02); (4) initialise the pinned Rapier build from the verified bytes (external); an
  initialisation failure resolves `Uncomputable` (EL-11: a solver exists ready or not at all; F-6); (5) resolve
  `new ReadySolver(rapier, record.pin)`. There is no seeded or fallback path. The latest resolved (solver, record) pair is
  kept by the root (F-3).
- **`wirePhysics` (SX-02, SX-03; refuses at construction).** Refuses (EL-11, XR-27) a `solver` that is not the one the latest
  `loadPinned` resolved, or if none has. Refuses (XH-09, XR-31) any preset that is not an `AdmittedPreset` (G-0b) or whose
  `hash` is not in the kept record's `presetHashes` (SX-22). Otherwise builds, once for this call: `SnapshotHasher`,
  `Simulator(solver, hasher, pinMatch)`, `DieReader`, `SpinnerReader`, `SettleRecords`, and per intent type one
  `RollGuard(intentType, presets, pins)` and one `RollApplier(simulator, reader of the kind, records, presets, solver.pin,
  kindField)`; hands each its collaborators (it names no decider except the two it builds in this module); returns `wire`.
- **`wire(core)` (the sealed `host`/`resume`/`rebuild` call it).** Re-asserts XH-02 through the one private method
  `loadPinned` also uses (a mismatch throws an `Error` whose message begins `UNCOMPUTABLE(π)`, because `wire` returns
  nothing; F-6); then `core.registerIntent('die:throw', guard, applier.apply)` and `core.registerIntent('spinner:spin', …)`
  (one registration per type; supersede, never respec). The sealed submit logs each attempt after its succeeded apply
  (SX-11, HOOK-02, sealed; a note on this seam). Hosting with `LockstepController.host` is the caller's, handed this `Wire`.
- **`replay` (SX-13, XH-07; the sealed `rebuild`, not `resume`).** (1) `core = rebuild(row, genesis, wire)`; a refusal or an
  applier throw during the rebuild is the sealed `DivergenceError` and propagates. (2) For each component id the presets
  name, `σ = records.last(core.getState(), id)`; if present, `check.compare(σ, references.reference(row, {component: id,
  k: σ.k}))`. (3) `check.compareState(core.getStateHash(), references.reference(row, 'FINAL'))`. (4) Any `DIVERGENCE`
  verdict throws `new DivergenceError(row.moves.length - 1, detail)`: the replay is refused whole (XR-21). Returns the
  rebuilt core. Only the last σ per component is in a rebuilt state (SC-x4), so earlier attempts are covered through the
  state they leave and the final state hash (F-4).
- Binding: every collaborator is INJECTED; it builds by name only the Simulator and RollGuard (this module) and the
  non-deciding readers, records, hasher and applier. How the Simulator, readers and jitter rule it builds reach Trajectory
  and the lab is not fixed by S2 (F-2).
- Open: the pinned build and the pin's holder (ODG-g7); the reference's holder and the absent-reference result (ODG-g11);
  the load and bundle cost (XPC-02, XPC-03).

### 2.5 MOD-42 Outcome readers (Decides NO)

**`read/roll-outcome.ts` — `RollOutcome` (OBJ-29, value).**
```ts
type RefuseReason = 'non-finite' | 'unsettled' | 'escaped' | 'no-tumble' | 'cocked' | 'under-floor' | 'on-line';
class RollOutcome {
  static value(n: number): RollOutcome               // VALUE(face | sector)
  static refuse(reason: RefuseReason): RollOutcome   // REFUSE(outcome reason)
  readonly kind: 'VALUE' | 'REFUSE'; readonly value?: number; readonly reason?: RefuseReason
}
```
'on-line' exists only if AE-c29 adopts it. A REFUSE is a named outcome, never a repair (EL-6).

**`read/outcome-reader.ts` — `OutcomeReader` (OBJ-26, abstract).**
```ts
abstract class OutcomeReader {
  read(run: RollRun, preset: ValidPreset): RollOutcome               // concrete: the fixed gate order
  protected abstract kindGates(run: RollRun, preset: ValidPreset): RollOutcome // G-3, G-4, G-5 of the kind
}
```
`read` runs G-F (any non-finite number in `run`: `REFUSE(non-finite)`), then G-2 (`run.settledAt === 'UNSETTLED'`:
`REFUSE(unsettled)`), then `kindGates`. Pure; reads only the RollRun and the preset it is handed (SX-08); refuse, never
repair (EL-6); the order never varies (S-2).

**`read/die-reader.ts` — `DieReader` (OBJ-27, is-a `OutcomeReader`).** `kindGates`: G-3 the rest translation outside the
preset's tray: `REFUSE(escaped)`; G-4 fewer than `T_f` distinct values in `run.motion.upFaces`: `REFUSE(no-tumble)`; G-5 the
face of greatest `(R(q)·n_f)·ŷ` over the preset's face normals, `VALUE(face)` when that dot is at least `cos α` (the
preset supplies `cos α`: no trigonometric call, EL-2), else `REFUSE(cocked)`.

**`read/spinner-reader.ts` — `SpinnerReader` (OBJ-28, is-a `OutcomeReader`).** `kindGates`: G-4 `run.motion.theta` under 2π:
`REFUSE(under-floor)`, recorded and flagged as a preset defect (the Guard's floor makes this unreachable for an admitted
flick); G-5 on-the-line only if adopted (AE-c29); then `VALUE(sector)` by sign tests of the rest pose against the preset's
boundary directions; Θ is accumulated by the Simulator and no angle is recovered by `atan2` (F-5c of S1). Open: AE-c29.

Neither reader has construction inputs (everything is preset data passed per `read`).

### 2.6 MOD-43 Settle records and replay check (Decides NO)

**`record/settle-record.ts` — `SettleRecord` (OBJ-30, value σ).**
```ts
class SettleRecord {
  constructor(
    readonly component: string,
    readonly k: number,                         // the count of earlier logged attempts on this component (0 for the first)
    readonly x: JsonValue,                      // the intent's input exactly as logged (integers)
    readonly u: number,                         // the attempt's one draw
    readonly xEff: EffectiveInput,
    readonly s0: Pose,
    readonly outcome: RollOutcome,              // O
    readonly restPose: Pose,
    readonly settledAt: number | 'UNSETTLED',   // n*
    readonly hash: string,                      // H
    readonly pinRef: string,                    // the build SHA-256 of the pin that decided it (F-8)
  )
}
```
No operation. Everything in σ is JSON-shaped (F-19). Under XH-11 a non-finite numeric member is omitted, never stored as
NaN or ±∞ (F-11).

**`record/settle-records.ts` — `SettleRecords` (OBJ-31, module state).**
```ts
type AttemptFacts = {
  component: string; k: number; x: JsonValue; u: number; xEff: EffectiveInput; s0: Pose;
  outcome: RollOutcome; run: RollRun; pinRef: string;
};
class SettleRecords {
  constructor()
  readonly key: 'settle'
  record(facts: AttemptFacts): SettleRecord                   // restPose, settledAt, hash come from facts.run
  lastRest(state: State, component: string, canonical: Pose): Pose // the last σ's rest pose, else the preset's canonical pose
  last(state: State, component: string): SettleRecord | undefined // FA addition: the last σ, read from the state (F-5)
}
```
Holds the last σ per component only, and only in the state tree at `settle` (SC-x4); reads the state it is handed. It is the
one place that knows the key. `lastRest` is the only source of an attempt's start pose (SX-12; XR-28); `last` supplies the
attempt index `k` (0 when absent, else the last σ's `k + 1`) and the rebuilt σ for `replay`.

**`record/replay-check.ts` — `ReplayCheck` (OBJ-32, comparator χ).**
```ts
type ReplayVerdict = 'EQUAL' | 'DIVERGENCE';
class ReplayCheck {
  constructor()
  compare(rebuilt: SettleRecord, reference: string | undefined): ReplayVerdict          // rebuilt.hash against H_ref
  compareState(rebuiltStateHash: string, reference: string | undefined): ReplayVerdict  // FA addition (F-4)
}
```
Compares two values it is handed; `DIVERGENCE` on any inequality; pure. The block (the sealed `DivergenceError`) is thrown by
`PhysicsHost.replay` (XH-07 runs there). Open: the result for `undefined` (no reference held) is ODG-g11's; Phase 4 does
not choose it.

### 2.7 MOD-44 Roll applier (Decides NO)

**`intents/roll-applier.ts` — `RollApplier` (OBJ-35, realises the sealed `Applier`).**
```ts
class RollApplier {
  constructor(
    simulator: Simulator,
    reader: OutcomeReader,                               // the kind's reader
    records: SettleRecords,
    presets: ReadonlyMap<string, AdmittedPreset>,
    pin: EnginePin,
    kindField: 'face' | 'sector',                        // the kind's sealed field name
  )
  readonly apply: Applier                                // (state, intent, ctx) => JsonObject; a closure, so `this` is not relied on
}
```
Instances are per intent type (`'face'` ↔ `die:throw` ↔ `args.throw`; `'sector'` ↔ `spinner:spin` ↔ `args.flick`). One
`apply`, in this order, after the sealed `submit` has a LEGAL verdict:
1. `component = intent.args.component`; `preset = presets.get(component)`; `k` from `records.last(state, component)`.
2. `s0 = records.lastRest(state, component, preset.canonicalPose)`: never from the intent (SX-12, XR-28).
3. **One draw:** `u = ctx.rng.stream('rand:' + component).next()`, exactly once (XH-04, SX-05). A second draw in this attempt throws
   the sealed `HookViolation` naming XH-04 (F-1, F-7). The seed never chooses the outcome (EL-9).
4. Build the input (`Throw` from `args.throw`, or `Flick` from `args.flick`; F-16), `new Jitter(u, preset.epsilon)`, and
   `effective = input.scale(jitter)` (SX-06).
5. `run = simulator.roll(pin, preset.valid, effective, s0)` (XH-03 inside).
6. `outcome = reader.read(run, preset.valid)`.
7. `σ = records.record({component, k, x, u, xEff: effective, s0, outcome, run, pinRef: pin.buildSha256})`.
8. **XH-11:** if any value in `run` or σ is non-finite, the outcome is `REFUSE(non-finite)` and σ is recorded without the value
   (F-11). **XH-06:** return the next state: `settle` with `settle[component] = σ`; on `VALUE` also
   `components[component][kindField] = outcome.value`; on `REFUSE` nothing but σ; no effect-owned field (cash, favor, assets,
   sueRights, windows, deck inject) is touched (SX-10, SX-18: no transfer). A non-conforming return is blocked by throwing
   before returning, so the sealed `submit` leaves the state and the log untouched (F-19).
Invariants: one draw per attempt, after LEGAL; refuse, never repair (EL-6); no kind field without a σ, no σ without a logged
attempt (EL-7); σ is complete before any state is returned (SX-09). Open: REF-24's detector naming these writes (ODG-g10;
XR-20 guards meanwhile); latency per roll (XPC-01).

### 2.8 MOD-45 Trajectory (Decides NO)

**`view/trajectory.ts` — `Trajectory` (OBJ-36, derivation X7).**
```ts
class Trajectory {
  constructor(simulator: Simulator)
  trajectory(sigma: SettleRecord, pin: EnginePin, preset: ValidPreset): readonly Pose[]
}
```
`trajectory` returns `simulator.poses(pin, preset, sigma.xEff, sigma.s0)`: the same roll function (RX-1, SX-14), derived per
call and never stored (EL-10); nothing is held between calls and nothing is written. The last pose equals `sigma.restPose`
(XP-12); a last pose that differs is returned as computed, never repaired (EL-6), and is what XH-10 flags at animation
completion (BLOCKED on ODG-g9). Notes (no seam rows): SX-15 (σ in the sealed SeatView) and SX-16 (HOOK-11 read
"engine-decided") are not dependencies of this module, because a library module may not import presentation; both are
BLOCKED on ODG-g9. Open: ODG-g9.

### 2.9 MOD-49 Physics package boundary (Decides NO)

**`packages/physics/src/index.ts` and `packages/physics-lab/src/index.ts`.** No class. Each barrel only re-exports.
- The physics barrel re-exports, one line per file, the public classes and types of MOD-36, 37, 38, 39, 40, 41, 42, 43, 44, 45.
  It declares nothing and constructs nothing; the deciders (MOD-38, 40, 41) are exported so a caller can construct and hand
  them their collaborators, never so that another module reaches them by name (F-9).
- The lab barrel re-exports MOD-46, 47, 48. No symbol of a lab module appears in the physics barrel; nothing in the runtime
  imports the lab.
- Owns XR-26 and XH-08: no platform file imports `@tabletop/physics`, `packages/physics` or Rapier, by resolved path.
  Registered at the sealed `tools/check-tiers.mjs`; the rows it needs (the platform directories may not import the physics
  package or Rapier; `packages/physics` may not import the lab) wait for the owner's `seal.py reopen` (ODG-g8). Nothing in
  FA's design depends on it. SX-17 (to the sealed MOD-29) is a note here: MOD-29 is not among the sealed modules C0 §3
  carries, so it has no seam row (F-9).

---

## 3. Seams

| Local id | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule | Binding |
|---|---|---|---|---|---|---|
| FA.S1 | MOD-36 | MOD-01 | SnapshotHasher: the sealed FNV-1a 64 (`hashState`) as the candidate digest of the snapshot bytes; H out as a string (GX-46, F-11) | synchronous, pure JavaScript, no clock or random; the algorithm pinned with the first vector; never throws on any bytes | XP-11, XR-32 | NAMED |
| FA.S2 | MOD-40 | MOD-01 | types `State` (the argument of `pin`) and `GameRow` (the argument of `reference`); type-only | a port reads only what it is handed | XP-03, XP-09 | NAMED |
| FA.S3 | MOD-40 | MOD-36 | `PinRecord`, the result of `pin(state)` (or absent); type-only | a port returns a whole PinRecord or absent, never a partial one | XP-03, XR-02 | NAMED |
| FA.S4 | MOD-41 | MOD-36 | `PinMatch`, handed to the root and on to the Simulator; the loaded build's SHA-256 against π | the solver's build is compared with π at `loadPinned`, at `wire` (XH-02) and on every `roll` (XH-03) | XR-01, XR-02, XR-30, XH-02, XH-03 | INJECTED |
| FA.S5 | MOD-41 | MOD-36 | `SnapshotHasher`, built by the root by name and handed to the Simulator | one hasher per composition; H synchronous | XP-11 | NAMED |
| FA.S6 | MOD-41 | MOD-36 | values: `EnginePin`, `PinRecord`, `Pose`, `RollRun` (built by the Simulator), `SettleRule` (read from the preset) | values only; no behaviour is reached | XP-10, XP-11, XR-24 | NAMED |
| FA.S7 | MOD-41 | MOD-39 | `EffectiveInput` passed to `Simulator.roll` and `poses` (SX-06) | the Simulator receives x_eff only: never the intent's integers, never the draw | XH-01, XP-10, XR-23 | NAMED |
| FA.S8 | MOD-41 | MOD-40 | `PinRecordSource` and `ReplayReference`, handed to the root; the root hands the `PinRecordSource` to each RollGuard | consulted only through the ports; holders open (ODG-g7, ODG-g11) | XP-03, XP-09, XR-21 | INJECTED |
| FA.S9 | MOD-41 | MOD-42 | the root builds `DieReader` and `SpinnerReader` and hands each to the applier of its kind | each applier is handed one reader of its own kind | XP-05, XP-06 | NAMED |
| FA.S10 | MOD-41 | MOD-43 | the root builds one `SettleRecords` per composition and hands it to each applier; `replay` reads σ through `last` (SX-13) | σ is read only from the state handed | XP-09, XP-15 | NAMED |
| FA.S11 | MOD-41 | MOD-43 | `ReplayCheck` handed to the root; `replay` passes each rebuilt σ and the final state hash with their references (SX-13) | compares only what it is handed; a DIVERGENCE verdict becomes the sealed `DivergenceError` | XH-07, XP-09, XR-21 | INJECTED |
| FA.S12 | MOD-41 | MOD-44 | one `RollApplier` per intent type, built by the root and handed the Simulator, the kind's reader, SettleRecords, the presets, π and the kind's field name | the applier names no decider; every collaborator arrives handed | XP-04, XP-08 | NAMED |
| FA.S13 | MOD-41 | MOD-37 | `AdmittedPreset` per component, handed to `wirePhysics`; each preset's hash checked against the pin record (SX-22; FB-A1) | only presets admitted for play wire (G-0b); hash ∈ `presetHashes` | XH-09, XR-31 | INJECTED |
| FA.S14 | MOD-41 | MOD-37 | preset data RollGuard reads: input bounds, no-throw floor, `x_min`, kind (FB-A2) | bounds and floors are preset data; the Guard holds no number of its own (ODG-g5) | XR-09, XR-10, XR-15, XR-28 | INJECTED |
| FA.S15 | MOD-41 | MOD-37 | `ValidPreset` per roll into the Simulator: the SettleRule and the world data (SX-22; FB-A2, FB-A3) | one roll function reads only the preset it is handed | XP-10, XP-11 | INJECTED |
| FA.S16 | MOD-41 | MOD-02 | `EngineCore.registerIntent(type, spec, applier)` for `die:throw` and `spinner:spin`, on the core the sealed `host`/`resume`/`rebuild` hands to `wire` (SX-02, SX-03); note SX-11: the sealed `submit` logs each attempt after its succeeded apply (HOOK-02) | one registration per type (supersede, never respec); `wire` is called only after `loadPinned` resolves | XP-01, XR-27, XR-30 | INJECTED |
| FA.S17 | MOD-41 | MOD-02 | `rebuild(row, genesis, wire)` called by `replay`; the sealed `DivergenceError` thrown by `replay` (SX-13) | `rebuild`, not `resume`; the replay is refused whole | XH-07, XP-09, XR-21 | NAMED |
| FA.S18 | MOD-41 | MOD-02 | RollGuard realises `IntentSpec` (`ArgsCheck`, `RuleCheck`); its rules include the sealed `onTurnRule`, imported by its file (C0 §3) | the sealed Guard checks type, seat, `args` and the spec's rules; RollGuard adds no check outside them and draws nothing | XR-09, XR-10, XR-11, XR-15, XR-28 | NAMED |
| FA.S19 | MOD-41 | MOD-02 | the sealed `HookViolation`, thrown by the Simulator for XH-03 and XH-05 (F-1) | XH-03 fires before any world is built | XR-24, XR-30 | NAMED |
| FA.S20 | MOD-41 | MOD-01 | types `State`, `Intent`, `GameRow`, `Genesis`; `replay` reads `core.getState()` and `getStateHash()` | read-only | XP-09 | NAMED |
| FA.S21 | MOD-41 | MOD-10 | RollGuard reads `state.components[id].kind` (`Die` or `Spinner`) as data | the kind is read from the state, never from the intent | XR-11 | NAMED |
| FA.S22 | MOD-42 | MOD-36 | `RollRun` (and its `Pose`) into `read` (SX-08) | a reader reads only the RollRun | XP-05, XR-13, XR-32 | NAMED |
| FA.S23 | MOD-42 | MOD-37 | `ValidPreset` per `read`: tray, `cos α`, `T_f`, face normals, boundary directions (FB-A3) | preset data only | XR-14, XR-16, XR-17, XR-33 | INJECTED |
| FA.S24 | MOD-43 | MOD-36 | the rest `Pose`, n* and H, taken from the `RollRun` into σ (SX-09) | σ is complete before any state is returned | XP-08 | NAMED |
| FA.S25 | MOD-43 | MOD-42 | `RollOutcome` O into σ | O is VALUE or REFUSE(reason), never absent | XP-08, XR-19 | NAMED |
| FA.S26 | MOD-43 | MOD-39 | `EffectiveInput` into σ as x_eff | stored exactly as given | XP-08 | NAMED |
| FA.S27 | MOD-43 | MOD-01 | `State` read by `lastRest` and `last`; σ is JSON-shaped (SX-10, SX-12) | s0 is the last σ's rest pose, or the preset's canonical pose for the first roll; never the intent's | XP-15, XR-28 | NAMED |
| FA.S28 | MOD-44 | MOD-41 | `Simulator` handed; `roll(π, preset, x_eff, s0)` returns the RollRun (SX-06) | one roll function; XH-03 fires on every call | XP-04, XR-30 | INJECTED |
| FA.S29 | MOD-44 | MOD-42 | the kind's `OutcomeReader` handed; `read(run, preset)` returns the `RollOutcome` | the gate order is fixed inside the reader | XP-05, XR-32 | INJECTED |
| FA.S30 | MOD-44 | MOD-43 | `SettleRecords` handed; `lastRest`, `last` and `record` (SX-09, SX-12) | the start pose is never from the intent | XP-15, XR-28 | INJECTED |
| FA.S31 | MOD-44 | MOD-39 | the applier builds `Throw` or `Flick` from the args and a `Jitter`, then calls `scale` (SX-06) | divide, then multiply; the jitter reaches the flick and the die's velocity and spin, never the release position | XH-01, XP-10, XR-23 | NAMED |
| FA.S32 | MOD-44 | MOD-36 | `EnginePin` handed at construction | the π the solver was verified against | XR-30 | INJECTED |
| FA.S33 | MOD-44 | MOD-37 | `AdmittedPreset` per component handed: ε, the canonical pose, the `ValidPreset` (FB-A1, FB-A2) | preset data only | XP-04, XR-15 | INJECTED |
| FA.S34 | MOD-44 | MOD-02 | the sealed `Applier` and `ApplyContext` types realised; `HookViolation` thrown for XH-04 (F-1) | one draw, after LEGAL | XH-04, XR-12 | NAMED |
| FA.S35 | MOD-44 | MOD-04 | `ctx.rng.stream('rand:' + component).next()`, one u ∈ [0, 1) per attempt (SX-05) | exactly one draw; the stream is the component's own; never drawn in the Guard | XH-04, XP-04, XR-12 | INJECTED |
| FA.S36 | MOD-44 | MOD-01 | the next state returned: `settle[component]` and, on VALUE, the kind's field (SX-10) | no effect-owned field is written (SX-18: no transfer) | XH-06, XP-08, XR-19, XR-20 | NAMED |
| FA.S37 | MOD-44 | MOD-10 | VALUE writes the kind's sealed field (`face` or `sector`) of `state.components[id]` | VALUE only; REFUSE leaves it byte-unchanged | XH-06, XP-08, XR-19 | NAMED |
| FA.S38 | MOD-45 | MOD-41 | `Simulator` handed; `poses(π, preset, σ.x_eff, σ.s0)` (SX-14) | the same roll function (RX-1); XH-03 on every call | XH-10, XP-12 | INJECTED |
| FA.S39 | MOD-45 | MOD-43 | `SettleRecord` σ in | derived per read, never stored | XP-12 | NAMED |
| FA.S40 | MOD-45 | MOD-36 | `EnginePin` in, `Pose` sequence out | the π the solver was verified against | XP-12 | NAMED |
| FA.S41 | MOD-45 | MOD-37 | `ValidPreset` per call | preset data only | XP-12 | INJECTED |
| FA.S42 | MOD-49 | MOD-36 | re-export of the engine values (public classes and types) | the barrel declares and constructs nothing | XH-08, XR-26 | NAMED |
| FA.S43 | MOD-49 | MOD-39 | re-export of the roll inputs, jitter and effective input | the barrel declares and constructs nothing | XH-08, XR-26 | NAMED |
| FA.S44 | MOD-49 | MOD-40 | re-export of the two port interfaces, so a holder can implement them (F-9) | exported for implementation and handing; no module reaches a port by name | XH-08, XR-26 | INJECTED |
| FA.S45 | MOD-49 | MOD-41 | re-export of `PhysicsHost` (and the solver, Simulator and guard types) so a caller constructs the root and hands it its collaborators (F-9) | the barrel constructs nothing; every reach to a decider is handed | XH-08, XR-26 | INJECTED |
| FA.S46 | MOD-49 | MOD-42 | re-export of the readers and `RollOutcome` | the barrel declares and constructs nothing | XH-08, XR-26 | NAMED |
| FA.S47 | MOD-49 | MOD-43 | re-export of the settle records and the replay check | the barrel declares and constructs nothing | XH-08, XR-26 | NAMED |
| FA.S48 | MOD-49 | MOD-44 | re-export of `RollApplier` | the barrel declares and constructs nothing | XH-08, XR-26 | NAMED |
| FA.S49 | MOD-49 | MOD-45 | re-export of `Trajectory` | the barrel declares and constructs nothing | XH-08, XR-26 | NAMED |
| FA.S50 | MOD-49 | MOD-37 | re-export of FB's preset and provenance values (cross-facet; FB-A6) | the barrel declares and constructs nothing | XH-08, XR-26 | NAMED |
| FA.S51 | MOD-49 | MOD-38 | re-export of FB's admission and pass-rule classes (cross-facet; FB-A6) | exported for construction by a caller; no module reaches it by name | XH-08, XR-26 | INJECTED |
| FA.S52 | MOD-49 | MOD-46 | the lab barrel re-exports the dyno (cross-facet; FB-A6) | the lab barrel declares and constructs nothing; nothing in the runtime imports it | XH-08, XR-26 | NAMED |
| FA.S53 | MOD-49 | MOD-47 | the lab barrel re-exports the dataset and fitting (cross-facet; FB-A6) | as above | XH-08, XR-26 | NAMED |
| FA.S54 | MOD-49 | MOD-48 | the lab barrel re-exports the closed form and energy books (cross-facet; FB-A6) | as above | XH-08, XR-26 | NAMED |

Notes carried, no row (see part 10): SX-01 and SX-07 (Rapier, external), SX-11 (logged by the sealed submit; stated on FA.S16),
SX-15 and SX-16 (blocked on ODG-g9), SX-17 (blocked on ODG-g8; MOD-29 is not a carried module), SX-18 (no transfer; XR-20 and
XH-06 guard it), and the `host`/`resume` leg of SX-02 (the caller's, handed the `Wire`).

---

## 4. Refusal rows

| Local id | MOD | Invariant | Forbidden input | Expected rejection | Test name | Outcome | S1 case |
|---|---|---|---|---|---|---|---|
| FA.R1 | MOD-41 | G-H, GX-43, XH-02: only the pinned build is ever loaded | `loadPinned` over a build source serving a build whose SHA-256 is not π.build (or a `wire` over a solver whose pin is not the record's) | UNCOMPUTABLE(π); not hosted; no roll simulated; no seeded fallback | `XR-01 · a loaded build whose hash is not the pin's is UNCOMPUTABLE, unhosted and never simulated` | UNCOMPUTABLE | XR-01 |
| FA.R2 | MOD-41 | G-H: a pin names its build | a `PinRecord` whose `EnginePin` has no build hash | UNCOMPUTABLE(π); no build bytes requested | `XR-02 · a pin with no build hash is UNCOMPUTABLE` | UNCOMPUTABLE | XR-02 |
| FA.R3 | MOD-41 | G-1, GX-2: args are complete integers within the preset's bounds | a non-integer, out-of-bounds or missing input | MALFORMED_ARGS; state byte-unchanged; not logged; stream count unchanged | `XR-09 · a non-integer, out-of-bounds or missing input is MALFORMED_ARGS, drawless and unlogged` | MALFORMED_ARGS | XR-09 |
| FA.R4 | MOD-41 | G-1: a die throw is above the no-throw floor | a throw at or below the no-throw floor (zero) | RULE_REFUSED "no throw"; no draw; not logged | `XR-10 · a throw at or below the no-throw floor is RULE_REFUSED.NO_THROW, drawless and unlogged` | RULE_REFUSED.NO_THROW | XR-10 |
| FA.R5 | MOD-41 | G-1: a spinner flick is above the floor | a flick at or below the floor (zero) | RULE_REFUSED "no flick"; no draw; not logged | `XR-10 · a flick at or below the no-flick floor is RULE_REFUSED.NO_FLICK, drawless and unlogged` | RULE_REFUSED.NO_FLICK | XR-10 |
| FA.R6 | MOD-41 | G-1, REF-01 (sealed turn discipline): only a Die or Spinner component rolls | an intent naming a component whose kind is not the intent type's kind (not a Randomizer of this kind) | refused (REF-01); no draw; not logged | `XR-11 · a component that is not a Die or Spinner is RULE_REFUSED.NOT_RANDOMIZER, drawless and unlogged` | RULE_REFUSED.NOT_RANDOMIZER | XR-11 |
| FA.R7 | MOD-41 | G-1, REF-01 (sealed turn discipline): only the active seat rolls | a roll submitted by a seat that is not the active seat | refused (REF-01); no draw; not logged | `XR-11 · a roll out of turn is RULE_REFUSED.OUT_OF_TURN, drawless and unlogged` | RULE_REFUSED.OUT_OF_TURN | XR-11 |
| FA.R8 | MOD-44 | XH-04, GBC-85: the applier draws exactly once, after LEGAL | an applier drawing twice, or before LEGAL | HookViolation | `XR-12 · an applier drawing twice, or before LEGAL, is HOOK_VIOLATION.XH_04` | HOOK_VIOLATION.XH_04 | XR-12 |
| FA.R9 | MOD-42 | G-2: a roll is at rest by N | a RollRun not at rest by N | REFUSE(unsettled); logged; kind field unchanged | `XR-13 · a roll not at rest by the cap is REFUSE.UNSETTLED, logged, kind field unchanged` | REFUSE.UNSETTLED | XR-13 |
| FA.R10 | MOD-42 | G-3: the die rests inside the tray | a die at rest outside the tray | REFUSE(escaped) | `XR-14 · a die at rest outside the tray is REFUSE.ESCAPED` | REFUSE.ESCAPED | XR-14 |
| FA.R11 | MOD-41 | G-1, F-1: the spinner's floor is applied to the input, before the draw | a flick x below x_min | intent refusal "re-spin"; no draw; not logged; nothing moves | `XR-15 · a flick under x_min is RULE_REFUSED.RE_SPIN, drawless and unlogged` | RULE_REFUSED.RE_SPIN | XR-15 |
| FA.R12 | MOD-42 | G-4: a die tumbles | a die with fewer than T_f distinct up-faces | REFUSE(no-tumble), "re-roll" | `XR-16 · a die with fewer than T_f distinct up-faces is REFUSE.NO_TUMBLE` | REFUSE.NO_TUMBLE | XR-16 |
| FA.R13 | MOD-42 | G-5: a die rests flat | a die tilted 20 degrees against a wall with alpha 10 degrees | REFUSE(cocked), "re-roll" | `XR-17 · a die tilted 20 degrees against a wall with alpha 10 degrees is REFUSE.COCKED` | REFUSE.COCKED | XR-17 |
| FA.R14 | MOD-44 | XH-06, EL-7: a REFUSE attempt writes σ only | a REFUSE attempt whose return writes the kind field or omits σ | blocked | `XR-19 · a REFUSE attempt that writes the kind field, or omits sigma, is blocked by XH-06` | XH-06 | XR-19 (hook-only) |
| FA.R15 | MOD-44 | XH-06, AE-c24 ruling: no effect-owned field | an applier writing cash, favor, assets, sueRights, windows or a deck | blocked | `XR-20 · an applier writing cash, favor, assets, sueRights, windows or a deck is blocked by XH-06` | XH-06 | XR-20 (hook-only) |
| FA.R16 | MOD-43 | G-7, GX-46: a rebuilt row reproduces the original run | a row with one input x changed by 1 | DIVERGENCE, refused whole | `XR-21 · a row with one input changed by 1 is DIVERGENCE and refused whole` | DIVERGENCE | XR-21 |
| FA.R17 | MOD-41 | XH-01, EL-2: only the exactly specified Math functions in input construction and deciding | `Math.sin` (or any other `Math.*`, a clock or `random`) in the build or decision code | build (commit scan) fails | `XR-23 · a Math.sin, clock or random in the build or decision code fails the XH-01 scan` | XH-01 | XR-23 (hook-only) |
| FA.R18 | MOD-41 | XH-05, EL-3: no world outlives an attempt | a world reused across attempts | HookViolation | `XR-24 · a world reused across attempts is HOOK_VIOLATION.XH_05` | HOOK_VIOLATION.XH_05 | XR-24 |
| FA.R19 | MOD-45 | XH-10, HOOK-11 read "engine-decided": displayed ≡ decided | a displayed outcome that differs from the decided one (BLOCKED on ODG-g9) | flagged; decided wins | `XR-25 · a displayed outcome that differs from the decided one is flagged by XH-10 and decided wins` | XH-10 | XR-25 (hook-only) |
| FA.R20 | MOD-49 | XH-08, EL-8, CF-6: no platform file imports the physics package | a platform file importing the physics package or Rapier (BLOCKED on ODG-g8) | build fails | `XR-26 · a platform file importing the physics package fails the XH-08 import check` | XH-08 | XR-26 (hook-only) |
| FA.R21 | MOD-41 | EL-11: a solver exists ready or not at all | `wirePhysics` over a solver that is not ready (not the one `loadPinned` resolved, or none resolved) | refused at construction | `XR-27 · wiring the roll intents without a ready solver is refused as EL-11` | EL-11 | XR-27 |
| FA.R22 | MOD-41 | G-1, AE-c18 ruling: the start pose is never an input | an intent that carries a start pose | MALFORMED_ARGS; drawless; not logged | `XR-28 · an intent that carries a start pose is MALFORMED_ARGS, drawless and unlogged` | MALFORMED_ARGS | XR-28 |
| FA.R23 | MOD-41 | XH-03, F-8: the closed-over solver's build is π's on every roll | another module superseding `spinner:spin` with an applier over a solver whose build is not π | HookViolation before any simulation | `XR-30 · superseding spinner:spin over a solver whose build is not the pin is HOOK_VIOLATION.XH_03 before any simulation` | HOOK_VIOLATION.XH_03 | XR-30 |
| FA.R24 | MOD-41 | XH-09, F-7: only admitted presets whose hash is in the pin record are wired | wiring a preset not admitted for play, or one whose hash is not in the pin record | refused | `XR-31 · wiring a preset not admitted for play, or whose hash is not in the pin record, is refused by XH-09` | XH-09 | XR-31 (hook-only) |
| FA.R25 | MOD-42 | G-F, F-10: a non-finite RollRun is refused first | a RollRun holding NaN or ±∞ | REFUSE(non-finite); sigma recorded without the value; no state hash throws | `XR-32 · a RollRun holding NaN or an infinity is REFUSE.NON_FINITE at the reader (G-F)` | REFUSE.NON_FINITE | XR-32 |
| FA.R26 | MOD-44 | XH-11, F-10: every value in the RollRun and sigma is finite at the apply return | a non-finite value reaching the apply return | REFUSE(non-finite), recorded without the value; no state hash throws | `XR-32 · a non-finite value reaching the apply return is REFUSE.NON_FINITE, sigma recorded without it, no state hash throws (XH-11)` | REFUSE.NON_FINITE | XR-32 |
| FA.R27 | MOD-42 | G-4 defect hook: an admitted flick turns at least 2π | an admitted flick whose simulated Θ is under 2π (the preset's margin is wrong) | REFUSE(under-floor), recorded, flagged as a preset defect | `XR-33 · an admitted flick whose simulated theta is under 2 pi is REFUSE.UNDER_FLOOR, flagged as a preset defect` | REFUSE.UNDER_FLOOR | XR-33 |

Cases carried (24): XR-01, 02, 09, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33. XR-18 is
reserved (AE-c29) and XR-22 is folded into XR-01 (S2). XR-29 and XR-03 to XR-08 are FB's. Two cases give two or more rows
because S1 names two guard elements in them: XR-10 and XR-11 (one `(module, outcome)` each) and XR-32 (the reader's G-F and the
applier's XH-11).

---

## 5. Uncovered guards

| Module | Outcome | Where S1/S2 names it |
|---|---|---|
| MOD-41 | RULE_REFUSED.UNPINNED | S2 OBJ-34 rules ("pinned (else RULE_REFUSED "unpinned")"); S1 GX-47 ("unpinned" intent refusal) and step 3 §3 G-1; S2 §6 "'Unpinned' has no S1 refusal test of its own" (CT-4's decision: no XR case exists, so no row; RollGuard rule 3 stays specified in part 2.4) |
| MOD-42 | REFUSE.ON_LINE | S2 OBJ-28 ("G-5 on-line if adopted"), OBJ-29 (reason "on-line if adopted"); S1 XR-18, reserved for AE-c29 |
| MOD-41 | DIVERGENCE | S2 OBJ-03 `replay` (a DIVERGENCE verdict becomes the sealed `DivergenceError`, refused whole); S1 XR-21 names it only for OBJ-32 (FA.R16) |

---

## 6. Vectors

| Local id | MOD | Pinned value | Rule | Input | Output | Encoding | State | Discharge condition | S1 vector |
|---|---|---|---|---|---|---|---|---|---|
| FA.V1 | MOD-41 | Θ_engine against Θ_closed for a peg-free spinner (engine side) | For a peg-free spinner the Θ the Simulator accumulates equals the closed-form Θ within a tolerance of at least order ω_eff·dt/2, compared on Θ and never on sectors (GX-50, LA-4, SX-21) | S-min preset; flicks 8, 12 and 16 rad/s; s0 = 0; u = 0.5 (symmetric jitter zero) | engine Θ per flick: DEFERRED. Comparand, oracle side, COMPUTED and FB's (S1 `mwe_g1.py`, `oracle_xv01`): Θ = 16.0, 36.0, 64.0 rad; T = 4.0, 6.0, 8.0 s | binary64 radians (Θ), binary64 seconds (T) | DEFERRED | compute from X4 at first implementation; re-derive; within the tolerance AE-c26 sets | XV-01 |
| FA.V2 | MOD-41 | cross-platform replay of a row with die and spinner attempts | Theorem D, GBC-80: a row's σ and state hashes are a pure function of (row, pinned build, admitted presets) and are identical on every JavaScript engine and operating system | a row with die and spinner attempts, one refused | σ.H per component and the state hash: DEFERRED | the strings `H` and the state hash, one per component and one final | DEFERRED | compute on two different JavaScript engines or operating systems with the pinned build; σ and state hashes equal; re-derive. No die module counts complete without it (I-4) | XV-03 |
| FA.V3 | MOD-44 | a die roll | GX-40: the die's face is a deterministic function of (π, P_D, x, u, s0) through the one roll function; the seed never chooses it (EL-9) | fixed (π, P_D, x, u, s0) | `VALUE(face)` or `REFUSE(reason)` and σ: DEFERRED | the `RollOutcome` and σ as JSON | DEFERRED | compute from X3, X4 and X5; re-derive | XV-04 |
| FA.V4 | MOD-44 | the component stream's draws | GX-42, LA-1: the attempt's draw is the next value of the sealed stream `rand:<component id>`; the sequence depends only on (seed, stream name, draw index) | seed `sigma-7`, stream `rand:spinner-1`, draws 1 and 2 | 0.557480385992676, 0.5018962631002069 (COMPUTED from the sealed RNGStream, S1 XV-07) | binary64, shortest round-trip decimal | COMPUTED | re-derive from MOD-04 under the stream name Phase 3 fixes (C0 §7, `rand:<component id>`) | XV-07 |
| FA.V5 | MOD-39 | x_eff's bits | RX-2, RX-6, AE-c20: x_eff = (x ÷ 1000, correctly rounded) × (1 + ε·(2u − 1)), the quotient first and the product second, in binary64 | x = 12000 mrad/s, u = 0.5018962631002069 (XV-07's second draw), ε = 0.05 | x_eff's bits: DEFERRED | the 8 bytes of the binary64 value, as 16 hexadecimal digits | DEFERRED | compute from X3 in two runtimes; equal bits | XV-09 |
| FA.V6 | MOD-42 | the die reader's decisions | RX-3: the reader returns VALUE(face) when the greatest (R(q)·n_f)·ŷ is at least cos α, else REFUSE(cocked); G-F, G-2, G-3, G-4 first | rest q = identity; rest q = 20° about z; α = 10° | DEFERRED; cross-check from the reference script (not the vector): VALUE(1) and REFUSE(cocked) | the `RollOutcome` as JSON | DEFERRED | compute from X5; re-derive | XV-10 |

---

## 7. Hooks

| Local id | MOD | Trigger | Condition | Block action | Registered at | S1 hook |
|---|---|---|---|---|---|---|
| FA.H1 | MOD-41 | @before-commit | in input construction and decisions, no `Math` function outside abs, ceil, clz32, floor, fround, imul, max, min, round, sign, trunc; ASSERT_ABSENT `Math.random`, `Date`, `performance`; scans the source of OBJ-01 to OBJ-05, OBJ-15 to OBJ-29, OBJ-34, OBJ-35, OBJ-49 | fail commit | project hook `hooks/physics_exact_math.py`, run by `tools/precommit.py` (F-15) | XH-01 |
| FA.H2 | MOD-41 | @before-host-or-resume-or-rebuild | loaded build SHA-256 = π.build | UNCOMPUTABLE(π), not hosted | `packages/physics/src/core/physics-host.ts` | XH-02 |
| FA.H3 | MOD-41 | @before-roll-simulate | the closed-over solver's build = π.build (load-bearing, F-8 of S1) | HookViolation | `packages/physics/src/core/simulator.ts` | XH-03 |
| FA.H4 | MOD-44 | @at-stream-draw | Guard verdict LEGAL ∧ first draw of this attempt | HookViolation | `packages/physics/src/intents/roll-applier.ts` | XH-04 |
| FA.H5 | MOD-41 | @after-attempt | the attempt's world is freed ∧ no world existed before it began | HookViolation | `packages/physics/src/core/simulator.ts` | XH-05 |
| FA.H6 | MOD-44 | @before-apply-return | VALUE ⇒ kind field ∧ σ; REFUSE ⇒ σ only, kind field unchanged; no effect-owned field changed | block | `packages/physics/src/intents/roll-applier.ts` | XH-06 |
| FA.H7 | MOD-43 | @after-rebuild | rebuilt σ.H and state hash = the original run's reference (ODG-g11); run by `PhysicsHost.replay` after `rebuild` | DivergenceError | `packages/physics/src/record/replay-check.ts` | XH-07 |
| FA.H8 | MOD-49 | @ci-import-boundary | no file under the platform directories imports the physics package or Rapier (by resolved path); BLOCKED on ODG-g8 | fail build | `tools/check-tiers.mjs` (sealed; needs the owner's `seal.py reopen`, ODG-g8) | XH-08 |
| FA.H9 | MOD-41 | @before-preset-wire | preset admitted (G-0) ∧ its hash in the pin record | refuse | `packages/physics/src/core/physics-host.ts` | XH-09 |
| FA.H10 | MOD-45 | @at-animation-complete | displayed ≡ decided ∧ last pose ≡ σ.rest; BLOCKED on ODG-g9 | flag mismatch, decided wins | `packages/physics/src/view/trajectory.ts` | XH-10 |
| FA.H11 | MOD-44 | @before-apply-return | every value in the RollRun and σ is finite | REFUSE(non-finite), recorded without the value | `packages/physics/src/intents/roll-applier.ts` | XH-11 |

```
HOOK FA.H1  @before-commit { condition: in input construction and decisions, no Math function outside abs, ceil, clz32, floor, fround, imul, max, min, round, sign, trunc; ASSERT_ABSENT Math.random, Date, performance, BLOCK: fail commit }
HOOK FA.H2  @before-host-or-resume-or-rebuild { condition: loaded build SHA-256 = π.build, BLOCK: UNCOMPUTABLE(π), not hosted }
HOOK FA.H3  @before-roll-simulate { condition: the closed-over solver's build = π.build, BLOCK: HookViolation }
HOOK FA.H4  @at-stream-draw { condition: Guard verdict LEGAL ∧ first draw of this attempt, BLOCK: HookViolation }
HOOK FA.H5  @after-attempt { condition: the attempt's world is freed ∧ no world existed before it began, BLOCK: HookViolation }
HOOK FA.H6  @before-apply-return { condition: VALUE ⇒ kind field ∧ σ; REFUSE ⇒ σ only, kind field unchanged; no effect-owned field changed, BLOCK: block }
HOOK FA.H7  @after-rebuild { condition: rebuilt σ.H and state hash = the original run's reference (ODG-g11), BLOCK: DivergenceError }
HOOK FA.H8  @ci-import-boundary { condition: no file under the platform directories imports the physics package or Rapier (by resolved path), BLOCK: fail build }
HOOK FA.H9  @before-preset-wire { condition: preset admitted (G-0) ∧ its hash in the pin record, BLOCK: refuse }
HOOK FA.H10 @at-animation-complete { condition: displayed ≡ decided ∧ last pose ≡ σ.rest, BLOCK: flag mismatch, decided wins }
HOOK FA.H11 @before-apply-return { condition: every value in the RollRun and σ is finite, BLOCK: REFUSE(non-finite), recorded without the value }
```

FA.H8 and FA.H10 are carried BLOCKED on their gates (ODG-g8, ODG-g9); nothing FA builds depends on either.

---

## 8. Production concerns

| Local id | MOD | Concern | Class | Owner | Discharge target | S1 |
|---|---|---|---|---|---|---|
| FA.P1 | MOD-41 | Latency: a synchronous die simulation (up to N steps) inside `submit` blocks the caller's thread (the roll is OBJ-24's, run from OBJ-35's apply in MOD-44) | production | developer | Phase 5 review: measure per roll; budget | XPC-01 |
| FA.P2 | MOD-41 | The WASM bundle's size and load time before hosting | production | developer | Phase 5 review | XPC-02 |
| FA.P3 | MOD-41 | Packaging several pinned builds so old games replay on their own | production | developer | Phase 5 review | XPC-03 |
| FA.P4 | MOD-39 | Security: scripted aimers (ODG-g6); the hash detects inconsistency, not cheating | production | developer, with the owner's ODG-g6 | Phase 5 security review | XPC-04 |
| FA.P5 | MOD-39 | Accessibility: a fine gesture is not everyone's input; an accessible path must still be the seat's own input (for example a hold-to-set strength, logged as an integer), never a throw the seed generates (EL-9) | production | developer, with the owner | Phase 5 review | XPC-07 |
| FA.P6 | MOD-43 | Telemetry of re-roll rates per preset for fairness audits | production | developer | Phase 5 review | XPC-08 |

---

## 9. Positive tests

| S1 case | MOD | Test name |
|---|---|---|
| XP-01 | MOD-41 | `XP-01 · a game whose pinned build is loaded is hosted and accepts a roll` |
| XP-03 | MOD-41 | `XP-03 · a legal throw or flick is LEGAL` |
| XP-04 | MOD-44 | `XP-04 · three attempts, one refused, draw three times and each draw index equals the earlier logged attempts` |
| XP-05 | MOD-42 | `XP-05 · an attempt at rest before the cap continues to the kind gates` |
| XP-06 | MOD-42 | `XP-06 · an admitted flick turns at least 2 pi and a die with at least T_f up-faces continues to G-5` |
| XP-07 | MOD-42 | `XP-07 · a flat die with best dot at or above cos alpha is VALUE of the face` |
| XP-08 | MOD-44 | `XP-08 · a VALUE attempt writes the kind field and a complete sigma` |
| XP-09 | MOD-43 | `XP-09 · a rebuilt row yields the original sigma and state hash` |
| XP-10 | MOD-41 | `XP-10 · a world builds from integers and pinned literals` |
| XP-11 | MOD-41 | `XP-11 · the same attempt run first and after ten others in one process gives equal H` |
| XP-12 | MOD-45 | `XP-12 · a trajectory from sigma ends at its rest pose and agrees with its outcome` |
| XP-13 | MOD-41 | `XP-13 · a larger omega0 with the same u and preset raises theta` |
| XP-14 | MOD-42 | `XP-14 · a spinner's sector by sign tests equals the sector of theta mod 2 pi from s0, with no atan2` |
| XP-15 | MOD-43 | `XP-15 · the attempt after a refused one starts from the refused attempt's rest` |

XP-02, XP-16 and XP-17 are FB's.

---

## 10. Open gates and findings for S5

### 10.1 Open gates: where each of FA's modules sits, and how the interface stays fixed

| Gate | FA modules behind it | How the interface stays fixed |
|---|---|---|
| ODG-g5 (ε, x_min, A_max, pass rule) | MOD-39 (`Jitter`), MOD-41 (RollGuard), MOD-42, MOD-44 | No number appears in any FA interface. ε, the floors, the bounds, the tray, α and T_f are read from the preset handed in (FB-A2, FB-A3). Admission for play is FB's (MOD-38). |
| ODG-g6 (trust model vs scripted aimers) | MOD-39 (XPC-04) | `Jitter(u, ε)` and `RollInput.scale` are unchanged whatever the owner rules; the concern is FA.P4. |
| ODG-g7 (the pinned build; where the pin record lives) | MOD-36 (`EnginePin`, `PinRecord` values), MOD-40 (`PinRecordSource`), MOD-41 (`loadPinned`, `BuildSource`) | `PinRecordSource.pin(state)` is the one lookup whether the pin sits in the pack or a setup intent; `loadPinned(record)` takes the record; the build arrives through the handed `BuildSource`. The values of version, hash and ι are not fixed here. |
| ODG-g8 (HOOK-06 by path containment; RULES rows for the physics package and Rapier) | MOD-49 (XR-26, XH-08) | FA.R20 and FA.H8 are registered at the sealed `tools/check-tiers.mjs` and BLOCKED. No FA module depends on it. R5's merge needs the owner's `seal.py reopen`. |
| ODG-g9 (SeatView carries component state and σ) | MOD-45 (XR-25, XH-10; SX-15, SX-16) | `Trajectory.trajectory(σ, π, preset)` is complete without it; FA.R19 and FA.H10 are BLOCKED; SX-15 and SX-16 are notes, not dependencies. |
| ODG-g10 (REF-24's detector names RollApplier's writes) | MOD-44 | XR-20 and XH-06 guard the writes meanwhile (FA.R14, FA.R15); the applier interface is unchanged. |
| ODG-g11 (where the replay reference is held) | MOD-40 (`ReplayReference`), MOD-41 (`replay`), MOD-43 (`ReplayCheck`) | `reference(game, key)` is the one lookup; the holder is open, and so is the result when none is held (`undefined`). |
| AE-c19 (settle numbers, floors, α, T_f) | MOD-36 (`SettleRule`), MOD-42 | The numbers are constructor data of `SettleRule` and preset data of the readers. |
| AE-c26 (τ and b in the engine; XV-01's tolerance) | MOD-41 (`Simulator`) | `roll` and `poses` keep their signatures; the damping and the tolerance are inside the run (FA.V1 DEFERRED). |
| AE-c28 (several dice per throw) | MOD-41, MOD-39 | The interface is one body per call and one `component` per intent; several dice would add content, not change a signature here. |
| AE-c29 (the on-the-line rule) | MOD-42 (`SpinnerReader`) | `RefuseReason` already carries `'on-line'`; part 5 holds the guard element. |

### 10.2 Findings

**Seam conflicts and S2/S1 points that do not fit**

- **F1. The sealed `HookViolation` cannot name an XH hook.** Its constructor is `(hook: 'HK-1' | 'HK-2', detail: string)`
  (`kernel/hook-violation.ts`), yet S1's XH-03, XH-04 and XH-05 block with "HookViolation" and FA.R8, R18 and R23 expect
  `HOOK_VIOLATION.XH_nn`. A call naming `'XH-03'` does not type-check; passing `'HK-1'` with the XH id in `detail` is
  misleading. S5 must rule: carry the id in `detail` (an owner reading of the sealed type), or a physics error class (a new
  node, not in the S2). FA's interfaces say "the sealed `HookViolation` naming XH-nn" and do not choose.
- **F2. No operation hands the Simulator, readers or jitter rule to Trajectory or the lab.** S2 and C0 say they are "handed
  collaborators", but OBJ-03 builds the Simulator and readers inside `wirePhysics` and returns only `wire(core)`; Trajectory
  (OBJ-36) is not built by the root, and the lab (MOD-46 to 48) needs a Simulator outside any `wire`. A caller building a
  Simulator by name would reach MOD-41 (YES) by name, which B-1 forbids. Either `wirePhysics` returns more than `wire`, or
  OBJ-03 gains an accessor; FA.S38 and FB's lab seams stay INJECTED and the path is undecided.
- **F3. The root keeps two pieces of state S2's signatures omit.** XH-09 needs the `PinRecord` (S2's `wirePhysics(ReadySolver,
  AdmittedPreset per component)` has no record parameter) and `replay(row, genesis)` has no `wire` parameter ("that wire").
  FA reads S2 as: the root keeps the record of its latest `loadPinned` that resolved a solver, and the composition of its
  latest `wirePhysics`. If S5 prefers no retained state, add `record` to `wirePhysics` and `wire` to `replay`.
- **F4. XH-07 is not fully expressible with S2's two operations.** S2 gives `ReplayReference.reference(game, attempt) → H_ref`
  and `ReplayCheck.compare(σ, H_ref)`, but XH-07 and XP-09 compare the state hash as well, and the sealed `rebuild` returns
  only the final core (no per-move hashes, and only the last σ per component survives, SC-x4). FA's reading: `ReplayKey`
  adds `'FINAL'` to the per-attempt key; `ReplayCheck.compareState` is the one added operation; `compare` and `compareState`
  return a verdict and `PhysicsHost.replay` throws the sealed `DivergenceError(row.moves.length - 1, detail)` (its `index` is a
  move index; a post-rebuild hash has none). Earlier attempts' σ.H are not compared one by one: they are covered only through
  the state they leave, which the final state hash covers (and the sealed `MoveListener` hashes, F-15 of S1, between live peers).
- **F5. `SettleRecords` has no read of the last σ.** S2 lists `record` and `lastRest` only. The attempt index `k` (which
  XP-04 equates with the draw index) and `replay`'s rebuilt σ both need `last(state, component)`; FA adds it (`lastRest` is
  then `last(...)?.restPose ?? canonical`). `record(attempt)` takes `AttemptFacts`, a structural parameter type, because S2
  names `attempt` without a node. `k` is 0-based: the count of earlier logged attempts, so the first draw is XV-07's "draw 1".
- **F6. UNCOMPUTABLE and the loaded build's digest.** S2 names "UNCOMPUTABLE(π)" without a node. FA returns a structural
  `Uncomputable` from `loadPinned` and throws an `Error` whose message begins `UNCOMPUTABLE(π)` from `wire` (a void callback).
  S2 also leaves open who digests the loaded bytes: FA lets the handed `BuildSource` return `{bytes, sha256}`, so the root
  trusts the loader's digest (an independent re-digest would need a handed SHA-256 function). An initialisation failure of
  verified bytes resolving `Uncomputable` is FA's reading of EL-11. S5 to rule on all three.
- **F7. XH-04's "before LEGAL" half is not observable in the applier.** `ApplyContext` carries only `RNGStreams` and
  `RNGStream` has no draw counter; the applier cannot know the verdict. FA enforces "exactly one draw, through a one-shot
  gate in `apply`" (second draw: XH-04) and "never before LEGAL" by construction: the sealed `submit` runs `apply` only after
  HK-1 and RollGuard holds no stream. FA.R8's "before LEGAL" input is therefore a test of the Guard holding no stream.
- **F8. Names FA fixed where S2 gave inputs only.** `PinMatch.matches`, `UnitsToBinary64.toBinary64`,
  `SnapshotHasher.hash`, `RollOutcome.value` and `.refuse`, `OutcomeReader.kindGates`, `ReadySolver.rapier` and `.pin`,
  `SettleRecords.key`, `RollApplier.apply`, `RollGuard.args` and `.rules`, and σ's `pinRef` (read as the pin's build
  SHA-256; S2 gives "pin ref" without a type).
- **F9. The barrel, B-1 and SX-17.** MOD-49's re-exports of MOD-38, 40 and 41 are by-name symbols of deciders; FA.S44, S45,
  S51 are INJECTED as instructed, on the reading that the barrel exports for construction and implementation and constructs
  nothing. If the checker counts a value re-export as a reach, those three rows need a type-only export and a different
  entry for `PhysicsHost`. SX-17 (physics package to sealed MOD-29) has no seam row: C0 §3 does not carry MOD-29, so a row
  would name a module absent from the S3's table; it is a note on MOD-49 and BLOCKED with ODG-g8.
- **F10. Uncovered guards (part 5).** UNPINNED (S2 §6: no XR case; CT-4 here decides no REF row covers it, so RollGuard's
  rule 3 is specified but has no refusal row), ON_LINE (AE-c29) and (MOD-41, DIVERGENCE) (S2 assigns XR-21 to OBJ-32 only).
- **F11. XR-32 has two guard elements, and σ's two statements agree only by a reading.** The reader's G-F (FA.R25) and the
  applier's XH-11 (FA.R26) are separate elements. SX-09 says σ is "complete, and finite" before any state is returned, and
  XR-32 says σ is "recorded without the value": FA reads "complete" as every member present except a non-finite numeric member,
  which is omitted (so the state hash cannot throw).
- **F12. NOT_RANDOMIZER names a kind rule.** S1's XR-11 says "a non-Randomizer component"; S2's rule is the kind in {Die,
  Spinner}. The sealed roster also gives `Dial` the Randomizer role, so a Dial is refused under the same outcome although it
  is a Randomizer. FA keeps S1's token (FA.R6) and the kind rule (RollGuard rule 2).

**Cross-facet assumptions about FB (record as seams; S5 reconciles)**

- **F13. FB-A1 to FB-A6.** FA reads FB's values only as the slice's S2 rows describe them, with these names, which FB must
  confirm or change:
  - **FB-A1.** `AdmittedPreset` (MOD-37) is constructible only by `PlayAdmission` (MOD-38) and exposes `hash: string` (the hash
    that appears in `PinRecord.presetHashes`) and `valid: ValidPreset`. The root's test for "admitted" is `instanceof`.
  - **FB-A2.** `ValidPreset` exposes `kind: 'Die' | 'Spinner'`, `settleRule: SettleRule` and `canonicalPose: Pose` (both MOD-36
    classes: "the preset supplies the SettleRule"; "the preset's canonical pose for the first roll"), `epsilon: number`, the
    input bounds (A_max), the no-throw floor and, for a spinner, `x_min`.
  - **FB-A3.** The die's tray, `cos α` (a pinned binary64: EL-2 allows no trigonometric call), `T_f` and face normals, the
    spinner's boundary directions, and the world data the Simulator builds from (integers and pinned literals) are readable
    from the `ValidPreset`.
  - **FB-A4.** FB's MOD-37 constructs `SettleRule` and `Pose` values from FA's MOD-36 (FB's seam into FA).
  - **FB-A5.** A preset's hash in `PinRecord.presetHashes` is the same string as `AdmittedPreset.hash`.
  - **FB-A6.** FB's modules MOD-37, 38, 46, 47, 48 export public classes the barrels re-export (FA.S50 to S54); the lab
    receives the Simulator, reader and jitter rule handed (see F2).

**Pinned values and shapes**

- **F14. Pinned values with no S1 vector.** The unit scale 1000 for the die's inputs (XV-09 exercises only a flick in
  mrad/s); σ's state key `settle`; the intent type names `die:throw` and `spinner:spin`; the digest of known bytes by
  `SnapshotHasher` (XV-03 compares hashes across runtimes but pins no algorithm's output); the decision strings of RollGuard's
  refusals (`no throw`, `no flick`, `re-spin`, `unpinned`). XV-07 covers the stream name pattern `rand:<component id>` (for
  `spinner-1`).
- **F15. XH-01's file and scope.** FA names the project hook `hooks/physics_exact_math.py` (a proposal; S5 may rename it). Its
  scope is S1's "X1, X3, X4, X5" (S2: OBJ-01 to 05, 15 to 29, 34, 35, 49), so the files of MOD-36, 39, 41, 42, 44 and
  `ports/pin-record-source.ts`; `record/*`, `view/*` and `ports/replay-reference.ts` are outside it (as S2 lists).
- **F16. Two classes read the args layout.** RollGuard validates `args.throw` or `args.flick` and RollApplier parses the same
  layout into `Throw` or `Flick`, so the layout (`{p, v, w}` of three integers each; one integer) is stated twice; S2 gives no
  parse operation on `Throw` or `Flick`. S5 may add one in MOD-39.
- **F17. `hashState` takes a state, not bytes.** The sealed FNV-1a 64 is `hashState(State)`; SnapshotHasher takes bytes. Using
  the candidate means encoding the bytes as a JSON value or reimplementing the same algorithm over bytes; the choice is Phase
  4's first vector (FA.S1).
- **F18. Interiors left to Phase 4 behind fixed interfaces:** `WorldSummary` and `RestSummary` fields beyond `pose`, the
  quaternion component order, ι's keys, the quantity the die's no-throw floor measures, and the world contents.
- **F19. Consequences of the sealed core.** σ and everything in it must be JSON-shaped (the sealed `Applier` returns a
  `JsonObject` and the state is hashed as canonical JSON). A blocked apply (XH-06) or a hook throw (XH-03, XH-04, XH-05) leaves
  the state and the log untouched in live play, and inside the sealed `rebuild` it surfaces as `DivergenceError`
  ("applier refusal during replay"), so a hook violation during a replay reads as a divergence.

**Notes carried with no seam row.** SX-01 and SX-07: Rapier, external, in MOD-41's interface (`loadPinned`, `Simulator`). SX-11:
the sealed `submit` logs after a succeeded apply (HOOK-02), stated on FA.S16. SX-15 and SX-16: σ to the sealed SeatView and
HOOK-11 read "engine-decided", not dependencies of MOD-45, BLOCKED on ODG-g9 (XR-25 and XH-10 stay MOD-45's). SX-17: MOD-49,
BLOCKED on ODG-g8. SX-18: no transfer; XR-20 and XH-06 guard it. SX-02's `host`/`resume` leg: the caller's, handed the `Wire`.

**Counts.** Modules 9; seam rows 54 (41 FA-internal or sealed, 13 from MOD-49); refusal rows 27 (24 S1 cases); uncovered-guard
flags 3; vectors 6 (1 COMPUTED, 5 DEFERRED); hooks 11 (2 BLOCKED on a gate); production concerns 6; positive tests 14.
