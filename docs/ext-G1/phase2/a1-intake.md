# Extension G-1 · Phase 2 · A1 — Intake

Run R3 (`docs/reentry-2026-11-08.md` §5), the Phase 2 leg of extension G-1 (Amendment E-1). Library sealed at
`seal-1` (`fca9e10`). Started fresh from S1's files (TE-3). Gate handling: standing approval (SR-3); the final gate
is the owner's, live. Budget: 4M weighted, measured as the ledger total at the start (25,661,063) plus 4,000,000:
`spend.py status --budget 29661063 --measure tokens`.

## 1. Inputs, by hash

| Input | sha256 | Standing |
|---|---|---|
| `docs/ext-G1/phase1/S1-G1-final-package.md` | `143b5a1635c0fffae787153d9d68a36e4df18669fb6cb19169e0dc3c5f5b4e72` | S1, approved by the owner 2026-11-08, live: "Approve and commit (Recommended)"; commit `10dea4a` |
| `docs/ext-G1/phase1/CLAUDE_TABLETOP_G1.md` | `15fbe9409bfd3cfcda34de78a13b83252819f9df3f9412ae0a0b225300d23cf1` | same gate |
| `governance/S3/v1.3/CLAUDE_TABLETOP_Phase3.md` | `9b10495ba53a391d6c0201328f3a8e728a92a9859aad48acf18f1e4dc85485f4` | the sealed S3 (v1.3); the record of the sealed nodes' modules |
| `governance/upstream/CLAUDE_TABLETOP_v2.md` | `408c52da9c64432aba4c4e8057970aba2b9d61abd028a58fdc0e8a05092e3eb5` | the sealed Phase 1/2 anchor (S2-TABLETOP-v2.0), read-only |

The step files (`step-1` to `step-8`) are the S1 package's own sections, carried whole by `assemble_package.py`; they
are read as the package, not as separate inputs.

## 2. Entry guard: AND[all_proven, all_directed]

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

## 3. Sealed nodes referenced (Amendment E-1)

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

## 4. Traceability Map anchor

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

## 5. Verification payload registered for carry-through (never generated)

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

## 6. Issues log (self-reliance points)

| ID | Point | Handling |
|---|---|---|
| I2-01 | E-1 assumes the sealed nodes carry `OBJ` ids; this library's sealed Phase 2 predates the emission contract and minted none | Carried by S2 name and `MOD-nn` (§3), outside the §2 `OBJ` table; new ids from `OBJ-01`. Reported to the owner; one row in `_metaframework/docs/plugin-findings.md` |
| I2-02 | S1 names ODG-g7's placement as Phase 2's; the lead session's brief keeps ODG-g7 open in this run | The pin record is expressed behind its fixed interface (handed to the host and the Guard); its home is not chosen. Reported to the owner |

## 7. Gate

A1 passes: S1 is proven and directed; 14 sealed nodes are registered ACTIVE by their sealed identifiers; the TM is
anchored (XTM-01 to XTM-12); the payload is registered. Under standing approval this gate batches to the final gate.
