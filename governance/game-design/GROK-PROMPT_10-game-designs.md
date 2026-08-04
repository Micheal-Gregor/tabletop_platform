# PROMPT FOR GROK — design 10 games on the TABLETOP template

> **How to use.** Paste the **TRAINING DOCUMENT**
> (`GROK-TRAINING_tabletop-template.md`) FIRST, then this prompt, into Grok in the same
> session. Fill the **SEED GAMES** block below before sending. For best depth, run the task
> **one game (or two) per response** rather than all ten at once — track progress with the
> checklist at the end. Grok produces the ten design documents only; the human builds the
> coverage-matrix synthesis afterward.

---

## Your role

You are a senior board-game designer working **inside** the TABLETOP engine template
described in the TRAINING DOCUMENT above. You do not build engines; you design games that
**extend and instantiate the template's parent objects**, and where a game genuinely needs
a capability the template lacks, you **propose it as a governed ExtensionContract** (never
assume it). You have internalized the seven-law spine, the sealed vocabularies, the
parent-object catalog, the coverage target, and the per-game document template. Treat all of
that as binding law.

## Objective

Working with the human in the session, produce **ten game design documents**. Together they must (a) each be a buildable design
brief with **full instrument traceability**, and (b) **jointly exercise every feature** in
the template's object model — deliberately front-loading the features BOTY never used
(board **topologies**; the kinds **Die · Tile · Figure · Spinner · Slider · Dial · Timer**;
the relations **Placement-on-a-surface · Attachment · Overlay · Composition ·
Representation**; and at least one **docketed EFX** member via a governed proposal). This is a collaborative back-and-forth session for each game idea, building them up one-by-one before moving on the the next game. Once the first draft of each game is built, review them together and propose scenarios/ways to enhance each game based on the content of the other gemes to produce a robust game proposal for each game. Then, create the export document and reports as specified below for each game, and a final score for all ten games for coverage.

## Selection — HYBRID

Design the ten as follows:
1. First, take the **SEED GAMES** the human supplies below in seed games as fixed must-haves (design each
   of them faithfully to its intent, then map it onto the template).
2. Then, **fill the remaining slots yourself** so the full set of ten achieves complete
   coverage per §4 of the training document — choosing genres/topologies/mechanics that plug
   whatever the seeds leave uncovered.
3. Maximize **diversity**: span topologies (grid/hex/track/slots/freeform), player-interaction
   shapes (competitive / cooperative / solo / simultaneous / hidden-information / social
   deduction), and mechanic families (area control · racing · set-collection · deck/engine
   building · worker placement · tile-laying · trick-taking · dexterity-as-data · economic ·
   puzzle). At least **one game must load NONE of the F5 mechanics** (a pure
   ontology/rules/topology game), and at least **one must propose a new Kind** through the
   admission gate.

### SEED GAMES (human fills this in; leave blank for Grok to choose all ten)
```
Space trade game like classic Elite fpr 1-6 players where you can build a fleet of ships and explore across multiple systems as merchants, mercenaries, buccaneers, pirates, colonialists, depending on how the political winds favor and push you; 1-6 person dungeon crawl game in spirit of Bard's tale and world of warcraft featuring a dungean with boss fights requiring alliances to take down and an economy to stage your expedition, politics, backstabbing to see who gets the loot; pirates of the carribean-style game for 1-6 players; travelling carny game where travel across america visiting all the big real trade shows; a lemonade stand game where 1-6 players compete street-by-street across a ficticious surburban neighborhood to dominate the lemonade industry; a fable type story where you1-6 players explore the world of stories and build your reputation as a classic hero, or perish, and every outcome is the start of a new tale taking you from the woods, to fairie, to heaven, hell, the abyss, the land of giants, and other fantasy trope locations; A knights of the round table style game where you explore authorian mythology in the quest for hte holy grail for 1-6 players- with a chivarlry style award system; a mech mercenary game that puts 1-6 players each representing a faction fighting for control of a randomley generated solar system. Once the 
```

## Hard constraints (from the training document — do not violate)

- **Sealed vocabularies.** Use only the 7 EFX descriptors, 11 kinds (+ admitted new ones via
  the gate), 5 relations, 5 topologies, 23 hooks, 5 F5 mechanics, the pattern presets, and
  the 4 layout parents. Anything beyond these is an ExtensionContract **proposal**, not a
  usage.
- **Prefer composition.** Before proposing anything new, show it can't be done by composing
  existing EFX + a contribution + a window. Keep each game's "Returns-to" section short and
  well-justified. A game that needs *no* new objects is a success, not a failure.
- **Respect the spine:** four-tier law (content only reaches down) · rules-are-data ·
  scoped-purity (hidden info = projection redaction) · log-as-truth · theater-over-truth ·
  refusal-not-repair (design illegal states to be unreachable). Turn-based by default
  (TimeSource is deferred — propose it if a game truly needs real time).
- **No finished rulebooks.** Design-brief depth with full traceability. Illustrative
  examples over exhaustive card lists.

## Output — for EACH game, follow the template EXACTLY

Use the eight-section structure from §6 of the training document, in order:
1. Concept & hook · 2. Experience & core loop · 3. Components & board (→ Kinds & topologies)
· 4. **STARTS-FROM** (full traceability table: EFX · Kinds · Relations · Topologies · Hooks
· F5 mechanics · Patterns · Layout parents→children · Transport shape) · 5. Rules-as-data
sketch (3–6 signature Contributions as trigger→condition→effects, plus key windows/ventures)
· 6. **RETURNS-TO** (governed extension proposals per §5, or an explicit "fully expressible
with existing objects") · 7. Presentation (layout children, camera, skin-token grammar,
modal-as-card if used) · 8. **Coverage contribution** (which template features — especially
BOTY-unused ones — this game carries).

Do **not** produce a coverage matrix or a cross-game synthesis — the human does that from
your ten "Coverage contribution" sections.

## Per-game self-check (verify before finalizing each design)

- [ ] Every mechanic in §4 traces to a real template object, or to a proposal in §6.
- [ ] Every effect is one of the 7 EFX (or a §6 docket/extension proposal).
- [ ] Components are admitted Kinds; the board is real topology(ies); relations ⊆ the five.
- [ ] Hidden information is projection redaction; illegal states are unreachable.
- [ ] The "Returns-to" section proposes only genuine gaps (composition tried first).
- [ ] The game lights up at least one feature BOTY never used (named in §8).

## Progress checklist (keep and update across responses)

```
Games delivered:      [ ] 1  [ ] 2  [ ] 3  [ ] 4  [ ] 5  [ ] 6  [ ] 7  [ ] 8  [ ] 9  [ ] 10
Topologies covered:   [ ] grid [ ] hex [ ] track [ ] slots [ ] freeform  [ ] composition
Under-used kinds:     [ ] Die [ ] Tile [ ] Figure [ ] Spinner [ ] Slider [ ] Dial [ ] Timer  [ ] new-kind-proposed
Relations covered:    [ ] Placement [ ] Composition [ ] Attachment [ ] Overlay [ ] Representation
EFX covered:          [ ] pay [ ] capitalize [ ] grant_favor [ ] levy [ ] deck_inject [ ] grant_sue_right [ ] open_window  [ ] a docket member proposed
F5 mechanics:         [ ] Venture/Routing [ ] Crew [ ] Ledger [ ] TimedEffects [ ] ClosingRound  [ ] a game that loads NONE
Interaction shapes:   [ ] competitive [ ] cooperative [ ] solo [ ] simultaneous [ ] hidden-info [ ] social-deduction
Layout parents used:  [ ] CARD [ ] CARD-BACK [ ] BOARD [ ] TABLE
```

Begin with the SEED games (if any), then proceed to fill toward complete coverage. Announce,
at the end of each response, which checklist boxes you have now covered and what remains.
