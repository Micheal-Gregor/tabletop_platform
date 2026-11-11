# Extension G-1 · Phase 3 · K6 — Conformance gate

Run R4. Lead, top tier. Subject: `CLAUDE_TABLETOP_G1_Phase3.md` as `emit_phase3.py` writes it from the facets and
`S5-synthesis.md`. Mechanical checks first, by the kit's scripts; then the six tests.

## 1. Scripts

| Check | Result |
|---|---|
| `tools/emission-check.py CLAUDE_TABLETOP_G1_Phase3.md --phase2 CLAUDE_TABLETOP_G1_Phase2.md` | "Phase 3 document conforms": headings, columns, ids, enums; every OBJ-01 to OBJ-49 mapped exactly once; no orphan module; every DEFERRED vector has a discharge condition; no decider reached by name; every Outcome well formed |
| `tools/test-set.py … --config test-set.json` | exit 0: 43 guard elements, 47 rows, none dropped; the S1 floor keeps every S1 case's row; 2 wiring rows (turn discipline, owner sealed MOD-02; the replay's DIVERGENCE, owner MOD-43); 1 variant cut and kept as the record (REF-71) |
| `tools/seal.py verify` | run before the commit (VC-6) |

## 2. Rounds

- **Round 1: RETURN (CT-6).** The S2 tags load-bearing invariants ("LB", carried from S1) that S1's hook manifest names
  no hook for: EL-11, GX-51, EL-5, EL-9, GX-46, EL-1, EL-4, S-2, EL-6, EL-7, SC-x4, GX-47, F-1 (OBJ-34 and OBJ-37),
  EL-10, GX-40. Under-verified is not conformant.
- **S5 round 2** (`S5-synthesis.md` §6): EL-1, EL-3, GX-46 and S-2 join HOOK-13's commit-time scanner; EL-11 joins
  HOOK-14; GX-40 joined HOOK-20 in round 1 (S5 §2, FB 12); OBJ-37's F-1 gets HOOK-24 (no trigger point existed).
- **Round 2: PASS**, on the tests below.
- **Round 3, after the independent adversarial pass (TE-6):** 20 findings (13 major, 7 minor, no blocker) fixed or
  carried as `te6-adversarial-pass.md`'s dispositions record (S5 §7); the S3 re-emitted; the scripts re-run (§1); the
  tests below re-read against it. **PASS.**

## 3. CT-1 Trace

Every component traces to an admitted S2 node: §3 maps each of the 49 OBJ once (emission-check, cross-document); each
new module owns S2 nodes, and MOD-49 owns the package S2 §6 names as XR-26's and XH-08's owner. Each seam, refusal,
vector, hook and concern row cites an S1 or S2 id; S5's rows cite the S2 node or S1 contract that names their guard.
**PASS.**

## 4. CT-2 Carried rules

- **Binding (B-1):** every seam into MOD-38, MOD-40, MOD-41 is INJECTED; emission-check finds no decider by name. The
  root builds the Simulator and RollGuard inside MOD-41 (S2 F2-03; C0 §6). Barrel re-exports carry no row (S5 C-3,
  the sealed precedent). Sealed MOD-01, 02, 03, 04, 10 classed Decides NO by the S2's reading (C0 §4, approved at C0); MOD-29 Decides YES
  (its checker reads the file system), the source of its one seam as the sealed SEAM-38 is (S5 §7), on the gate list.
- **Sealed doors (E-1):** every seam into MOD-01, 02, 04, 10, 29 uses an existing operation; the one sealed change any
  seam needs is ODG-g8 (MOD-29), carried BLOCKED for the owner's `seal.py reopen`, as ruled.
- **The owner's rulings** carried: AE-c20 units and order (MOD-39, VEC for XV-09 and S5.V3); refused rolls logged
  (MOD-44, HOOK-18); the engine loads before hosting (HOOK-14); each roll starts at the last rest (SX-12, REF rows for
  XR-28, XP-15); rest pose in σ (MOD-43); a roll is its own mutation, no effect (SX-18, HOOK-18); symmetric jitter on
  the die's velocity and spin only (MOD-39); the die's refusals and admission (MOD-37, MOD-42); the spinner's floor on
  the input before the draw (MOD-41, HOOK-16); fairness on accepted outcomes relative to the start (MOD-46, HOOK-24).
- **EL-1 to EL-11:** §1 Do not and the hooks (§6 below).
- **Carried-rule invariants:** affordance forbidden-but-visible, N/A by absence (no interaction facet in this S2); a
  device admitted by default on a sensitive action, N/A by absence (no trust boundary proven; ODG-g6 open); stored
  versus computed, applies (presets are data, SC-x1): every number is preset data with its κ, nothing frozen in code.

**PASS.**

## 5. CT-3 Fidelity

What Phase 3 added beyond the S2's text, each traced (S5 §2): `ReplayCheck.compareState` and the `'FINAL'` key
(S2 OBJ-03: "each rebuilt σ and the state hash … through ReplayCheck"); `SettleRecords.last` (X6; `lastRest` derives
from it); `Throw.fromArgs`, `Flick.fromArgs` (one place for the layout two S2 nodes read); `Preset.settleRule()` (OBJ-24:
"the preset supplies the SettleRule"); `Preset.hash()` (P-2's preset hash); `componentId` on the dyno (LA-1's stream);
`s0` and `restSector` on Φ (XV-08 pins sectors from s0); the NOT_ADMITTED.OTHER_PRESET guard (OBJ-14: "its passing dyno
record"); structural types where the runtime may not import the lab (MeasuredEvidence, the claims' result types). The
root's retained record and wire are a reading of S2's own signatures ("that wire"). S2 rows S5 refined, each traced:
DiePreset carries cos α, not α (EL-2 forbids `Math.cos`); SpinnerPreset stores τ, b, ΔE with a, c, d derived (G-0a and
EnergyBooks need τ, b, ΔE); DynoRecord carries an acceptance rate per claim and its population's provenance (GX-48;
XR-07); Trajectory takes a ValidPreset (RX-1 accepts only one). No other behaviour. One reading
waits on the owner: XH-03, XH-04, XH-05 throw the sealed `HookViolation('HK-1', 'XH-nn: …')` (S5 §2, FA F1). **PASS,
with that item at the gate.**

## 6. CT-4, CT-5, CT-6

**CT-4 Refusal.** One row per guard element per module, 47 rows over 43 elements (round 3 added RollGuard's "holds no
stream" row and `replay` before any wire); every XR case S1 gives (XR-01 to 17,
19 to 21, 23 to 33) has its row; S5 wrote the ten elements S1 gives no case (UNPINNED, the replay wiring, INCOMPLETE,
MEASURED_WITHOUT_FIT, NO_TIME_BASE, NO_HELD_OUT_RESIDUAL, UNDETERMINED, OTHER_PRESET, and RX-8's two). N/A until
adopted: (MOD-42, REFUSE.ON_LINE), AE-c29, XR-18 reserved. BLOCKED rows: XR-25 (ODG-g9), XR-26 (ODG-g8). **PASS.**

**CT-5 Vectors.** Fourteen: XV-01 (engine side DEFERRED; oracle side COMPUTED), XV-02 to XV-06, XV-09, XV-10 and S5's
three (the preset hash, the snapshot hash of known bytes, a die throw's x_eff) DEFERRED with discharge conditions;
XV-07 and XV-08 COMPUTED from `mwe_g1.py` and the sealed RNGStream, carried verbatim. Each rule is stated in its row,
independent of its vector; none is hand-written. **PASS.**

**CT-6 Hooks.** Every load-bearing invariant the S2 tags, and the hook that carries it:

| LB invariant (S2 node) | Hook |
|---|---|
| GX-43, XH-02 (OBJ-03, 05); EL-11 (OBJ-03, 04) | HOOK-14 |
| XH-03 (OBJ-05, 24) | HOOK-15 |
| EL-1, EL-2, EL-3, EL-4, GX-46, S-2 (OBJ-23, 24, 26) | HOOK-13 (scanner), HOOK-17 (EL-3 at run time) |
| XH-07 (OBJ-03, 32) | HOOK-19 |
| GX-51 (OBJ-10), XH-09 (OBJ-14) | HOOK-21 (G-0 before a preset is wired) |
| GX-47 (OBJ-34) | the sealed HOOK-01 and HOOK-02 (RollGuard's `args` and `rules` are the verdict; a refused intent is unlogged and drawless), with the structural row that RollGuard holds no stream |
| EL-5, EL-9, F-1 (OBJ-15, 19, 34), XH-04 (OBJ-35) | HOOK-16, whose condition states each (round 3) |
| XH-06, EL-6, EL-7, SC-x4, EL-10 (OBJ-26, 30, 31, 35, 36) | HOOK-18, whose condition states each (round 3) |
| XH-11 (OBJ-26, 35) | HOOK-23 |
| XH-10 (OBJ-36) | HOOK-22, BLOCKED on ODG-g9 |
| GX-40 (OBJ-47), XH-08 | HOOK-20, BLOCKED on ODG-g8 |
| F-1 (OBJ-37) | HOOK-24 |

**PASS** (round 2).

## 7. Verdict

**K6 PASS (round 3).** Carried to the owner's gate: the HookViolation reading (CT-3); MOD-29 classed Decides YES and the
barrel rows cut (S5 C-3, §7); callers outside the modules build Trajectory's and the dyno's Simulator (S5 §2, FA F2);
ODG-g8's reopen before R5's merge; and the open gates of §9 of the S3.

## 8. The human gate

The owner, 2026-11-11, live: **"Approve and commit (Recommended)"** for the S3 and its Specification record; the
HookViolation reading **"HK-1, XH id in detail (Recommended)"**; and a second budget raise for the close, **"Raise to
12.3M (Recommended)"** (SR-3: a second raise in a phase is the owner's). R4 spend at the gate: 11.52M weighted.
