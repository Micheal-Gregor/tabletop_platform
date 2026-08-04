# TRAINING DOCUMENT — designing games on the TABLETOP engine template

**Audience:** Grok, acting as a board-game designer working *inside* an existing engine
template. **Read this in full before executing the prompt.** Your job is not to invent a
game engine — it already exists, is built, and is governed by strict laws. Your job is to
design games that **extend and instantiate the template's parent objects**, and — where a
game genuinely needs something the template lacks — to **propose that new object as a
governed extension**, never to assume it.

Everything here is distilled from the template's own instruments
(`INSTRUMENTS/object-model-and-parameters.md`, `axioms-and-base-cases.md`,
`drift-ledger.md`). Those instruments are law; this is their designer-facing digest.

---

## 0 · The one-paragraph mental model

TABLETOP is a **deterministic, data-driven board-game engine**. A *game* is not code — it
is a **ContentPack**: data that (a) declares components as instances of admitted **Kinds**,
(b) lays them on **Surfaces** with **Relations**, (c) expresses every rule as a
**Contribution** (data: trigger → condition → effects) whose effects are drawn from one
**sealed effect vocabulary (EFX)**, and (d) optionally opts into **library mechanics**
(ventures, crew, a ledger, timed effects, a closing round) and **presentation layouts**.
The engine applies effects, guards legality, logs succeeded intents, and rebuilds any game
byte-identically from its log. **Games vary infinitely; the vocabularies do not.** New
capability enters only through a **governed extension cycle**, never by a pack inventing its
own mechanic.

---

## 1 · The spine (seven non-negotiable laws — design *with* them, never around them)

1. **Four-tier law / imports point down.** `platform < library < patterns < content`. A
   game (content) may *use* everything below it; nothing below may depend on a game. A game
   never reaches sideways or up.
2. **Closed governed vocabularies.** Effects (EFX), hook points, and verb sets are **sealed
   sets**. A game may only reference existing members. Growth = a repo-time version bump
   through an ExtensionContract, never a runtime invention.
3. **Rules are data.** A rule is a *Contribution* — `{trigger (a hook), condition (bounded
   DSL), effects (⊆ EFX)}` — validated at load. No rule is bespoke procedural code.
4. **Scoped purity.** Presentation reads state ONLY through a redacted per-seat projection;
   it emits ONLY intents; it never mutates. Opponent secrets are *absent* from a seat's
   view, not merely hidden.
5. **Log-as-truth.** The whole game is `{packRef, seed, seats, moves}`. Only succeeded
   intents are logged; the state is always rebuildable from the log, byte-identical.
6. **Theater over truth.** Animations/flourishes are cosmetic presets; if what's shown ever
   disagrees with the seeded result, the seeded result wins and the mismatch is flagged.
7. **Refusal-not-repair.** An illegal move yields a *typed refusal*; the state is
   byte-unchanged; nothing is logged. The engine never "fixes" a move. Design so that
   illegal states are *unreachable*, not patched.

If a game idea requires breaking one of these, it does not belong on this template —
redesign it so it lives *within* them (that is the whole exercise).

---

## 2 · The parent-object catalog — what every game extends or instantiates

These are the "parent objects." A game **starts from** them and **returns to** them (see §6).

### 2.1 ContentPack (the game itself)
`{ id, version, efxVersion, maxRounds, seats[], cards{id:{fx[], flavor?}},
decks{ref:{cards[], owner?}}, contributions[], genesis, wire }`. The pack is validated at
load (`validate()` names any defect); `genesis(packRef, seats, seed) → State` builds the
opening position; `wire()` registers the pack's intents. Flavor is carried, never read by
rules.

### 2.2 EFX v1.1.1 — the sealed effect vocabulary (the ONLY way state changes)
Every effect a card, window option, or contribution can cause is one of **seven**:

| Descriptor | Effect |
|---|---|
| `pay` | move cash between seats / bank |
| `capitalize` | create an owned asset |
| `grant_favor` | mint N favor to a seat |
| `levy` | charge a scope (seat / table), exempting eliminated seats |
| `deck_inject` | insert a card into a deck, order-preserving (living decks) |
| `grant_sue_right` | record a right one seat holds against another |
| `open_window` | open a gated decision window (IWN) — **depth-1 only** (a window may not open a window) |

**Docket (NOT yet members — each needs a governed ExtensionContract cycle to admit):**
`spawn_venture`, `draw_card`, `form_relation`. If your game needs content-*triggered*
venture spawning, per-draw hooks, or content-triggered relation formation, you are asking
for a docket member → propose it (see §5), do not assume it.

### 2.3 Kinds — the component ontology (admitted **by rule**, not by enumeration)
Eleven named kinds + an **open family**: `Board · PlayerBoard · Card · Token · Die · Tile ·
Figure · Spinner · Slider · Dial · Timer`. A component is an instance of an admitted kind.
A **new** kind is admissible iff it declares identity + a state shape, roles that bind to
platform primitives (§2.4), and only grantable relations ⊆ the five (§2.5). The gate refuses
naming any missing leg. **Supersede, never respecify** an admitted kind.

### 2.4 Roles (what a kind's moving parts bind to)
`Randomizer → RNG streams · Tracker → derived state · Reference → ruleset presentation ·
TimeSource → DEFERRED` (a real-time clock binding is an open gate — a kind may declare it,
but *using* it refuses today). Design turn-based; treat real-time as an extension request.

### 2.5 Relations — the five typed connections (closed set)
`Placement` (a component sits on a Surface position) · `Composition` (parts form a whole) ·
`Attachment` (a component rides another) · `Overlay` (a component covers another) ·
`Representation` (a read-only view of a derived value — **views never own/write**). Each
forms/dissolves by a **predicate**; a formation without a holding predicate refuses. You may
not invent a sixth relation.

### 2.6 Surfaces & topologies (where placement happens)
Five topologies: `grid` (int x/y) · `hex` (q/r) · `track` (index) · `slots` (slot-id) ·
`freeform` (numeric x/y). **Recursion is constitutive:** components composed side-by-side
*form a new Surface* that itself accepts placement (build a map from tiles, then place on
the map). Almost every "board" in a game is one or more of these.

### 2.7 Hooks + Contributions + State slots (rules-as-data)
**HookPoints (23):** 7 turn-phase hooks (across the phases `start · draw · resolution ·
maintenance · cleanup`), 6 lifecycle hooks (round wrap, game start/end, …), and 10 relation
hooks (`on-form` / `on-dissolve` × the 5 relations). A **Contribution** binds a hook to a
condition and EFX effects. **Conditions** use a bounded DSL (`always | eq/ne/gte/lte(path,
value) | and/or(...)`) reading only event fields and the contribution's own declared
**state slots** (reset class ∈ `never | per-turn | per-round | per-game`). Dispatch is
snapshot-ordered (hook, bearer-entry-seq); effects apply only through the engine. A
relation-*borne* contribution is active only while a relation of its bearer type is formed
(derived, not bookkept).

### 2.8 F5 Mechanics Library (opt-in — a game loads only what it uses)
- **Venture + Routing** — the general contract primitive: multi-party, portioned,
  routable-to-a-counterparty-with-carried-debt work; also its degenerate single-portion
  "Job" form. Lifecycle: spawn → assign → work → complete → payoff (receivables) | lapse.
  Windowed routing gates advance; the decision is a logged intent.
- **Outfit + Crew** — seat roles; crew work one portion at a time (assign refuses if busy).
- **Ledger** — balanced posting: every resource move is zero-sum legs (bank absorbs); an
  unbalanced post throws; cash ≡ derived balances.
- **TimedEffects** — modifiers scoped to an outfit or the table, ticking once at round wrap,
  expiring by duration.
- **ClosingRound** — the endgame: at status `closing`, force-collect receivables, rank,
  crown a champion, status `ended`.

### 2.9 Patterns (data-first presets — thin builders that EMIT DATA ONLY)
`6 VNT` (project · civic · routed · incident · expansion · job) · `3 RTM`
(subcontract-debt · commission-now · deferred-referral) · `9 IWN` (threat · court · damages
· settle · poach · mayor · referral · routing · estate) · `2 TFX` (modifier=outfit ·
global=table) · closing defaults. Presets carry *structure*; content supplies parameters;
the engine's doors re-validate. Reuse a preset before proposing a new mechanic.

### 2.10 Layout parents (F6 presentation — how a game is drawn, unskinned)
Four parents as data: `CARD · CARD-BACK · BOARD · TABLE`, each a set of roled regions in a
0–100 unit space. A game makes **children** via `extendLayout(parent, overlay)` where the
overlay is `{override / add / suppress}` with **declared shadowing** (a child claiming an
undeclared region refuses). A 2.5D **camera** (pan/zoom + focus presets) is pure and
stateless toward the game. Skins are **token contracts** (names, never raw values); a
built-in Placeholder Skin renders any contract as labeled frames (frames-before-assets).
**Flourishes** are cosmetic data presets (card-flip, die-throw…). Modals are just card
children rendered at a focus preset — there is no separate "dialog" object.

### 2.11 Transport
A lockstep controller hosts the engine over the row (`subscribe / submit / resume` +
presence). Resume = rebuild from the row; a packRef mismatch refuses whole. Design assuming
multi-seat play over one authoritative log; networking itself is a production concern.

---

## 3 · The governed vocabularies, in full (your allowed primitives)

- **EFX (7):** pay · capitalize · grant_favor · levy · deck_inject · grant_sue_right ·
  open_window. **Docket (propose to use): spawn_venture · draw_card · form_relation.**
- **Kinds (11 + open):** Board · PlayerBoard · Card · Token · Die · Tile · Figure · Spinner
  · Slider · Dial · Timer.
- **Relations (5):** Placement · Composition · Attachment · Overlay · Representation.
- **Topologies (5):** grid · hex · track · slots · freeform.
- **Roles (4):** Randomizer · Tracker · Reference · TimeSource(deferred).
- **Hooks (23):** 7 turn · 6 lifecycle · 10 relation.
- **F5 mechanics (5):** Venture/Routing · Outfit/Crew · Ledger · TimedEffects · ClosingRound.
- **Patterns:** 6 VNT · 3 RTM · 9 IWN · 2 TFX · closing defaults.
- **Layout parents (4):** CARD · CARD-BACK · BOARD · TABLE.

**BOTY (the one existing game) already leans on:** Venture/Routing · Crew · Ledger ·
TimedEffects · ClosingRound · `pay/levy/capitalize/grant_favor/deck_inject/grant_sue_right/
open_window` · CARD/BOARD/TABLE layout children. **BOTY barely or never uses:** any real
board **topology** (grid/hex/track/slots/freeform), and the kinds **Die · Tile · Figure ·
Spinner · Slider · Dial · Timer**, and the relations **Placement (on a real surface) ·
Attachment · Overlay · Composition · Representation**, and the **docket EFX**. *These gaps
are your richest design territory.*

---

## 4 · The coverage target (the 10 games must, TOGETHER, exercise all of this)

Design the set so that, across the ten games, **every** item below is exercised by at least
one game (ideally 2–3), with BOTY's unused features (above) deliberately front-loaded:

- Each of the **5 topologies**; the **compose-forms-a-surface** recursion.
- Each of the **11 kinds** (plus at least one *newly proposed* kind through the gate).
- Each of the **5 relations**, including Representation (a read-only view) and Attachment.
- Each of the **7 EFX descriptors**, and at least one **docketed** member exercised via a
  governed proposal.
- Each **F5 mechanic** and a game that loads *none* of them (pure ontology/rules game).
- Representative **patterns** across VNT / RTM / IWN / TFX.
- A spread of **hook** usage (turn-phase, lifecycle, relation-borne rules).
- **Layout children** off each of the 4 parents; camera focus presets; a modal-as-card.
- **Transport-interesting** shapes (simultaneous vs strict-turn; hidden information;
  cooperative; solo).

You do NOT need to fill a matrix yourself — just make each game **declare** what it exercises
(the "coverage contribution" section), and collectively hit everything. The human will build
the master coverage matrix from your ten declarations.

---

## 5 · Proposing a new object (the ONLY lawful way the template grows)

When a game needs a capability no existing object provides, **do not stretch an existing one
past its meaning and do not invent a bespoke mechanic.** Instead, emit an **ExtensionContract
proposal** in that game's "Returns-to" section. A valid proposal states:

1. **What & family** — the new EFX descriptor / Kind / relation-usage / pattern / layout
   parent, and which vocabulary it joins.
2. **Why existing objects can't express it** — the specific meaning gap (be concrete; most
   ideas are actually expressible by composing existing EFX + a contribution + a window —
   prefer that and say so).
3. **Refusal test** — the illegal input this object must refuse, and the expected typed
   refusal (refusal-not-repair).
4. **Vector plan** — the deterministic scenario that would pin its behavior (input →
   expected observable), computed later, never hand-waved.
5. **Hook / seam spec** — where it fires, what it may read/write, and how it stays inside
   the tier law and scoped purity.

Governance rules you must respect: **supersede, never respecify** existing objects; the
sealed vocabularies never mutate at runtime; a proposal is a *request on the record*, not an
adopted change. Prefer **composition of existing primitives** every time it works; reserve
proposals for genuine gaps. A great outcome is a game whose "Returns-to" section is *short
and sharp* — one or two well-justified proposals — because the rest was already expressible.

---

## 6 · The per-game design-document template (each of the 10 MUST follow this)

> Keep each to a tight **design brief with full traceability** — enough to scope and build,
> NOT a finished rulebook. Illustrative examples over exhaustive tables.

```
# GAME <n> — <title>  (<genre> · <player count> · <~length>)

## 1. Concept & hook
Theme, player fantasy, the one sentence that sells it.

## 2. Experience & core loop
Turn/phase structure (map to start·draw·resolution·maintenance·cleanup), the decision
players actually make each turn, and the win condition.

## 3. Components & board
- Components → Kinds (each physical thing = an admitted Kind; note any NEW kind → §7).
- Board/space → Surface topology(ies) (grid/hex/track/slots/freeform) + any composition.

## 4. STARTS-FROM  (what this game inherits — full instrument traceability)
A table mapping this game's mechanics to template objects:
| Game mechanic | Template object it uses | Notes |
(cover: EFX descriptors used · Kinds · Relations · Topologies · Hooks · F5 mechanics loaded
(or none) · Patterns reused · Layout parents → children · Transport shape.)

## 5. Rules-as-data sketch
The 3–6 signature rules as Contributions (trigger → condition → effects⊆EFX), plus any key
windows (IWN) and any ventures. Show they're expressible as data, not procedural code.

## 6. RETURNS-TO  (what this game demands back — governed extension proposals)
Zero or more ExtensionContract proposals, each per §5 (what/why-not-expressible/refusal
test/vector plan/hook spec). If everything was expressible with existing objects, say so
explicitly — that is a *good* result.

## 7. Presentation
Layout children needed (off which parents; key regions), camera/focus notes, and any
skin-token grammar. Note if it uses modal-as-card.

## 8. Coverage contribution
Bullet list: which template features THIS game is the (or a) carrier for — especially any
BOTY-unused feature it lights up. This is what the human's coverage matrix will read.
```

---

## 7 · Hard do's and don'ts (checklist before you finalize each game)

**DO**
- Make every mechanic trace to an instrument object *or* to a governed proposal in §6.
- Prefer composing existing EFX + a contribution + a window over any new object.
- Design so illegal states are unreachable (refusal-not-repair), and so the whole game is a
  log of intents (log-as-truth).
- Use real board topologies and the under-used kinds/relations — that's the point.
- Keep hidden information as *projection redaction* (opponent secrets absent from a view).

**DON'T**
- Don't invent an effect, relation, or mechanic outside the sealed sets without a §6 proposal.
- Don't require real-time/clock mechanics as core (TimeSource is deferred) — propose it if
  essential.
- Don't let presentation carry logic, or let a game reach up/sideways across tiers.
- Don't write finished rulebooks — this is a design-brief campaign to complete the template.
- Don't fill the coverage matrix — declare per-game coverage; the human synthesizes.

---

## 8 · Worked micro-example (BOTY, condensed — this is the target shape, smaller)

- **Concept:** run a small-town trade, most cash at year-end wins.
- **Components→Kinds:** shops = PlayerBoard; fortune/character/job = Card; crew = Token/Figure.
- **Board→Topology:** essentially `slots` (shop columns) — *note: BOTY never used grid/hex/
  track; a coverage gap your games should fill.*
- **Starts-from:** EFX `pay/levy/capitalize/grant_favor/deck_inject/grant_sue_right/
  open_window`; F5 Venture+Routing (jobs & routed contracts w/ carried debt), Crew, Ledger,
  TimedEffects (recession), ClosingRound; Patterns job/routed/global + routing IWN; layout
  children off CARD (fortune/round) + BOARD (shop) + TABLE (standings/log).
- **Rules-as-data:** `city-inspection` (on-round-wrap → levy), `boom-times` (on-round-wrap →
  grant_favor + per-round slot).
- **Returns-to:** would-be `spawn_venture` (content-triggered contracts) and `draw_card`
  (per-draw hook) — **docket members, proposed not assumed.**
- **Coverage contribution:** the economic/ledger/venture spine — so your ten should cover
  the *spatial/component* half BOTY leaves open.

Now execute the prompt.
