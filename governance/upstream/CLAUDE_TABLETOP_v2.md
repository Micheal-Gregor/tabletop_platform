# CLAUDE_TABLETOP_v2.md

> **⚠ CONCEPT DISAMBIGUATION & SUPERSESSION.** The Phase-1 handoff for **TABLETOP
> S1 v2.0** — SUPERSEDES CLAUDE_TABLETOP.md (v1.0) as the operative anchor, incorporating
> the E-3/E-1/E-2 enhancement payloads per the Consolidation Record. v1.0 and the three
> enhancement CLAUDE.md files remain the permanent record; only THIS file anchors the
> Phase 2 re-run. Never merge with another concept's CLAUDE.md.

**Anchor:** S1-Phase1-TABLETOP-v2.0 · **Spine:** four-tier law (platform < library <
patterns < content) · closed, versioned vocabularies under governed growth · rules are
data · scoped purity · log-as-truth · theater over truth.

## What this project does

A digital board/card-game platform. The engine is pure and deterministic — one state
tree, one guarded intent surface, seeded streams, the persisted game = (seed, seats,
log). The **ontology** gives it a full game box: 12 component kinds, 4 roles bound to
platform primitives, 5 first-class relations over recursive Surfaces, new kinds admitted
by rule. The **rule model** makes every piece rule-bearing: contributions (trigger ×
condition × effects) travel with kinds and relations, dispatch through one registry, hold
state only as declared tree slots; vocabularies grow only through the ExtensionContract.
The **presentation layer** gives it a body: contracts per kind and join, token-bound
skins bridged to design systems, physical verbs emitting intents, animations that perform
seeded results, an unboxing with a checksum, a rulebook that derives itself — all read
through per-seat projections. Games are content packs; proven scenarios are pattern-tier
presets; universes are skins over one machine.

## Architecture (module families)

**Kernel:** M1 StateTree · M2 Guard · M3 IntentLog/Replay · M4 RNGStreams. **Play:** M5
TurnMachine (+Closing-Round slot) · M6 Deck (living) · M7 WindowManager · M8 PackLoader ·
M9 EffectEngine (registry-fed). **Ontology (E-3):** ME1 KindRegistry · ME2 RoleBinder ·
ME3 RelationEngine · ME4 SurfaceManager · ME5 AdmissibilityGate. **Rules (E-1):** MR1
RuleRegistry (supersedes the EVT switch) · MR2 HookBus · MR3 ContributionLoader · MR4
StateSlotManager · MR5 ExtensionContract+docket · MR6 RulesetView. **Library (opt-in):**
M10 Venture · M11 Routing · M12a Outfit · M12b Crew · M13 Ledger · M14 TimedEffects ·
M15 ClosingRound. **Presentation (E-2, separate package):** MP1 ContractRenderer · MP2
JoinRenderer · MP3 VerbHandler · MP4 SkinBinder · MP5 SeatProjector · MP6 Unboxer · MP7
BookletRenderer · MP8 ClockDriver · MP9 Adaptation/A11y. **Edges:** M16 Transport · M17
PatternLibrary. Statuses per source packages; M9/M16/M17 review flags stand.

## Vocabularies (closed, versioned, contract-governed)

**EFX v1.1.1:** pay · capitalize · grant_favor · levy · deck_inject · grant_sue_right ·
open_window (depth-1 law). Docket: spawn_venture, draw_card, form_relation.
**HookPoints v1.0:** turn (7) · lifecycle (6) · relation (on-form/on-dissolve × 5).
**VerbSets v1.0:** per-kind (roll, spin, flip, snap, slide, drag, tap). Growth for ALL
three: the ExtensionContract only (proposal → refusal test + vector + hook spec →
owner review → version).

## Contracts (18) · Constraints · Rules

RC-1..6 (guard, effects, balanced-move, windows, replay, pack-validate) · RC-e1..4
(admit-kind, role-bind, relation-lifecycle, view-sync) · RC-r1..4 (dispatch,
validate-contribution, slot-lifecycle, contract-cycle) · RC-p1..4 (seat-projection,
theater-sync, token-bind, verb-emit). SC-1..5 unchanged + SC-e1 topology-not-hardcoded.
ER/EX/ER1/EP axiom sets consolidated per the ledger; standouts: refusal-not-repair ·
wrap-once · view-never-owns · is-a-in-the-catalog-has-a-in-the-engine · two clocks ·
scoped purity.

## Verification handoff (consolidated)

**Refusal tests (23):** the 10 core + unbindable-role, representation-write,
relation-without-predicate, admitted-node-respec (E-3) + unknown-vocab/version,
meta-beyond-fields, window-from-window, undeclared-slot-write (E-1) + projection-breach,
theater-mismatch, unbound-token, raw-value-in-contract, non-intent-emission (E-2).
**Golden vectors (9, ALL DEFERRED — compute from implementation, re-derive before the
owning module completes):** V-1 MINIMAL micro-game · V-2 replay byte-equality · V-3 EFX
dispatch table · V-4 pattern-preset fidelity · V-5 admissibility decision table · V-6
composed-Surface integrity · V-7 rule-dispatch order · V-8 the monster room · V-9 the
die-tile-page scene. **Hooks (12):** the 6 core + kind-admission, representation-write,
relation-form (E-3) + dispatch-integrity, load-version, slot-declared (E-1) +
pre-render-projection, animation-result-equality, bind-completeness (E-2 — fold at
implementation into a consolidated manifest).

## Open decision gates (all non-blocking) & production concerns

OPEN: ODG-3 pattern catalog · ODG-4 BOTY migration (greenfield vs refactor — decided at
the Phase 4 anchor, never by momentum) · ODG-5 + ODG-SE-01/02 boundaries · AE-c6-CF
transport/UX split · AE-c12-CF simultaneity · ODG-e1 Clock seam · the EFX docket ·
ODG-p1 realization technique · ODG-p2 second-bridge validation. CLOSED: ODG-2 (by
exercise). Production concerns: the v1.0 nine + asset pipeline & skin distribution.

## Do not (consolidated standouts)

Do not let content define behavior — vocabularies bound it, the contract grows it. Do not
write an if-ladder where a registry is law. Do not let any component, rule, or view own
state — the tree holds, everything else declares or displays. Do not let a gesture
influence a result or an animation carry game meaning. Do not render outside the seat
projection. Do not respecify an admitted node — supersede on the record. Do not resolve
ODG-4 implicitly by starting to code. Do not merge this file with any other concept's.

*Next: Phase 2 on THIS anchor → S2 v2.0 → the single Phase 3 fan-out → the Phase 4 repo.
The box is designed. Print it.*

**End · CLAUDE_TABLETOP_v2.md · Companions: TABLETOP_Consolidation_v2_0.md + the four
source packages (permanent record)**
