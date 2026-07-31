# HANDOFF — Resume the TABLETOP Conformance Build here

*For ANY fresh session (any model) picking up this build. The repo is the record; no
conversation history is required or assumed. Updated 2026-07-30: **THE PHASE 4
CONFORMANCE BUILD IS COMPLETE** (tags through `k7-pass-f6`, `k7-pass-boty`,
`resolution-run-6`). Owner: Micheal Gregor.*

## Who you are

The BUILDER in a #MetaFramework Phase 4 Conformance Build. Read, in order:
1. `CLAUDE.md` (root) — THE build instruction + process contract. It governs everything.
2. `governance/Phase4_Conformance_Build_Roster.md` — the C4/B/K7/R/F/H machine.
3. `INSTRUMENTS/` — the four living instruments. The Interpretation Register
   (drift-ledger.md, I-1..I-48) is binding: registered interpretations are law;
   unregistered inventions are defects.
4. `governance/S3/` — FROZEN spec + supersessions SUP-1..3. Never edit; supersede via F.
5. `AUDITOR_CHARTER.md` — hand to any external/distinct K7 reviewer.

## State at handoff

| Facet | Status |
|---|---|
| ALL SEVEN FACETS + BOTY | **CERTIFIED & COMPLETE** (k7-pass-f1..f7, k7-pass-boty; external audits 1-4C in governance/audits/). Every completion-ledger row COMPLETE/VERIFIED |
| Vectors | **NINE OF NINE FROZEN** (V-1..V-9 in vectors/ — computed, never hand-written; a mismatch is a divergence to EXPLAIN) |
| Phase 5 | **COMPLETE — K8 PASS, tag k8-pass-1.** Target: local-first browser bench (owner-ruled Option A). Run: `cd utilization/bench && node build.mjs && python3 -m http.server 4173` → http://localhost:4173 · health check: `node run-target-check.mjs` (expect BATTERY 21/21 · DRILLS 5/5). Discharge record + operations pack in utilization/ |
| Still open (by design) | SP-6 (owner's Phase 3 channel) · ODG-e1 · the Option-B online-multiplayer supersession + other recorded revisit triggers (discharge-record.md) · the drift ledger NEVER closes |
| Suite | 253/253 (`npm test`) · `npm run ci` = tiers + build (incl. packs/boty) + test |

## Non-negotiable process (the short version)

Instruments FIRST (object-model row + axioms/base cases BEFORE code). Every decision the
S3 didn't make → Interpretation Register, never silent. Every guard ships with the test
that fails when the guard is deleted. K7 review by a DISTINCT context (fresh
session/subagent, mutation testing mandatory) before a facet counts passed; drift < 7
blocks. Owner rules at every gate — vector discharges, supersessions, and resolutions are
LIVE HUMAN decisions. Commit per increment; tag gates; push to
github.com/Micheal-Gregor/tabletop_platform (credential helper configured in-session;
a fresh environment needs the owner's PAT again).

## Standing items (on the record)

library/wire completion confirmation binds to the NEXT K7 entry (the F7 review) per
RD-1 — the same pattern MR1 followed (confirmed at the F5 K7) · at F7 design: ODG-3
(pattern-catalog shape) is an OWNER ruling — propose, don't decide · the docketed EFX
members (spawn_venture, draw_card, form_relation) run their first ExtensionContract
cycle only if BOTY's cards need them ·
ODG-e1 Clock seam still OPEN (TimeSource deferred) · EFX docket (spawn_venture,
draw_card, form_relation) grows only via ExtensionContract cycles · F6 owner doctrines
ratified at C4: Placeholder Skin (alt-text/caption complete skin — frames before assets)
+ flourish library as presentation-tier presets + SVG substrate (ODG-p1 partial) ·
after F7: `packs/boty/` (ODG-4: BOTY re-enters as the FIRST CONTENT PACK; V-4 proves
preset fidelity) · Phase 5 (utilization/) runs per its roster AFTER the build.

*The seams were preserved for this. Whoever you are, the record is enough.*
