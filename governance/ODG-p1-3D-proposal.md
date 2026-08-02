# ODG-p1 REALIZATION SUPERSESSION PROPOSAL — true 3D (WebGL) for the presentation realization

Status: **AWAITING OWNER RULING** (arc step 4; I-60). The standing law: ODG-p1 = 2.5D
tilted SVG (owner-ruled 2026-07-31, "true-3D/WebGL = a skin-era realization supersession
if ever justified"). This document is the justification case + the spike's evidence, for
that ruling.

## What the spike proved (utilization/bench/spike3d.html · commit-pinned evidence)

1. **The layout contracts survive the renderer swap UNCHANGED.** Every mesh face is
   built FROM LayoutDef regions in the same 0..100 unit space — table (TOWN_TABLE flat
   on the ground plane: the "tilt" becomes real geometry), shop boards (SHOP_BOARD
   standing at the edges), cards (FORTUNE_CARD front / CARD_BACK_PARENT back). 65
   region quads, all law-derived, zero re-declared geometry.
2. **The theater law survives.** The card flip runs UNDER HK-11 exactly as the SVG
   theater does: beginFlourish captures the seeded result; at animation complete the
   hook compares displayed ≡ seeded; truth wins. Live verdict in headless Chromium:
   `displayed "job-posting" ≡ seeded "job-posting" → in sync`.
3. **The camera law survives.** The 3D camera consumes the SAME focusPresets data
   (cx/cy → orbit target on the table plane, zoom → distance) — a pure mapping,
   stateless toward the game, like cameraViewBox.
4. **CI viability (the risk datum): PROVEN.** Headless sandbox Chromium initializes
   WebGL 2.0 (`WebGL 2.0 (OpenGL ES 3.0 Chromium)`), renders, animates, and completes
   the HK-11 handshake — the same gate infrastructure (playwright-core, screenshots,
   __SPIKE__ drill surface) drives it. rAF runs throttled headless (animations take
   ~2–10× wall time) — gates must wait on state, not timeouts (already our practice).
5. **Bundling: clean.** three.js enters as a devDependency bundled by esbuild
   (1.1 MB bundle; no runtime network). Tier law untouched — the spike imports
   presentation + packs downward, reads defs only, touches no engine, no projection,
   no state.

## What would change vs what would NOT change (the supersession's exact scope)

NOT changed (the law): LayoutDef/extendLayout/validateLayout · the parent vocabulary ·
declared shadowing · focusPresets data · FLOURISHES as data + HK-11 · D-1 unskinned
doctrine · S-6 (projection-only reads, intent-only writes) · redaction law · V-9 (the
SVG renderTable pin stands — the SVG realization REMAINS certified and maintained).

Changed (the realization): a SECOND renderer target ("3D bench") alongside the SVG
bench — meshes from defs, flourish presets mapped to 3D animations (flip · fan · draw
arc · token hop · tile lay · spinner), the visual gate extended with 3D geometry
assertions (mesh transforms vs law — the VG1 pattern; scene pins via deterministic
render probes, NOT pixel hashes).

## Decision options

- **Option A — adopt now, bench-tier:** the 3D bench becomes arc step 4's build target;
  the SVG bench stays the certified reference; the 10-game corpus (step 5) evaluates on
  BOTH renderers. Cost: parallel bench maintenance until one is superseded.
- **Option B — defer until after the 10-game corpus:** run step 5 on SVG only; the
  corpus findings (how much geometry the parents must flex) inform the 3D build. The
  spike stands as the feasibility record; nothing is thrown away.
- **Option C — reject:** stay 2.5D SVG; the spike archives as the record that 3D was
  measured, not assumed.

**Builder's recommendation: Option B.** The 3D path is proven feasible and the law
carries over — but the 10-game corpus will stress the PARENT VOCABULARY, and vocabulary
changes are cheap in SVG data and expensive in mesh code. Prove the vocabulary against
ten games first; then build the 3D realization once, against a vocabulary that has
stopped moving. (The K7 for this increment binds to the ruling's outcome commit, RD-1
pattern.)
