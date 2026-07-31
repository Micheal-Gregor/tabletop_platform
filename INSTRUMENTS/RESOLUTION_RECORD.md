# R — Resolution Run Record · TABLETOP

Live human gate, per-abstraction. RC-3 order: resolution RECORDED first, body filled second.

| Gate | Disposition (human decision, dated) | Operationalized as |
|---|---|---|
| ODG-4 · BOTY migration | **GREENFIELD + BOTY-as-first-content-pack** — owner-approved 2026-07-25 at the C4 anchor ("approve all"). The shipped BOTY codebase is never refactored into the platform; it re-enters as content, validated by V-4 preset fidelity. | Build per S3 order; `packs/boty/` authored after F7; V-4 discharges against it |
| ODG-p1 · realization (substrate only) | **SVG** as the piece-rendering substrate — owner input ratified 2026-07-25. Full technique designed at F6 (last), still under ODG-p1's remaining scope. | F6 SkinBinder/renderers target SVG; technique detail = F6 design gate |
| D-1 · Placeholder Skin | **RATIFIED** 2026-07-25 — platform ships a built-in COMPLETE skin: visual tokens → alt-text, sound tokens → transient self-removing captions. Frames-before-assets is platform doctrine. | F6: `placeholder-skin` shipped in packages/presentation; satisfies R-21/R-22 by completeness; doubles as MP9 floor; SP-2 goes upstream |
| D-2 · Flourish library | **RATIFIED** 2026-07-25 — reusable experience presets at the presentation tier, bound to kind/join contracts, opt-in, promotable pack-local → library. Theater law (HK-11) governs. | F6/F7: flourish presets in packages/patterns (presentation tier); SP-3 goes upstream |
| Stack | **TypeScript monorepo** ratified 2026-07-25: packages/engine (F1–F5, F7) · packages/presentation (F6, own package per S-6) · packages/patterns · packs/ · Vitest · HK-6 as CI rule. | Repo scaffold; tools/check-tiers.mjs fails the build on upward imports |

## Deferred-vector discharge log

| Vector | Status | Note |
|---|---|---|
| V-2, V-3 | **DISCHARGED 2026-07-25** — owner-approved R gate ("yes") | computed from the certified F2 implementation (DISCHARGE run), persisted vectors/V-2.json + V-3.json, re-derived same-run and on every suite run (vectors.test.ts); refusal-not-repair applies — a mismatch is a divergence to explain |
| V-7, V-8 | **DISCHARGED 2026-07-25** — owner-approved R gate ("yes") | computed (DISCHARGE run), persisted vectors/V-7.json + V-8.json, re-derived every run; MR1 CC-5 satisfied — completion confirmation binds to the next K7 entry (RD-1) |
| V-1, V-4, V-9 | DEFERRED | V-1 post-F5 (I-14) · V-4 at F7 (BOTY pack) · V-9 at F6 |
| R gate 2 (F3) | **V-5 + V-6 DISCHARGED** — owner-approved 2026-07-25 ("yes, discharge") | computed (DISCHARGE run), persisted vectors/V-5.json + V-6.json, re-derived every run; 135/135 |
| SP-4 → SUP-2 | **EXECUTED** 2026-07-25 — ontology-mutation authority wording + P13 fold | governance/S3/TABLETOP_Phase3_Supersession_SUP-2.md |
| I-20 → SUP-3 | **RESOLVED** 2026-07-25 — "12 kinds" = pre-merge artifact; the truth is ELEVEN named + open family | governance/S3/TABLETOP_Phase3_Supersession_SUP-3.md |
| ODG-3 (pattern-catalog shape) | **RESOLVED 2026-07-30** — owner ruled "Option 3": data-first presets with THIN BUILDERS. The artifact is DATA (a declarative fragment); each catalog entry pairs the fragment-builder with its BOTY-inventory doc reference (defaults embedded in builder signatures — noted per K7-F7 D4); builders EMIT DATA ONLY — never engine calls, never state. V-4 pins built fragments' behavior (VK-8). Registered I-41 | catalog = 6 VNT (project/civic/routed/incident/expansion/job) · 3 RTM (subcontract-debt/commission-now/deferred-referral) · 9 IWN (threat/court/damages/settle/poach/mayor/referral/routing/estate) · 2 TFX (modifier/global) + closing defaults — per BOTY inventory §2/§5 + stage-2b §6 |
