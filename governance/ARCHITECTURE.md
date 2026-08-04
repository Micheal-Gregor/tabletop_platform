# ARCHITECTURE.md — the repo map and TOUCH BOUNDARIES (owner-requested 2026-08-02)

> Read this BEFORE editing anything. It says where each kind of work lives, what an
> increment MAY touch, and what is FROZEN. A change outside an increment's lane is a
> defect for K7 to catch, not a preference. This file rides the compression-surviving
> resume ritual (CLAUDE.md → instruments → 3D-ROADMAP.md → THIS FILE).

## The repo, top-down

| Area | What it is | Touch rule |
|---|---|---|
| `packages/engine/` | F1–F5+F7: kernel, guard, log, turn machine, decks, windows, effects, mechanics, transport | **FROZEN for the 3D program.** Zero commits since the program began (verified 6294d06..HEAD). Changes only via their own facet increment + K7, never as a side effect of presentation work |
| `packages/presentation/` | F6: projector (S-6 reads), emitter, layouts/parents, focusPresets, theater/flourishes, skin tokens | **LAW SURFACE — touch only with a register row.** The 3D program has touched exactly ONE function (focusPresets, I-65a, additive: n≤3 output byte-identical, F6 pin intact) |
| `packs/boty/` | Content tier: the certified 3-seat slice + layouts + the 6-up exhibit variant | Content is DATA and adds no law. The certified slice (BOTY_PACK/botyGenesis) is frozen; the 6-up variant (BOTY_PACK6, I-65e) is the 3D bench's sandbox — additive edits only |
| `utilization/bench/src/*.ts` | **THE 3D BENCH — where the whole Phase-A program builds.** Since I-71 split into `game3d.ts` (orchestration: buildScene, draw theater, interaction, tick, `__GAME3D__` gate surface) + `stage.ts` (shared primitives) + `surfaces.ts` · `stacks.ts` · `camera.ts` · `onion.ts` | A 3D increment touches its component MODULE(s) + a registration in `game3d.ts` buildScene + `visual-gate.mjs` + the records. `game.ts`/`spike3d.ts` stay FROZEN |
| `utilization/bench/visual-gate.mjs` | The visual regression gate (VG1–VG8j) | Touched by every increment that adds law — checks land WITH the code, kill-first |
| `utilization/bench/src/game.ts` | The SVG bench v7 — **THE CERTIFIED REFERENCE (V-9)** | **FROZEN.** Zero commits since the 3D program began. Supersession only by owner ruling |
| `utilization/bench/src/spike3d.ts` | The 3D feasibility spike | **FROZEN exhibit (I-60)** |
| `INSTRUMENTS/` | The register (drift-ledger), resolution record, completion ledger | Append/supersede-only records — touched by EVERY increment by design; never rewritten |
| `governance/` | Rosters, the 3D roadmap, audits, sources, THIS file | Records — append/update rows only |
| `vectors/`, `visual-pins.json` | Computed pins | Re-derived only; re-pin only in a commit naming the cause (I-57b) |

## The increment lane (what one 3D increment touches)

Normal lane (since the I-71 split): the increment's **component module**
(`surfaces.ts`/`stacks.ts`/`camera.ts`/`onion.ts`, or a NEW bench-local module) +
its **registration in `game3d.ts`** (buildScene/tick/interaction) + `visual-gate.mjs`
+ the three record files (drift-ledger, RESOLUTION_RECORD, 3D-ROADMAP). Keeping new
work in its own module (thin registration in game3d.ts) is what lets parallel
increments run in isolated worktrees without colliding — see the parallel program.
Verified across the shipped tags: A1b/A1d/A2/A2b each touched 3–5 files, all in-lane.

Excursions REQUIRE their own register row naming the file and why:
presentation (a data-law change, e.g. I-65a) · packs (content data, e.g. the 6-up
variant) · game3d.html (chrome). Anything else → stop, propose first.

## Known debt (recorded, not hidden)

- ~~`game3d.ts` is one growing file (~730 lines…). Proposed … split into bench-local
  modules…~~ **RESOLVED 2026-08-03 (I-71, pure refactor, behavior-identical — pins
  byte-unchanged, 37/37):** game3d.ts (835→381 ln) split into `stage.ts` (shared
  three.js primitives + status()), `surfaces.ts` (pure builders), `stacks.ts`,
  `camera.ts` (ladder + pose state + tickGlide), `onion.ts` (reading board). game3d.ts
  keeps the engine binding, buildScene, draw theater, interaction, tick(), and the
  `__GAME3D__` gate surface.
- The full visual gate runs ~8 min headless (flight animations under throttled rAF);
  budget K7 runs accordingly.

## Session hygiene

The session is DISPOSABLE; the repo is not. Everything needed to resume lives here
(CLAUDE.md ritual → instruments → roadmap → this file). Ending a long session and
starting fresh is safe at any sealed increment — and preferable to a bloated context.

## PIPELINE v2 (owner-ruled 2026-08-03; source: governance/reference/Build-analysis-2026-08-03.md)

The owner's direction: the UI file is too large, per-step development has bogged down —
limit UI size and run parallel agents. Adopted, adapted to THIS repo's laws:

**ADOPTED as law:**
1. **Module decomposition of the 3D bench.** `utilization/bench/src/game3d.ts` (731
   lines) splits into `src/game3d/`: a thin SPINE (`game3d.ts` entry: engine binding,
   scene, tick, module wiring ONLY) + leaf modules — `camera.ts` (presets/glide/ladder),
   `stacks.ts` (card stacks + fidget), `onion.ts` (reading board + draw theater),
   `panels.ts` (panel/panelTexture/layoutFace/backdrop), `input.ts` (pointer/wheel/bar),
   `surfaces.ts` (__GAME3D__). Named exports only; no circular imports; a module's
   public surface is its exports — consumers never reach into internals.
2. **THE SIZE GATE: ≤300 lines per implementation file** in the bench source, enforced
   in CI (a real check that FAILS the build, not advice). Exceed it → extract a
   subordinate module in that same increment.
3. **Parallel-agent protocol.** Before fan-out: freeze the spine's exports + the module
   contracts (recorded in this file). Each agent gets ONE leaf module (or disjoint
   subtree) in its OWN git worktree; editing outside the assignment is a defect. A
   public-export change requires updating the contract here in the same commit. Merges
   land ONE at a time; the FULL battery (ci + gate:visual + gate:target) runs green on
   each merged result before the next merge; K7 reviews each merged increment.
4. **Gate partitioning (the ACTUAL bottleneck).** Measured: esbuild is ~3s — build time
   is NOT the problem; the ~8-minute full visual gate per iteration is. The gate gains
   suite flags (`--suite=svg | --suite=3d | --check=VG8x`) so an agent iterates on ITS
   OWN checks in seconds-to-a-minute and the FULL battery runs at merge/K7 only. The
   full battery remains the only thing that seals an increment.

**DEFERRED (recorded, not dropped):** dynamic `import()` / lazy loading, tree-shaking
budgets, `platforms/` device adapters, per-component versioned packages — production/
skin-era concerns; the bench has no bundle-size or route problem yet. Responsive layout
is already owned by the camera ladder (owner-ruled A1c/A1d), not CSS trees.

**Migration path (the doc's §6, as increments):** (1) the split refactor — pure
behavior-preserving, gates unchanged and green, K7 verifies identical; the extraction
itself MAY be parallelized (one agent per extracted concern against the frozen spine
interface); (2) the size gate lands WITH the split; (3) first parallel pilot: A3
(fortune card in the reading board) + A4 (round preamble + the tossed die) in separate
worktrees, merged one at a time. The owner rules per increment as always.

### Pipeline v2 — STATUS RECONCILIATION (2026-08-03, same day)

The section above was recorded while a PARALLEL SESSION was already executing the same
owner direction — the rebase surfaced its work. Reconciled against reality:

- **EXECUTED (by the parallel session, K7-passed):** the split refactor (I-71,
  k7-pass-split) — as-built layout is FLAT files in `src/` (stage · surfaces · stacks ·
  camera · onion · die · ledger · box + the game3d.ts spine), which SUPERSEDES the
  `src/game3d/` directory shape proposed above; gate-server ports parameterized for
  parallel worktrees (I-72); the FIRST PARALLEL BATCH already ran — A4 die + A10 ledger
  + A15 box in worktrees, integrated serially (I-73/I-74/I-75/I-76) — so the "pilot"
  is done, with a different (larger) roster than the A3+A4 proposed above; A3/A3b also
  landed (I-69/I-70).
- **STILL OPEN from Pipeline v2:** (1) the CI SIZE GATE is not yet enforced — and two
  files already exceed 300 lines (the spine game3d.ts at 518; die.ts at 306): the gate
  lands WITH a trim-or-recorded-exception decision per file; (2) the visual-gate SUITE
  FLAGS (--suite / --check) are not yet implemented; (3) the owner's playtests of
  A3/A3b, A4, A10, A15.
- **COORDINATION LAW (learned the hard way just now):** ONE active build session at a
  time. Two sessions pushing main races (non-fast-forward). The newer session is the
  active thread; an older session hands off by pushing its records and STOPPING.

### The Component contract (the public seam — updated WITH its changes, law #3)

- **v2 (Q-2b, I-91):** `onGrabStart(ctx, hit): boolean` (pointerdown raycast claims the
  drag) · `onGrabMove(ctx, ev)` · `onGrabEnd(ctx, ev): boolean` (true = consumed).
- **v3 (S-1, I-103 — the K7-Q preconditions for R-1):** `onGrabAbort(ctx)` joins the
  contract — the spine calls it when a claim cannot complete (a rebuild mid-grab, a
  `pointercancel`, a throwing `onGrabEnd`); the component settles its gesture home.
  Spine guarantees: claims are PER-POINTER (`Map<pointerId, Component>`, captured, a
  `pointercancel` listener); the claim releases in a `finally` — a throw can never
  freeze input; `buildScene` aborts every live claim except the one whose release is
  executing; the camera WHEEL is gated on `grabActive()`. Gate: `VG8q` (5 kill-first).
  R-1 physics rides THIS contract; component-internal multi-pointer is R-1's business.

### Dependencies (updated WITH their excursions — the D17 lesson)

- **`@dimforge/rapier3d-compat@0.19.3`** (R-1a, I-109; noted here at I-115 after K7-R
  found this section owed): the bench's physics engine — the owner's dice-shaker version,
  wasm INLINED (no fetch; async `init()` at die.ts module load; every draw path gates on
  `dicePhysicsReady()` BEFORE consuming the LCG stream). Bundled by esbuild into
  game3d.js (1.3→3.5 mb — accepted; bundle budgets are a skin-era concern). The bench
  ONLY — engine/presentation/packs never import it (HK-6 enforces).
