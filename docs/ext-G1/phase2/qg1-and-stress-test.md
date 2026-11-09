# Extension G-1 · Phase 2 · QG1 and ST — Quality gate and stress test

## 1. Coverage (by script)

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

## 2. AE Resolution Protocol

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

## 3. Stress test

### ST-1 Constraint collision: the generative mandate against fidelity

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

### ST-2 Missing information: an undirected dependency

**Probe.** Each node's declared inputs (A2 §2) were read against what its sources hand it. A node that needs an input
nobody hands it, or a dependency whose direction S1 leaves open, halts A1 with a blocking AE.

**Outcome.** One input was missing from S1's prose: EnergyBooks's ∫ω²dt for a drag preset (I2-03). GX-50's formula
names it, so it is expressed, not invented; S1's vectors (b = 0) do not need it. Every dependency is directed: the replay path runs PhysicsHost's `replay` → the sealed `rebuild` (the appliers re-run) → each rebuilt σ and H_ref
from OBJ-33 → ReplayCheck (SX-13, XH-07 after `rebuild`; the caller was first left unnamed, corrected after TE-6,
F2-01); the
kind's field name reaches RollApplier at construction from the sealed kind (MOD-10). Had S1 left the rebuild-to-X6
direction open, A1 would have halted, reject-not-repair. **PASS.** Protection: A1's guard and OS-1's declared inputs.

### ST-3 Adversarial interpretation: flattening that stays traceable

| Attack | Why it traces | Why it fails |
|---|---|---|
| One Roll class doing X3 to X6 | every member traces to P-6 or XTM-01 | no god class: σ, the gate chain and the guard are proven-structured; GX-47 and XH-04 keep the guard and the applier apart (RA-06); EL-1 needs the Simulator shared with X7 and X8 (RE-04) |
| Subclass the sealed Spinner to carry its rest angle | XTM-10 "the Spinner's sector and resting angle" | RSI fails: a sealed member changes; the owner ruled a settle record (AE-c17, RE-02) |
| One OutcomeReader with a kind switch | P-7 is one primitive | AFG: not equivalent (G-3 is the die's only; dot products against sign tests), so flattening is refused |
| Let the closed form skip the spinner's simulation | XTM-11, "the spinner proves the engine" | GX-40: the oracle never decides (RE-05, S-3) |

**PASS.** Protection: no-god-class, RSI against the sealed model, and AFG.

## 4. Gate

QG1 passes with coverage complete, the register closed, one item escalated to the owner (AE-c20) and twelve carried.
ST passes all three scenarios. Batches under standing approval.
