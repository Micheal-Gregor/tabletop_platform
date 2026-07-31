# BOTY v1 source screens — the v1-extraction increment's SOURCE DOCUMENTS

Owner-supplied screenshots of BOTY v1 (https://boty-web.vercel.app), delivered
2026-07-31 for the v1-extraction increment (RESOLUTION_RECORD "v1-extraction increment"
row · I-51 · tag `k7-pass-v1x`). These nine files are the measured source for
`packs/boty/src/layouts.ts` and the bench-v5 composition, archived here so any
third-party audit has FIXED source documents inside the repo.

**Erratum (owner, on the record):** the original upload included three TABLETOP
showcase PNGs attached in error ("sorry - 3 of the showcase images included in
error"); the owner re-posted without them. Those PNGs are EXCLUDED here and were
never source material.

## Manifest (sha256)

| File | Screen | What was measured from it |
|---|---|---|
| 01-landing.jpg `7f117adf…e24c0` | Landing page | full-bleed art, centered title, single gold CTA — menu grammar (chrome/skin era, not layout law) |
| 02-home-menu.jpg `188463ff…92a01` | Home menu | gold-primary / dark-secondary stacked buttons — color grammar (skin-token candidates) |
| 03-play-online.jpg `d11ff813…c0545` | Play Online | twin Host/Join panels, MAPLE-XXXX code — production-concern surface (Option B revisit trigger), not layout law |
| 04-lobby.jpg `7e4a4b84…1b94a` | Lobby | code chip, player row w/ you/host badges, trade chips, +Add CPU — presence/chrome grammar |
| 05-ingame-3col.jpg `85a3e004…fc3d15` | In-game desktop (round 1) | THE core anatomy: table panel (standings rows + TABLE LOG) → `boty:town-table` adds; shop column (art banner · identity·trade · cash+overhead · building tier · TRADESPEOPLE · EQUIPMENT · JOBS · AR/AP · actions) → `boty:shop-board`; Fortune column (deck stack "59 left" + drawn card) → deck-count grammar + `boty:fortune-card` |
| 06-ingame-job-active.jpg `6d0e39a6…d84d3` | In-game, job active | jobs-list row anatomy (progress · net · due · crew · sticky · Hold), owned-equipment card w/ Dispose — `boty:shop-board` jobs-list/equipment regions |
| 07-round2-interstitial.jpg `e14a2222…2c3f7` | Round 2 modal | `boty:round-card`: art ~50%, "Round N · Season" title, italic lore, gold callout ("CPU 2 leads off"), one action — modal-as-card (I-51a) + the callout-derives-from-truth lesson (K7-v1x D2) |
| 08-round1-interstitial.jpg `7ac92ccd…134aaf` | Round 1 modal | same child, second instance — one layout law, two contents |
| 09-card-drawn-character.jpg `5d30a0db…8c155` | Character card modal | `boty:fortune-card`: art-dominant (~70%), name, italic org subtitle, effect line — the drawn card and the character card are ONE child |

Full hashes: run `sha256sum governance/audits/sources/v1-screens/*.jpg` and compare
against the audit charge's attestation step.
