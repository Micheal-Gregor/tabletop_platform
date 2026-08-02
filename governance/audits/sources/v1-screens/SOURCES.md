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

## Round-2 captures (owner-authenticated live session, pushed 2026-08-01)

Renamed into the numbered convention CONTENT-UNCHANGED (git mv); the owner's original
filenames and byte-identical duplicate re-uploads of screens 01–09 (plus the EXT-5
auditor's measurement crops) are preserved in `archive-uploads/`.

| File | Screen | What it documents |
|---|---|---|
| 10-books-balance.jpg `4e34b385…d88734` | **Books · Balance Sheet tab** | THE F5 source: panel title "The books · {seat}", P&L/Balance tab pair, section rows (Assets/Cash · Liabilities/none · Equity/Owner's capital + Retained earnings **with negative-red**), Liabilities+equity total, "The books always balance." reconciliation line, footer nav w/ Books active. Geometry source for `boty:books`/PANEL_PARENT. **⚠ P&L tab NOT yet captured** — its rows are inventory/Report-5-documented; the cash-vs-paper callout's geometry stays DEFERRED until a P&L capture exists |
| 11-settings-over-books.jpg `23c3f019…dcae97` | Settings modal (scrolled) | $/W display unit ($50 per W), rivals'-cards-popup options, confirm-before-end-turn, card-animation copy ("the on-card buttons are gone, so the art shows uncluttered" — the F1 art-dominance corroboration) |
| 12-round-preamble-live.jpg `d9e04933…3a0e3d` | "🎲 Who goes first?" live | `boty:round-preamble` validation: small die glyph, gold callout "You lead off Round 1!", italic lore ("lead-off rotates one seat clockwise each round"), single Next ▶ |
| 13-cards-gallery.jpg `3c613b76…fb7c4c` | "Your cards" gallery live | tile grid with TYPE BADGES (TRADESPERSON · JOB), per-tile stat sublines, the SIX filter checkboxes (the CARD_KINDS vocabulary live), Close — gallery + tradesperson/job card children validation + future measurement source |
| 14-rivals-carousel.jpg `478dbd46…299404` | Rivals carousel live | `boty:rival-summary` validation: prev/next paging, identity "·mechanic", gold cash, "Garage · cap 2", shop art, CREW(1) chips, EQUIPMENT none, JOBS(1) chips, Close — and NO local-play/hand (the suppression is v1-true) |
| 15-endturn-confirm.jpg `a44184f6…13640e` | "End turn?" confirm | the settings' confirm-before-ending-turn dialog — product chrome (I-51d) |
| 16-how-to-play.jpg `f572504d…0427b77` | How-to-play doc | rules text: THE GOAL (cash ≠ profit — the Books teaching), EACH ROUND, CREW & EQUIPMENT (one tool per worker), JOBS (walk-ins vs ladder **J1–J6**, factor/sell — the I-55d deferral's future source), WORKING TOGETHER (referrals/finder's fee/civic levy), GROWING |
| 17-save-and-leave.jpg `293f24b9…4efd51` | Save & leave confirm | stand-in-covers-your-seat copy — Option B/production chrome |
| 18-books-pnl.jpg `e33390b2…` | **Books · P&L tab** | THE I-56b deferral's source: Revenue (+contract/other lines) · −COGS (labour/subcontract/materials) · Gross margin (gold) · −Overhead (rent/insurance/licenses/legal) · Net income · **the cash-vs-paper CALLOUT box** (net-income-on-paper vs cash-in-bank + "Profit isn't cash… that gap is the whole game") — measured at ~76–99% of panel height, below the total row. BONUSES: red dashed levy banner ("Town Hall cost overrun — $50/turn levy · 3 rounds left") = the danger-accent grammar on a TIMED EFFECT; CPU 4 struck-through + skull in the presence row = the ELIMINATION treatment (skin-era candidates both) |
