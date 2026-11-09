# Extension G-1 · Phase 2 · A5 — Contract

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

## Verification payload: owners named for Phase 3

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
