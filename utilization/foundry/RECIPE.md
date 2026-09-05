# The Component Foundry — the per-piece pipeline

*STATUS: PROPOSED PROCESS, scaffolded for owner review. Per the repo's contract, nothing
here is law until the owner puts adoption on the record; until then this directory is
tooling + a checklist, and the certified build's instruments remain untouched. The
foundry lives in `utilization/` (Phase-5 territory — bindings, never core).*

The foundry industrializes what the die proved: a repeatable pipeline that takes an
iconic tabletop object (spinner, coin, pawn, card toss, …) from concept to a bench piece
that passes FOUR oracles — mechanics, physics, visual, performance. It adapts the
"iterate until the screenshot matches the vision" agent loop to a platform where the
piece must also obey engine law.

## 0 · The doctrine this builds on (already certified, not new)

- **Physics ANIMATES, it never decides** (I-82e / HK-11, `bench/src/die-physics.ts`):
  one real Rapier simulation runs invisibly per toss, returns the recording + settled
  outcome; the component reconciles the replay to the SEEDED result. Truth stays in
  RNGStreams; replay stays byte-identical; theater-mismatch flags (R-20). Every foundry
  piece copies this shape.
- **One composition point** (K-A, I-77): piece N+1 is one line in
  `bench/src/components/registry.ts` plus its adapter module.
- **Pins are computed, never hand-written; pixel-hashes rejected** (I-57b/c): the visual
  gate checks layout-vs-law; aesthetics are judged by eyes (human or agent vision),
  never pinned.
- **Skins bind tokens, never raw values** (R-21/R-22): the piece's look is swappable
  behind the token discipline.

## 1 · The four oracles ("done" for a piece)

| Oracle | Question | Judge | Tooling |
|---|---|---|---|
| Mechanics | Interaction emits the right intents; engine effects move it; theater-mismatch flags | deterministic tests (R-test / HK-11 shape) | existing test discipline |
| Physics | Invisible sim settles fast, stays contained, rests valid, distributes plausibly | headless numeric battery, no browser | `harness/physics-bench.mjs` |
| Visual | Looks like the pinned concept art | agent vision loop over screenshots vs targets | `harness/shot.mjs` + `targets/<piece>/` |
| Performance | Frame budget held; assets within budget | asset lint (static) + eyeball on hardware | `harness/asset-lint.mjs` |

Mechanics and physics are mechanical gates. The visual oracle is an AGENT LOOP, not a CI
gate — convergence ends by pinning the piece's *layout* contract as a `VG<piece>` group
in `bench/gate/registry.mjs`; the aesthetic judgment itself is never pinned. The
performance oracle's static half (asset budgets) is CI-able; absolute fps is judged on
real hardware (headless cloud Chromium renders on SwiftShader — relative regressions
only).

## 2 · Layout

```
utilization/foundry/
  RECIPE.md                     ← this file
  targets/<piece>/              ← the pinned vision, committed BEFORE the build
    BRIEF.md                    ← spec: affordances · outcome semantics · engine binding
    concept-*.png               ← owner-approved concept images (1–3)
  scenarios/<piece>.scenario.mjs← the piece's headless physics scenario
  harness/
    physics-bench.mjs           ← generic scenario runner (settle/containment/pose/histogram)
    shot.mjs                    ← build + serve + screenshot from named camera poses
    asset-lint.mjs              ← GLB budget lint (tris, texture dims, file size)
  shots/                        ← screenshot output (gitignored)
pieces themselves live where they always have:
  bench/src/components/<piece>.ts    ← adapter (theater + interaction + gate())
  bench/src/<piece>-physics.ts       ← invisible-sim wrapper, die-physics shape
  bench/gate/VG<piece>.gate.mjs      ← layout pin, added at convergence
```

## 3 · The pipeline, stage by stage

**A — Spec (no code).** `targets/<piece>/BRIEF.md` from `targets/TEMPLATE-BRIEF.md`:
affordances, outcome semantics (what the settled pose MEANS and how it's read), engine
binding (intents emitted, effects consumed, where the seeded truth comes from), theater
contract (the reconcile point), and the camera poses the visual loop judges from.

**B — Vision pinned.** Generate concept images of the piece in the bench's world (image
gen or reference photos); owner picks 1–3; commit to `targets/<piece>/`. Committed BEFORE
the loop starts and never regenerated mid-loop to match the build — a target derived
from the implementation under test pins nothing.

**C — Physics loop (headless, numeric, fast).** Write the scenario module
(`scenarios/<piece>.scenario.mjs`, contract documented in `physics-bench.mjs`; the die
scenario is the worked reference). Grind against:

```
node utilization/foundry/harness/physics-bench.mjs die --sims=1000
```

Battery: settle ≤ K steps for every seeded throw · contained by the arena · resting pose
valid · outcome histogram over N sims within χ² tolerance. (The histogram tests the
SIM's plausibility as theater; actual fairness is RNGStreams', per the doctrine.) Then
port the tuned constants into `bench/src/<piece>-physics.ts`, die-physics shape.

**D — Mechanics wiring.** Adapter module + the one registry line. Tests: interaction →
intent through IntentEmitter only (R-23) · effect → motion through the engine seam
(view-never-owns) · forced recording ≠ seeded result → flagged, truth wins (HK-11).

**E — Visual loop (the grind).** Repeat until the owner accepts a shot:

```
node utilization/foundry/harness/shot.mjs --piece=<piece> --poses=overview,seat-0
```

1. Shoot from the BRIEF's poses (the harness drives `__GAME3D__.glideTo`).
2. Agent reads shots + targets side by side and names the deltas IN WORDS
   ("bevel too sharp · felt oversaturated · no rim light on the brass").
3. Edit materials/geometry/lighting; textures procedural (canvas) or generated,
   committed as assets.
4. Re-shoot. Keep the round log — the loop's record IS the tuning rationale.

Convergence → pin the layout contract as `VG<piece>`, eyeball frame budget on hardware.

**F — Close.** Completion row for the piece: four oracles green, VG group self-seeding,
registry line in, BRIEF + targets + round log committed.

## 4 · Generated meshes — ComfyUI + image-to-3D (TRELLIS.2)

Image-to-3D changes the mesh-authoring leg for ONE of the two kinds of geometry:

- **The archetype stays procedural.** Collider, outcome-reading geometry, attachment
  points — the piece's semantics. A die outcome reads from known face normals; generated
  topology there is a liability, and as a collider it's a performance bug.
- **The dress is swappable — and can be generated.** The visual mesh is a child of the
  archetype's body (render mesh ≠ collision mesh). Carved ship, brass medal, figurine,
  centerpiece: concept image → TRELLIS.2 → GLB, parented at an attachment point. A skin
  token binds a dress asset the way it binds a color.

Asset path: generate the CONCEPT image first in the piece's BRIEF style and lift it to
3D (keeps a set of pieces in one art style) → post-process to budget → **asset lint
before landing**:

```
node utilization/foundry/harness/asset-lint.mjs path/to/dress.glb
```

Division of labor: ComfyUI rounds run on the owner's GPU machine (a local session can
drive its HTTP API); physics/mechanics/screenshot grinding runs anywhere. The halves
meet in the repo as committed targets and committed dress assets.

License note: "commercial-safe" is a tweet, not an audit — before a pack ships
commercially, verify the weights + node-pack licenses on the record.

## 5 · Running a piece with an agent

One piece per session, destination-first: the prompt names the piece and its four-oracle
end state. Stages C and E are the grind loops. The visual loop's judge and builder may be
the same session (taste, not conformance); the repo's distinct-review discipline still
gates the CODE before the piece counts complete.
