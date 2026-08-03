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
