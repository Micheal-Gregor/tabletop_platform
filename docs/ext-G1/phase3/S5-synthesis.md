# Extension G-1 · Phase 3 · S5 — Synthesis (closing gate)

Run R4. S5 consolidates the two approved facet slices once, after both finished: `facets/FA.md` (Play runtime, nine
modules) and `facets/FB.md` (Presets, evidence and lab, five modules). Lead, top tier. The tables below are read by
`emit_phase3.py`, which mints the contract's ids; nothing here edits a facet file.

## 1. The contradiction path, on three genuine multi-output tensions

| # | Tension (seam) | FA's output | FB's output | Resolution, with its trace (no claim dropped) |
|---|---|---|---|---|
| C-1 | The preset witnesses (SX-22; FA.S33, FB.S17, FB.S18) | FA-A1/A2: `ValidPreset` exposes `kind`, `settleRule`, `canonicalPose`, ε, floors and bounds directly; `AdmittedPreset.hash` a property; the readers take a `ValidPreset` | `ValidPreset {preset; hash()}` and `AdmittedPreset {valid; record; hash()}` wrap the preset; the readers take a `Preset` | **FB's shape governs** (S2 OBJ-11: "a preset that passed G-0a", its declared input the Preset; OBJ-14 holds a ValidPreset and its DynoRecord by composition; OBJ-26 `read(RollRun, Preset)`). FA's reads go through the witness: `admitted.valid.preset.<member>`, `admitted.hash()`. The readers take `Preset` (S2), the Simulator `ValidPreset` (S2). FA's need for a SettleRule is met by `Preset.settleRule()`, built from the preset's settle numbers ("the preset supplies the SettleRule", S2 OBJ-24) |
| C-2 | The spinner's motion summary (SX-08; FB.S10 to S19) | `{theta, omegaSquaredIntegral}` | also `deltaESum`, for EnergyBooks | **FA's summary governs** (S2 §6 I2-03 adds ∫ω²dt alone). ΣΔE stays an operation input of EnergyBooks, as S2 OBJ-48 lists it, supplied by its caller; peg losses stay open behind AE-c26 (XV-02 runs on S-min, which has no pegs, so ΣΔE = 0 there) |
| C-3 | The barrels and B-1 (FA.S42 to S54, FB.S22 to S26) | 13 re-export rows, three into deciding modules marked INJECTED | 5 re-export rows, the other way round | **A re-export publishes a module's surface and reaches nothing**: the barrel neither calls nor constructs. The sealed S3 v1.3 carries no seam rows for its own barrels (MOD-29's engine barrel re-exports every module; §4 has no row for it). So the 18 re-export rows are cut, with this reason, and MOD-49's one seam is the boundary its package depends on: MOD-49 → MOD-29 (sealed TierCriterion), SX-17, BLOCKED on ODG-g8. MOD-29 is carried in §2, ACTIVE, Decides NO (a check over the source tree it walks, consulting nothing else) |

## 2. Rulings on the facets' findings

| Finding | Ruling |
|---|---|
| FA F1 (sealed `HookViolation` types its hook as `'HK-1' \| 'HK-2'`) | **For the owner at the gate.** Recommended: XH-03, XH-04 and XH-05 throw the sealed `HookViolation('HK-1', 'XH-nn: …')`, read as breaches of the mutation gate (an apply that would mutate state through a draw outside its one lawful draw, an unpinned solver, or a leaked world); the refusal rows assert the class and the `XH-nn` at the head of `detail`. The alternative, a physics violation class, is a new node and needs an S2 supersession |
| FA F2 (nothing hands the Simulator to Trajectory or the lab) | Trajectory and the dyno are handed a Simulator by their caller, a composition root outside the library's modules: Phase 5's view composition, and the lab's offline entry script outside `src/` (XPC-05). Each builds it from `PhysicsHost.loadPinned`'s ReadySolver, a SnapshotHasher and PinMatch: the same class, the one roll function (EL-1). Inside the library every reach to MOD-41 stays INJECTED |
| FA F3 (the root retains its record and its wire) | FA's reading stands: `PhysicsHost` keeps the record of its latest resolved `loadPinned` (XH-09 reads its preset hashes) and the composition of its latest `wirePhysics` ("that wire", S2 OBJ-03); one PhysicsHost serves one game. `replay` before any `wirePhysics` is refused UNCOMPUTABLE (EL-11) |
| FA F4 (XH-07 over σ and the state hash) | Adopted: `ReplayCheck.compareState(stateHash, H_ref)` beside `compare(σ, H_ref)` (S2 OBJ-03: "each rebuilt σ and the state hash … through ReplayCheck"); `ReplayReference.reference(game, key)` with key an attempt or `'FINAL'`. The sealed `rebuild` keeps only each component's last σ (SC-x4); earlier attempts are covered through the final state hash and, between live peers, `MoveListener` (ODG-g11 open) |
| FA F5, F7, F8, F11, F15, F18, F19 | Adopted as FA wrote them (`SettleRecords.last`; the one-draw gate; the names; "complete" omits a non-finite member; `hooks/physics_exact_math.py`; interiors open; a hook throw inside `rebuild` surfaces as `DivergenceError`) |
| FA F6 (UNCOMPUTABLE; who digests the build) | Adopted: `loadPinned` resolves a structural `Uncomputable`; the handed BuildSource supplies `{bytes, sha256}`. XH-02 guards a mismatched build, not a lying host: the host runs the game |
| FA F9 | C-3 above |
| FA F10, FB part 5 | §4 below |
| FA F12 (a Dial is a Randomizer) | The rule is S2 OBJ-34's (the kind ∈ {Die, Spinner}); the token keeps S1 XR-11's word. A Dial has no physics preset and is refused by the same rule |
| FA F13, FB 15 | C-1 and C-2 above; every other assumption matches the other facet's interface (`Simulator.roll`, `RollOutcome` VALUE or REFUSE, `RollRun.rest`, `RollInput.scale(Jitter)` as the one builder, `EnginePin` as π) |
| FA F14, FB 4 (pinned values with no S1 vector) | Three vectors added, DEFERRED (§5): the preset hash, the snapshot hash over known bytes, a die throw's x_eff. The names (`settle`, the intent types, `rand:<component id>`) are literals the tests assert, not computed values; XV-07 pins the stream pattern |
| FA F16 (the args layout read twice) | `Throw.fromArgs` and `Flick.fromArgs` in MOD-39 hold the layout once; RollGuard's `args` and RollApplier both call them (the G8 fix: one shared function) |
| FA F17 (`hashState` takes a state) | SnapshotHasher is FNV-1a 64 over the snapshot's bytes in order, offset basis `0xcbf29ce484222325`, prime `0x100000001b3`, modulo 2⁶⁴, as 16 lowercase hexadecimal digits: the sealed `hashState`'s algorithm and output form, applied to bytes (F-11: pinned, synchronous, pure JS) |
| FB 1, 2, 3 | Adopted: structural `MeasuredEvidence` and `HeldOutResiduals` in MOD-37; the claims' result types and `PopulationRef` in `dyno-record.ts`; the issue token package-internal, and MOD-49 exports `ValidPreset` and `AdmittedPreset` as types only |
| FB 5 (a record for another preset) | `PlayAdmission` refuses a DynoRecord whose preset hash is not the ValidPreset's (S2 OBJ-14: "a ValidPreset and **its** passing dyno record"; OBJ-41 names the preset hash). A guard element S2 names; §4 writes its row. `population: {hash, provenance}` adopted for XR-07 |
| FB 6, 7, 9, 11, 14, 16, 18 | Adopted (XR-08's arms share PASS_RULE_FAILED until ODG-g5; rule-free refusals before UNDETERMINED; an acceptance rate per claim; `s0` and `restSector` in Φ; τ, b, ΔE stored with a, c, d derived; FB's names; MOD-47 may import MOD-48) |
| FB 8 | Adopted: `componentId` on the dyno's operations (the stream is `rand:<component id>`); the JitterClaim's admissible inputs are an argument; N per seed, the population sampling and the hand's target are interiors open behind ODG-g5 and the films; `aim` returns the largest aim advantage found, `A`, and the owner's A_max stays the cap |
| FB 10 | §4: the two RX-8 refusals get rows |
| FB 12 (GX-40 has no hook) | GX-40 is load-bearing (S2 OBJ-47). It joins XH-08's CI import boundary, the same trigger point: no file under `packages/physics` imports `@tabletop/physics-lab` (§5 override). BLOCKED with XH-08 on ODG-g8 |
| FB 13 | §4: MEASURED_WITHOUT_FIT gets its row; a measured κ's source citation names the fit that produced it |
| FB 17 | Film sources are named by the SHA-256 of their bytes (as step 1 hashed the owner's clips); populations and presets by the sealed `hashState` of their canonical JSON. `lengthScale`'s unit stays with the films (AE-c27) |
| The die's cos α (FA-A3) | DiePreset carries cos α as a pinned binary64 literal with its κ, never α through `Math.cos` (EL-2); spinner boundary directions likewise |
| Pose's JSON | `{q: {x, y, z, w}, t: {x, y, z}}`, the engine's own quaternion and translation fields, keys ordered by the sealed `canonicalJson`; the preset hash and σ use it |
| A handed collaborator's type | A receiver types a handed collaborator by the operations it calls (a structural parameter type in its own file), so being handed the Simulator never makes MOD-44, MOD-45 or MOD-46 import MOD-41. This removes the only module cycle (MOD-41 builds MOD-44; MOD-44 is handed MOD-41's Simulator) and fixes §10's order |

## 3. Sealed modules carried

MOD-01, MOD-02, MOD-04, MOD-10 (C0 §4), and MOD-29 (C-3), all ACTIVE, Decides NO, files as the sealed S3 v1.3 §2.

## 4. Uncovered guards, consolidated once (TS-2, TS-3, TS-4)

| Flag | Disposition |
|---|---|
| (MOD-41, RULE_REFUSED.UNPINNED), FA | **Row S5.R1.** GX-47 names "unpinned" an intent refusal and S2 OBJ-34 expresses it; CT-4 counts it although S1 gives no case (TS-1). This answers S2 §6's question |
| (MOD-41, DIVERGENCE), FA | **Row S5.R2**, the wiring row: ReplayCheck (MOD-43) owns the guard in full (FA.R16, XR-21); the root throws the sealed `DivergenceError` on its verdict (TS-2) |
| (MOD-42, REFUSE.ON_LINE), FA | **No row.** The guard exists only if the owner adopts the on-the-line rule (AE-c29, open); XR-18 is reserved for it and its row is written then |
| (MOD-37, PRESET_INADMISSIBLE.INCOMPLETE), FB | **Row S5.R3** (S2 OBJ-10: "complete") |
| (MOD-37, PRESET_INADMISSIBLE.MEASURED_WITHOUT_FIT), FB | **Row S5.R4** (S2 OBJ-10, OBJ-46; RX-7) |
| (MOD-37, ProvenanceCheck `measured`: no time base; no held-out residual), FB | **Rows S5.R5, S5.R6** at the owner, ProvenanceCheck (TS-2); ParameterFit's FB.R8 (XR-29) is the caller's wiring row |
| (MOD-38, UNDETERMINED), FB | **Row S5.R7** (S2 OBJ-12) |
| (MOD-38, NOT_ADMITTED.OTHER_PRESET), §2 FB 5 | **Row S5.R8** |
| (MOD-46, RX-8.UNNAMED_POPULATION), (MOD-46, RX-8.CHAINED_STARTS), FB | **Rows S5.R9, S5.R10** (S2 OBJ-42; RX-8, F-2) |

| Local id | MOD | Invariant | Forbidden input | Expected rejection | Test name | Outcome | S1 case |
|---|---|---|---|---|---|---|---|
| S5.R1 | MOD-41 | G-1, GX-47 (S2 OBJ-34, OBJ-49) | a legal throw for a game whose PinRecordSource finds no pin record | RULE_REFUSED "unpinned"; no draw; state byte-unchanged; not logged | `G-1 · a roll in a game with no pin record is RULE_REFUSED.UNPINNED, drawless and unlogged` | RULE_REFUSED.UNPINNED | none (GX-47) |
| S5.R2 | MOD-41 | G-7, XH-07 (wiring) | `replay` of a row whose reference ReplayCheck finds unequal | the sealed `DivergenceError`; nothing returned as a replayed game | `G-7 · PhysicsHost.replay throws DivergenceError when ReplayCheck reports DIVERGENCE` | DIVERGENCE | none (wiring of XR-21) |
| S5.R3 | MOD-37 | G-0a (S2 OBJ-10) | a preset missing a required value | `PRESET_INADMISSIBLE` with reason `INCOMPLETE`; no ValidPreset | `G-0a · a preset missing a required value is PRESET_INADMISSIBLE.INCOMPLETE` | PRESET_INADMISSIBLE.INCOMPLETE | none (S2 OBJ-10) |
| S5.R4 | MOD-37 | G-0a, RX-7 (S2 OBJ-10, OBJ-46) | a value with κ measured whose source citation names no fit | `PRESET_INADMISSIBLE` with reason `MEASURED_WITHOUT_FIT`; no ValidPreset | `G-0a · a measured value citing no fit is PRESET_INADMISSIBLE.MEASURED_WITHOUT_FIT` | PRESET_INADMISSIBLE.MEASURED_WITHOUT_FIT | none (RX-7) |
| S5.R5 | MOD-37 | RX-7, step 6 S-2 (S2 OBJ-46 `measured`) | `measured` on evidence whose time base is not verified in clip | `PRESET_INADMISSIBLE` with reason `NO_TIME_BASE`; not measured | `RX-7 · measured on a source with no in-clip time base is PRESET_INADMISSIBLE.NO_TIME_BASE` | PRESET_INADMISSIBLE.NO_TIME_BASE | none (RX-7) |
| S5.R6 | MOD-37 | RX-7, step 6 S-2 (S2 OBJ-46 `measured`) | `measured` with a verified time base but no held-out residual | `PRESET_INADMISSIBLE` with reason `NO_HELD_OUT_RESIDUAL`; not measured | `RX-7 · measured with no held-out residual is PRESET_INADMISSIBLE.NO_HELD_OUT_RESIDUAL` | PRESET_INADMISSIBLE.NO_HELD_OUT_RESIDUAL | none (RX-7) |
| S5.R7 | MOD-38 | G-0b, ODG-g5 (S2 OBJ-12) | `admitForPlay` with no pass rule handed, on a ValidPreset and its record on the measured population | `UNDETERMINED`; no AdmittedPreset | `G-0b · with no pass rule handed, admission is UNDETERMINED` | UNDETERMINED | none (S2 OBJ-12) |
| S5.R8 | MOD-38 | G-0b (S2 OBJ-14, OBJ-41) | a DynoRecord whose preset hash is not the ValidPreset's | `NOT_ADMITTED` with reason `OTHER_PRESET`; no AdmittedPreset | `G-0b · a dyno record for another preset is NOT_ADMITTED.OTHER_PRESET` | NOT_ADMITTED.OTHER_PRESET | none (S2 OBJ-14) |
| S5.R9 | MOD-46 | RX-8, GX-48 (S2 OBJ-42) | χ² requested over an unnamed population | the record marked invalid with `RX-8` reason `UNNAMED_POPULATION` | `RX-8 · chi-square over an unnamed population is RX-8.UNNAMED_POPULATION` | RX-8.UNNAMED_POPULATION | none (RX-8) |
| S5.R10 | MOD-46 | RX-8, F-2, GBC-87 (S2 OBJ-42) | χ² requested over raw chained starts, not the outcome relative to the start | the record marked invalid with `RX-8` reason `CHAINED_STARTS` | `RX-8 · chi-square over raw chained starts is RX-8.CHAINED_STARTS` | RX-8.CHAINED_STARTS | none (RX-8, F-2) |

## 5. Rows added, cut and changed

**Seam added (C-3).**

| Local id | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule | Binding |
|---|---|---|---|---|---|---|
| S5.S1 | MOD-49 | MOD-29 | SX-17: the physics packages' import boundary: no platform file imports `@tabletop/physics` or Rapier; `packages/physics` imports neither `@tabletop/physics-lab` nor `packages/physics-lab` (CF-6, GX-40, SC-x6) | the sealed checker gains RULES rows for both packages and decides by path containment; BLOCKED on ODG-g8, the owner's `seal.py reopen`, before R5's merge | XR-26, XH-08 | NAMED |

**Vectors added (FA F14, FB 4, FA F17), DEFERRED.**

| Local id | MOD | Pinned value | Rule | Input | Output | Encoding | State | Discharge condition | S1 vector |
|---|---|---|---|---|---|---|---|---|---|
| S5.V1 | MOD-37 | the preset hash | `Preset.hash()` = the sealed `hashState` (FNV-1a 64 over canonical JSON, 16 lowercase hex digits) of `{kind, canonicalPose, values: {<name>: {value, kappa, source}}}`, Pose as `{q: {x, y, z, w}, t: {x, y, z}}` | S-min as `mwe_g1.py`'s `PRESET` (I 0.002, τ 0.004, b 0, 8 equal sectors, ε 0.05, all κ assumed), canonical pose the identity at the origin | DEFERRED | utf8 string, 16 hex digits | DEFERRED | compute from MOD-37 at first implementation; re-derive before MOD-37 counts complete | none (S5, FB 4) |
| S5.V2 | MOD-36 | the snapshot hash of known bytes | SnapshotHasher: FNV-1a 64 over the bytes in order, offset basis 0xcbf29ce484222325, prime 0x100000001b3, modulo 2⁶⁴, 16 lowercase hex digits (F-11) | the bytes 0x00 to 0xFF once each, in order | DEFERRED | utf8 string, 16 hex digits | DEFERRED | compute from MOD-36 at first implementation in two runtimes; equal; re-derive | none (S5, FA F17) |
| S5.V3 | MOD-39 | a die throw's x_eff bits | RX-2, RX-6, F-6, AE-c20: each component ÷ the exact integer 1000, correctly rounded; then the velocity and spin components × (1 + ε·(2u − 1)); the release position is never jittered | p = (0, 0, 150) mm, v = (1200, 0, −300) mm/s, w = (0, 15000, 0) mrad/s; u = 0.5018962631002069 (XV-07's second draw); ε = 0.05 | DEFERRED | nine binary64 values, each as 16 hexadecimal digits of its 8 bytes | DEFERRED | compute from MOD-39 in two runtimes; equal bits | none (S5, FA F14) |

**Cut** (C-3: a re-export reaches nothing; the cut rows stay in the facet files as the record).

| Local id | Change | Why |
|---|---|---|
| FA.S42 | drop | C-3 |
| FA.S43 | drop | C-3 |
| FA.S44 | drop | C-3 |
| FA.S45 | drop | C-3 |
| FA.S46 | drop | C-3 |
| FA.S47 | drop | C-3 |
| FA.S48 | drop | C-3 |
| FA.S49 | drop | C-3 |
| FA.S50 | drop | C-3 |
| FA.S51 | drop | C-3 |
| FA.S52 | drop | C-3 |
| FA.S53 | drop | C-3 |
| FA.S54 | drop | C-3 |
| FB.S22 | drop | C-3 |
| FB.S23 | drop | C-3 |
| FB.S24 | drop | C-3 |
| FB.S25 | drop | C-3 |
| FB.S26 | drop | C-3 |

**Changed cells** (emission enums, and the rulings above).

| Local id | Column | Value | Why |
|---|---|---|---|
| FA.H8 | Condition | no file under the platform directories imports the physics package or Rapier (by resolved path), and no file under `packages/physics` imports `@tabletop/physics-lab` or `packages/physics-lab` (GX-40); BLOCKED on ODG-g8 | FB 12 |
| FB.V1 | Pinned value | Θ and T of the closed form for a peg-free spinner, the oracle side of XV-01 (the engine side is MOD-41's) | the State enum |
| FB.V1 | Output | Θ = 16.0, 36.0, 64.0 rad; T = 4.0, 6.0, 8.0 s | the State enum |
| FB.V1 | State | COMPUTED | the oracle side is computed (`mwe_g1.py`, `oracle_xv01`) |
| FB.V2 | Output | the residual E of the books: DEFERRED | the State enum |
| FB.V2 | Encoding | binary64 joules, shortest round-trip decimal | an Encoding is named even when deferred |
| FB.V3 | Output | the DynoRecord: DEFERRED | the State enum |
| FB.V3 | Encoding | the DynoRecord as utf8 JSON | as FB.V2 |
| FB.V4 | Output | the Θ and T residuals: DEFERRED | the State enum |
| FB.V4 | Encoding | the residuals as utf8 JSON | as FB.V2 |
| FB.V4 | State | DEFERRED | the State enum; open behind the owner's films |
| FB.V5 | Pinned value | the closed form's Θ, rest sector and skill index on G-1's example | the State enum |
| FB.V5 | Output | Θ 36.0 rad, sector 5; Θ 37.8225 rad, sector 0; skill index 0.1309 rad/s | the State enum |
| FB.V5 | State | COMPUTED | computed by `mwe_g1.py` (`gap_example`) |
| FB.P1 | Class | production | the sealed §8's class |
| FB.P2 | Class | production | the sealed §8's class |

## 6. Round 2, on K6's RETURN (CT-6)

K6 round 1 returned CT-6: the S2 tags load-bearing invariants (`LB`, "carried from S1") that S1's hook manifest names
no hook for. S5 answers once, consolidating at trigger points that already exist (the sealed precedent's consolidation:
trigger points merge, obligations never do), and adds one hook where no trigger point exists. `K6-conformance.md` §6
maps every LB tag to its hook.

| Local id | MOD | Trigger | Condition | Block action | Registered at | S1 hook |
|---|---|---|---|---|---|---|
| S5.H1 | MOD-46 | @before-dyno-record | both claims are counted on accepted outcomes only, each with its acceptance rate, and the hand's χ² is on the outcome relative to the start where starts chain (F-1, F-2, GX-48; S2 OBJ-37 LB F-1) | record marked invalid (RX-8) | `packages/physics-lab/src/dyno/dyno.ts` | none (S2 OBJ-37) |

| Local id | Column | Value | Why |
|---|---|---|---|
| FA.H1 | Condition | in input construction and decisions, no `Math` function outside abs, ceil, clz32, floor, fround, imul, max, min, round, sign, trunc; ASSERT_ABSENT `Math.random`, `Date`, `performance` (EL-2, EL-4); no file but `core/simulator.ts` constructs or steps a Rapier world (EL-1, EL-3); `engine/snapshot-hasher.ts` holds no `async`, `await` or `Promise` (GX-46, F-11); no OutcomeReader subclass declares `read` (S-2); scans the source of OBJ-01 to OBJ-05, OBJ-15 to OBJ-29, OBJ-34, OBJ-35, OBJ-49 | CT-6 round 2 |
| FA.H2 | Condition | loaded build SHA-256 = π.build, and a `wire` is made only from a ReadySolver that `loadPinned` issued (EL-11) | CT-6 round 2 |

## 7. Round 3, on the independent adversarial pass (TE-6)

`te6-adversarial-pass.md` found no blocker, 13 major and 7 minor defects; the lead's dispositions are appended there.
The owner raised R4's budget to 11.6M to fix them (2026-11-11, live: "Raise to 11.6M (Recommended)").

**Rulings added.** The sealed HookViolation reading (FA F1) is written out as the exact call in every row that throws
it, and recorded in S3 §9 for the owner's gate. After any HookViolation the hosting session is abandoned and rebuilt
from its row (the sealed `resume`): the attempt's draw has already advanced the shared stream (F4-19). RollGuard's
`args` checks the shape (the layout through `fromArgs`, integers, no start pose) and, for a component wired with a
preset, the bounds; an unwired component passes `args` and its rule 2 refuses it (F4-06). Trajectory takes a
ValidPreset, the S2's "Preset" read as the witness the one roll function accepts (RX-1; F4-04). MOD-29 is Decides YES:
its checker reads the source tree from the file system; its seam is the sealed SEAM-38's shape, the checker the source
(F4-12). `DivergenceError` is MOD-03's (`kernel/intentlog.ts` exports it; F4-20). MOD-44 and MOD-43 are built before
MOD-41 but count COMPLETE only after it (their vectors and REF-40's input run through the Simulator; F4-09).

| Local id | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule | Binding |
|---|---|---|---|---|---|---|
| S5.S2 | MOD-47 | MOD-48 | the fit's model, where it is the closed form (FB 18) | lab-internal; the runtime imports neither | XR-29 | NAMED |
| S5.S3 | MOD-41 | MOD-03 | the sealed `DivergenceError(index, detail)`, thrown by `replay` on a DIVERGENCE verdict | its index is the last move's; nothing is returned as a replayed game | XR-21, XH-07 | NAMED |

| Local id | MOD | Invariant | Forbidden input | Expected rejection | Test name | Outcome | S1 case |
|---|---|---|---|---|---|---|---|
| S5.R11 | MOD-41 | XH-04's "never before LEGAL", GX-47 | a RollGuard spec that can reach a stream (its constructor or rules handed RNGStreams or an ApplyContext) | the structural test fails: RollGuard is constructed with no stream and its rules take only (state, intent) | XR-12 · RollGuard holds no stream, so no draw precedes LEGAL | XH-04.BEFORE_LEGAL | XR-12 |
| S5.R12 | MOD-41 | EL-11 (S5 §2, FA F3) | `replay(row, genesis)` on a PhysicsHost that has made no wire | UNCOMPUTABLE; no rebuild runs | EL-11 · replay before any wirePhysics is UNCOMPUTABLE | UNCOMPUTABLE | none (EL-11) |

| Local id | Change | Why |
|---|---|---|
| FA.S1 | drop | F4-02: no call; SnapshotHasher re-implements the algorithm over bytes (S5 §2, FA F17) |
| FB.S9 | drop | test only (SX-21); the vector for XV-01 carries it |
| FB.S16 | drop | F4-03: duplicates the root's AdmittedPreset seam |
| FB.S17 | drop | F4-03: duplicates the Simulator's ValidPreset seam |
| FB.S18 | drop | F4-03: duplicates the readers' Preset seam |
| FB.S19 | drop | F4-03: duplicates the applier's AdmittedPreset seam |

| Local id | Column | Value | Why |
|---|---|---|---|
| FB.S1 | Source MOD | MOD-38 | F4-03: Source depends on Target |
| FB.S1 | Target MOD | MOD-37 | F4-03 |
| FB.S3 | Source MOD | MOD-46 | F4-03 |
| FB.S3 | Target MOD | MOD-37 | F4-03 |
| FB.S5 | Source MOD | MOD-46 | F4-03 |
| FB.S5 | Target MOD | MOD-47 | F4-03 |
| FB.S8 | Source MOD | MOD-48 | F4-03 |
| FB.S8 | Target MOD | MOD-37 | F4-03 |
| FB.S10 | Source MOD | MOD-48 | F4-03 |
| FB.S10 | Target MOD | MOD-36 | F4-03 |
| FB.S10 | Transferred value | Θ and ∫ω²dt from a spinner RollRun's motion summary, handed to `EnergyBooks.balance`; ΣΔE is the caller's (S5 C-2) | F4-04 |
| FB.S14 | Source MOD | MOD-46 | F4-03 |
| FB.S14 | Target MOD | MOD-36 | F4-03 |
| FB.S15 | Source MOD | MOD-37 | F4-03 |
| FB.S15 | Target MOD | MOD-36 | F4-03 |
| FB.S15 | Transferred value | `Pose` (the canonical pose a Preset holds), `SettleRule` (built by `Preset.settleRule()`) and `EnginePin` (the π a DynoRecord names) | F4-03, F4-17 |
| FB.S2 | Transferred value | `AdmittedPreset` built by `PlayAdmission` from (ValidPreset, DynoRecord) on a pass, with the issue token from `valid-preset.ts`'s package-internal `issueToken()`; nothing built on a refusal | F4-05 |
| S5.S1 | Source MOD | MOD-29 | F4-12: the sealed SEAM-38's shape |
| S5.S1 | Target MOD | MOD-49 | F4-12 |
| S5.S1 | Transferred value | SX-17: the sealed checker's tier boundary over the physics packages: no platform file imports `@tabletop/physics` or Rapier; `packages/physics` imports neither `@tabletop/physics-lab` nor `packages/physics-lab` (CF-6, GX-40, SC-x6) | F4-12 |
| FA.S7 | Transferred value | `EffectiveInput` passed to `Simulator.roll` and `poses` (SX-06); RollGuard's `args` calls `Throw.fromArgs` and `Flick.fromArgs` (S5 §2, FA F16) | F4-17 |
| FA.S17 | Transferred value | `rebuild(row, genesis, wire)` called by `replay` (SX-02, SX-13); a refusal or a throw during it surfaces as MOD-03's `DivergenceError` | F4-20 |
| FA.S19 | Transferred value | the sealed `HookViolation`, thrown by the Simulator as `new HookViolation('HK-1', 'XH-03: …')` and `new HookViolation('HK-1', 'XH-05: …')` (S5 §2, FA F1) | F4-01 |
| FA.S23 | Transferred value | `Preset` per `read` (S2 OBJ-26): the tray, `cosAlpha`, `settleTime` (T_f), face normals and labels; sector boundary directions | F4-04 |
| FA.S34 | Transferred value | the sealed `Applier` and `ApplyContext` types realised; `new HookViolation('HK-1', 'XH-04: …')` and `new HookViolation('HK-1', 'XH-06: …')` thrown by the applier (S5 §2, FA F1) | F4-01 |
| FA.R6 | Invariant | G-1, S2 OBJ-34: the kind in {Die, Spinner}; an unwired component passes `args` and is refused here | F4-06, F4-20 |
| FA.R7 | Invariant | G-1, the sealed `onTurnRule` (MOD-02) | F4-20 |
| FA.R8 | Forbidden input | an applier drawing twice in one attempt | F4-07 |
| FA.R8 | Expected rejection | throws the sealed `HookViolation('HK-1', 'XH-04: …')`: the class, and `XH-04` at the head of `detail`; state and log untouched | F4-01, F4-07 |
| FA.R8 | Test name | XR-12 · an applier drawing twice in one attempt throws HookViolation naming XH-04 | F4-07 |
| FA.R16 | Forbidden input | ReplayCheck handed a rebuilt σ whose H differs from H_ref (the row with one x changed by 1, rebuilt) | F4-09 |
| FA.R18 | Expected rejection | throws the sealed `HookViolation('HK-1', 'XH-05: …')`: the class, and `XH-05` at the head of `detail` | F4-01 |
| FA.R23 | Expected rejection | throws the sealed `HookViolation('HK-1', 'XH-03: …')` before any step: the class, and `XH-03` at the head of `detail` | F4-01 |
| FA.R25 | Test name | XR-32 · a RollRun holding NaN or an infinity is REFUSE.NON_FINITE at the reader, G-F | F4-13 |
| FA.R26 | Test name | XR-32 · a non-finite value reaching the apply return is REFUSE.NON_FINITE, sigma recorded without it, the XH-11 case | F4-13 |
| FB.R1 | Test name | XR-03 spinner tau at most zero is refused as PRESET_INADMISSIBLE.NO_FRICTION | F4-13 |
| FB.R2 | Test name | XR-04 die mu at most zero is refused as PRESET_INADMISSIBLE.NO_CONTACT_FRICTION | F4-13 |
| FB.R3 | Test name | XR-04 die e at least one is refused as PRESET_INADMISSIBLE.NO_DISSIPATION | F4-13 |
| FA.H3 | Block action | throws `HookViolation('HK-1', 'XH-03: …')` before any step | F4-01 |
| FA.H4 | Condition | exactly one draw of the component's stream `rand:<component>` per apply, after the Guard's LEGAL (the Guard holds no stream: S5.R11); u scales only the seat's input, integers at or above the no-throw floor and, for a spinner, `x_min` (EL-5, EL-9, F-1) | F4-07, F4-08 |
| FA.H4 | Block action | throws `HookViolation('HK-1', 'XH-04: …')` | F4-01 |
| FA.H5 | Block action | throws `HookViolation('HK-1', 'XH-05: …')` | F4-01 |
| FA.H6 | Condition | VALUE ⇒ the kind field and `settle[component]` only; REFUSE ⇒ `settle[component]` only, the kind field unchanged and no value repaired in (EL-6); `settle` holds one σ per component (SC-x4); no trajectory and no effect-owned field written (EL-10, SX-18); no kind field without its σ (EL-7) | F4-08 |
| FA.H6 | Block action | throws `HookViolation('HK-1', 'XH-06: …')`; state and log untouched | F4-01 |
| FA.H7 | Registered at | `packages/physics/src/core/physics-host.ts` (after `rebuild` in `replay`; the verdict is `record/replay-check.ts`'s) | F4-09 |
| S5.V1 | Input | S-min as a SpinnerPreset: `inertia` 0.002, `tau` 0.004, `b` 0, `deltaE` 0, `sectorWidths` eight of 0.7853981633974483, `boundaryDirections` the eight unit vectors at multiples of 45° as pinned literals, `grabRadius` 0.05, `xMin` 0, `bounds` [0, 100000], `epsilon` 0.05, `settleNumbers` [1e-6, 1e-6, 30], `settleCount` 20000, each with κ assumed and source "G-1 worked example (mwe_g1.py PRESET)"; canonical pose `{q: {x: 0, y: 0, z: 0, w: 1}}` | F4-11 |
