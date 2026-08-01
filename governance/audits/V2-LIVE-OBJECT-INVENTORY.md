# V2 OBJECT & PARAMETER INVENTORY — mined from the LIVE BOTY v1 (boty-web.vercel.app)

> **For the build session.** This is **not** the audit (see `K7_AUDIT_REPORT-5.md`, sealed).
> It is a **companion capture**: an inventory of every object the *live* v1 product exposes,
> each matched to (a) its **location/surface**, (b) its **declared parameters** (the data it
> shows), and (c) the **functions** (actions) available on it. It exists because this session
> had a live, authenticated v1 in front of it and the build session does not. Use it as the
> **checklist of what v2 must instantiate as objects** so no v1 functionality goes missing in
> v2. It supersedes nothing and prescribes no geometry — where a surface must become a
> layout child, its region x/y/w/h still has to be pixel-measured off a source screenshot the
> way the four existing children were (some source screens do not exist yet — flagged inline).
>
> Provenance: owner-authenticated live walk, 2026-07-31, 4-seat game (Mr_Secret + CPU 2/3/4),
> Standard difficulty, round 1. Content values (names, cash, art) are examples; the
> **parameters and functions** are the contract. Verified surfaces are marked ✓seen; a few
> state-dependent details are marked ⓘinferred (from the same surface in another state / the
> in-game rules text) and should be confirmed against a live instance before freezing.

## How to read

Each object = `{ id (proposed) · location · parameters · functions · data source · v2 status }`.
- **Data source** — `projection` = read from the SeatProjector (presentation reads only, never
  owns the math, K7-v1x D3); `ui-state` = local presentation state (tab selection, filters,
  camera); `engine` = a verb submitted through the controller.
- **v2 status** — `child ✓` already a layout child; `region ✓` a region inside an existing
  child; `chrome` bench/product furniture (I-51d, not layout law); `MISSING` no v2 object yet.

---

## 1 · Pre-game shell

| Object (proposed id) | Location | Parameters | Functions | Src | v2 |
|---|---|---|---|---|---|
| `shell:landing` | first screen | full-bleed art · presenter line ("🎀 …BBB presents") · title "Business of the Year" · tagline · CTA label | `enter()` (→ auth) | ui | chrome |
| `shell:auth` | after Enter | prompt copy · email field · submit label · helper copy | `requestCode(email)` · `submitCode(code)` | engine | chrome (NEW vs archived) |
| `shell:home-menu` | post-auth | tag "BBB · Est. 1867" · title · button list · signed-in identity | `play(local)` · `playOnline()` · `players()` · `story()` · `howTo()` · `settings()` · `feedback()` · `credits()` · `support()` · `signOut()` | engine/ui | chrome |
| `shell:play-online` | Play Online | heading · **Host** {create copy, difficulty ∈ Steady\|Standard\|Cutthroat} · **Join** {code field MAPLE-XXXX} · support link | `host(difficulty)` · `join(code)` · `back()` | engine | chrome |
| `shell:lobby` | after Host | code chip · difficulty · **player rows** [{name, you?, host?, trade}] · **CPU rows** [{label, trade ∈ auto\|6 trades, remove}] · trade picker (6 trades) · invite list | `copyCode()` · `pickTrade(t)` · `addCPU()` · `setCpuTrade(i,t)` · `removeCPU(i)` · `invite(friend)` · `startGame()` · `leave()` | engine | chrome |

Trades (closed set): **Mechanic · Plumber · Electrician · Pipefitter · Welder · HVAC technician**.

---

## 2 · In-game frame (chrome — I-51d, not layout law, but must exist for parity)

| Object | Location | Parameters | Functions | Src | v2 |
|---|---|---|---|---|---|
| `chrome:header-status` | header left | place · season · round `N / max` · active-turn label | — | projection | chrome |
| `chrome:header-toolbar` | header right | 6 icon-buttons (below) | see each | ui/engine | chrome |
| `chrome:banner` | under header | mode ∈ your-turn \| waiting \| FINAL · message · (final: ranking, champion) | — | projection | chrome |
| `chrome:presence` | under banner | "Who's connected" · dots [{seat, connected}] | — | projection | chrome |
| `chrome:footer-nav` | bottom | 4 tabs: Table · Fortune · Your shop · Books · active tab | `select(view)` | ui | chrome (declares the 4 views) |

**Header toolbar buttons** (each opens an object in §5 unless noted):
| Button | Function | Opens |
|---|---|---|
| view rivals | `openRivals()` | `modal:rivals-carousel` |
| open hand | `openHand()` | `modal:cards-gallery` |
| toggle sound | `toggleMute()` | — (stateful icon; no modal) |
| settings | `openSettings()` | `modal:settings` |
| quit to menu | `quit()` | `modal:save-and-leave` |
| rules | `openHowTo()` | `modal:how-to-play` |

---

## 3 · In-game views (the four footer tabs — desktop shows 3–4 at once; mobile one at a time)

### 3.1 `view:table` — Table view  → maps to existing `boty:town-table` (child ✓)
- **Parameters:** art-banner ("{season} — {place}") **⚠ not in v2 town-table (audit F6)** · heading "The table" · **standings** rows [{seat, activeBadge ⭐/you, cash (gold), subline "building · N crew · N jobs"}] ranked by cash, active row gold-outlined · **table log** entries [{seat, event text}] newest-last.
- **Functions:** none interactive in live (display); log entries are read-only text. *(bench adds row→focus; not in live v1.)*
- **Src:** projection. **v2:** `standings`, `log` regions ✓; **art-banner region MISSING (F6)**.

### 3.2 `view:fortune` — Fortune view  → `deck` region + `boty:fortune-card` (child ✓)
- **Parameters:** heading "Fortune" · **deck** {count "N left", stacked glyph} · **drawn card** (a `card:fortune` instance, §4.1).
- **Functions:** `draw()` (deck) · `zoom(card)` (→ pops the card modal).
- **Src:** projection/engine. **v2:** deck = a TABLE_PARENT region; card = `fortune-card` ✓. (No dedicated "fortune column" board object — it is composed; fine.)

### 3.3 `view:shop` — Your shop  → `boty:shop-board` (child ✓)
- **Parameters (top→bottom):** art-banner "{trade} {building}" → `art-banner`; identity "{seat} · {trade}" → `identity`; counters "{cash} · overhead {n}/turn" → `counters`; building "{icon} {name} · tier {t} · cap {c}" → `building-tier`; **Tradespeople ({n}/{cap})** rack of `card:tradesperson` (§4.4) → `crew`; **Equipment** rack of `card:equipment` (§4.5) → `equipment`; **Jobs ({n})** list of `card:job` (§4.3) → `jobs-list`; **AR — owed to you** {count·sum | none} → `ar`; **AP — you owe** {count·sum | none} → `ap`; action strip → `actions`.
- **Functions:** `moveShop()` (building upgrade) · `hire()` · per-crew see §4.4 · equipment `buyBasic/buyPro/rentBasic/rentPro` + per-item §4.5 · per-job §4.3 · `bankCredit()` (borrow) · **`endTurn()` (active board only)**.
- **Src:** projection + engine verbs. **v2:** all regions ✓; `local-play`/`hand` are carried BOARD_PARENT regions with no live counterpart (audit F4).

### 3.4 `view:books` — Books  → **NO v2 OBJECT (audit F5 — build this)**
- **Object:** `boty:books` — per-player financial-statement panel. Needs a parent kind beyond
  `card|board|table` (recommend a new `PANEL_PARENT kind:'panel'`, or fold onto BOARD_PARENT —
  decide on the ledger, record it).
- **Parameters:**
  - title "The books · {seat}"
  - **tab** ∈ `Profit & Loss` | `Balance Sheet`  *(ui-state)*
  - **P&L fill:** revenue · cost-of-jobs (COGS) {+ breakdown lines, e.g. "COGS — labour"} · **gross-margin** (subtotal) · overhead {+ breakdown lines, e.g. "Rent"} · **net-income** (total; negative → red) · callout {net-income-on-paper, cash-in-bank, teaching text "profit isn't cash…"}
  - **Balance-Sheet fill:** assets {+ lines: Cash…} · liabilities {+ lines | "none"} · equity {+ lines: Owner's capital, Retained earnings} · **liabilities+equity** (total) · reconciliation text "Assets X = Liabilities Y + Equity Z. The books always balance."
- **Functions:** `selectStatement(mode)` *(ui-state only, no game write)*.
- **Invariants (engine-side — the view only projects them; already covered by M13 Ledger / the
  "books reconcile" test):** gross-margin ≡ revenue − COGS · net-income ≡ gross-margin − overhead ·
  assets ≡ liabilities + equity.
- **Src:** projection. **v2:** **MISSING.** Geometry needs a **Books source screenshot** (none in
  `sources/` yet — the reason it was never extracted).

---

## 4 · Game-entity cards (each is an art-dominant card object; all share the `fortune-card` anatomy)

> v1 proves card art at ~55–80% of card height (audit F1) — the coded `fortune-card` under-encodes
> it at 52%. Every card below is a content fill of the same card child + a type badge.

### 4.1 `card:fortune` (the drawn card / Fortune deck card)  → `boty:fortune-card` (child ✓, art % = F1)
- **Parameters:** art · type badge (e.g. JOB) · title · italic quote/flavor · effect/payout line.
- **Functions:** `zoom()`/`close()` (as modal). **Src:** projection.

### 4.2 `card:character` (e.g. "Hal Ramsey · Chamber of Commerce")  → same `fortune-card` child ✓
- **Parameters:** art · name (title) · **org-subtitle** (italic) · effect line · action ("Next ▶").
- Note: archived 09 is a character; live 09-equivalent was a JOB — **one child, two fills** (confirmed).

### 4.3 `card:job` (a venture/contract) ✓seen
- **Parameters:** art · title · **status** ∈ Queued \| Active \| … · progress "x/N" · **crew-rate/turn** "⚡{n} base" + variance note ("± a jobsite card each turn — setback / good day / rework") · **crew** "assigned/required" · **value · due** "${v} · turn {t}" · terms (net-30/net-90) · sticky? (ⓘ archived active jobs show "sticky") · ladder rung (J1–J6, ⓘ rules).
- **Functions:** `assignWorker()` · `sell()` · `drop()` · `hold()` (ⓘ active jobs) · `factor()` (ⓘ rules — sell the invoice for a fee).
- **Src:** projection + engine. **v2:** a `jobs-list` row / a `card` child fill; the bench uses a `JOB_CARD` extension already.

### 4.4 `card:tradesperson` (crew/worker) ✓seen
- **Parameters:** portrait art · name · **productivity** "⚡{n}" · **tier** "T{n}" · flavor quote · **tool** (bare-handed | equipped item) · last-review · training (enrolled?) · **status** ∈ idle \| working {venture}.
- **Functions:** `assignToJob()` · `assignEquipment()` · `fire()` · (select→assign-portion, work — bench verbs).
- **Src:** projection + engine. **v2:** fills the shop `crew` region; card detail is a modal.

### 4.5 `card:equipment` (tool) ✓seen (rack) / ⓘ owned-detail from archived 06
- **Parameters:** name · grade (Basic | Pro) · tenure (owned | rented) · assigned-to (worker) · cost/rent.
- **Functions:** `buyBasic/buyPro/rentBasic/rentPro()` (rack) · `dispose()` (owned) · `assign(worker)`.
- **Src:** projection + engine. **v2:** fills the shop `equipment` region.

---

## 5 · Modals & overlays (opened from chrome or by zooming a card)

| Object | Opened by | Parameters | Functions | v2 |
|---|---|---|---|---|
| `modal:round-preamble` "🎲 Who goes first?" | round start | die glyph · "{seat} leads off Round {n}!" callout · lore ("lead-off rotates one seat clockwise…") | `next()` → reveals round-card | MISSING (NEW; sibling of round-card) |
| `modal:round-card` "Round N · Season" | after preamble | art (~50–55%) · title "Round {n} · {season}" · italic lore · gold callout (derives from truth) · action "Next ▶" | `next()`/dismiss | child ✓ (`boty:round-card`) |
| `modal:card` (fortune/character/job/crew/equipment) | zoom a card | the card's params (§4) · type badge · Close/Next | `close()` (· card-specific actions when own card) | child ✓ (`fortune-card`) — art % F1 |
| `modal:rivals-carousel` | view-rivals | per-seat: identity · cash · building "· cap" · shop art · CREW(n) [⚡tier] · EQUIPMENT · JOBS(n) [title x/N] · index/paging | `prev()` · `next()` · `close()` | MISSING (compact `shop-board` reuse) |
| `modal:cards-gallery` "Your cards" | open-hand | grid of `card:*` tiles · **filters** {Tradespeople, Equipment, Jobs, Persistent, Playable, Global} · scroll | `toggleFilter(kind)` · `open(card)` · `close()` | MISSING (grid of `fortune-card` tiles) |
| `modal:settings` | settings | Sound-effects ☑ · Music ☑ · Volume {0–100} · Auto-close-popups ☐ · Animate-cards-on-open ☐ · Card-animation-sound ☐ · Confirm-before-ending-turn ☑ · **Show amounts in** {Dollars $ \| Work-units W} ($50 per W) · **Rivals' cards popup** {Interesting only \| All cards \| None} | `set(option,val)` · `sendFeedback()` · `deleteAccount()` · `done()` | chrome (product shell) |
| `modal:how-to-play` | rules | scrollable doc: THE GOAL · EACH ROUND · CREW & EQUIPMENT · JOBS · WORKING TOGETHER · … | `scroll()` · `close()` | chrome (doc) |
| `modal:save-and-leave` | quit | copy ("a stand-in covers your seat… Play Online → Resume") · No / Save-&-leave | `confirmLeave()` · `cancel()` | chrome (dialog) |

Note (relevant to audit F1/F3): Settings → "Animate my cards on open" removes the on-card buttons
so "the art shows uncluttered" — i.e. with animation on, v1's card art is *even more* dominant,
reinforcing that `fortune-card`'s 52% art under-encodes v1.

---

## 6 · Cross-cutting closed vocabularies (parameters shared across objects)

- **Card kinds / component families** (from the hand filters): `tradespeople · equipment · jobs · persistent · playable · global`.
- **Difficulty:** `Steady · Standard · Cutthroat`.
- **Trades:** `Mechanic · Plumber · Electrician · Pipefitter · Welder · HVAC technician`.
- **Seasons:** `Spring · Summer · Fall · Winter` (cycle over 24 rounds).
- **Amount unit (display):** Dollars `$` ⇄ Work-units `W`, at **$50 per W** (rankings/output always in W).
- **Terms:** `net-30 · net-90`; jobs ladder `J1–J6`.
- **Grammar tokens (skin candidates — recorded, not painted, D-1):** money = gold · one danger accent = red (Drop, Fire, Leave, Delete-account, negative net-income) · active entity = gold outline · deck always shows its count · bold line + muted subline on every entity row · italic serif flavor for quotes/lore.

---

## 7 · Coverage map — what v2 already instantiates vs what to add

| Live object | v2 today | Action for v2 |
|---|---|---|
| Table / Fortune / Shop views | `town-table`, `fortune-card`(+deck), `shop-board` | keep; **add town-table art-banner region (F6)**; **widen fortune-card art to v1 ~65% (F1)** |
| Round card | `round-card` | keep |
| **Books view** | — | **build `boty:books` (§3.4) — capture a Books source screen first (F5)** |
| Round preamble | — | build `round-preamble` (§5) — sibling card modal |
| Rivals carousel | — | build as compact `shop-board` reuse |
| Cards gallery | — | build as a grid of `fortune-card` tiles + filters |
| Job / Tradesperson / Equipment cards | partial (`JOB_CARD` in bench) | promote to first-class card children with the params in §4 |
| Settings / How-to-play / Save-&-leave | — | product-shell chrome objects (utilization tier), not layout children |
| Header / footer / banner / presence | bench furniture | keep as chrome; ensure the footer's 4th tab (Books) resolves to a real object |

**Bottom line for v2:** instantiate **`boty:books`** (the one load-bearing gap), add the
**town-table art-banner**, correct the **`fortune-card` art fraction**, and promote the
**round-preamble, rivals-carousel, cards-gallery** and the **job / tradesperson / equipment**
cards to declared objects with the parameters and functions listed above. Everything else is
already modelled or is deliberately chrome.

*Companion to `K7_AUDIT_REPORT-5.md` (which remains sealed). Compiled from the live product;
parameters/functions are the contract, content values are illustrative.*
