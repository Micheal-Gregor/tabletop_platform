# BOTY — Mechanics & Objects Inventory

*Intake corpus for the Phase 1 COMPRESSOR-MODE run · prepared 2026-07-24 from the GitHub
head (659 files) · reverse-engineered from code + design docs by three parallel analysis
passes (object model · mechanics · architecture), every claim file-cited in the underlying
reports. Purpose: give Stage 0 everything it needs to anchor the extraction of a
game-agnostic engine/template ("the core") from this built, working game.*

## 1 · Restated concept (what exists)

**BOTY — Business of the Year (engine name "Order to Cash")**: a turn-based business game,
1–6 players, each running a small service trade (mechanic, plumber, electrician, pipefitter,
welder, HVAC) in the town of Maple Hollow. Take jobs, staff them, get paid before the
deadline (a late job pays nothing); stretch vendors to float cash but risk civil action;
most cash at fiscal year-end (24 rounds) wins; insolvency mid-game is elimination. Shipped
as a monorepo: `packages/engine` (pure rules, ~4,200 lines / 26 modules, zero dependencies,
37 test files ≈700 assertions), `apps/web` (Svelte 5 client: solo-vs-AI + online
multiplayer, full art/audio), `api/` (Stripe/account serverless), Supabase backend.

**The extraction target:** the concept-agnostic game core — engine architecture, state
discipline, turn machinery, contract/deck/economy primitives — with BOTY itself becoming
the first *content pack* riding on it, so new games are content + thin mechanics rather
than new engines.

## 2 · The object inventory (as implemented)

**Per-player entities** (containment tree on `player.*`): Player/shop (cash, building,
trade, flags), Tradesman (assignment, productivity mod, flags), Equipment instance
(def-ref, owned-vs-rented, assigned-to), Job (the big one — value, work, deadline, gates,
state ∈ Queued|Active|OnHold|Expired|Complete, plus per-feature foreign keys), Invoice
(AR), Payable (AP — NPC or cross-player with creditor_id), Defect, Hand card, Modifier
(standing services), Ledger entries, per-player Deck.

**Shared/composite entities** (on `state.*`): Project (phased marquee contract), Civic
(town-wide, one contract per player), Routed (3-trade GC contract), Incident (light
civic), Expansion (deferred capital project), GlobalEffect (levy/boom/recession/union) —
plus nine ad-hoc `pending*` interaction queues (threat, court, damages, settle, poach,
mayor, referral, routing, estate claims).

**Relations:** ownership by containment; Tradesman↔Job bidirectional by id; the
cross-player **debt web** (payable.creditor_id + job.hirer_id) is the only ownership that
crosses player boundaries — the game's "main event." Composites own jobs by id with
completion callbacks. No class hierarchy anywhere: plain objects discriminated by type
strings, dispatched by a central switch (`resolveCard`, ~16 card types).

**State:** one serializable tree (`game.state`) — players, decks, RNG streams, turn
bookkeeping, composites, queues, id sequence counters, log. Cash is a *mirror* of ledger
account 1000. P&L/balance-sheet/season/standings are derived, never stored.

**Content vs logic:** tunables and definition tables live in authored JSON
(economy/fortune/jobprogress/civil/flavor), validated at load, expanded by `copies`;
card-type *behavior* is code. Several content tables are hard-coded in logic (see §5).

## 3 · The mechanics catalog (as implemented)

**Turn = five phases:** Upkeep (non-optional, strict internal order: crew returns → theft →
projects → collect AR → process AP → defects → premiums → interest → expansion → levy →
overhead; cash<0 → bankrupt + estate wind-down) → Draw (draw power = f(crew), capped) →
Actions (every move through one chokepoint, illegal ⇒ typed `GameError` refusal) → Job
progress (crew productivity ± a jobsite card) → Cleanup (hard-deadline expiry, advance;
round wrap ticks globals/civics exactly once). End-game: Final Reckoning ("Last Licks,"
trailing-first, restricted move set) → `closeBooks` (AR force-collects, AP deliberately
survives — outrunning vendors is legitimate; borrowed money can't win) → Gala.

**Mechanics families:** dice/PRNG (seeded mulberry32, *eight independent streams* by fixed
seed offsets); decks (Fisher–Yates, reserve refill, scripted mode, **living-deck**
injection without reshuffle to preserve feast/famine order, word-of-mouth triggers);
economy (double-entry ledger — every movement a balanced journal post, imbalance throws;
factoring, collections, escalating Demand Rolls, sue windows, class action, line of credit
with call risk); employment (reviews, four firing classes with wrongful-termination risk);
jobs (hard gates equipment/building-tier, soft gates crew/tools, productivity model);
composite contracts ×5 (projects/civics/routed/incidents/expansion — see §5); litigation
(pure threshold math separated from state mutation); fortune (the ~16-type card dispatch);
modifiers (insurance/marketing/accountant/training/security); globals.

**Enforcement:** two chokepoints — `Game.#act` (game-over, eight pending-decision gates,
phase legality, bankruptcy) + per-module preconditions; refusal, never repair; only `Game`
methods mutate. **Determinism:** fully replayable — online multiplayer is *lockstep
replay*: the persisted game IS `{seed, seats, ordered move log}` over an `INTENTS` set;
every client rebuilds byte-identical state; human dice injected as arguments; AI decisions
deterministic so replay stays exact.

## 4 · Architecture verdict (what the boundary audit found)

The engine/app boundary is **genuinely clean**: the pure barrel imports no
Node/DOM/Svelte/Supabase (one fs loader deliberately quarantined); the Svelte app consumes
the engine through a single seam (`store.js`); the four same-named lib files are cosmetic
shells, not logic duplicates; a CLI reference client inside the engine package exists
precisely to prove the API is the only legal-move surface. Non-game subsystems (auth,
billing, social, feedback, sound, settings) are cleanly one-way. Dev-only app-layer
invariant watchers observe the *transport/surfacing* layer the engine can't see — correctly
placed. **The one concentrated reuse debt: `store.js` (113 KB)** fuses generic lockstep
transport + BOTY-specific UX orchestration + sound heuristics that regex the engine's log
prose. Secondary couplings: the `INTENTS` verb list duplicated app-side; DB row-level
security tied to the engine's seat index; cosmetic modules assuming engine id/string
conventions.

## 5 · Compression candidates (the redundancy compressor mode eats)

1. **Five implementations of one concept.** Projects, Civics, Routed, Incidents, and
   Expansion are all "spawn jobs across parties, track portions, pay on all-complete,
   penalize on any-botch" — each with its own contract object, tick, botch handler,
   bankruptcy settler, its own foreign-key field on Job, and a parallel if-ladder in the
   three job lifecycle functions. Prime candidate: one **CompositeContract** primitive with
   five content-configured skins. The tautology tests here are live VALID_REMOVAL
   decisions — exactly what compressor mode exists for.
2. **Three routing models for "a job that isn't your trade"** (subcontract-with-AP,
   immediate-commission referral, deferred pendingReferral) — collapse candidate to one
   parameterized routing primitive.
3. **Nine bespoke `pending*` queues** with drifted, polymorphic schemas (fields read
   defensively as `c.recipientId ?? c.hirerId`) — one **InteractionWindow** primitive.
4. **Content hard-coded in logic:** JOB_LADDER, NPC job skins, the SERVICES catalog, the
   deck SPINE, civic sizing, routed terms — all belong in the content pack, and their
   extraction is what makes the engine claim "concept-agnostic" true.
5. **Duck-typed invoices** (fake job objects), **cash-mirrors-ledger by convention** (one
   direct write already patches it manually), and a **deprecated sabotage card** still
   present — small, but each is a preservation-vs-collapse decision for the run.

## 6 · The load-bearing core (what's demonstrably good — carry candidates)

(a) **Pure Game class as sole mutation surface + typed refusal** — legality by
construction; (b) **one serializable state tree** with derived-never-stored reports;
(c) **seeded multi-stream PRNG + lockstep replay** — `{seed, seats, moves}` as the entire
persisted game, self-healing rebuild on divergence: game-agnostic multiplayer infra of
real value; (d) **the double-entry ledger with a hard balanced-post invariant** — an
audited economy inside a game; (e) **the five-phase turn machine** with its
pending-decision gates; (f) **the content pipeline** (authored JSON, load validation, deck
expansion, fs-free core); (g) **deck machinery** including the living-deck; (h) **the test
culture** — 37 behavioral files, deterministic bot games, replay byte-equality proofs.

Worth naming plainly: this engine independently converged on the same principles as the
ContractLite/BCU work — single legal surface, refusal not repair, append-only move log as
the source of truth, balanced-entry invariants, determinism for audit. The compressor run
will likely find the game core and the BCU core are cousins; the game template inherits a
governance-shaped skeleton almost for free.

## 7 · Ambiguity register (seed AEs for Stage 0)

- **AE-c1** "Plain JSON state" claim vs reality: Deck instances and RNG closures live on
  the tree; true persistence is replay-based. Which is the *canonical* persistence story
  for the template — serializable state, or seed+log? (The code already chose log.)
- **AE-c2** Season is documented cosmetic but mechanically gates season-locked fortune
  cards — cosmetic or mechanic? (Conflict with its own comment.)
- **AE-c3** `state.flavor` is read but never set by `createGame` — dangling seam between
  engine and flavor loading.
- **AE-c4** Global id counter requires `resetIds()` discipline for replay while seq
  counters were already migrated onto state — finish the migration or keep the ritual?
- **AE-c5** `INTENTS` duplicated between engine and app — who owns the verb list?
- **AE-c6** `store.js`: where is the template's boundary between generic lockstep
  controller and per-game UX orchestration? (The single biggest extraction decision.)
- **AE-c7** Sound-by-log-regex and DB-security-by-seat-index — acceptable couplings or
  template-level seams?
- **AE-c8** Reckoning steps only *human* seats through Last Licks — intended rule or
  implementation artifact?

## 8 · Recommended Stage 0 direction

Run compressor mode over this corpus with the candidate core boundary drawn at §6(a–g) +
the two new primitives from §5(1–3), BOTY's trades/cards/NPCs/flavor/economy numbers
becoming content-pack material, and `store.js`'s split (§5/AE-c6) treated as the major
open decision gate. The reduction thesis to test: **a game =
engine-core + content pack + thin per-game mechanics + UX orchestration layer**, with the
five composite-contract features as the first proof that five code features compress to
one primitive plus five content skins — tautology proofs required for every collapse, per
the mode's rules.

## 9 · Reframe addendum (owner challenge, 2026-07-24 — supersedes §8's framing)

**The extraction target is the BOARD-GAME PLATFORM, not the business-game core.** BOTY is
the first universe, not the subject. Target games share one shape: run an outfit, manage
crew/resources, take ventures against deadlines, race rivals under a clock — instantiated
as a space-trading universe (factions: merchants/mercenaries/buccaneers/pirates over a
multi-system map), a fantasy dungeon-venture universe (rival parties, legendary loot), a
carnie-circuit universe (real-world fairs as venues), and BOTY itself.

**Two-strata core boundary (replaces §6's single stratum):**
- **Stratum 1 · Tabletop platform:** the component ontology (game board, player boards,
  hand, deck, tokens, dice) + the universal turn skeleton (round start → draw → effect
  resolution → strategic maintenance → cleanup → pass — already implemented as BOTY's
  five-phase machine) + the proven architecture (sole-mutation-surface Game, typed
  refusal, one state tree, seeded multi-stream PRNG, lockstep replay/multiplayer, content
  pipeline, deck machinery incl. living-deck, test/replay culture).
- **Stratum 2 · Mechanics library (opt-in per universe):** the venture/composite-contract
  primitive (§5.1 — doubles as mission/quest/route/booking), crew management, resource
  economy (ledger available but optional), routing, interaction windows, incidents/events,
  modifiers, globals, end-game reckoning. BOTY's trades/cards/NPCs/numbers/flavor →
  content pack #1.

**Owner-directed enhancements (BUILDER-mode concepts, not compression — per the
no-silent-mode-change rule, run separately after the compressor run and merged at the
engine build):**
- **E-1 · Component-rule model:** Component as parent (board / player board / card /
  token); each unique card carries *the rules it adds* as attached rule objects
  registering into turn-machine hooks — replacing the central `resolveCard` switch
  (the KIND_REGISTRY pattern, generalized). NOTE for Phase 2: is-a (rules as child
  objects) vs has-a (card composes rule contributions) is a live refused-edge decision —
  do not pre-commit inheritance.
- **E-2 · Presentation layer ("the unboxing"):** SVG-based, 3D-feel game pieces across
  phone/tablet/desktop — every Component parent carries a presentation contract (render/
  flip/stack/pan/zoom), universes supply skins; a separate package consuming the component
  model, keeping the engine presentation-free (the purity BOTY already proved). Per-universe
  design systems in Claude Design; per-universe token swaps.

**Revised Stage 0 direction:** compressor run over §2–§7 with the two-strata boundary
above; E-1/E-2 registered as carried enhancement concepts for builder-mode follow-up runs;
AE-c6 (store.js split) now reads as "platform transport vs universe UX" — same decision,
sharper frame. New seed ambiguity **AE-c9:** which Stratum-2 mechanics are platform-
mandatory vs library-optional (e.g. is the reckoning/end-game shape universal?).
