# 3D ROADMAP — the object-by-object program (owner-ruled 2026-08-02, I-61)

> **THIS DOCUMENT SURVIVES SESSION COMPRESSION.** The owner's standing instruction:
> the conversation will compress multiple times before the 3-D forms perform for
> players in a polished way — so THE REPO carries the program. A fresh or compressed
> session resumes by reading, in order: `CLAUDE.md` → `INSTRUMENTS/drift-ledger.md`
> (the Interpretation Register, I-1..I-61+) → `INSTRUMENTS/RESOLUTION_RECORD.md` →
> THIS FILE → the per-object status table below. Then: `git pull --tags`, run
> `npm run ci && npm run gate:visual && npm run gate:target`, and continue at the
> first ⬜ row. Never re-decide a ✅ or a recorded ruling — supersede on the record.

## The ruling and the program

**ODG-p1 superseded (2026-08-02):** 3D (three.js, bundled devDependency) is the BUILD
TARGET. The SVG realization remains the CERTIFIED REFERENCE — V-9 and the SVG gates
keep running; nothing certified is abandoned.

**Three phases, strictly in order:**

- **PHASE A — BOTY in 3D, object by object** (with the owner, one object per gated
  increment): every v2 object from `governance/audits/V2-LIVE-OBJECT-INVENTORY.md`
  gets its 3-D form, driven by the SAME LayoutDefs, animated by the SAME flourish
  presets under HK-11, fed by the SAME projection (S-6 law: project() reads,
  emit()+submit writes — the 3D bench becomes PLAYABLE, not just visible).
- **PHASE B — DRAFT 3D parents:** with BOTY whole, review the parent vocabulary
  object-by-object for its 3-D representation; produce DRAFT parent revisions
  (data-first — I-50 law; mesh builders adapt to data, never the reverse). Owner
  rules on each draft.
- **PHASE C — the 10-game corpus** (`governance/game-design/`, DEFERRED not dropped):
  parent-robustness via refusal/suppression signals · core-vs-child promotion
  economics via measured repetition · the borrowable layout catalog. Runs against the
  post-Phase-B vocabulary.

## Standing law that carries into every 3D increment (pointers, not copies)

- Geometry source = LayoutDefs ONLY (I-60a); physical aspect/depth = realization
  freedom (I-48b); regions are law, refusals at the extension door (I-50).
- Theater: animations are FLOURISH data presets; HK-11 at completion — displayed ≡
  seeded, truth wins (proven in 3D at the spike, I-60b).
- Camera: focusPresets data mapped pure (I-60c); stateless toward the game.
- Unskinned until the owner opens the skin era (D-1); the v1 grammar waits in
  `packs/boty/skin-token-candidates.md`.
- Gates: DOM/scene-geometry assertions + computed pins; NEVER pixel hashes (I-57c);
  wait on STATE never clocks (headless rAF throttles, I-60f); kill-first-then-claim
  (I-58 corrective); every increment: instruments → build → gates → K7 (distinct
  reviewer, mutations); register wording grep-falsified (I-58, 8 strikes on record).
- Redaction: own-cards only on the viewing seat's surfaces; VG6 data-true pattern.
- Recorded survivors bind to REGISTER triggers (M-AR + slice-ordering precedents).

## PHASE A worklist — v2 objects → 3D (one ✅ per gated increment; owner playtests each)

| # | Object (v2 def) | 3D form | Animations (flourish presets) | Interactions (verbs via emit) | Status |
|---|---|---|---|---|---|
| A1 | The stage: table (boty:town-table) + camera + lighting-free ground | table plane flat, region quads, world scale | camera glides between presets | preset buttons · wheel dolly · click-to-focus | 🔶 BUILT (game3d.html, I-62, VG8a–d kill-first) — awaiting the owner's playtest verdict |
| A2 | Deck + draw | card-back stack w/ count | draw arc: top card lifts → flies to focus → FLIP under HK-11 | click deck → draw verb → drawn card modal-in-3D | ⬜ |
| A3 | Fortune/character card (boty:fortune-card) | front/back card mesh (spike-proven) | flip · zoom-to-camera (modal-as-card in 3D, I-51a) | click to zoom/dismiss | ⬜ spike partial |
| A4 | Round preamble + round card (boty:round-preamble/round-card) | sequenced zoomed cards | deal-in → flip → advance | click advances the queue (I-55a sequence) | ⬜ |
| A5 | Shop board (boty:shop-board) | standing board at the seat edge | none (static frame) | click regions route like the SVG bench | ⬜ spike partial (static form exists) |
| A6 | Tradesperson (boty:tradesperson-card) | mini standing card in the crew rack | select-lift · assign-hop to portion slot · work-bounce | select → assign → work (the v4 loop, in 3D) | ⬜ |
| A7 | Job/venture cards on global-play (boty:job-card) | flat cards on the table w/ portion slot quads | lay-down when spawned · slot fill on assign | spawn (buttons) · portion click w/ crew selected | ⬜ |
| A8 | Windows/prompts | amber prompt card standing in prompt-zone | pop-in | option click → decide verb | ⬜ |
| A9 | Hand fan (redaction-honest, I-59d) | fanned card meshes at the viewing seat only | fan spread (spike-proven) · card raise on hover | click to zoom | ⬜ spike partial |
| A10 | Books panel (boty:books) | zoomed panel (modal-as-card pattern) | slide-in | tab = ui-state; fills from projection (I-56d) | ⬜ |
| A11 | Rivals + gallery | carousel of standing rival-summary boards · card grid | page-turn | prev/next/close · filter chips (CARD_KINDS) | ⬜ |
| A12 | Standings + log + chrome | flat panels on the table + HTML chrome (I-51d) | active-row pulse (structural) | row click → camera focus | ⬜ |
| A13 | Persistence + drills parity | — | — | autosave/resume/export; GD + VG gates extended to the 3D bench | ⬜ REQUIRED for Phase A completion |
| A14 | Dice + spinner + tile-lay forms | placeholder meshes (no verbs in slice — nothing false) | throw/spin/lay presets AUTHORED as data, exercised in exhibit mode | — until mechanics increments | ⬜ |

**Definition of Phase-A done:** the full BOTY loop of the SVG bench v7 playable in 3D
(A1–A13), every increment K7-passed, the 3D gates green, and the owner has playtested
each object ("really perform for the players" is the owner's acceptance bar).

## Status ledger (append per increment — id · commit · K7 tag · owner playtest verdict)

| Increment | Commit | K7 | Owner verdict |
|---|---|---|---|
| Spike (feasibility exhibit) | 6294d06 | k7-pass-3d-adoption | ruled: adopt (2026-08-02) |
| A1 the stage (game3d shell) | 2a699ad | K7 PASS (tag rides the playtest) | awaiting owner playtest |
