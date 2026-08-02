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

Opened `https://boty-web.vercel.app`. The live site now gates play behind a one-time
email-code sign-in that did not exist in the archived flow; the **owner performed the
sign-in step** (I did not touch the credential fields), after which I drove the full walk
in the owner's own Chrome (Claude-in-Chrome): landing → Enter → home menu → Play Online →
Host (Standard) → +Add CPU ×3 → Start → round-1 modal(s) → in-game panels → drawn-card
modal. **All nine archived screens were reproduced and verified live.**

| Screen | Verdict | Live evidence (content differs where noted; structure is the test) |
|---|---|---|
| 01 landing | **FAITHFUL** | full-bleed art, "…BBB presents", centered "Business of the Year", subtitle, single gold "▶ Enter Maple Hollow" |
| 02 home menu | **FAITHFUL** | same tag/heading + identical button stack (gold Play/Play Online; dark Players→Credits; Support-$5). *New:* a "Signed in as secretfont@gmail.com / Sign out" footer (auth chrome) |
| 03 play online | **FAITHFUL** | twin Host/Join panels, Difficulty (Steady/Standard/Cutthroat), MAPLE-XXXX join field, Chip-in-$5, ← Menu |
| 04 lobby | **FAITHFUL** | Lobby heading, code chip + Copy + "· Standard", player row "Mr_Secret · you · host · Mechanic", six trade chips, +Add CPU, Start, red **Leave**, Invite-a-friend |
| 05 in-game 3col | **FAITHFUL** | header place·season·"round 1/24"·turn·toolbar; banner "Your turn…"; CPU 2/3/4 presence; table panel (art banner + standings w/ gold-outlined "⭐ you" row + Table log); shop column (art→identity→counters→"🏚️ Garage tier 1·cap 2·Move→Shop"→Tradespeople→Equipment→Jobs→AR→AP→actions); Fortune deck "59 left" + drawn card; footer nav Table/Fortune/Your shop/Books |
| 06 job active | **FAITHFUL** | Jobs(1) row "Tune-up [Queued] · 0/4 · $650 · net-30 · due in 4 · crew 0/2" + Assign/Sell/Drop; Equipment rack Buy/Rent (owned+Dispose is a later state, not reached) |
| 07 / 08 round modals | **FAITHFUL** | the "Round 1 · Spring" **card** appeared: ~50–55% sepia art (Frontier Bank/Folsom) → "Round 1 · Spring" title → italic lore → gold callout "✨ You lead off — clear this and make your move!" → Next ▶. Card-shaped, not a dialog (I-51a). *New:* a "🎲 Who goes first?" die preamble modal precedes it (see below) |
| 09 card/character | **FAITHFUL** | the drawn card pops as a card-shaped **modal** — art-dominant (~60–65%), type badge "JOB", title "Tune-up", italic quote, effect "new job J9 ($650, due turn 5)", Close. Same anatomy as the archived Hal-Ramsey character modal (the fortune-card is one child for both) |

**No STALE, no FABRICATED — all nine FAITHFUL.** The archived screens are confirmed
genuine v1 captures; the coded children's structural claims hold against *live* v1. Three
**additive** elements were seen that are not in the archived set, none of them regressions
and none touching the four coded layout children:

1. **Sign-in auth gate** before the home menu (one-time email code). Production-concern /
   auth chrome — SOURCES.md already flags Play-Online as a "production-concern surface,"
   not layout law.
2. **"🎲 Who goes first?" preamble modal** before the "Round N · Season" card — a small die
   glyph + "You lead off Round 1!" + lore + Next. It *precedes* (does not replace) the
   round card, so it leaves 07/08 FAITHFUL; it is a card-shaped modal, consistent with
   I-51a.
3. **"The books" P&L/Balance-Sheet panel** shown inline on the wide desktop (the "Books"
   footer tab expanded) — the same Books feature the archived footer nav carries.

Live v1 also **corroborates Finding 1**: the Fortune-column card and the drawn-card modal
both render art at ~60–80% of card height — the "art dominance" the coded fortune-card
(52%) fails to reach.

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

**Finding 2 — MINOR (resolved) — live flow adds an auth gate + a round preamble modal.**
`boty-web.vercel.app` now gates play behind a one-time email-code sign-in absent from the
archived flow, and interposes a "🎲 Who goes first?" preamble modal before the "Round N ·
Season" card. *Resolution:* the owner performed the sign-in and I completed the full live
walk — **all nine screens verified FAITHFUL** (Step 1); the initial coverage gap is closed.
Both additions are additive production-concern / preamble chrome, not changes to any coded
layout child, and neither renders an archived screen STALE.

**Finding 3 — MINOR — character-modal "Next ▶" not modeled by `boty:fortune-card`.** The
child models the payout-foot (column) variant; the 09 character modal ends in a dismiss
button instead of a payout. Consistent with modal-as-card dismissal (I-51a); immaterial.

**Finding 4 — MINOR — `boty:shop-board` `local-play`/`hand` have no distinct v1 shop
counterpart.** They are carried BOARD_PARENT regions repositioned by the override; in the
unskinned bench they render as honest bracketed placeholders, asserting nothing false. Not
a fabrication; noted for completeness.

**Finding 5 — MAJOR — the Books footer view is uninstantiated in v2.** Live v1 exposes
**four** footer views (`Table · Fortune · Your shop · Books`); v2 instantiates layout
children for three (`town-table`, `fortune-card`, `shop-board`) plus the `round-card`
modal, but has **no child and no bench composition for Books** — the per-player financial
view (Profit & Loss + Balance Sheet). `grep` across `packs/boty/` and `utilization/bench/`
finds **zero** books/ledger/P&L/balance region roles or panels; the only "books" hits are
the engine-level ledger-reconciliation *test*. So the ledger *data* exists (M13 / the
"books reconcile" invariant) but its *presentation view* does not. Root cause: **no Books
screen was among the nine attested sources**, so the v1-extraction never measured it — a
source-coverage gap, not a mis-extraction. Live-captured this session: P&L (Revenue · −COGS
[COGS-labour] · Gross margin · −Overhead [Rent] · Net income · cash-vs-paper callout with
"profit isn't cash…") and Balance Sheet (Assets [Cash] · Liabilities [none] · Equity
[Owner's capital · Retained earnings] · Liabilities+equity · "the books always balance").
Spec for the missing child in **Appendix A.2**.

**Finding 6 — MINOR — `boty:town-table` omits the table-view art banner.** `shop-board`
declares an `art-banner` add; `town-table` does not — yet live v1's table column carries a
`Spring — Maple Hollow` establishing image above "The table". The banner is a live
parameter with no town-table region.

*(The live walk also surfaced additional modal surfaces — a "Who goes first?" round
preamble, a rivals-shop carousel, a "Your cards" gallery, and Settings / How-to-play /
Save-&-leave dialogs — none modeled as v2 children. These are I-51d chrome / production
surfaces; inventoried with object specs in **Appendix A**.)*

---

## Overall verdict: **RETURN**

Attestation (Step 0) passes cleanly and the increment is strong overall — Step 1 now
verifies **all nine archived screens FAITHFUL against live v1** (owner-authenticated walk),
three of four children conform, every declared `shadowed` record matches code + test +
measured shadowing, the modal-as-card and deck-count/active-row/table-log grammar hold, and
the bench realizes the anatomy live with 21/21 · 5/5 and correct D-1 unskinned frames.
**But one measurement fails the charge's ±8pp conformance bar:** `boty:fortune-card`'s art
region is coded at 52% against a measured v1 ~65–75% — now corroborated live (Fortune-column
card and drawn-card modal render art at ~60–80%) — contradicting the very "art dominance"
claim (I-51b) the child is built to encode (Finding 1). Per the charge's refusal-not-repair
doctrine ("if anything fails … conformance, RETURN with the finding named"), the increment
is **RETURNED** on Finding 1 alone. Findings 2–6 are non-blocking (Finding 5, the
uninstantiated Books view, is a coverage gap the build session should close — see Appendix
A). Nothing in the repo was modified except this report.

*Auditor: independent K7-style session, no builder context. Sources attested by SHA256;
measurements are the auditor's own pixel readings of the attested JPEGs; live checks driven
against real Chromium.*

---

## Appendix A — Live v1 surfaces as v2 child-object specs (for the build session)

The v1-extraction (I-51) modelled **four** children off the **nine** archived screens. An
owner-authenticated live walk this session surfaced the full running product, which carries
more first-class surfaces than the nine stills captured. Per the request to organise every
live-v1 component as a stricter-OOP v2 object (parameters + functions) so v2 can replicate
v1 faithfully, this appendix inventories the live surfaces and specifies the missing ones.

> **Role boundary (why this is a spec, not code).** This audit is refusal-not-repair and
> "modify nothing but the report." Authoring these objects into `packs/boty/` or the
> presentation template is a **build-session** action, and a *fresh* K7 must then verify
> them — the builder never scores its own conformance. What follows is the auditor's
> organised requirement, handed to the build session; it is not an implementation.

### A.1 Surface inventory — live v1 → v2 object status

| Live surface | Live role / anatomy | v2 object | Status |
|---|---|---|---|
| Header status strip | place · season · round · turn | bench chrome (I-51d) | furniture — not a child |
| Header toolbar (×6) | view-rivals · open-hand · sound · settings · quit · rules | bench chrome | furniture; open the modals below |
| Alert banner | "Your turn…" / "waiting on…" | bench chrome | furniture |
| Presence | "Who's connected" dots | bench chrome | furniture |
| Footer nav (×4) | Table · Fortune · Your shop · Books | bench chrome | furniture — **declares 4 views** |
| **Table view** | art banner + standings + Table log | `boty:town-table` | ✅ (banner missing — **F6**) |
| **Fortune view** | deck ("N left") + drawn card | `deck` region + `boty:fortune-card` | ✅ |
| **Shop view** | art→identity→counters→building→crew→equip→jobs→AR→AP→actions | `boty:shop-board` | ✅ |
| **Books view** | P&L + Balance Sheet | — | ❌ **F5** |
| Round interstitial | "Round N · Season" art card | `boty:round-card` | ✅ (art % — **F1**) |
| Who-goes-first preamble | die glyph + lead-off + lore + Next | — | ❌ new (precedes round-card) |
| Drawn / character card | art-dominant card modal | `boty:fortune-card` | ✅ |
| Rivals-shop carousel | paged compact shop summaries (◀▶) | — | ❌ (compact `shop-board`) |
| "Your cards" gallery | mini-card grid + category filters | — | ❌ (reuses `fortune-card` tiles) |
| Settings modal | audio · card-anim · confirm-end · $/W unit · rivals-popup · feedback · delete-account | — | ❌ production/form surface |
| How-to-play modal | scrollable rules doc | — | ❌ doc surface |
| Save-&-leave confirm | "stand-in covers your seat… Resume" dialog | — | ❌ dialog surface |

**Coverage:** v2 instantiates 4 children covering 3 of 4 footer views + the round modal;
**≥6 live surfaces are unmodelled**, the load-bearing one being the **Books** view (F5).

### A.2 `boty:books` — the missing view, specified as a v2 child object (F5)

*Template fit first:* v2's parent kinds are `card | board | table` (`layout.ts`). A
per-player financial **report panel** fits none. Two lawful routes for the build session —
(a) add a `PANEL_PARENT` (`kind:'panel'`) to the presentation package (platform tier; a
content pack importing it downward is HK-6-clean), or (b) fold it onto `BOARD_PARENT` and
override/suppress. Route (a) is cleaner; record the choice on the drift ledger, don't pick
by momentum (ODG discipline).

```
Object  boty:books   (kind: panel — pending A.2 route; player-scoped, lineage ['template:panel'])
Parameters (roled regions; VALUES come from the projection — project() is the sole read, K7-v1x D3):
  title            "The books · {seat}"
  statement-tabs   { 'pnl' | 'balance' }            ← presentation state, not game state
  ── P&L fill ──
  revenue          gold money
  cogs             + breakdown lines (e.g. "COGS — labour")
  gross-margin     subtotal  ≡ revenue − cogs
  overhead         + breakdown lines (e.g. "Rent")
  net-income       total     ≡ gross-margin − overhead   (negative → red: the one danger accent)
  cash-callout     { net-income-on-paper, cash-in-bank, teaching: "profit isn't cash…" }
  ── Balance-Sheet fill ──
  assets           + lines (Cash …)
  liabilities      + lines (or "none")
  equity           + lines (Owner's capital, Retained earnings ≡ net-income)
  liabilities+equity  total
  reconciliation   "Assets X = Liabilities Y + Equity Z. The books always balance."
Functions:
  selectStatement(mode)     pure presentation-state switch (no game write)
  render(projection, seat)  fills regions from the SeatProjector — owns no math
Invariants (ENGINE-side; the view only projects them — already covered by M13 Ledger /
  the "books reconcile" test): gross-margin ≡ revenue−cogs · net-income ≡ gross-margin−overhead
  · assets ≡ liabilities+equity.
Grammar (skin-token candidates, recorded not painted — D-1): money gold · negative total red
  · muted sublines · bold section headers.
```
Geometry (region x/y/w/h) must be **measured off a Books screenshot** the same way the four
children were — which requires the owner to add a Books source screen to
`governance/audits/sources/` (none exists yet; that absence is the root cause of F5).

### A.3 The other unmodelled surfaces (thumbnail specs)

- **`boty:round-preamble`** (sibling of `round-card`): card modal · params
  `{leadOffSeat, lore, action}` · fn `dismiss()` → reveals `round-card`. Callout derives
  from truth (K7-v1x D2).
- **rivals-shop carousel**: compact `shop-board` reuse · params `{seats[], index}` · fns
  `prev() / next() / close()`.
- **"Your cards" gallery**: grid of `fortune-card` tiles · params
  `{cards[], filters:{tradespeople,equipment,jobs,persistent,playable,global}}` · fns
  `toggleFilter(kind)`, `open(cardId)` → pops `fortune-card`.
- **Settings / How-to-play / Save-&-leave**: utilization-tier **chrome** surfaces (form /
  document / dialog), not layout children — objectify in the bench/product shell, not the
  pack. (Settings notably carries `SHOW AMOUNTS IN $ / Work-units [$50 per W]` and
  "Animate my cards on open → the on-card buttons are gone, so the art shows uncluttered" —
  the latter corroborates F1/F3: with animation on, v1's card art is *even more* dominant.)

