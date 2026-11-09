# Extension G-1 · Phase 2 · A3 — Abstraction

Source: A2. An abstraction is surfaced only where S1 proves the grouping; property-based (tag-like) and build-status
groupings are refused. Tagging expresses S1's load-bearing invariants and open gates; it generates nothing.

## 1. Abstractions surfaced (4)

| Base | Subtypes | The grouping S1 proves | What the base holds once |
|---|---|---|---|
| OBJ-07 Preset | OBJ-08 DiePreset, OBJ-09 SpinnerPreset | one primitive P-2 with two value forms (step 3 §10); one admission gate G-0 (GX-49, GX-51); one hash in the pin record (GX-43) | κ on every value, the canonical pose, ε, the settle numbers, N, the hash |
| OBJ-15 RollInput | OBJ-16 Throw, OBJ-17 Flick | one primitive P-3 with two forms (step 2 §4); GX-41 (integers in declared units); EL-5 (logged as given) | integer-ness, bounds and the no-throw floor against the preset; conversion by UnitsToBinary64; the jitter applied to the kind's jittered components (the die's velocity and spin, the spinner's flick; F-6) |
| OBJ-26 OutcomeReader | OBJ-27 DieReader, OBJ-28 SpinnerReader | one primitive P-7, read_c over c ∈ {Die, Spinner} (GX-40); one ordered chain with a fixed precedence (S-2); RX-3 | the order G-F → G-2 → the kind's gates; the first failing gate names the refusal; a REFUSE is never mapped to a value (EV-5) |
| OBJ-37 DynoClaim | OBJ-38 HandClaim, OBJ-39 JitterClaim | one dyno record, two claims (GX-48); both on accepted outcomes with the acceptance rate (F-1, GBC-87); both name π and the preset hash (GBC-83) | running N rolls through the one Simulator and the kind's reader; conditioning on acceptance; reporting the acceptance rate |

ValidPreset (OBJ-11) and AdmittedPreset (OBJ-14) are concrete witnesses, not abstractions; AdmittedPreset holds a
ValidPreset by composition (RE-09, after TE-6 F2-08).

## 2. Abstractions refused

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

## 3. Tags

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

## 4. Gate

4 abstractions surfaced, each proven; 9 refused with reasons; 26 nodes tagged (after TE-6). Batches under standing approval.
