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

<!-- INCLUDE a2-hierarchy.md -->

<!-- INCLUDE a3-abstraction.md -->

## 4. Admission verdict detail

<!-- INCLUDE a4-admission.md -->

<!-- INCLUDE a4b-worked-example.md -->

## 5. Quality gate and stress test

<!-- INCLUDE qg1-and-stress-test.md -->

## 6. Intake and the consolidated traceability map

<!-- INCLUDE a1-intake.md -->

## 7. Verification payload carried from S1

<!-- INCLUDE a5-contract.md -->

## 8. Ambiguity and assumption dispositions

The AE Resolution Protocol is §5 (QG1 §2); the assumption log is §4 (A4b §2); the issues log is §6 (A1 §6) with I2-03
in §3 (A2 §2). No admitted exception.

## 9. Open decision gates

As `CLAUDE_TABLETOP_G1_Phase2.md` §7: ODG-g5 to ODG-g11, AE-c19, AE-c26, AE-c28, AE-c29. None blocks Phase 3; ODG-g7
and ODG-g8 block Phase 4 (the pinned build; the tier check), ODG-g9 blocks the trajectory's view use and R6, ODG-g5
blocks admitting a preset for play.

## 10. The independent adversarial pass (TE-6)

<!-- INCLUDE te6-adversarial-pass.md -->

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

<!-- INCLUDE CLAUDE_TABLETOP_G1_Phase2.md -->
