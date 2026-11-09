# Extension G-1 · Phase 2 · A4 — Admission

Computed after A2 and A3 mapped the whole structure (49 nodes, 8 is-a edges, 4 abstractions; revised after TE-6). Tri-valued: any UNKNOWN
halts to investigate. RSI is checked separately against the sealed model and never folded into the MIN.

## 1. PS_OOP, five dimensions

| Dimension | Question | Evidence | Value |
|---|---|---|---|
| Meaning | Does every node keep the meaning of the S1 element it expresses? | Each node's Kind cell restates S1's definition (step 2 §4, step 7 §2); the two refusals, the two claims and the escaped and unsettled reasons stay apart (RA-01 to RA-03); the kinds keep `{face}` and `{sector}` (RE-01, RE-02) | 1.0 |
| Function | Does every S1 operation have exactly one home? | X1 to X10's public interfaces map onto OBJ-03, 10, 12, 24, 26, 31, 32, 36, 40, 44, 45, 47; RX-1 to RX-8 onto OBJ-24, 18, 26, 05, 22, 19, 46, 42 (QG1 §1); after TE-6 (F2-01 to F2-04) every node is handed what it uses: OBJ-03 calls the replay check after `rebuild`, XH-03 runs in OBJ-24, OBJ-03 composes and registers the pairs, the dyno's claims are handed their seeds | 1.0 |
| ExpressivePower | Can the model express every S1 base case? | §2: GBC-65 to GBC-87, each at a named node | 1.0 |
| Traceability | Does every node trace into proven(S1)? | 49 of 49 non-empty `Traces to` cells (QG1 §1, by script) | 1.0 |
| AbstractionFidelity | Is every abstraction proven, and nothing flattened? | 4 bases, each with S1's grouping (A3 §1); 9 refused (A3 §2); no subtype collapsed into its base | 1.0 |

**PS_OOP = MIN(1.0, 1.0, 1.0, 1.0, 1.0) = 1.0.** No dimension is UNKNOWN.

## 2. Base cases at their nodes (ExpressivePower)

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

## 3. RSI: extension, not rewrite (against the sealed model)

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

## 4. AFG: no flatten without equivalence

No node was flattened. The only merges considered (RA-01, RA-02, RA-03, RA-06) were refused: three on S1's own
tautology tests (INVALID), one on GX-47 and XH-04. **AFG: PASS.**

## 5. Verdict

PS_OOP = 1.0 ∧ RSI pass ∧ AFG pass: **ADMIT** all 49 nodes, status ACTIVE. The verdict goes to the owner at the final
gate; under standing approval this gate batches.
