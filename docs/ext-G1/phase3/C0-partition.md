# Extension G-1 · Phase 3 · C0 — Anchor, sealed doors, partition

Run R4 (`docs/reentry-2026-11-08.md` §5), the Phase 3 leg of the extension run on gap G-1 (Amendment E-1). Lead: the
coordinator, top tier. Fixed input: the S2 approved by the owner on 2026-11-08 (R3). Second input (E-1): the sealed
`governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md`. Nothing present at `seal-1` is written by this run.

## 1. Inputs, by hash

| File | sha256 |
|---|---|
| `docs/ext-G1/phase2/CLAUDE_TABLETOP_G1_Phase2.md` (parsed) | `24ce6f2efece01bbe361ebe300da29e3b3c616e636aac03e20fd9a498e937e3e` |
| `docs/ext-G1/phase2/S2-G1-final-package.md` (record) | `8281de217d8c8106a984e909ea88c8dce5b7a1043a2e3161a4a13da27117e24e` |
| `governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md` (sealed S3) | `9b10495ba53a391d6c0201328f3a8e728a92a9859aad48acf18f1e4dc85485f4` |
| `docs/ext-G1/phase1/step-7-implementation-specification.md` (the S1 cases, vectors, hooks the S2 carries by id) | at commit `10dea4a` |

## 2. The A1 halt, re-run

- **Well-formed.** `tools/emission-check.py` on the Phase 2 document: "Phase 2 document conforms." Headings, columns
  and ids as the emission contract §3 fixes them.
- **All dependencies directed.** The declared-inputs table (S2 §2, third table) is a directed graph with one root,
  OBJ-03 (the composition root, S2 F2-03): every other node is handed what it uses, or computes from its arguments. No
  cycle. Every S1 seam the S2 carries (SX-01 to SX-22) has a source and a target.
- **No unproven node.** 49 nodes, all ACTIVE, each traced to S1 (GX, P, X, SX, RX, GBC, a ruling or XTM row). No
  admitted exception. Four abstractions, each on a grouping S1 proves.

**Verdict: PROCEED.** No blocking AE.

## 3. Sealed doors (E-1): every seam into a sealed module uses what it already offers

Read from the sealed source, not assumed:

| Sealed module | Operation the extension uses | Public today | How reached |
|---|---|---|---|
| MOD-02 | `EngineCore.registerIntent(type, spec, applier)` | yes (barrel: `EngineCore`) | on the core the sealed `host`/`resume`/`rebuild` hand to `wire` |
| MOD-02 | `rebuild(row, genesis, wire)` → EngineCore; throws `DivergenceError` on any refusal or applier throw | yes (barrel) | by name, from `replay` |
| MOD-02 | `IntentSpec`, `Applier`, `ApplyContext {rng}` types; `HookViolation(hook, detail)` | yes (barrel) | by name (types; the error the hooks throw) |
| MOD-02 | `onTurnRule(state, intent)` | exported by `kernel/discipline.ts`, **not** by the engine barrel | by name, `@tabletop/engine/src/kernel/discipline.js` |
| MOD-04 | `RNGStreams(seed).stream(name).next()` | yes (barrel) | in play: `ctx.rng`, handed by the sealed `submit`; offline: opened from a seed |
| MOD-01 | `State`, `Intent`, `GameRow`, `Genesis` types; `hashState` (FNV-1a 64 over canonical JSON) | yes (barrel) | by name |
| MOD-10 | the kinds' fields `Die {face}`, `Spinner {sector}`; components in `state.components[id]` with `kind` | yes (state shape) | written through the apply return |

**One import past the engine barrel.** The S2 names the sealed `onTurnRule` (MOD-02, `kernel/discipline.ts`) among
RollGuard's rules, as one of the sealed doors. The sealed library tier (`library/wire.ts`) and three platform wirings
import it by relative path; the barrel does not export it. A package outside `packages/engine` reaches it by its file.
That calls an existing exported function and changes nothing sealed; it is recorded here and at the gate.

**Three S1 seams need a sealed change, and the owner has already ruled each carried:** SX-15 (σ in the sealed
SeatView) and SX-16 (HOOK-11 read "engine-decided" on the real path) need ODG-g9; SX-17 (the physics package in the
sealed tier checker) needs ODG-g8. Both are seal defects found in the sealed library (K7-1-11, K7-1-3), carried by the
owner's rulings at R2 and R3 for `seal.py reopen`. This is not a mis-shaped gap, so C0 does not halt. The S3 builds
nothing around them: the modules R5 builds do not depend on them, and the rows that do (XR-25, XR-26, XH-08, XH-10)
are carried BLOCKED on their gate. **R5's merge needs the owner's `seal.py reopen` for ODG-g8.**

No other seam requires a sealed module to change. `replay` uses the sealed `rebuild`, not `resume`: `rebuild` returns
the rebuilt core, whose state holds every σ and whose hash XH-07 compares. Hosting (`LockstepController.host`) is the
caller's: it is handed the `wire` that `wirePhysics` returns, so no new module depends on MOD-27.

## 4. Decides for the sealed modules referenced

The sealed S3 v1.3 and the sealed object model carry no Decides tag (`—`: S2-TABLETOP-v2.0 predates B-1, SP-7).
emission-check needs YES or NO on every §2 row, so this run classifies the four sealed modules a new seam reaches, by
the S2's one reading (S2 §2: "YES where the node consults something ambient"; TE-6 F2-05). The classification is for
B-1 only and changes nothing in the sealed modules.

| Sealed | Decides | Basis |
|---|---|---|
| MOD-01 | NO | types, and `hashState`, a pure function of the state it is handed |
| MOD-02 | NO | the Guard and EngineCore consult nothing ambient: they run the specs, rules and appliers registered with them against the state and seats they hold; `onTurnRule` compares the intent's seat with the active seat of the state it is handed; `rebuild` replays a handed row through a handed wire. "Who may roll" is answered by RollGuard (OBJ-34, YES), which supplies the rules |
| MOD-04 | NO | a seeded generator: the streams are a pure function of the seed and the stream name |
| MOD-10 | NO | the kinds' shapes, admitted by rule; read as data |

## 5. Placement (S2 §6, RA-07)

Constraints met: no platform file imports the physics package or Rapier (CF-6; enforced only once ODG-g8 lands); the
runtime that admits and wires presets holds OBJ-06, OBJ-41 and OBJ-46; the dyno and the fitting stay off the play path
(SC-x6); no decision path imports the closed form (GX-40).

- **`packages/physics/src/`, package `@tabletop/physics`** (library tier, the runtime): X1 to X7 and X2. It imports
  `@tabletop/engine` and `@dimforge/rapier3d-compat` (0.19.3 installed; the pinned build stays ODG-g7). No platform
  file imports it.
- **`packages/physics-lab/src/`, package `@tabletop/physics-lab`** (tooling, offline): X8 to X10. It imports
  `@tabletop/physics` and `@tabletop/engine`; nothing in the runtime imports it.
- Both sit under `source_glob` (`packages/*/src/**/*.ts`), so every file is claimed by a module below (CC-1). One class
  per file. The rows ODG-g8's reopen must add to the sealed checker: the platform directories may not import
  `@tabletop/physics`, `packages/physics` or Rapier; `packages/physics` may not import `@tabletop/physics-lab` or
  `packages/physics-lab`.

## 6. Modules (MOD-36 to MOD-49)

The composition root builds the Simulator and RollGuard by name (S2 F2-03), and B-1 forbids a by-name reach into a
deciding module from another module. So the root and the two deciders it builds share one module (MOD-41); every other
reach into a decider is a handed collaborator (INJECTED). Values and utilities sit in modules that decide nothing, so
importing a value type never reaches a decider.

| MOD | Module | Files (`packages/physics/src/` unless lab) | Owns OBJ | Decides |
|---|---|---|---|---|
| MOD-36 | Engine values | `engine/engine-pin.ts`, `engine/pin-record.ts`, `engine/pin-match.ts`, `engine/pose.ts`, `engine/settle-rule.ts`, `engine/snapshot-hasher.ts`, `engine/roll-run.ts` | OBJ-01, 02, 05, 21, 22, 23, 25 | NO |
| MOD-37 | Presets and provenance | `presets/provenance.ts`, `presets/preset.ts`, `presets/die-preset.ts`, `presets/spinner-preset.ts`, `presets/provenance-check.ts`, `presets/preset-validation.ts`, `presets/valid-preset.ts`, `presets/admitted-preset.ts`, `presets/dyno-record.ts` | OBJ-06 to 11, 14, 41, 46 | NO |
| MOD-38 | Admission for play (G-0b) | `admission/play-admission.ts`, `admission/dyno-pass-rule.ts` | OBJ-12, 13 | YES |
| MOD-39 | Roll inputs and jitter | `input/roll-input.ts`, `input/throw.ts`, `input/flick.ts`, `input/units-to-binary64.ts`, `input/jitter.ts`, `input/effective-input.ts` | OBJ-15 to 20 | NO |
| MOD-40 | Reference ports | `ports/replay-reference.ts`, `ports/pin-record-source.ts` | OBJ-33, 49 | YES |
| MOD-41 | Roll core: host, solver, Simulator, RollGuard | `core/physics-host.ts`, `core/ready-solver.ts`, `core/simulator.ts`, `core/roll-guard.ts` | OBJ-03, 04, 24, 34 | YES |
| MOD-42 | Outcome readers | `read/outcome-reader.ts`, `read/die-reader.ts`, `read/spinner-reader.ts`, `read/roll-outcome.ts` | OBJ-26 to 29 | NO |
| MOD-43 | Settle records and replay check | `record/settle-record.ts`, `record/settle-records.ts`, `record/replay-check.ts` | OBJ-30, 31, 32 | NO |
| MOD-44 | Roll applier | `intents/roll-applier.ts` | OBJ-35 | NO |
| MOD-45 | Trajectory | `view/trajectory.ts` | OBJ-36 | NO |
| MOD-46 | Dyno (lab) | `packages/physics-lab/src/dyno/dyno-claim.ts`, `…/hand-claim.ts`, `…/jitter-claim.ts`, `…/dyno.ts`, `…/fairness-statistics.ts` | OBJ-37 to 40, 42 | NO |
| MOD-47 | Dataset and fitting (lab) | `packages/physics-lab/src/data/data-source.ts`, `…/parameter-fit.ts`, `…/dataset.ts` | OBJ-43, 44, 45 | NO |
| MOD-48 | Closed form and energy books (lab) | `packages/physics-lab/src/oracle/closed-form-oracle.ts`, `…/energy-books.ts` | OBJ-47, 48 | NO |
| MOD-49 | Physics package boundary | `packages/physics/src/index.ts`, `packages/physics-lab/src/index.ts` | none: the package the S2 names as XR-26's and XH-08's owner (S2 §6) | NO |

Sealed modules carried in §2 with their ids and files, ACTIVE: MOD-01, MOD-02, MOD-04, MOD-10.

## 7. Names this run fixes (S2 §6)

- **The component's stream:** `rand:<component id>` (LA-1), as the sealed Deck names `deck:<deckRef>`. XV-07 stands as
  computed (`rand:spinner-1`).
- **σ's state key:** `settle`, a map from component id to that component's last σ (SC-x4).
- **Intent types:** `die:throw {component, throw}`, `spinner:spin {component, flick}` (S2).
- **Replay:** the sealed `rebuild` with the root's `wire` (§3).

## 8. Seam pricing and the partition (ODG-A)

Module-level crossings among the new modules (each counted once; the facet writes the rows):

| Cluster | Internal crossings | Crossings out |
|---|---|---|
| Play runtime: MOD-36, 39 to 45, 49 | about 25: the root builds readers, SettleRecords, the applier and hands each its collaborators; the applier is handed the Simulator, reader and SettleRecords and scales the input; readers and records read RollRun and Pose; Trajectory is handed the Simulator; the barrel re-exports | 6 to 7, all a value handed in: AdmittedPreset and ValidPreset into the root, RollGuard, applier and Simulator; preset data into readers; the lab handed the Simulator, reader and jitter rule |
| Presets, evidence and lab: MOD-37, 38, 46, 47, 48 | about 6: G-0b on a ValidPreset and a DynoRecord (SX-22); the dyno on a ValidPreset and the measured population (SX-19); fits with κ into presets (SX-20); the oracle on P_S | (as above) |

Splitting the play runtime cuts about nine crossings (root and applier against readers, records and inputs) for S5 to
reconcile; splitting presets from the lab cuts four (SX-19, SX-20, the DynoRecord). Neither cut follows a thin seam, so
**two facets**:

| Facet | Modules | OBJ | Carried verification (S1 ids) |
|---|---|---|---|
| **FA Play runtime** | MOD-36, 39, 40, 41, 42, 43, 44, 45, 49 | 01 to 05, 15 to 36, 49 (28) | XP-01, 03 to 15; XR-01, 02, 09 to 17, 19 to 21, 23 to 28, 30 to 33; XV-01 (engine side), 03, 04, 07, 09, 10; XH-01 to 11; XPC-01 to 04, 07, 08 |
| **FB Presets, evidence and lab** | MOD-37, 38, 46, 47, 48 | 06 to 14, 37 to 48 (21) | XP-02, 16, 17; XR-03 to 08, 29; XV-01 (oracle side), 02, 05, 06, 08; XPC-05, 06 |

The cross-facet seams are the handed values above; the seam governs, and S5 reconciles them once. Each facet uses local
ids (`FA.S1`, `FA.R1`, `FA.V1`, `FA.H1`, `FA.P1`; `FB.…`); S5's script mints the contract's SEAM, REF, VEC, HOOK and
PC ids above the sealed record's (SEAM-46, REF-25, VEC-10, HOOK-13, PC-10 onward).

## 9. Forecast (TE-8)

No `facet:` unit is measured in this ledger. The estimate per facet is 1.5M weighted, from the measured sonnet facet
rows of the two builds closed on 2026-11-08 (0.93M to 1.92M each); FA carries about three quarters of the rows.

| | Weighted |
|---|---|
| Spent at C0 (anchor, sealed-door reading, partition) | about 1.3M |
| Fan-out: 2 facets × 1.5M (`spend.py forecast --units 2 --unit-kind facet --unit-cost 1500000`) | 3.0M |
| S5, K6, emission and set cover, TE-6 pass, assembly, the gate, the close | about 2.7M |
| **Phase total forecast** | **about 7.0M of the 7M budget** |

## 10. Gate

The owner, 2026-11-10, live: "Approve (Recommended)": the partition (two facets, MOD-36 to MOD-49 in
`packages/physics` and `packages/physics-lab`), the `onTurnRule` import by its file, the four sealed modules classed
Decides NO for B-1, and the 3.0M fan-out. FA and FB launch in parallel on the mid tier.
