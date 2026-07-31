# K7 AUDIT REPORT 5 — Visual conformance: the v1 extraction vs its source documents

Independent external audit (K7-style, no builder context). Charge:
`governance/audits/AUDIT-EXT-5-charge.md`. Scope: the `k7-pass-v1x` increment
(f94e51c..e7e3765) + the archived sources (77a2b8a). Doctrine: refusal-not-repair —
nothing in the repo was modified except this report.

---

## Step 0 — SYNC + ATTEST (attestation block, verbatim)

```
$ git fetch --tags && git pull
Already up to date.

$ git rev-parse HEAD
62e7066820e6c03136df25907d21f11777955b8d

$ git describe --tags
k7-pass-v1x-2-g62e7066

$ git tag -l k7-pass-v1x
k7-pass-v1x
```

- **HEAD at/after 77a2b8a?** YES — `git merge-base --is-ancestor 77a2b8a HEAD` → true.
  The two commits between the tag and HEAD are audit scaffolding only:
  `77a2b8a` (archive the nine v1 screens) and `62e7066` (this audit's charge). No code.
- **Tag `k7-pass-v1x` exists?** YES.

### Source hash attestation — `certutil`/`sha256sum` vs SOURCES.md

| File | Computed SHA256 | SOURCES.md prefix…suffix | Match |
|---|---|---|---|
| 01-landing.jpg | `7f117adf…e1de24c0` | `7f117adf…e24c0` | ✅ |
| 02-home-menu.jpg | `188463ff…48792a01` | `188463ff…92a01` | ✅ |
| 03-play-online.jpg | `d11ff813…21f9c0545` | `d11ff813…c0545` | ✅ |
| 04-lobby.jpg | `7e4a4b84…ff21c1b94a` | `7e4a4b84…1b94a` | ✅ |
| 05-ingame-3col.jpg | `85a3e004…748fc3d15` | `85a3e004…fc3d15` | ✅ |
| 06-ingame-job-active.jpg | `6d0e39a6…23c08d84d3` | `6d0e39a6…d84d3` | ✅ |
| 07-round2-interstitial.jpg | `e14a2222…5c42c3f7` | `e14a2222…2c3f7` | ✅ |
| 08-round1-interstitial.jpg | `7ac92ccd…ec58134aaf` | `7ac92ccd…134aaf` | ✅ |
| 09-card-drawn-character.jpg | `5d30a0db…c9138c155` | `5d30a0db…8c155` | ✅ |

**All nine hashes match. Attestation PASSES.** The archived sources are exactly the
bytes SOURCES.md pins; the clone is at/after 77a2b8a with the tag present. Audit proceeds.

---

## Step 1 — SOURCE FIDELITY (live walk vs the nine archived screens)

Opened `https://boty-web.vercel.app`. **Landing was walked live; the rest of the flow is
now gated behind an authentication wall that did not exist in the archived flow.**

- **Landing → `01-landing.jpg` — FAITHFUL (live-verified).** DOM tree: image "Business of
  the Year", "🎀 The Maple Hollow Better Business Bureau presents", heading "Business of
  the Year", subtitle "Run a trade. Outwork your rivals. Be named the pride of Maple
  Hollow.", single gold CTA "▶ Enter Maple Hollow", "Click to begin — and to turn the
  sound on." Full-bleed art + centered title + single gold CTA — the menu grammar of 01.
- **Enter → sign-in wall (NEW, not in the archived set).** Clicking "Enter Maple Hollow"
  now lands on a one-time-email-code sign-in form: *"Testers sign in with a one-time email
  code — no password to remember."* + email textbox + "Email me a code ▶". No guest / "Play
  (this device)" / local path is exposed pre-auth. The archived flow (02-home-menu → 03
  Play Online → 04 lobby → 05+ in-game) is reachable only after authenticating.
- **Screens 02–09 — NOT live-reproducible this session.** Completing a one-time-code email
  sign-in is account authentication; per my operating constraints I did not perform it and
  did not sign in as the owner. I therefore could not walk home-menu → Play Online → lobby
  → in-game → round card → drawn card on the live site.

**Verdicts, 02–09:** assessed against the *attested* archived sources + cross-screen
internal consistency (the strongest evidence available without authenticating):

| Screen | Verdict | Basis |
|---|---|---|
| 01 landing | **FAITHFUL** | live DOM matches |
| 02 home menu | consistent-with-source (live-unverified) | gold-primary/dark-secondary stacked buttons; not falsified |
| 03 play online | consistent-with-source (live-unverified) | twin Host/Join, MAPLE-XXXX code |
| 04 lobby | consistent-with-source (live-unverified) | code chip MAPLE-LB2B, you/host badges, trade chips, +Add CPU, red "Leave" |
| 05 in-game 3col | consistent-with-source (live-unverified) | see Step 2 — anatomy matches the coded children |
| 06 job active | consistent-with-source (live-unverified) | jobs-list row + owned-equipment/Dispose |
| 07 / 08 round modals | consistent-with-source (live-unverified) | card-shaped interstitials, see Step 2/3 |
| 09 card/character | consistent-with-source (live-unverified) | see Step 2 |

No FABRICATED indicators: the nine screens depict one coherent session (Maple Hollow ·
Spring · round 1/24 · Jumpin_Jack the mechanic · $3,350 · Fortune "59 left" · the same
street/garage art recurring across 01/05/06 · Hal Ramsey's card and the "Win the county
fair raffle / +$550" drawn card matching). The **only structural drift observed live is
the added auth gate** — a production-concern / chrome surface (SOURCES.md itself flags
Play-Online as a "production-concern surface," not layout law), not a change to any of the
four coded layout children. Recorded as **Finding 2 (major — audit-coverage gap)**.

---

## Step 2 — MEASUREMENT CONFORMANCE (do the coded children encode the screens?)

Read `packs/boty/src/layouts.ts` + parents in `packages/presentation/src/layout.ts`
(CARD_PARENT art = y16/h38 → the "parent's 38% stands" baseline). Pixel-measured the
archived JPEGs by panel/art bounding-box detection (brightness thresholding). Tolerance
±8 percentage points of card height.

### 2.1 `boty:fortune-card` (coded art y=4, **h=52** → 52% of card height, top)

Measured v1 art fraction (art-tile height ÷ full-card height), three instances:

| Instance | card top→bottom (px) | art top→bottom (px) | **art %** |
|---|---|---|---|
| 09 character **modal** (full-bleed, cleanest) | 100 → 771 (671) | 122 → 580 (458) | **≈ 68%** |
| 09 Fortune-**column** drawn card | 282 → ~726 (~444) | ~322 → ~609 (~287) | **≈ 65%** |
| 05 Fortune-**column** drawn card | ~150 → ~400 (~250) | 150 → 344 (194) | **≈ 75%** |

**Measured range ≈ 65–75% (center ~70%). Coded 52%. Gap ≈ 13–23pp — outside ±8pp even at
the most conservative reading (68% modal → 16pp).** This matches SOURCES.md's own
"art-dominant (~70%)" and I-51b's "55–70%", both of which the code fails to reach — the
child is coded *below the increment's own stated art-dominance band*. **→ Finding 1
(blocking).**

- **Order** art → title → subtitle → text → payout: **matches** v1. Character modal:
  art → "Hal Ramsey"(title) → "Chamber of Commerce"(org-subtitle) → effect(text) → foot.
  Column card: art → title → quote(text) → "+$550"(payout). ✅
- **`modifiers` genuinely absent in v1:** ✅ — v1 cards carry no keyword/status strip;
  correctly `suppress`ed.
- **Nothing material missing:** the child models the *payout-foot* (column) variant; the
  character-**modal** instance ends in a "Next ▶" button instead of a payout. That button
  is the modal-dismiss affordance (bench dismisses by clicking the card, I-51a) — chrome,
  not card anatomy. Noted as **Finding 3 (minor)**, not material.
- **`shadowed` in code + test:** `{overridden:[art,title,text], added:[subtitle,payout],
  suppressed:[modifiers]}` — code == test == measured shadowing. ✅

### 2.2 `boty:round-card` (coded art y=4, **h=50** → 50%)

Measured v1 round-modal art fraction:

| Instance | card (px) | art (px) | **art %** |
|---|---|---|---|
| 08 round-1 modal | 170 → 894 (724) | 194 → 629 (435) | **≈ 60%** |
| 07 round-2 modal | 105 → 740 (635) | 130 → 469 (339) | **≈ 53%** |

**Measured ≈ 53–60% (mid ~56%). Coded 50%. Mid gap ≈ 6pp — within ±8pp (the 08 single
reading, 60%, sits ~10pp, at the edge).** Charge/SOURCES claim round art "~50%", which the
code matches; **round-card art CONFORMS** (reported edge noted). Anatomy art → "Round N ·
Season" title → italic lore(text) → gold callout → single action button: **matches** (08:
"Round 1 · Spring" → lore → "✨ You lead off — clear this and make your move!"(callout) →
"Next ▶"). `modifiers` absent ✅. **Modal-as-card (I-51a):** the interstitial is a rounded,
art-topped **card**, not a generic dialog — confirmed on 07 and 08. `shadowed`
`{overridden:[art,title,text], added:[callout,action], suppressed:[modifiers]}` — code ==
test == measured. ✅

### 2.3 `boty:shop-board` (BOARD_PARENT thickened; 6 overrides, 6 adds, 0 suppress)

Coded vertical anatomy vs 05/06 middle column, top→bottom:

| Coded region | v1 structure in 05/06 | present? |
|---|---|---|
| art-banner (add) | garage-interior banner | ✅ |
| identity (override→title) | "Jumpin_Jack · mechanic" | ✅ |
| counters (override) | "$3,350 · overhead $100/turn" | ✅ |
| building-tier (add) | "🏠 Garage · tier 1 · cap 2 · Move — Shop" | ✅ |
| crew (override→crew-zone) | **TRADESPEOPLE (1/2)** rack (Etta M., Fire, +Hire) | ✅ |
| equipment (override→equipment-rack) | **EQUIPMENT** buy/rent + owned "Basic Tools · Dispose" (06) | ✅ |
| jobs-list (add) | **JOBS** rows: progress·net·due·crew·sticky·Hold (06) | ✅ |
| ar (add) | "RECEIVABLES (AR) — OWED TO YOU" | ✅ |
| ap (add) | "PAYABLES (AP) — YOU OWE" | ✅ |
| actions (add) | "Bank Credit · End turn ▶" | ✅ |

All **six adds correspond to real v1 structures**; TRADESPEOPLE→`crew`, EQUIPMENT→
`equipment` (overrides, semantic role preserved: crew-zone / equipment-rack). **No v1 shop
structure of the same rank is silently missing.** Column order matches. The two remaining
overrides — `local-play`(play-zone) and `hand`(hand-anchor) — are *carried parent regions*
with no distinct v1 shop counterpart; they render as honest bracketed placeholders
(`[play-zone]`, `[hand-anchor]`) in the unskinned bench, asserting nothing false. Recorded
as **Finding 4 (minor)**, not a fabrication. `shadowed` `{overridden:[identity,counters,
crew,equipment,local-play,hand], added:[art-banner,building-tier,jobs-list,ar,ap,actions],
suppressed:[]}` — code == test == measured; regions.length == parent+6. ✅

### 2.4 `boty:town-table` (adds standings + log; overrides nothing)

05 left "The table" panel: **standings** — ranked rows `Jumpin_Jack ★ you $3,350 / Garage
· 1 crew · 0 jobs`, then CPU 2/3/4 $2,900 (name · badge · gold cash · subline, active row
**gold-outlined**); **TABLE LOG** — "Upkeep for Jumpin_Jack… = $100", "Jumpin_Jack drew
Win the county fair raffle: +$550". Both exist in v1; the child **adds exactly these two
and overrides nothing** (every TABLE_PARENT region carried byte-equal). `shadowed`
`{overridden:[], added:[standings,log], suppressed:[]}` — code == test == measured. ✅
(Observation: v1's left column also carries a street-scene art banner above "The table";
the charge scopes town-table to standings+log only, so this is out-of-scope, not a gap.)

**Unit test `packs/boty/tests/boty-layouts.test.ts` — 9/9 pass** (re-ran); every declared
`shadowed` record asserted there matches the code and my measured shadowing. The
construction-falsifiability fixture (`extendLayout(parent, overlay)` deep-equals each
shipped child) passes.

---

## Step 3 — TRACE CONFORMANCE (drift-ledger I-51 a–e + skin-token grammar)

- **(a) both modals are cards** — ✅ round interstitial (07/08) and character/fortune popup
  (09) are rounded, art-topped **card** shapes, not generic dialogs; the bench renders both
  as card *children* at a focus preset (no modal machinery). Supported.
- **(b) art 55–70%** — **measured range: fortune ~65–75%, round ~53–60%.** The *screens*
  support 55–70% (fortune at/near the top; round straddling the low end). But I-51b claims
  this is "realized as child OVERRIDES of art" — and the **coded overrides (fortune 52%,
  round 50%) fall below the 55–70% band the ledger says v1 proves.** The claim's
  *measurement* is sound; its *realization* for the fortune card is not (→ Finding 1).
- **(d) header/banner/footer items in 05** — ✅ header (place "Maple Hollow" · season
  "Spring" · "round 1/24" · turn "Jumpin_Jack's turn" · toolbar icons), alert banner "Your
  turn, Jumpin_Jack — make your move!", CPU presence dots (CPU 2/3/4, green), footer nav
  (Table / Fortune / Your shop / Books) all present. These are I-51d bench furniture.
- **(e) grammar spot-checks vs `skin-token-candidates.md`:**
  - money gold? **✅** — every cash value ($3,350, $2,900, +$550) is gold across 05/06/09.
  - exactly one red danger item per screen? **Supported where checkable** — 04 lobby has a
    single red "Leave" and nothing else red; in-game screens show one reddish header glyph.
    Not falsified; "exactly one" is not rigorously provable from stills alone.
  - deck shows its count? **✅** — "59 left" beside the stacked-card glyph (05/09); bench
    shows "3 left".
  - active row gold-outlined? **✅** — Jumpin_Jack's standings row is gold-outlined (05/06);
    bench marks exactly one `row-active`.

No trace claim is contradicted by the screens except the *realization* half of (b)/I-51b
(Finding 1).

---

## Step 4 — LIVE RENDER (does the bench realize the anatomy?)

`npm install` (clean), `node build.mjs` (4 bundles built). Served `game.html` and drove it
in real Chromium (Playwright). **Unskinned frames confirmed — dashed regions, white fills,
no art, no v1 colors — absence of paint is CORRECT per D-1.** Structure audited:

| Requirement | Result |
|---|---|
| Round card pops **on load** naming the ACTIVE seat as leader | ✅ `poppedLayout()="boty:round-card"`, callout "**moe** leads off this round." (active seat-0) |
| Name **rotates** with the turn (end a turn, reload → not constant) | ✅ end turn → header "▶ pete's turn"; reload → round card callout "**pete** leads off", not moe |
| Clicking the deck pops the drawn card as the **fortune child** | ✅ deck click → `poppedLayout()="boty:fortune-card"` (drawn: job-posting) |
| Deck shows its **count** | ✅ deck glyph + "3 left"; title "moe's deck — 3 left. Click to draw." |
| Standings rank by cash, **active row marked**; click focuses that shop | ✅ "moe ★", exactly one `row-active`; row click changes viewBox `0 0 1600 1000` → zoomed seat frame |
| **Table log** lists recent moves | ✅ "TABLE LOG": "moe · turn:end", "pete · upkeep" (bound to controller.row().moves) |
| Shop board shows the regions incl. **visibly-bracketed placeholders** | ✅ `[trade]`, `[building · tier — · next increment]`, `[crew-zone]`, `[equipment-rack]`, `[play-zone]`, `[hand-anchor]`, "AR — owed to you", "AP — you owe" — placeholders READ as placeholders (no asserted fake facts) |
| **End turn on the active board only** | ✅ exactly one `data-act="end-turn"` ("End turn — moe") |

**Target battery** (`run-target-check.mjs`, driven against real Chromium — the repo runner
derives its static-server root from `import.meta.url.pathname`, which URL-encodes the
spaces in "CPA CMA Services" and 404s; I ran a byte-identical driver from a space-free path
so the battery actually executed — env/path portability only, not a conformance defect):

```
BATTERY 21/21 · DRILLS 5/5
```

All 21 in-target HK checks pass; all 5 fail-safety drills pass (legal move logs; illegal
"reckon" refused+unlogged "requires status 'closing', got 'playing'"; kill/restart resumes
to a stable hash; corrupt save → PersistHalt "row shape invalid"; tampered row → PersistHalt
"hash lineage broken: replay ≠ stored"). D-1 unskinned + refusal-not-repair hold live.

---

## Findings

**Finding 1 — BLOCKING — `boty:fortune-card` art region under-encodes v1's art dominance.**
Coded art = **52%** of card height (`layouts.ts:36`, y=4/h=52). Measured v1 art fraction =
**~65–75%** across three instances (09 modal 68%, 09 column ~65%, 05 column ~75%). Gap
**≈13–23pp**, outside the ±8pp contract tolerance even at the most conservative reading
(68% → 16pp). The coded value also falls **below the increment's own stated band** — I-51b
and `skin-token-candidates.md` (art.dominance) both say "55–70%", SOURCES.md says "~70%",
and the child's own docstring says "art ~0–70%" (`layouts.ts:30`) — yet the region is coded
at 52%, only 2pp above the round-card's 50% despite v1 showing the fortune card's art as
markedly *more* dominant than the round card's. The "art dominance" the child exists to
encode (I-51b) is not realized. *No repair performed (refusal-not-repair).*

**Finding 2 — MAJOR — Live source-fidelity (Step 1) unverifiable beyond the landing.**
`boty-web.vercel.app` now gates all play behind a one-time email-code sign-in that is
absent from the archived flow; no guest/local path is exposed. Landing verifies FAITHFUL
live; screens 02–09 could only be checked against the attested archived sources + internal
consistency (no FABRICATED indicators found). Completing the auth flow is account
authentication, which I did not perform. This is (a) a coverage gap in this audit's live
walk and (b) a live-product flow drift — though a production-concern/chrome surface, not a
change to any coded layout child.

**Finding 3 — MINOR — character-modal "Next ▶" not modeled by `boty:fortune-card`.** The
child models the payout-foot (column) variant; the 09 character modal ends in a dismiss
button instead of a payout. Consistent with modal-as-card dismissal (I-51a); immaterial.

**Finding 4 — MINOR — `boty:shop-board` `local-play`/`hand` have no distinct v1 shop
counterpart.** They are carried BOARD_PARENT regions repositioned by the override; in the
unskinned bench they render as honest bracketed placeholders, asserting nothing false. Not
a fabrication; noted for completeness.

---

## Overall verdict: **RETURN**

Attestation (Step 0) passes cleanly and the increment is strong overall — three of four
children conform, every declared `shadowed` record matches code + test + measured shadowing,
the modal-as-card and deck-count/active-row/table-log grammar hold, and the bench realizes
the anatomy live with 21/21 · 5/5 and correct D-1 unskinned frames. **But one measurement
fails the charge's ±8pp conformance bar:** `boty:fortune-card`'s art region is coded at 52%
against a measured v1 ~65–75% (Finding 1), contradicting the very "art dominance" claim
(I-51b) the child is built to encode. Per the charge's refusal-not-repair doctrine ("if
anything fails … conformance, RETURN with the finding named"), the increment is **RETURNED**
on Finding 1. Finding 2 additionally leaves the live source-fidelity of screens 02–09
unconfirmed this session (auth wall). Nothing in the repo was modified except this report.

*Auditor: independent K7-style session, no builder context. Sources attested by SHA256;
measurements are the auditor's own pixel readings of the attested JPEGs; live checks driven
against real Chromium.*
