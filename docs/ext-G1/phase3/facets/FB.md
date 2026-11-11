# Facet FB: Presets, evidence and lab (extension G-1, R4)

Facet agent FB, Phase 3. Modules MOD-37, MOD-38, MOD-46, MOD-47, MOD-48, as fixed by `C0-partition.md` §6 (objects not
moved). Inputs: `briefs/FB-slice.md` (the S2 nodes, the S1 rows), `C0-partition.md` §3 to §8, and the sealed signatures
`kernel/rng.ts`, `kernel/rng-stream.ts`, `kernel/statetree.ts`, `kernel/types.ts`. The oracle's computed values are cited
from `docs/ext-G1/phase1/mwe/mwe_g1.py` and were not recomputed. Nothing sealed is written. FA's interfaces are assumed
exactly as the S2 describes them; each assumption is a cross-facet seam row (part 3) and a finding (part 10).

## Conventions that bind every class below

- **C-1 One class per file** (C0 §6). Types and interfaces beside the class in the same file are not classes. OBJ-13 is
  a "policy interface" in the S2; it is written as an abstract class so the declarations check and OS-12 (which read a
  file's first class) have a class to read.
- **C-2 Nothing ambient (OS-1).** Every decider, provider and collaborator is a constructor argument; every operation
  takes its data as arguments. No clock, no `Math.random`, no environment read, no file read in any class below. MOD-47
  never reads a film: a `DataSource` is a record by hash (XPC-06).
- **C-3 Refusals are returned, never thrown** (EL-6, "refuse, never repair"): a plain record
  `{ refuse: <code>, reason: <token>, detail: <string> }`. The code is the one the S2/S1 name (`PRESET_INADMISSIBLE`,
  S2 OBJ-10; `NOT_ADMITTED`, S1 XR-06 to XR-08); where S1/S2 name none, it is the S1 invariant id (`RX-8`, `S-2`).
  Reason tokens are minted by this spec (finding 16).
- **C-4 Binding words.** INJECTED: the target is handed the value or collaborator as a constructor or operation
  argument and does not construct, or call by name, the source. NAMED: the target names the source's class or function
  (constructs it, or calls it).
- **C-5 Package direction.** MOD-37 and MOD-38 are the runtime (`@tabletop/physics`) and import nothing from
  `@tabletop/physics-lab`. MOD-46 to MOD-48 are the lab and import the runtime. Nothing in MOD-36 to MOD-45 imports
  MOD-46 to MOD-48 (SC-x6); no decision path imports the closed form (GX-40). The rows ODG-g8 adds to the sealed checker
  will enforce this mechanically; until then it holds by construction and by this table.
- **C-6 Witness classes.** `ValidPreset` and `AdmittedPreset` are constructible only by their issuer. The constructor
  takes a package-internal issue token that is exported inside the package and is not re-exported by the barrel
  (MOD-49, FA's); the barrel exports both classes as types only (finding 3).
- **C-7 Immutability.** Every value class is immutable after construction; values held by a `Preset` are `JsonValue`
  (sealed `types.ts`) so the preset can be hashed with the sealed `hashState`.

### What FB assumes of FA (S5 reconciles; each is a seam row and finding 15)

```ts
// MOD-41  Simulator.roll(pin: EnginePin, preset: ValidPreset, input: EffectiveInput, pose: Pose): RollRun
// MOD-42  OutcomeReader.read(run: RollRun, preset: Preset): RollOutcome   // RollOutcome separates a VALUE (accepted) from a REFUSE
// MOD-36  RollRun: exposes `rest: Pose`; for a Spinner a motion summary { theta, omegaSquaredIntegral, deltaESum }
// MOD-39  UnitsToBinary64: seat integer (mm, mm/s, mrad/s) -> binary64 by the exact integer 1000 (AE-c20)
// MOD-39  Jitter: the factor 1 + epsilon * (2u - 1) applied after the division
// MOD-39  EffectiveInput: what roll takes; ONE builder function that RollApplier and the claims both call (EL-1)
// MOD-36  EnginePin (pi); Pose, with a canonical JSON form; MOD-39 RollInput (the seat's Throw or Flick)
```

---

## 1. Modules

| MOD | Module | File | Owns OBJ | Status | Decides |
|---|---|---|---|---|---|
| MOD-37 | Presets and provenance | `packages/physics/src/presets/`: `provenance.ts`, `preset.ts`, `die-preset.ts`, `spinner-preset.ts`, `provenance-check.ts`, `preset-validation.ts`, `valid-preset.ts`, `admitted-preset.ts`, `dyno-record.ts` | OBJ-06, 07, 08, 09, 10, 11, 14, 41, 46 | ACTIVE | NO |
| MOD-38 | Admission for play (G-0b) | `packages/physics/src/admission/`: `play-admission.ts`, `dyno-pass-rule.ts` | OBJ-12, 13 | ACTIVE | YES |
| MOD-46 | Dyno (lab) | `packages/physics-lab/src/dyno/`: `dyno-claim.ts`, `hand-claim.ts`, `jitter-claim.ts`, `dyno.ts`, `fairness-statistics.ts` | OBJ-37, 38, 39, 40, 42 | ACTIVE | NO |
| MOD-47 | Dataset and fitting (lab) | `packages/physics-lab/src/data/`: `data-source.ts`, `parameter-fit.ts`, `dataset.ts` | OBJ-43, 44, 45 | ACTIVE | NO |
| MOD-48 | Closed form and energy books (lab) | `packages/physics-lab/src/oracle/`: `closed-form-oracle.ts`, `energy-books.ts` | OBJ-47, 48 | ACTIVE | NO |

---

## 2. Interfaces

### MOD-37 Presets and provenance (Decides NO)

Imports from outside the module: sealed MOD-01 (`hashState`, `JsonValue`), FA's MOD-36 (`Pose`, `EnginePin`). It imports
nothing from the lab (C-5).

#### `provenance.ts`: `Provenance` (OBJ-06, Value)

```ts
export type Kappa = 'measured' | 'published' | 'assumed';
export class Provenance {
  constructor(readonly kappa: Kappa, readonly source: string) {}   // S2: class, source citation
}
```
- Returns/refuses: nothing; no operation. The constructor never refuses; the guard is `ProvenanceCheck` (G-0a).
- Invariants: immutable. For `measured`, `source` is the citation of the fit and of the `DataSource` hashes behind it
  (SX-20).
- Open: how a fit citation differs from any other citation (finding 13).

#### `preset.ts`: `Preset` (OBJ-07, abstract Value)

```ts
export interface PresetValue { readonly value: JsonValue; readonly provenance: Provenance | null }  // null = a value without κ (XR-05's input)
export abstract class Preset {
  abstract readonly kind: 'Die' | 'Spinner';                  // the sealed MOD-10 kinds
  abstract readonly requiredValues: readonly string[];        // the names the kind must carry (data, not an operation)
  constructor(readonly values: ReadonlyMap<string, PresetValue>, readonly canonicalPose: Pose) {}
  hash(): string;                                             // the preset hash, rule below
}
```
- Construction: the values, each with its Provenance; the canonical Pose (S2). Base values: `epsilon` (ε), `settleNumbers`,
  `settleCount` (N). The floors are the kind's own (`noThrowFloor`, `xMin`).
- Returns: `hash()` is a pure function of the preset's content. Refuses: nothing.
- **Preset hash rule (pinned by this spec; no S1 vector, finding 4):** `hash() = hashState(content)` using the sealed
  MOD-01 function (FNV-1a 64 over canonical JSON, 16 hex digits), where `content` is the `JsonObject`
  `{ kind, canonicalPose: <Pose canonical JSON>, values: { <name>: { value, kappa, source } } }`; a missing Provenance is
  written `null`. Equal content hashes equal; changing any value, any κ, any citation, the kind or the pose changes it.
  Keys are sorted by the sealed `canonicalJson`, so insertion order does not matter. This is the hash the DynoRecord
  names (OBJ-41), `AdmittedPreset` carries (OBJ-14) and the pin record covers (XH-09).
- Invariants: immutable (C-7); a preset is a value, never a decider.
- Open: the shape of non-scalar values behind AE-c19 and the dataset (R5); FA's readers read them.

#### `die-preset.ts`: `DiePreset` (OBJ-08, is-a Preset, P_D)

```ts
export class DiePreset extends Preset { readonly kind = 'Die'; /* typed readers over `values` */ }
```
- Construction: as `Preset`. Members (names fixed here, from the S2's P_D list): `edge`, `mass`, `cornerRadius`,
  `faceNormals`, `faceLabels`, `contacts` ((μ, e) for each contact pair), `tray`, `alpha` (α), `settleTime` (T_f),
  `bounds`, `noThrowFloor`. `requiredValues` is these plus the base values.
- Invariants: the readers are defined on a complete preset; `PresetValidation` checks completeness before it reads one.
- Open: AE-c19 (α, T_f, settle numbers, floors are data, the dataset, R5).

#### `spinner-preset.ts`: `SpinnerPreset` (OBJ-09, is-a Preset, P_S)

```ts
export class SpinnerPreset extends Preset { readonly kind = 'Spinner'; get a(): number; get c(): number; get d(): number; }
```
- Construction: as `Preset`. Stored members: `inertia` (I), `tau` (τ), `b`, `deltaE` (ΔE), `sectorWidths`,
  `boundaryDirections`, `grabRadius`, `xMin`, `bounds`. The coefficients the solver reads are derived and read-only:
  `a = tau / inertia`, `c = b / inertia`, `d = deltaE / inertia` (S2: a = τ/I, c = b/I, d = ΔE/I). τ, b and ΔE are the
  stored values because G-0a tests τ and EnergyBooks uses τ·Θ (finding 14).
- Invariants: as `DiePreset`. Open: AE-c19, ODG-g5 (ε, x_min are the owner's numbers), AE-c26 (τ and b in the engine).

#### `provenance-check.ts`: `ProvenanceCheck` (OBJ-46, Utility)

```ts
export type ProvenanceReason = 'NO_PROVENANCE' | 'MEASURED_WITHOUT_FIT' | 'NO_TIME_BASE' | 'NO_HELD_OUT_RESIDUAL';
export type ProvenanceVerdict = { readonly ok: true } | { readonly ok: false; readonly reason: ProvenanceReason; readonly detail: string };
export interface MeasuredEvidence { readonly hash: string; readonly timeBaseVerifiedInClip: boolean }   // a DataSource satisfies it structurally
export interface HeldOutResiduals { /* the Θ and T residuals on the held-out third; shape open behind XV-06 */ }
export class ProvenanceCheck {
  constructor();                                                                  // S2: nothing handed
  present(value: JsonValue | undefined, provenance: Provenance | null | undefined): ProvenanceVerdict;
  measured(value: JsonValue, provenance: Provenance, source: MeasuredEvidence, residuals: HeldOutResiduals | null): ProvenanceVerdict;
}
```
- `present` (X2, RX-7): ok when a Provenance exists with a κ and a non-empty citation; refuses `NO_PROVENANCE` when absent;
  refuses `MEASURED_WITHOUT_FIT` when a measured κ's citation does not name its fit.
- `measured` (X9, RX-7): ok only when the source's time base is verified in clip and a held-out residual is given;
  refuses `NO_TIME_BASE` or `NO_HELD_OUT_RESIDUAL`.
- Invariants: computes from its arguments alone. The S2 passes a `DataSource` (OBJ-43, lab) here; MOD-37 is the runtime,
  so the parameter is the structural `MeasuredEvidence` declared in this file, and `DataSource` satisfies it by its
  fields (finding 1).
- Open: how `present` tells a fit citation from another (finding 13); `HeldOutResiduals` shape (XV-06, the owner's films).

#### `preset-validation.ts`: `PresetValidation` (OBJ-10, Gate G-0a, LB GX-51)

```ts
export type PresetRefusalReason = 'INCOMPLETE' | 'NO_PROVENANCE' | 'MEASURED_WITHOUT_FIT' | 'NO_FRICTION' | 'NO_CONTACT_FRICTION' | 'NO_DISSIPATION';
export interface PresetRefusal { readonly refuse: 'PRESET_INADMISSIBLE'; readonly reason: PresetRefusalReason; readonly detail: string }
export class PresetValidation {
  constructor(provenanceCheck: ProvenanceCheck);                  // S2: ProvenanceCheck
  validate(preset: Preset): ValidPreset | PresetRefusal;          // S2: ValidPreset or REFUSE(preset-inadmissible: reason)
}
```
- Checks, in the order the S2 lists them, first failure wins: complete (every `requiredValues` name present, else
  `INCOMPLETE`); `ProvenanceCheck.present` on every value (`NO_PROVENANCE`, `MEASURED_WITHOUT_FIT`); a Spinner's `tau > 0`
  (else `NO_FRICTION`, detail "a spinner must stop"); a Die's `mu > 0` on every contact pair (else `NO_CONTACT_FRICTION`)
  and `e < 1` on every contact pair (else `NO_DISSIPATION`).
- The three numeric conditions are written affirmatively, so a value that is not a number fails them and is refused,
  never repaired.
- Returns a `ValidPreset` only when all pass; it is the only issuer of `ValidPreset`. It consults nothing ambient
  (Decides NO: computes from the preset alone).
- Open: nothing; the numeric conditions are fixed by GX-51. The ε, x_min numbers behind the preset are ODG-g5's, not G-0a's.

#### `valid-preset.ts`: `ValidPreset` (OBJ-11, Value, a witness)

```ts
export class ValidPreset { constructor(readonly preset: Preset, issue: IssueToken); hash(): string }   // hash() = preset.hash()
```
- Invariants: C-6 (only `PresetValidation.validate` issues one); immutable; `preset` is not changed after issue (C-7).

#### `admitted-preset.ts`: `AdmittedPreset` (OBJ-14, Value, LB XH-09)

```ts
export class AdmittedPreset { constructor(readonly valid: ValidPreset, readonly record: DynoRecord, issue: IssueToken); hash(): string }  // hash() = valid.hash()
```
- Held by composition: it holds the `ValidPreset` and the passing `DynoRecord` as fields; it inherits from neither.
- Invariants: C-6 (only `PlayAdmission.admitForPlay` issues one, MOD-38); its `hash()` is the value that enters the pin
  record; the root (MOD-41) checks that it is admitted and that the hash is in the pin record (XH-09) and never calls
  `PlayAdmission`.

#### `dyno-record.ts`: `DynoRecord` (OBJ-41, Value)

```ts
export interface PopulationRef { readonly hash: string; readonly provenance: Provenance }
export interface HandClaimResult { readonly chiSquare: number; readonly p: number; readonly counts: readonly number[] }
export interface JitterClaimResult { readonly aimAdvantage: number; readonly outcomeProbabilities: readonly (readonly number[])[] }
export class DynoRecord {
  constructor(readonly pin: EnginePin, readonly presetHash: string, readonly hand: HandClaimResult, readonly jitter: JitterClaimResult,
              readonly acceptanceRate: { readonly hand: number; readonly jitter: number },
              readonly seeds: readonly string[], readonly population: PopulationRef) {}
}
```
- Fields as the S2 lists them: π (`pin`), preset hash, both claims' results, acceptance rate, seeds, population hash. Deviations
  for S5 (findings 5, 9): the population carries its own Provenance (XR-07 needs it); the acceptance rate is one per claim.
- The three result types are declared here, in the runtime, so `DynoRecord` never imports the lab (finding 2).
- Invariants: immutable; names the pin and the preset hash it was run for. Open: the pass rule (ODG-g5) may need more of
  the record; fields are added only by a new gate pass.

### MOD-38 Admission for play, G-0b (Decides YES)

Imports: MOD-37 by name (`ValidPreset`, `DynoRecord`, `AdmittedPreset`). Reached by INJECTED seams only; the root never
calls it. The host's setup calls it before wiring.

#### `dyno-pass-rule.ts`: `DynoPassRule` (OBJ-13, Policy)

```ts
export type PassVerdict = 'pass' | 'fail';
export abstract class DynoPassRule { abstract judge(record: DynoRecord): PassVerdict }   // S2: judge(DynoRecord) -> pass, fail
```
- No construction inputs on the abstract class; the owner's rule (ε, x_min, A_max, α_sig, the rule: ODG-g5, AE-c21) is a
  subclass that does not yet exist. Decides NO: it is the policy value handed to `PlayAdmission`, which carries the YES.
- Invariants: a pure function of the record. Open: **everything about the rule's numbers and form**, behind ODG-g5. The
  interface stays fixed because `PlayAdmission` is written against `judge` alone.

#### `play-admission.ts`: `PlayAdmission` (OBJ-12, Gate G-0b)

```ts
export type NotAdmittedReason = 'NO_DYNO_RECORD' | 'ASSUMED_POPULATION' | 'PASS_RULE_FAILED';
export interface NotAdmitted { readonly refuse: 'NOT_ADMITTED'; readonly reason: NotAdmittedReason; readonly detail: string }
export interface Undetermined { readonly undetermined: true; readonly detail: string }
export type AdmissionResult = AdmittedPreset | NotAdmitted | Undetermined;
export class PlayAdmission {
  constructor(rule: DynoPassRule | null);     // INJECTED; null = the owner's rule does not exist yet (ODG-g5)
  admitForPlay(valid: ValidPreset, record: DynoRecord | null): AdmissionResult;
}
```
- Order (this spec's reading of the S2, finding 7): (1) `record` null: `NOT_ADMITTED.NO_DYNO_RECORD`; (2)
  `record.population.provenance.kappa` not `measured`: `NOT_ADMITTED.ASSUMED_POPULATION` ("development only", SX-19);
  (3) `rule` null: `Undetermined`; (4) `rule.judge(record)` is `fail`: `NOT_ADMITTED.PASS_RULE_FAILED`; (5) `pass`:
  `new AdmittedPreset(valid, record, token)`.
- Both XR-08 arms (a floor at which some u falls under one turn; admissible inputs giving A above A_max on accepted
  outcomes) reach step 4 as a `fail`: the S2's `judge` returns pass or fail only (finding 6). The closed form is never
  consulted (GX-40).
- Invariants: never admits without a record, never admits an assumed population, never admits without a rule; no
  clock, no state between calls; a refusal builds no `AdmittedPreset`.
- Open: ODG-g5 (the rule). XP-02 therefore runs against a fixture `DynoPassRule` that returns `pass`; the fixture fixes no ε,
  x_min or A_max.

### MOD-46 Dyno, lab (Decides NO)

Imports: MOD-37, MOD-36, MOD-39, MOD-41, MOD-42 (FA) and sealed MOD-04; MOD-47 for `Population` (type). Nothing in the
runtime imports it. The offline composition that loads a solver and builds the Simulator is a script outside `src/`; it
constructs the classes below and is not a module.

#### `fairness-statistics.ts`: `FairnessStatistics` (OBJ-42, Utility, RX-8)

```ts
export type StartPolicy = 'canonical' | 'previous-rest';     // the canonical pose, or the previous attempt's rest Pose from its RollRun
export interface NamedTarget { readonly hash: string | null; readonly probabilities: readonly number[] }
export interface StatisticsRefusal { readonly refuse: 'RX-8'; readonly reason: 'UNNAMED_POPULATION' | 'CHAINED_STARTS'; readonly detail: string }
export class FairnessStatistics {
  constructor();
  chiSquare(counts: readonly number[], target: NamedTarget, start: StartPolicy): { chiSquare: number; p: number } | StatisticsRefusal;
  aimAdvantage(outcomeProbabilities: readonly (readonly number[])[]): number;      // S2: (outcome probabilities per input) -> A
}
```
- `chiSquare` refuses an unnamed population (`target.hash` null or empty) and a χ² over chained starts (RX-8, F-2).
  `aimAdvantage` computes A from its argument.
- Invariants: computes from its arguments alone. The p-value is a report for the pass rule, never a decision here.
- Open: the S2 signature has no slot for a population name (carried on `target`, finding 10) and does not say how counts
  relative to the start differ from raw chained counts (finding 10); the closed-form of A is not used (GX-40).

#### `dyno-claim.ts`: `DynoClaim` (OBJ-37, Abstract, LB F-1)

```ts
export interface Attempt { readonly outcome: RollOutcome; readonly rest: Pose }
export interface ClaimRun<R> { readonly pin: EnginePin; readonly presetHash: string; readonly result: R; readonly acceptanceRate: number }
export abstract class DynoClaim {
  constructor(simulator: Simulator, reader: OutcomeReader, statistics: FairnessStatistics, jitter: Jitter, units: UnitsToBinary64);  // all INJECTED
  protected attempt(pin: EnginePin, preset: ValidPreset, pose: Pose, seatInput: RollInput, u: number): Attempt;
}
```
- `attempt` is the one step both claims share (EL-1): builds the `EffectiveInput` from the seat's integer input, the
  preset's ε and `u` (units division by the exact 1000 first, then the jitter factor), calls `simulator.roll(pin, preset,
  effective, pose)`, reads `reader.read(run, preset.preset)`, and returns the outcome with `run.rest`.
- Accepted outcomes are the VALUEs; a REFUSE counts as a roll and not as an accepted outcome (F-1). The acceptance rate is
  accepted divided by rolls. A claim names π and the preset hash in its `ClaimRun`.
- Invariants: no second simulation path; every `u` comes from a sealed stream (EL-9: u is applied to the seat's input, the
  seed never picks an outcome); nothing ambient.

#### `hand-claim.ts`: `HandClaim` (OBJ-38, is-a DynoClaim, GX-48(a))

```ts
export class HandClaim extends DynoClaim {            // construction as DynoClaim
  run(preset: ValidPreset, pin: EnginePin, componentId: string, population: Population, start: StartPolicy,
      n: number, seeds: readonly string[]): ClaimRun<HandClaimResult> | StatisticsRefusal;
}
```
- For each seed: `new RNGStreams(seed).stream('rand:' + componentId)` (sealed MOD-04, `.next()` gives `u`); the first attempt
  starts at `preset.preset.canonicalPose`; under `previous-rest` each later attempt starts at the previous attempt's
  `rest`. Seat inputs come from `population`. Accepted outcomes are counted; `statistics.chiSquare` gives the χ² of the
  outcome relative to the start (XP-17).
- Returns the run, or the statistics' refusal unchanged. Open: how N is divided among seeds, how the seat's input is drawn
  from the population, and the claim's `target` (finding 8).

#### `jitter-claim.ts`: `JitterClaim` (OBJ-39, is-a DynoClaim, GX-48(b))

```ts
export class JitterClaim extends DynoClaim {          // construction as DynoClaim
  run(preset: ValidPreset, pin: EnginePin, componentId: string, admissible: readonly RollInput[],
      n: number, seeds: readonly string[]): ClaimRun<JitterClaimResult>;
}
```
- For each fixed admissible input: the outcome over `u` drawn from the seeds' `rand:<component id>` streams, every start the
  canonical pose (the S2 signature carries no start policy); the accepted outcomes' probabilities per input go to
  `statistics.aimAdvantage`, giving A.
- Open: where the admissible inputs come from for `Dyno.dyno` and `Dyno.aim` (finding 8); ODG-g6 (what a scripted aimer
  may do) decides which inputs are admissible beyond the hand; not blocking.

#### `dyno.ts`: `Dyno` (OBJ-40, Offline runner, X8)

```ts
export class Dyno {
  constructor(handClaim: HandClaim, jitterClaim: JitterClaim);              // S2: HandClaim, JitterClaim
  dyno(preset: ValidPreset, pin: EnginePin, componentId: string, population: Population, start: StartPolicy,
       n: number, seeds: readonly string[]): DynoRecord | StatisticsRefusal;
  aim(preset: ValidPreset, pin: EnginePin, componentId: string, n: number, seeds: readonly string[]): number;   // the S2's A_max
}
```
- `dyno` runs both claims and assembles the `DynoRecord` (π, preset hash, both results, each claim's acceptance rate, the
  seeds, `population` as `{ hash, provenance }`). `aim` runs the `JitterClaim` and returns the aim advantage.
- Invariants: it runs both claims on what it is handed; the pass rule is not its (OBJ-13); it never calls `PlayAdmission`;
  synchronous like `Simulator.roll`; offline only (SC-x6).
- Deviation from the S2 signatures: `componentId` is added because the stream is `rand:<component id>` (finding 8).
  Open: the `aim` return naming (finding 8); XPC-05 (compute volume).

### MOD-47 Dataset and fitting, lab (Decides NO)

Imports: MOD-37 (`Provenance`, `PresetValue`, `ProvenanceCheck`, `MeasuredEvidence`, `HeldOutResiduals`, `PopulationRef`).
Open behind the owner's films (OBJ-45's status, XV-06) and AE-c27's ruling.

#### `data-source.ts`: `DataSource` (OBJ-43, Value)

```ts
export class DataSource {
  constructor(readonly hash: string, readonly origin: 'own-film' | 'third-party' | 'published',
              readonly timeBaseVerifiedInClip: boolean, readonly lengthScale: number) {}   // S2: hash, origin, time-base status, length scale
}
```
- Invariants: a record by hash; film bytes are never held (XPC-06); it satisfies `MeasuredEvidence` by its fields.
- Open: the hash function and the unit of `lengthScale` (finding 17).

#### `parameter-fit.ts`: `ParameterFit` (OBJ-44, Derivation, X9)

```ts
export interface FitModel { /* handed: the form fitted and which of its values are time-dependent; members open behind XV-06 */ }
export interface FittedValues { readonly values: ReadonlyMap<string, PresetValue>; readonly residuals: HeldOutResiduals }
export interface FitRefusal { readonly refuse: 'S-2'; readonly reason: ProvenanceReason; readonly detail: string }
export class ParameterFit {
  constructor(provenanceCheck: ProvenanceCheck);                                   // S2: ProvenanceCheck (INJECTED)
  fit(sources: readonly DataSource[], model: FitModel): FittedValues | FitRefusal; // S2: values with κ, or refused
}
```
- Returns values each with a `Provenance` of κ `measured` whose citation names the fit and the `DataSource` hashes
  (SX-20), plus the Θ and T residuals on the held-out third (XP-16). For every source a time-dependent value depends on it
  calls `provenanceCheck.measured(...)`; if a source has no verified in-clip time base, or no held-out residual exists, it
  returns a `FitRefusal` for that fit, never a lower κ (XR-29, step 6 S-2, EL-6).
- Invariants: computes from the sources it is handed; reads no film.
- Open: which clips form the held-out third, `FitModel`'s members, and the fit's numerics: the owner's films (XV-06). If
  `model` is the closed form, a lab-internal MOD-47 to MOD-48 crossing appears (finding 18).

#### `dataset.ts`: `Dataset` (OBJ-45, Collection)

```ts
export interface Population extends PopulationRef { /* the distribution the claim samples; members open behind the dataset */ }
export class Dataset {
  constructor(sources: readonly DataSource[], fits: readonly FittedValues[]);      // S2: DataSource set; ParameterFit results
  population(sources: readonly DataSource[]): Population;                           // a distribution named by hash
}
```
- Returns the measured population with its `hash` and a `Provenance` of κ `measured` citing the source hashes. Holds what it
  is given; decides nothing. An assumed population is built outside it and is run for development only.
- Open: **the owner's films** (the Dataset's status; XV-05, XV-06); the hash function that names a population (finding 17).

### MOD-48 Closed form and energy books, lab (Decides NO)

Imports: MOD-37 (`SpinnerPreset`). Tests and analysis only: no decision path imports it (GX-40).

#### `closed-form-oracle.ts`: `ClosedFormOracle` (OBJ-47, Oracle, LB GX-40)

```ts
export interface OracleResult { readonly theta: number; readonly T: number; readonly skillIndex: number;
                                readonly coverage: number; readonly aimAdvantage: number; readonly restSector: number }
export class ClosedFormOracle {
  constructor();
  phi(preset: SpinnerPreset, omega0: number, s0: number): OracleResult;     // S2: Φ(SpinnerPreset, ω₀) -> {Θ, T, δω, coverage, A}
}
```
- Computes from P_S and ω₀ alone. For a peg-free flick with no drag (b = 0), the case XV-01 and XV-08 pin:
  Θ = I·ω₀²/(2τ), T = I·ω₀/τ, rest angle = (s0 + Θ) mod 2π, `restSector` = ⌊rest angle / w⌋ with w = 2π over the sector
  count, `skillIndex` = w·τ/(I·ω₀) (`mwe_g1.py`: `theta_closed`, `time_closed`, `sector_of`, `gap_example`).
- Invariants: never a decider (GX-40); never imported by MOD-36 to MOD-45; placement in the lab is its enforcement
  (finding 12).
- Deviation from the S2 (finding 11): `s0` and `restSector` are added because XV-01 and XV-08 take s0 and pin sectors.
  Open: b > 0 and pegs behind AE-c26; the on-a-boundary sector behind AE-c29; `coverage` and `aimAdvantage` definitions are
  S1's and not in this slice, and no vector pins them.

#### `energy-books.ts`: `EnergyBooks` (OBJ-48, Derivation, GX-50)

```ts
export class EnergyBooks {
  constructor();
  balance(preset: SpinnerPreset, omegaEff: number, theta: number, omegaSquaredIntegral: number, deltaESum: number): number;
}
```
- Returns E = ½·I·ω_eff² − τ·Θ − b·∫ω²dt − ΣΔE (S2: `EnergyBooks`, GX-50) from what it is handed: Θ, ∫ω²dt and ΣΔE come from the
  engine's run motion summary (I2-03: ∫ω²dt is carried when b > 0, accumulated per step like Θ).
- Invariants: computes from its arguments; the tolerance is the test's, not the class's. Open: AE-c26 (the tolerance), and
  XV-02 (DEFERRED).

---

## 3. Seams

Binding rule: a seam into MOD-38, MOD-40 or MOD-41 is INJECTED. Rows FB.S10 to FB.S19 carry FA's side as assumptions
(finding 15); FB.S20 and FB.S21 are into sealed MOD-04 and MOD-01; FB.S22 to FB.S26 are the two barrels (FA's MOD-49).

| Local id | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule | Binding |
|---|---|---|---|---|---|---|
| FB.S1 | MOD-37 | MOD-38 | `ValidPreset` and the `DynoRecord` for it, handed to `PlayAdmission.admitForPlay` by the host's setup before wiring | `PlayAdmission` holds only the pass rule (or null); both values arrive per call; it never fetches a preset or a record itself | XR-06; XR-07; XR-08; XP-02; SX-22 | INJECTED |
| FB.S2 | MOD-38 | MOD-37 | `AdmittedPreset` built by `PlayAdmission` from (`ValidPreset`, `DynoRecord`) on a pass; nothing built on a refusal or UNDETERMINED | the constructor takes the package-internal issue token (C-6); held by composition | XR-06; XR-07; XR-08; XP-02; XH-09 | NAMED |
| FB.S3 | MOD-37 | MOD-46 | `ValidPreset` (SX-19, "the preset, for both claims") to `Dyno.dyno`, `Dyno.aim` and both claims | handed per call; the lab names `ValidPreset` only as an argument type; the lab runs the preset through the one roll function | XR-07; XP-02; XP-17; XV-05 | INJECTED |
| FB.S4 | MOD-46 | MOD-37 | `DynoRecord` built by `Dyno.dyno` from the two claim runs (π, preset hash, results, acceptance rates, seeds, population ref) | result types declared in MOD-37 (finding 2); `Dyno` is the only builder | XP-17; XV-05 | NAMED |
| FB.S5 | MOD-47 | MOD-46 | the measured `Population`, named by hash, with its Provenance, from `Dataset.population` to `Dyno.dyno` and `HandClaim.run` | for play the hand's population is X9's measured one (SX-19); an assumed population may be run for development and is refused at admission | XR-07; XP-02 | INJECTED |
| FB.S6 | MOD-47 | MOD-37 | `ParameterFit` calls `ProvenanceCheck.measured(value, provenance, source, residuals)` per source a fitted value depends on and reads the verdict | `ParameterFit` is handed the `ProvenanceCheck`; `source` is the structural `MeasuredEvidence` (finding 1) | XR-29; XP-16; SX-20 | INJECTED |
| FB.S7 | MOD-47 | MOD-37 | fitted values, each a `PresetValue` with a `Provenance` of κ measured, citing the fit and the `DataSource` hashes; an author hands them to a `Preset` | κ = measured only with a time base verified in clip and a time-dependent held-out residual | XP-16; XR-29; SX-20 | NAMED |
| FB.S8 | MOD-37 | MOD-48 | `SpinnerPreset` (P_S) to `ClosedFormOracle.phi` and `EnergyBooks.balance` | the oracle computes from P_S and ω₀ alone; it is handed the preset and never reads the engine's state | XV-01; XV-02; XV-08 | INJECTED |
| FB.S9 | MOD-48 | MOD-41 | (SX-21, test only) Θ_closed against Θ_engine for peg-free flicks | a test is handed both the oracle and the Simulator; MOD-41 never names MOD-48 (GX-40); tolerance at least of order ω_eff·dt/2, on Θ never on sectors (AE-c26) | XV-01; XV-02 | INJECTED |
| FB.S10 | MOD-36 | MOD-48 | the spinner run's motion summary (Θ, ∫ω²dt, ΣΔE) from the engine's run, handed to `EnergyBooks.balance` (assumed of FA's `RollRun`) | `EnergyBooks` is handed the numbers and never reaches the run; ∫ω²dt is present when b > 0 (I2-03) | XV-02; XV-01 | INJECTED |
| FB.S11 | MOD-46 | MOD-41 | `Simulator.roll(pin, preset, input, pose)` giving a `RollRun`, called by the claims (assumed FA signature) | the claims are handed the Simulator by the offline composition script; no second simulation path (EL-1); no clock, no `Math.random` | XP-17; XV-05; XV-01 | INJECTED |
| FB.S12 | MOD-46 | MOD-42 | `OutcomeReader.read(run, preset)` giving a `RollOutcome`, called by the claims (assumed FA signature) | the claims are handed the kind's reader; a REFUSE is a roll and not an accepted outcome (F-1) | XP-17 | INJECTED |
| FB.S13 | MOD-46 | MOD-39 | Jitter's rule and `UnitsToBinary64` giving the `EffectiveInput` (assumed FA: one builder shared with `RollApplier`) | units ÷ the exact 1000, then the factor 1 + ε·(2u − 1); `u` applied to the seat's input, never an outcome (EL-9) | XP-17; XV-05 | INJECTED |
| FB.S14 | MOD-36 | MOD-46 | `EnginePin` handed to `Dyno.dyno`, `Dyno.aim` and the claims; the rest `Pose` read from a `RollRun` for the `previous-rest` start (assumed FA) | handed per call; a start policy is the canonical pose or the previous attempt's rest Pose | XP-17; XV-05 | INJECTED |
| FB.S15 | MOD-36 | MOD-37 | `Pose` (the canonical pose a `Preset` holds, with a canonical JSON form) and `EnginePin` (π a `DynoRecord` names) | type use by MOD-37 classes; `Pose` must serialise canonically for the preset hash | XH-09; XP-17 | NAMED |
| FB.S16 | MOD-38 | MOD-41 | `AdmittedPreset` per component, issued by `PlayAdmission`, handed to the root (`wirePhysics`) by the host's setup; its hash enters the pin record | the root checks admitted and the hash in the pin record (XH-09) and never calls `PlayAdmission`; only presets admitted for play are wired (G-0b) | XH-09; XR-03 to XR-08; XR-31; SX-22 | INJECTED |
| FB.S17 | MOD-37 | MOD-41 | `ValidPreset` (from `AdmittedPreset.valid`) to `Simulator.roll`; the preset's floors and bounds (`noThrowFloor`, `xMin`) to `RollGuard` (assumed FA) | handed in; MOD-41 reads the preset and never validates it | XH-09; XR-03 to XR-08; SX-22 | INJECTED |
| FB.S18 | MOD-37 | MOD-42 | `Preset` data to the kinds' readers: face normals, labels, α, T_f; sector widths, boundary directions (assumed FA) | handed per call as `read(run, preset)`; the readers do not construct a preset | SX-22; XR-03 to XR-05 | INJECTED |
| FB.S19 | MOD-37 | MOD-44 | preset values the applier reads when it scales the seat's input (ε) (assumed FA, C0 §8) | handed in; `RollApplier` never validates a preset | SX-22; XR-03 to XR-05 | INJECTED |
| FB.S20 | MOD-46 | MOD-04 | sealed `new RNGStreams(seed).stream('rand:' + componentId).next()`, the source of u | one fresh `RNGStreams` per seed; the stream name is the one `RollApplier` uses in play, so XV-07 re-derives under it | XV-07; XP-17; XV-05 | NAMED |
| FB.S21 | MOD-37 | MOD-01 | sealed `hashState` over the preset's `JsonObject` content for `Preset.hash()`; the `JsonValue` type | the preset content is finite JSON values; the hash is the one the pin record covers | XH-09 | NAMED |
| FB.S22 | MOD-37 | MOD-49 | the runtime barrel re-exports the MOD-37 classes (`ValidPreset`, `AdmittedPreset` as types only, C-6) | the runtime barrel exports nothing from `@tabletop/physics-lab` | XR-26; XH-08 | NAMED |
| FB.S23 | MOD-38 | MOD-49 | the runtime barrel re-exports `PlayAdmission`, `DynoPassRule` | as FB.S22 | XR-26; XH-08 | NAMED |
| FB.S24 | MOD-46 | MOD-49 | the lab barrel re-exports the five MOD-46 classes | nothing in the runtime imports the lab (SC-x6) | XR-26; XH-08 | NAMED |
| FB.S25 | MOD-47 | MOD-49 | the lab barrel re-exports `DataSource`, `ParameterFit`, `Dataset` | as FB.S24 | XR-26; XH-08 | NAMED |
| FB.S26 | MOD-48 | MOD-49 | the lab barrel re-exports `ClosedFormOracle`, `EnergyBooks` | as FB.S24; GX-40 | XR-26; XH-08 | NAMED |

---

## 4. Refusal rows (CT-4, amendment S-1)

One row per guard element (module, outcome) per S1 XR case in the slice. Reason tokens are this spec's (finding 16).

| Local id | MOD | Invariant | Forbidden input | Expected rejection | Test name | Outcome | S1 case |
|---|---|---|---|---|---|---|---|
| FB.R1 | MOD-37 | G-0 (G-0a), GX-51 | a `SpinnerPreset`, every value carrying κ, with `tau` ≤ 0 | `PresetValidation.validate` returns `{ refuse: 'PRESET_INADMISSIBLE', reason: 'NO_FRICTION', detail: 'a spinner must stop' }`; no `ValidPreset` | `XR-03 spinner tau <= 0 is refused as PRESET_INADMISSIBLE.NO_FRICTION` | PRESET_INADMISSIBLE.NO_FRICTION | XR-03 |
| FB.R2 | MOD-37 | G-0 (G-0a), GX-51 | a `DiePreset`, every value carrying κ, with a contact pair whose μ ≤ 0 | `validate` returns `PRESET_INADMISSIBLE` with reason `NO_CONTACT_FRICTION`; no `ValidPreset` | `XR-04 die mu <= 0 is refused as PRESET_INADMISSIBLE.NO_CONTACT_FRICTION` | PRESET_INADMISSIBLE.NO_CONTACT_FRICTION | XR-04 |
| FB.R3 | MOD-37 | G-0 (G-0a), GX-51 | a `DiePreset`, every value carrying κ, with a contact pair whose e ≥ 1 | `validate` returns `PRESET_INADMISSIBLE` with reason `NO_DISSIPATION`; no `ValidPreset` | `XR-04 die e >= 1 is refused as PRESET_INADMISSIBLE.NO_DISSIPATION` | PRESET_INADMISSIBLE.NO_DISSIPATION | XR-04 |
| FB.R4 | MOD-37 | G-0 (G-0a), GX-49 | a complete preset in which one value has no Provenance (`provenance` null) | `validate` returns `PRESET_INADMISSIBLE` with reason `NO_PROVENANCE`; no `ValidPreset` | `XR-05 a preset value without kappa is refused as PRESET_INADMISSIBLE.NO_PROVENANCE` | PRESET_INADMISSIBLE.NO_PROVENANCE | XR-05 |
| FB.R5 | MOD-38 | G-0 (G-0b) | `admitForPlay(valid, null)`: a `ValidPreset` with no dyno record | returns `{ refuse: 'NOT_ADMITTED', reason: 'NO_DYNO_RECORD' }`; no `AdmittedPreset` | `XR-06 a preset with no dyno record is not admitted as NOT_ADMITTED.NO_DYNO_RECORD` | NOT_ADMITTED.NO_DYNO_RECORD | XR-06 |
| FB.R6 | MOD-38 | G-0 (G-0b), step 6 S-3 | a `DynoRecord` whose population Provenance is κ assumed | returns `NOT_ADMITTED` with reason `ASSUMED_POPULATION` (development only); no `AdmittedPreset` | `XR-07 a dyno on an assumed population is not admitted as NOT_ADMITTED.ASSUMED_POPULATION` | NOT_ADMITTED.ASSUMED_POPULATION | XR-07 |
| FB.R7 | MOD-38 | G-0 (G-0b), step 6 S-1 | a spinner `DynoRecord` that a fixture `DynoPassRule` judges `fail`, once for a floor x_min at which some u falls under one turn and once for admissible inputs giving A above A_max on accepted outcomes | returns `NOT_ADMITTED` with reason `PASS_RULE_FAILED`; no `AdmittedPreset` | `XR-08 a spinner failing the pass rule on its floor or on A above A_max is not admitted as NOT_ADMITTED.PASS_RULE_FAILED` | NOT_ADMITTED.PASS_RULE_FAILED | XR-08 |
| FB.R8 | MOD-47 | step 6 S-2 | `fit` over a `DataSource` with `timeBaseVerifiedInClip` false, for a time-dependent value | returns a `FitRefusal`; no value is returned with κ measured | `XR-29 a time-dependent fit on a source with no in-clip time reference is refused and not measured` | S-2 | XR-29 |

---

## 5. Uncovered guards

Guard elements these modules carry that no S1 XR case covers. Outcome tokens are proposals; no test is minted.

| Module | Outcome | Where S1/S2 names it |
|---|---|---|
| MOD-37 | PRESET_INADMISSIBLE.INCOMPLETE | S2 OBJ-10 Decides basis ("complete"); G-0a |
| MOD-37 | PRESET_INADMISSIBLE.MEASURED_WITHOUT_FIT | S2 OBJ-10 and OBJ-46 `present` ("a measured κ citing its fit"); S1 X2 step 7 §2, RX-7; XR-05 covers only the missing κ |
| MOD-37 | ProvenanceCheck NO_TIME_BASE (`measured`) | S2 OBJ-46 `measured`; SX-20; RX-7; XR-29 is carried by MOD-47 (`ParameterFit`) and exercises this only through it |
| MOD-37 | ProvenanceCheck NO_HELD_OUT_RESIDUAL (`measured`) | S2 OBJ-46 `measured` ("a time-dependent held-out residual"); SX-20; RX-7; no XR case |
| MOD-38 | UNDETERMINED (no pass rule handed) | S2 OBJ-12 ("UNDETERMINED until the rule exists"); ODG-g5 |
| MOD-46 | RX-8 UNNAMED_POPULATION (`FairnessStatistics.chiSquare`) | S2 OBJ-42 ("refuses an unnamed population"); S1 RX-8 |
| MOD-46 | RX-8 CHAINED_STARTS (`FairnessStatistics.chiSquare`) | S2 OBJ-42 ("a χ² over chained starts"); S1 RX-8, F-2, GBC-87 |

---

## 6. Vectors (CT-5)

Source for every COMPUTED value: `docs/ext-G1/phase1/mwe/mwe_g1.py` (not run here). S-min's values are the script's
`PRESET`: I = 0.002 kg m², τ = 0.004 N m, b = 0, 8 equal sectors, ε = 0.05, all κ assumed (the gap's worked example).

| Local id | MOD | Pinned value | Rule | Input | Output | Encoding | State | Discharge condition | S1 vector |
|---|---|---|---|---|---|---|---|---|---|
| FB.V1 | MOD-48 | Θ = 16.0, 36.0, 64.0 rad; T = 4.0, 6.0, 8.0 s, for flicks 8, 12, 16 rad/s (oracle side only) | peg-free spinner, no drag (b = 0), constant torque to rest: Θ = I·ω₀²/(2τ); T = I·ω₀/τ (GX-50, LA-4) | S-min; flicks 8, 12, 16 rad/s; s0 = 0; u = 0.5 (symmetric jitter, g(u) = 0, no jitter) | `ClosedFormOracle.phi` giving `theta` and `T` per flick | decimal rad and s as printed by `oracle_xv01` in `mwe_g1.py`; not asserted bit-exact; the comparison tolerance is AE-c26's | oracle side COMPUTED (`mwe_g1.py`, `oracle_xv01`, `theta_closed`, `time_closed`); the engine side is DEFERRED and is FA's (MOD-41), not specified here | oracle side: re-derive from the MOD-48 implementation at first implementation; engine side (FA): compute from X4 at first implementation, within the tolerance AE-c26 sets, on Θ never on sectors | XV-01 |
| FB.V2 | MOD-48 | none (DEFERRED) | the energy books close on the engine's spinner run: E = ½·I·ω_eff² − τ·Θ − b·∫ω²dt − ΣΔE (GX-50) | as XV-01: S-min; flicks 8, 12, 16 rad/s; s0 = 0; u = 0.5; through the engine's run | DEFERRED | DEFERRED | DEFERRED | compute from X4 at first implementation; re-derive (S1) | XV-02 |
| FB.V3 | MOD-46 | none (DEFERRED) | both claims run N rolls through the one roll function and the kind's reader; accepted outcomes only; acceptance rate reported; the hand's χ² on the outcome relative to the start; the jitter claim's A (GX-48) | each admitted preset; the measured population; both claims; the recorded seeds | DEFERRED | DEFERRED | DEFERRED | compute after the dataset (X9) exists; re-derive with the recorded seeds (S1) | XV-05 |
| FB.V4 | MOD-47 | none (DEFERRED) | κ = measured only with a time base verified in clip and a held-out Θ and T residual (GX-49) | the owner's films; the held-out third | DEFERRED | DEFERRED | DEFERRED (open behind the owner's films) | compute from X9: the Θ and T residuals on the held-out third (S1) | XV-06 |
| FB.V5 | MOD-48 | ω₀ = 12 rad/s: Θ = 36.0 rad, rest in sector 5; ω₀ = 12.3 rad/s: Θ = 37.8225 rad, rest in sector 0; skill index 0.1309 rad/s (at ω₀ = 12) | Φ for b = 0: Θ = I·ω₀²/(2τ); rest angle = (s0 + Θ) mod 2π; sector = ⌊rest angle / w⌋, w = 2π over the sector count, half-open; skill index = w·τ/(I·ω₀), the first-order ω₀ change that moves the rest angle by one sector width | ω₀ = 12 and 12.3 rad/s; S-min; s0 = 0 | `ClosedFormOracle.phi` giving `theta`, `restSector`, `skillIndex` | decimal as printed (S1 prints Θ 37.8225 and the skill index to four decimals); sector indices zero-based | COMPUTED by the oracle script (`mwe_g1.py`, `gap_example`, `sector_of`, `theta_closed`) | re-derive from MOD-48's own implementation (S1); boundary behaviour stays AE-c29's | XV-08 |

---

## 7. Hooks (CT-6)

none carried. Load-bearing invariants in this slice without a hook of their own are flagged in part 10 (finding 12), not
invented here.

---

## 8. Production concerns

Class tokens are this facet's choice; S5's script maps them.

| Local id | MOD | Concern | Class | Owner | Discharge target | S1 |
|---|---|---|---|---|---|---|
| FB.P1 | MOD-46 | Dyno compute (10,000 runs × two claims per preset) off the play path | PERFORMANCE | developer | Phase 4 tooling | XPC-05 |
| FB.P2 | MOD-47 | Dataset storage: films are large and must not sit in the synced repo; cite by hash | DATA_STORAGE | developer | before the films are fitted | XPC-06 |

---

## 9. Positive tests

| S1 case | MOD | Test name |
|---|---|---|
| XP-02 | MOD-38 | `XP-02 a preset with kappa on every value and a passing dyno on the measured population is admitted for play` |
| XP-16 | MOD-47 | `XP-16 a fit with a verified time base returns kappa measured with held-out Theta and T residuals` |
| XP-17 | MOD-46 | `XP-17 a dyno reports both claims on accepted outcomes with the acceptance rate and the hand chi-square relative to the start` |

---

## 10. Open gates and findings for S5

### Open gates (each stays open behind a fixed interface)

- **ODG-g5** (ε, x_min, A_max, the pass rule, AE-c21). MOD-38: `DynoPassRule.judge` is the fixed interface;
  `PlayAdmission(rule: DynoPassRule | null)` answers `Undetermined` while the rule is null, and XP-02, XR-08 run against a
  fixture rule. MOD-37: the preset's `epsilon`, `xMin`, floors are named members whose numbers arrive with the rule. MOD-46:
  A and the acceptance rate are reported; no threshold is applied there.
- **ODG-g6** (trust model against scripted aimers). MOD-46: the `JitterClaim`'s admissible-input set is handed in; the
  trust model decides what is admissible beyond the hand, with no interface change.
- **ODG-g7** (the pinned build, where the pin record lives). MOD-46 and MOD-37 name π only as an `EnginePin` value
  (`DynoRecord.pin`); `AdmittedPreset.hash()` is what the pin record covers, wherever the record is held (FA's
  `PinRecordSource`).
- **AE-c19** (settle numbers, floors, α, T_f). MOD-37: `DiePreset`/`SpinnerPreset` fix the member names; the numbers are data.
- **AE-c26** (τ and b in the engine; XV-01's tolerance). MOD-48: the oracle's b = 0 case is pinned; b > 0 and pegs are open;
  the tolerance belongs to the test (FB.S9), never to the oracle.
- **AE-c29** (the on-the-line rule). MOD-48: the oracle's sector at an exact boundary is open; `restSector` is half-open in
  `mwe_g1.py` only; OBJ-28 (FA) owns the rule.
- **The owner's films / AE-c27.** MOD-47: `Dataset`, `ParameterFit`'s numerics, `FitModel`, `HeldOutResiduals`, XV-05, XV-06 stay
  DEFERRED; `DataSource`, `ProvenanceCheck.measured` and the `fit`/`population` signatures are fixed.
- **ODG-g8** (the sealed checker's rows). Not blocking R5's modules, but it is the only mechanical enforcement of C-5 and
  GX-40 (finding 12).

### Findings

1. **Placement conflict, S2 OBJ-46.** `measured(value, Provenance, DataSource, residuals)` names OBJ-43 (lab) from MOD-37
   (runtime); the runtime may not import the lab (C0 §5). Resolved here by structural `MeasuredEvidence` and
   `HeldOutResiduals` declared in `provenance-check.ts`; `DataSource` satisfies the first by its fields. S5 to confirm.
2. **Same conflict, S2 OBJ-41.** `DynoRecord` holds "both claims' results"; `HandClaimResult`, `JitterClaimResult` and
   `PopulationRef` are declared in MOD-37's `dyno-record.ts` so the runtime never imports the lab.
3. **Witness constructors cross modules.** `AdmittedPreset` (MOD-37) is built by `PlayAdmission` (MOD-38). The issue token
   must be reachable inside the package and not re-exported; FA's MOD-49 barrel must export `ValidPreset` and
   `AdmittedPreset` as types only. Cross-facet.
4. **The preset hash is pinned here and no S1 vector covers it.** No S2 node computes it; `hash()` is placed on `Preset`
   (S2 gives OBJ-07 no operations) with the rule in part 2. It uses the sealed FNV-1a 64, which is not collision resistant
   against an adversarial preset (ODG-g6 decides whether that matters). It needs `Pose` to have a canonical JSON form (FA)
   and finite numbers (`canonicalJson` throws on non-finite). Needs a vector or a DEFERRED id at S5.
5. **XR-07 needs the population's κ in the record.** The S2's DynoRecord has "population hash" only; this spec carries
   `population: { hash, provenance }` so `PlayAdmission` can see assumed against measured. The S2 also does not say
   `PlayAdmission` compares `record.presetHash` with `valid.hash()`; XH-09 checks only that the hash is in the pin record,
   so a record for another preset could be paired. Not added here (no new behaviour); S5 or the owner to rule.
6. **XR-08's two arms share one outcome.** `judge` returns pass or fail only (S2), so "some u falls under one turn" and
   "A above A_max" are both `PASS_RULE_FAILED`. The S2's DynoRecord field list has no named field for the per-u turn count
   the first arm needs; it is assumed inside `JitterClaimResult.outcomeProbabilities`. ODG-g5 to settle.
7. **Order of UNDETERMINED.** The S2 says "UNDETERMINED until the rule exists". This spec runs the rule-free refusals
   (no record, assumed population) first so they are not masked; reading the S2 literally, every call would be UNDETERMINED.
8. **Dyno signatures are short of what the claims need.** (a) The stream is `rand:<component id>` but the S2's
   `dyno`/`aim`/claim signatures carry no id; `componentId` is added. (b) `JitterClaim` takes admissible inputs but
   `dyno(...)` and `aim(...)` carry none; their derivation (from the preset's floors and bounds, or handed) is in no S2
   node. (c) How N is shared among seeds, how a seat input is drawn from the population, and the hand's `target` are
   unstated. (d) `aim → A_max`: the owner's A_max is a cap (ODG-g5); here the return is the largest aim advantage found.
9. **One acceptance rate for two claims.** The S2's DynoRecord has one; this spec keeps one per claim (`{ hand, jitter }`).
10. **FairnessStatistics (RX-8).** The S2 signature `(counts, target, start policy)` has no slot for a population name
    (put on `target`) and cannot tell counts relative to the start from raw chained counts. Both refusals are part 5 flags.
11. **ClosedFormOracle lacks s0.** Φ(P_S, ω₀) has no s0 though XV-01 and XV-08 take s0 = 0 and XV-08 pins sectors; `s0` and
    `restSector` are added. `coverage` and `aimAdvantage` are returned but their definitions are not in this slice and no
    vector pins them; b > 0 and pegs are unspecified.
12. **Load-bearing invariants with no hook in this slice.** GX-40 (OBJ-47 never a decider) rests on placement: the runtime
    cannot import the lab, which is XH-08's rows (ODG-g8, BLOCKED); XH-01 (FA's) scans only X1, X3, X4, X5 sources. F-1
    (OBJ-37) has XP-17 only. GX-51 has XR-03 and XR-04, no hook. No hook invented.
13. **Provenance carrier.** OBJ-06's declared inputs are "class, source citation": no structure says a measured κ "cites its
    fit"; `MEASURED_WITHOUT_FIT` is carried as a reason with the test open (part 5).
14. **SpinnerPreset stores τ, b, ΔE.** The S2 lists a, c, d; G-0a and EnergyBooks need τ, b, ΔE, so a, c, d are derived.
15. **Cross-facet assumptions on FA** (rows FB.S10 to FB.S19, and the barrels FB.S22 to FB.S26): `Simulator.roll`, `OutcomeReader.read`, a
    `RollOutcome` that separates VALUE from REFUSE, `RollRun.rest` and the motion summary, one `EffectiveInput` builder shared
    by `RollApplier` and the claims (EL-1; G8 "one shared function"), `EnginePin` as π, `Pose` canonical JSON, the preset
    values the root, `RollGuard`, readers and applier read, and the MOD-49 barrel contents. S5 to reconcile with FA.
16. **Minted names.** The S2 names the code `PRESET_INADMISSIBLE` and "reason"; S1 names "not admitted". The reason tokens
    (`NO_FRICTION`, `NO_CONTACT_FRICTION`, `NO_DISSIPATION`, `NO_PROVENANCE`, `INCOMPLETE`, `MEASURED_WITHOUT_FIT`,
    `NO_DYNO_RECORD`, `ASSUMED_POPULATION`, `PASS_RULE_FAILED`) and the `RX-8` and `S-2` codes are this spec's; the
    production-concern classes are too. Operation names the S2 leaves unnamed (`run`, `balance`, `phi`, `hash`) are fixed here.
17. **Population and source hashes.** "Named by hash" (OBJ-43, OBJ-45) fixes no hash function or canonical form (the preset
    hash's `hashState` does not fit film bytes), and `lengthScale`'s unit is unstated.
18. **ParameterFit's `model` is untyped in the S2.** Which values are time-dependent is the model's declaration; if `model` is
    the closed form, MOD-47 imports MOD-48 (lab-internal, allowed). The held-out third's selection is open (XV-06).
19. **Cases not mine.** XV-01's engine side and XV-07 are FA's and sealed MOD-04's; no row of this facet restates them. XR-31
    (SX-22's validation) is FA's.
