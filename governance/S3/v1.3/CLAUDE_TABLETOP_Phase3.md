# CLAUDE_TABLETOP_Phase3.md — revision v1.3 (re-emission, content unchanged)

*Revision v1.3 of the TABLETOP Phase 3 build instruction, re-emitted 2026-11-08 under
`governance/S2-S3-emission-contract.md` v1.0 (SP-7, owner-approved "Approve 30M"). It supersedes the form of the
pair anchored at `s3-anchor-v1.2` (CLAUDE_TABLETOP_Phase3.md, the Specification, and SUP-1..SUP-3, whose effects are
folded in here) and changes none of its content: every rule, refusal, vector rule, hook, gate and do-not below is the
v1.2 pair's, now keyed by the contract's IDs. Old to new: R-n is REF-0n/REF-n, V-n is VEC-0n, HK-n is HOOK-0n/HOOK-n,
S-n is cited in each SEAM row, the §8 concerns are PC-01..PC-09. The companion Specification travels unchanged.*

## 1. Disambiguation header

> **⚠ CONCEPT DISAMBIGUATION.** The authoritative Phase-3 build instruction for **TABLETOP** only — anchored to
> S2-TABLETOP-v2.0 via the Phase 3 partition approved 2026-07-25. Never merge with BOTY-repo, ContractLite,
> GateControl, or any other concept's partition, seams, tests, or CLAUDE.md. CLAUDE_TABLETOP_v2.md remains the
> Phase-1/2 anchor and permanent record. Where this file and the Specification sheet differ, HALT and escalate; they
> were approved together and may not drift apart.

**Anchor chain:** S1-Phase1-TABLETOP-v2.0 → S2-TABLETOP-v2.0 → THIS partition (7 facets / 9 seams, ODG-A resolved).
**Spine:** four-tier law · closed governed vocabularies · rules are data · scoped purity · log-as-truth · theater over
truth · refusal-not-repair.

**The S5 boundary law (REF-24's ground):** RuleRegistry is the sole dispatcher of CONTRIBUTIONS; EffectEngine is the
sole applier of EFFECTS — fed by both registry dispatch and module-native library behavior. One vocabulary (EFX
v1.1.1) at the effect level; dispatch source is not the law's subject.

**Folded supersessions (the operative S3 at v1.2):**
- **SUP-1 (packRef).** The persisted row is `{packRef, seed, seats, moves}`, `packRef = (id, version, integrity
  hash)`. AX-4 reads "(packRef, seed, seats, log) rebuilds byte-identical state"; a row whose packRef does not match the
  loaded pack (id, version or hash) is a DIVERGENCE, refused whole, never patched (REF-09). S-2 inherits the row shape.
- **SUP-2 (ontology-mutation authority).** Ontology mutation (relation formation/dissolution, placement, surface
  composition) flows through S-1 PLAYER intents under turn discipline. Content-TRIGGERED formation awaits the docketed
  `form_relation` EFX member via its ExtensionContract cycle. Raw `relation:form` of type Placement creates a
  relation-level record that never denormalizes a location; placement-with-location flows through `component:place`.
- **SUP-3 (the kind count).** The Component family's NAMED roster is ELEVEN kinds: Board, PlayerBoard, Card, Token,
  Die, Tile, Figure, Spinner, Slider, Dial, Timer. The family stays OPEN under admission-by-rule (EX-2); the count is
  descriptive, never load-bearing.

**Do not**
- Do not build across the partition — one facet at a time, in the §10 order.
- Do not let any facet cross to another except through its recorded seam (§4).
- Do not apply an effect anywhere but EffectEngine (REF-24) or dispatch a contribution anywhere but RuleRegistry —
  the S5 boundary is law, not layout.
- Do not put presentation code in the engine package or read outside SeatProjector.
- Do not extend EFX, HookPoints, or VerbSets outside an ExtensionContract cycle.
- Do not repair an illegal intent, log a failed one, or mutate outside the Guard.
- Do not hand-write a golden vector; do not ship a guard without its failing test.
- Do not resolve ODG-4 implicitly by starting to code — it is decided at the C4 anchor.
- Do not respecify an admitted node — supersede on the record.
- Do not merge this file with any other concept's; do not let this file and the Specification sheet drift apart.

Doctrine: tests are falsifiable — mutation-test each guard (delete the guarded call; the named test MUST fail). A
test that cannot fail verifies nothing. Every hook is load-bearing and must be falsifiable.

## 2. Resolved partition

Seven facets: F1 Kernel & Determinism · F2 Play Engine · F3 Ontology · F4 Rule System · F5 Mechanics Library
(opt-in per module) · F6 Presentation (separate package, S-6 ONLY) · F7 Edges & Content Tiers. Each row is a module the
partition names; its File cell lists the files that carry it (a facet's intent wiring, shared types and package
barrels are filed under the named module whose rule or seam they carry). `Owns OBJ` names the S2 nodes: Phase 2
minted no OBJ ids.

| ID | Module | File | Owns OBJ | Status |
|---|---|---|---|---|
| MOD-01 | M1 StateTree (F1) | `packages/engine/src/kernel/statetree.ts`, `packages/engine/src/kernel/types.ts` | S2 M1 StateTree; the kernel types (State, PackRef, Seat, Intent, Refusal, Verdict, GameRow) | ACTIVE |
| MOD-02 | M2 Guard (F1) — with the S-1 guarded intent path it enforces | `packages/engine/src/kernel/guard.ts`, `packages/engine/src/kernel/core.ts`, `packages/engine/src/kernel/discipline.ts` | S2 M2 Guard | ACTIVE |
| MOD-03 | M3 IntentLog (F1) | `packages/engine/src/kernel/intentlog.ts` | S2 M3 IntentLog | ACTIVE |
| MOD-04 | M4 RNGStreams (F1) | `packages/engine/src/kernel/rng.ts` | S2 M4 RNGStreams | ACTIVE |
| MOD-05 | M5 TurnMachine (F2) | `packages/engine/src/play/turn.ts` | S2 M5 TurnMachine | ACTIVE |
| MOD-06 | M6 Deck (F2) | `packages/engine/src/play/deck.ts` | S2 M6 Deck | ACTIVE |
| MOD-07 | M7 WindowManager (F2) | `packages/engine/src/play/windows.ts` | S2 M7 WindowManager (IWN) | ACTIVE |
| MOD-08 | M8 PackLoader (F2) | `packages/engine/src/play/packloader.ts` | S2 M8 PackLoader | ACTIVE |
| MOD-09 | M9 EffectEngine (F2) | `packages/engine/src/play/effects.ts` | S2 M9 EffectEngine | ACTIVE |
| MOD-10 | ME1 KindRegistry + the Component family (F3) | `packages/engine/src/ontology/kinds.ts` | S2 ME1 KindRegistry; Component family (eleven named kinds) | ACTIVE |
| MOD-11 | ME2 RoleBinder (F3) | `packages/engine/src/ontology/roles.ts` | S2 ME2 RoleBinder | ACTIVE |
| MOD-12 | ME3 RelationEngine + the Relation family (F3) | `packages/engine/src/ontology/relations.ts`, `packages/engine/src/ontology/wire.ts` | S2 ME3 RelationEngine; Relation family (five) | ACTIVE |
| MOD-13 | ME4 SurfaceManager + Surfaces (F3) | `packages/engine/src/ontology/surfaces.ts` | S2 ME4 SurfaceManager; Surfaces | ACTIVE |
| MOD-14 | ME5 AdmissibilityGate (F3) | `packages/engine/src/ontology/admission.ts` | S2 ME5 AdmissibilityGate | ACTIVE |
| MOD-15 | MR1 RuleRegistry (F4) | `packages/engine/src/rules/registry.ts` | S2 MR1 RuleRegistry | ACTIVE |
| MOD-16 | MR2 HookBus (F4) | `packages/engine/src/rules/hookbus.ts`, `packages/engine/src/rules/wire.ts` | S2 MR2 HookBus | ACTIVE |
| MOD-17 | MR3 ContributionLoader + UniqueDef catalog (F4) | `packages/engine/src/rules/contributions.ts` | S2 MR3 ContributionLoader; UniqueDef (RE-7) | ACTIVE |
| MOD-18 | MR4 StateSlotManager (F4) | `packages/engine/src/rules/slots.ts` | S2 MR4 StateSlotManager | ACTIVE |
| MOD-19 | MR5 ExtensionContract (F4) | `packages/engine/src/rules/extension.ts` | S2 MR5 ExtensionContract | ACTIVE |
| MOD-20 | MR6 RulesetView (F4) | `packages/engine/src/rules/rulesetview.ts` | S2 MR6 RulesetView | ACTIVE |
| MOD-21 | GovernedVocabulary: EFX v1.1.1 · HookPoints · VerbSets (F4) | `packages/engine/src/rules/vocabularies.ts` | S2 GovernedVocabulary «interface»; EFX; HookPoints; VerbSets | ACTIVE |
| MOD-22 | M10 Venture + M11 Routing (F5) | `packages/engine/src/library/ventures.ts`, `packages/engine/src/library/wire.ts` | S2 M10 Venture; M11 Routing | ACTIVE |
| MOD-23 | M12a Outfit + M12b Crew (F5) | `packages/engine/src/library/outfit.ts` | S2 M12a Outfit; M12b Crew | ACTIVE |
| MOD-24 | M13 Ledger (F5) | `packages/engine/src/library/ledger.ts` | S2 M13 Ledger | ACTIVE |
| MOD-25 | M14 TimedEffects (F5) | `packages/engine/src/library/timedfx.ts` | S2 M14 TimedEffects | ACTIVE |
| MOD-26 | M15 ClosingRound (F5) | `packages/engine/src/library/closing.ts` | S2 M15 ClosingRound | ACTIVE |
| MOD-27 | M16 Transport — lockstep controller, AE-c6-CF shape (F7) | `packages/engine/src/transport/lockstep.ts` | S2 M16 Transport | ACTIVE |
| MOD-28 | M17 PatternLibrary (F7) | `packages/patterns/src/index.ts` | S2 M17 PatternLibrary | ACTIVE |
| MOD-29 | TierCriterion (F7) — the package boundaries it governs | `tools/check-tiers.mjs`, `packages/engine/src/index.ts`, `packages/presentation/src/index.ts` | S2 TierCriterion | ACTIVE |
| MOD-30 | MP1 ContractRenderer + MP2 JoinRenderer + MP7 BookletRenderer (F6) | `packages/presentation/src/render.ts`, `packages/presentation/src/layout.ts` | S2 MP1; MP2; MP7 | ACTIVE |
| MOD-31 | MP3 IntentEmitter / VerbHandler (F6) | `packages/presentation/src/emitter.ts` | S2 MP3 | ACTIVE |
| MOD-32 | MP4 SkinBinder (F6) | `packages/presentation/src/skin.ts` | S2 MP4 | ACTIVE |
| MOD-33 | MP5 SeatProjector + MP6 Unboxer (F6) | `packages/presentation/src/projector.ts` | S2 MP5; MP6 | ACTIVE |
| MOD-34 | MP8 TheaterSync (F6) | `packages/presentation/src/theater.ts` | S2 MP8 | ACTIVE |
| MOD-35 | MP9 ClockDriver + Adaptation/A11y (F6) | `packages/presentation/src/clock.ts` | S2 MP9 | ACTIVE |

## 3. Object-to-module map

Phase 2 (S2-TABLETOP-v2.0) minted no `OBJ` ids, so no row is keyed here and the join is unchecked. The v1.2 record
stands: every S2 node → exactly one destination — the 28+12+5+9 family nodes → F1–F7 as §2; Guard +
AdmissibilityGate + ExtensionContract double as K6's evaluator family; TierCriterion + SeamSet → C0/T. No orphans
(CT-1 ✓). §2's `Owns OBJ` column names each module's S2 nodes.

| OBJ | MOD | Role |
|---|---|---|

## 4. Seam contracts

S-1..S-9 as priced and approved at C0, the cross-facet law; S-3's wording as refined by S5 (§1). Each row is one
module-to-module crossing of a seam; Source depends on Target.

| ID | Source MOD | Target MOD | Transferred value | Dependency requirement | Validation rule |
|---|---|---|---|---|---|
| SEAM-01 | MOD-02 | MOD-01 | S-1: the state root, deep-frozen on exposure | the kernel owns the one root; derived values are never stored | REF-10: no mutation path bypasses the Guard |
| SEAM-02 | MOD-02 | MOD-03 | S-1: a succeeded intent, appended after success | record-after-success only | HOOK-02: no append without a succeeded apply |
| SEAM-03 | MOD-02 | MOD-04 | S-1: the seeded named streams | streams fixed per name and offset; human inputs are arguments, never entropy | determinism under (packRef, seed, seats, log) |
| SEAM-04 | MOD-27 | MOD-03 | S-2: the row `{packRef, seed, seats, moves}` and rebuild | Transport consumes only the row contract and its consumer interface (subscribe, submit, resume) | REF-09: divergence (packRef mismatch included) refused whole |
| SEAM-05 | MOD-27 | MOD-02 | S-2: submit(intent) on the hosted engine | writer discipline: a client submits only for a seat it holds | HOOK-01 on every submit |
| SEAM-06 | MOD-05 | MOD-02 | S-1: the turn intents (pass, advance, wrap) | registered through the kernel's guarded path | HOOK-03 wrap-once; HOOK-05 before advance |
| SEAM-07 | MOD-05 | MOD-07 | S-8: advance consults the open gated windows | TurnMachine checks Guard AND WindowManager before advance | REF-06; HOOK-05 |
| SEAM-08 | MOD-06 | MOD-04 | shuffle and draw from named streams | the Deck draws randomness only from the streams | determinism (VEC-02) |
| SEAM-09 | MOD-08 | MOD-02 | S-1: the F2 intents, registered by the pack wiring | registration through the kernel only | HOOK-01 |
| SEAM-10 | MOD-08 | MOD-14 | S-5: kinds admitted at pack load | admission by rule, never enumeration | HOOK-07; REF-11 |
| SEAM-11 | MOD-08 | MOD-21 | S-5: pack effects checked against EFX v1.1.1 at load | fx ⊆ EFX at load | REF-02; HOOK-04 |
| SEAM-12 | MOD-15 | MOD-09 | S-3: registry-dispatched contributions become effects | effects apply only through the EffectEngine | REF-24; HOOK-09 |
| SEAM-13 | MOD-22 | MOD-09 | S-3: module-native venture effects (payoffs, debts) | through the EffectEngine, one vocabulary | REF-24 |
| SEAM-14 | MOD-23 | MOD-09 | S-3: module-native outfit and crew levies | through the EffectEngine | REF-24 |
| SEAM-15 | MOD-24 | MOD-09 | S-3: balanced posts applied as pay and levy | balanced legs only, then the EffectEngine | REF-05; REF-24 |
| SEAM-16 | MOD-25 | MOD-24 | timed charges post through the Ledger when it is loaded | RC-D: Ledger when loaded, else the EffectEngine | REF-05 |
| SEAM-17 | MOD-25 | MOD-09 | S-3: timed-effect ticks when no Ledger is loaded | through the EffectEngine | REF-24 |
| SEAM-18 | MOD-26 | MOD-24 | close-books force-collects receivables as balanced posts | the reckoning posts through the Ledger | REF-05 |
| SEAM-19 | MOD-22 | MOD-07 | S-8: windowed routing gates advance | the route decision is a logged intent | REF-06; REF-07 |
| SEAM-20 | MOD-22 | MOD-02 | S-1: the library intents (upkeep, venture, crew, tfx, turn:end weave, closing) | turn-disciplined, through the kernel | HOOK-01 |
| SEAM-21 | MOD-23 | MOD-02 | S-1: the outfit and crew intents | turn-disciplined, through the kernel | HOOK-01 |
| SEAM-22 | MOD-10 | MOD-14 | S-5: a kind enters the registry only through the admission predicate | EX-2: identity+shape ∧ bindable roles ∧ relations ⊆ the five | HOOK-07; REF-14 |
| SEAM-23 | MOD-14 | MOD-11 | roles bindable to primitives | Randomizer→RNGStreams, Tracker→derived state, Reference→ruleset presentation, TimeSource deferred (ODG-e1) | REF-11 |
| SEAM-24 | MOD-12 | MOD-02 | S-1: relation, placement and surface intents (SUP-2) | turn-disciplined player intents | HOOK-08; REF-12; REF-13 |
| SEAM-25 | MOD-12 | MOD-13 | surface:add, component:place and surface:compose | topology-aware placement; composition forms a Surface | VEC-06 |
| SEAM-26 | MOD-16 | MOD-12 | S-4: recorded relation events (on-form, on-dissolve) | a processed cursor on state; events consumed in order | HOOK-09 |
| SEAM-27 | MOD-16 | MOD-15 | dispatch of turn, lifecycle and relation hooks | contributions only via the registry | HOOK-09 |
| SEAM-28 | MOD-16 | MOD-02 | S-1: the rules:pump intent | turn-disciplined | HOOK-01 |
| SEAM-29 | MOD-15 | MOD-17 | contributions validated at the MR3 door before registration | trigger ∈ HookPoints ∧ effects ⊆ EFX ∧ versions known ∧ bounded paths ∧ declared slots | REF-15; REF-16 |
| SEAM-30 | MOD-15 | MOD-18 | rule-state slot writes | declared slots only, four reset classes | REF-18 |
| SEAM-31 | MOD-17 | MOD-21 | S-7: vocabulary membership | the sealed vocabularies are read, never extended at runtime | REF-15 |
| SEAM-32 | MOD-19 | MOD-21 | S-7: governance cycles over the sealed vocabularies | growth is a repo-time version bump, never a runtime mutation | the docket (spawn_venture, draw_card, form_relation) stays open |
| SEAM-33 | MOD-20 | MOD-15 | total exposure of the registered contributions | a derivable view, never a copy that drifts | — |
| SEAM-34 | MOD-20 | MOD-21 | total exposure of the vocabularies | a derivable view | — |
| SEAM-35 | MOD-28 | MOD-22 | S-9: venture and routing presets as data | builders emit data only; the venture door re-validates | VEC-04 |
| SEAM-36 | MOD-28 | MOD-25 | S-9: timed-effect presets as data | data only; the TFX door re-validates | VEC-04 |
| SEAM-37 | MOD-28 | MOD-07 | S-9: window presets (open_window descriptors) | fx ⊆ EFX | VEC-04 |
| SEAM-38 | MOD-29 | MOD-28 | S-9: the tier boundary platform < library < patterns < content | imports point downward only | REF-04; HOOK-06 |
| SEAM-39 | MOD-33 | MOD-01 | S-6: project(state, seat), the one legal read | branded, deep-frozen, redacted SeatView | REF-19; HOOK-10 |
| SEAM-40 | MOD-31 | MOD-02 | S-6: verb → intent data only | presentation never touches state | REF-23 |
| SEAM-41 | MOD-30 | MOD-33 | S-6: rendering reads only the SeatView | tokens only, from the bound skin | REF-19; REF-22 |
| SEAM-42 | MOD-30 | MOD-32 | the bound skin's tokens | a contract holds token names, never raw values | REF-21; REF-22 |
| SEAM-43 | MOD-30 | MOD-20 | the booklet renders the RulesetView in full | total exposure | — |
| SEAM-44 | MOD-34 | MOD-33 | the seeded result an animation must show | displayed ≡ seeded; truth wins | REF-20; HOOK-11 |
| SEAM-45 | MOD-35 | MOD-33 | the game clock, derived from the SeatView | two-clock law: the animation timeline never writes state | — |

## 5. Refusal tests (CT-4)

Twenty-four: every guard — forbidden input → expected rejection. REF-24 was authored at K6 CT-4, the S5 boundary's
guard. `Test name` selects the test with `test_select` (`npx vitest run -t <name>`).

| ID | MOD | Invariant | Forbidden input | Expected rejection | Test name |
|---|---|---|---|---|---|
| REF-01 | MOD-02 | refusal-not-repair (R-1) | an illegal intent | typed refusal, state byte-unchanged, NOT logged | R-1 · refusal-not-repair |
| REF-02 | MOD-08 | pack EFX closure (R-2) | a pack with fx ∉ EFX | load refusal naming the descriptor | R-2 · pack validation names its defects |
| REF-03 | MOD-09 | halt-not-skip (R-3) | a runtime unknown descriptor | dispatch refusal, halt-not-skip | R-3 · unknown descriptor at runtime |
| REF-04 | MOD-29 | tier direction (R-4) | an upward dependency (content defining behavior; library importing content) | build refusal | GBC-45 · R-4: upward dependency |
| REF-05 | MOD-24 | balanced moves (R-5) | an unbalanced resource move with the Ledger loaded | the post throws | GBC-33 · balanced or refused |
| REF-06 | MOD-07 | window gating (R-6) | advance past an open gated window | refused | R-6 · open gated window blocks advance |
| REF-07 | MOD-07 | eliminated decider (R-7) | a skipped eliminated-decider window | refused; the auto-policy decides AND logs | R-7 · eliminated decider |
| REF-08 | MOD-05 | wrap-once (R-8) | a second wrap-tick in one round | refused | R-8 · wrap-once |
| REF-09 | MOD-03 | log-as-truth (R-9) | replay divergence | full rebuild, never a partial patch | R-9 · replay divergence |
| REF-10 | MOD-02 | single mutation path (R-10) | a mutation bypassing the Guard | structurally impossible; any path found is a defect | R-10 · structural immutability |
| REF-11 | MOD-11 | bindable roles (R-11) | an unbindable role | load refusal | R-11: an unknown role refuses |
| REF-12 | MOD-12 | view-never-owns (R-12) | a write through a Representation relation | refused | GBC-22 · Representation: views never own |
| REF-13 | MOD-12 | formation predicates (R-13) | a relation without a formation predicate | refused | R-13: an unknown relation type |
| REF-14 | MOD-10 | supersede, never respec (R-14) | respecification of an admitted node | refused (supersede on the record) | GBC-20 · supersede, never respec |
| REF-15 | MOD-17 | versioned validation (R-15) | a contribution with an unknown hook, effect or version | load refusal | GBC-25 · R-15: contribution validation NAMES defects |
| REF-16 | MOD-15 | bounded meta (R-16) | a meta-rule reaching beyond declared fields | refused | GBC-26 · R-16: bounded meta |
| REF-17 | MOD-15 | window depth 1 (R-17) | open_window from inside a window (depth > 1) | refused | GBC-30 · HK-9 full |
| REF-18 | MOD-18 | declared state (R-18) | a write to an undeclared rule-state slot | refused | GBC-27 · R-18: declared slots only |
| REF-19 | MOD-33 | scoped purity (R-19) | a render read outside SeatProjector | refused (projection breach) | R-19: a renderer handed RAW STATE refuses |
| REF-20 | MOD-34 | theater over truth (R-20) | an animation result ≠ the seeded result | theater-mismatch flagged, truth wins | GBC-51 · theater over truth |
| REF-21 | MOD-32 | skin completeness (R-21) | a skin with an unbound token | bind refusal naming the missing tokens | R-21: missing tokens refuse, NAMED |
| REF-22 | MOD-32 | tokens only (R-22) | a raw value in a presentation contract (non-token) | refused | R-22: a raw value in a contract refuses |
| REF-23 | MOD-31 | intents only (R-23) | presentation emitting anything but an intent | refused | GBC-50 · emission |
| REF-24 | MOD-09 | the S5 boundary (R-24) | any effect application bypassing the EffectEngine | refused | R-24 · sole applier |

## 6. Golden vectors (CT-5)

Nine, each rule stated independently of its vector (SP-5); never hand-written. Emitted DEFERRED at v1.0 with the
discharge rule "compute from the implementation, re-derive before the owning module counts complete"; each has since
been computed from the implementation and pinned at `vectors/V-n.json`, and the suite re-derives it (`rederive_all`).
No pinned value is recoverable only from its vector.

| ID | MOD | Pinned value | Rule | Input | Output | Encoding | State | Discharge condition |
|---|---|---|---|---|---|---|---|---|
| VEC-01 | MOD-02 | V-1 MINIMAL micro-game end-to-end (σ=7, two seats, three cards, ten steps): final state hash + B wins at +3W | the Stage-2b script + the ranking law | the row in `vectors/V-1.json` | finalHash, champion, ranking | utf8-json | COMPUTED | discharged 2026-07-26 (after F5, per the ownership correction: the MINIMAL game exercises F5 modules) |
| VEC-02 | MOD-03 | V-2 replay byte-equality | AX-4 as SUP-1 restates it: two rebuilds from the same {packRef, seed, seats, moves} row hash identically to the live final state | `vectors/V-2.json` | the rebuild hashes | utf8-json | COMPUTED | discharged at the R gate (F2) |
| VEC-03 | MOD-09 | V-3 EFX dispatch table | EFX v1.1.1 closure: each descriptor → its typed mutation, nothing else | `vectors/V-3.json` | the per-descriptor mutations | utf8-json | COMPUTED | discharged 2026-07-25 |
| VEC-04 | MOD-28 | V-4 pattern-preset fidelity | VK-8: each preset reproduces its inventory-documented behavior | `vectors/V-4.json` | the preset outputs | utf8-json | COMPUTED | discharged 2026-07-30 against the BOTY pack (ODG-4) |
| VEC-05 | MOD-14 | V-5 admissibility decision table | EX-2: the admission predicate decides, per kind | `vectors/V-5.json` | the decisions | utf8-json | COMPUTED | discharged 2026-07-25 |
| VEC-06 | MOD-13 | V-6 composed-Surface integrity | ER-e3: composed tiles FORM a Surface (recursion constitutive) | `vectors/V-6.json` | the composed surface | utf8-json | COMPUTED | discharged 2026-07-25 |
| VEC-07 | MOD-15 | V-7 rule-dispatch order | the precedence law: per-firing snapshot, total order (hook, bearer-entry-seq, …) | `vectors/V-7.json` | the dispatch order | utf8-json | COMPUTED | discharged 2026-07-25 |
| VEC-08 | MOD-15 | V-8 the monster room | ER1-4 × EX-5: a contribution registers when its bearer's relation FORMS; effects apply only through EFX | `vectors/V-8.json` | the activations and effects | utf8-json | COMPUTED | discharged 2026-07-25 (F3 × F4) |
| VEC-09 | MOD-34 | V-9 the die-tile-page scene | EP-2 theater-sync: displayed result ≡ seeded result across kinds and joins | `vectors/V-9.json` | the scene | utf8-json | COMPUTED | discharged 2026-07-30 |

## 7. Hook manifest (CT-6)

Twelve, consolidated per the CT-6 obligation (trigger → condition → block; owners bound). **Consolidation record
(15 named triggers → 12 hooks, on the record, not silent):** E-1's *pre-load version* folded into HOOK-04 (same
trigger point, one load gate); E-3's *before representation-write* and E-1's *pre-write declared slot* folded into
HOOK-01 (both are illegal writes refused at the single mutation gate). Their refusal TESTS remain separate and
separately owned (REF-12, REF-15, REF-18) — the fold merges trigger points, never obligations.

| ID | MOD | Trigger | Condition | Block action | Registered at |
|---|---|---|---|---|---|
| HOOK-01 | MOD-02 | before any mutation | Guard verdict LEGAL | block | `packages/engine/src/kernel/core.ts` |
| HOOK-02 | MOD-03 | before log append | the intent succeeded | block | `packages/engine/src/kernel/core.ts` |
| HOOK-03 | MOD-05 | at round wrap | wrap flag unset this round | block + flag | `packages/engine/src/play/turn.ts` |
| HOOK-04 | MOD-08 | at pack/contribution load (M8 + MR3) | fx ⊆ EFX ∧ schema valid ∧ all versions known | refuse load | `packages/engine/src/play/packloader.ts`, `packages/engine/src/rules/contributions.ts` |
| HOOK-05 | MOD-07 | before seat advance | no open gated window (or auto-resolved) | block | `packages/engine/src/play/windows.ts` |
| HOOK-06 | MOD-29 | CI import boundary | platform < library < patterns < content | fail build | `tools/check-tiers.mjs` |
| HOOK-07 | MOD-14 | before kind admission | the EX-2 predicate holds | refuse | `packages/engine/src/ontology/kinds.ts` |
| HOOK-08 | MOD-12 | before relation form | the formation predicate holds | refuse | `packages/engine/src/ontology/relations.ts` |
| HOOK-09 | MOD-15 | before rule dispatch (MR1 + M9) | registry integrity: snapshot taken, contributions only via the registry, no effect path bypassing the EffectEngine (REF-24's live twin) | halt | `packages/engine/src/rules/registry.ts`, `packages/engine/src/play/effects.ts` |
| HOOK-10 | MOD-33 | before render read | access through SeatProjector | block | `packages/presentation/src/projector.ts` |
| HOOK-11 | MOD-34 | at animation complete | displayed result ≡ seeded result | flag mismatch, truth wins | `packages/presentation/src/theater.ts` |
| HOOK-12 | MOD-32 | before skin bind | token completeness | refuse, name missing | `packages/presentation/src/skin.ts` |

```
HOOK HOOK-01 @before-any-mutation { condition: Guard verdict LEGAL, BLOCK: block }
HOOK HOOK-02 @before-log-append { condition: intent succeeded, BLOCK: block }
HOOK HOOK-03 @at-round-wrap { condition: wrap flag unset this round, BLOCK: block + flag }
HOOK HOOK-04 @at-pack-or-contribution-load { condition: fx ⊆ EFX ∧ schema valid ∧ all versions known, BLOCK: refuse load }
HOOK HOOK-05 @before-seat-advance { condition: no open gated window (or auto-resolved), BLOCK: block }
HOOK HOOK-06 @ci-import-boundary { condition: platform < library < patterns < content, BLOCK: fail build }
HOOK HOOK-07 @before-kind-admission { condition: EX-2 predicate holds, BLOCK: refuse }
HOOK HOOK-08 @before-relation-form { condition: formation predicate holds, BLOCK: refuse }
HOOK HOOK-09 @before-rule-dispatch { condition: snapshot taken ∧ contributions only via registry ∧ no effect path bypassing EffectEngine, BLOCK: halt }
HOOK HOOK-10 @before-render-read { condition: access through SeatProjector, BLOCK: block }
HOOK HOOK-11 @at-animation-complete { condition: displayed result ≡ seeded result, BLOCK: flag mismatch, truth wins }
HOOK HOOK-12 @before-skin-bind { condition: token completeness, BLOCK: refuse, name missing }
```

## 8. Production concerns

Developer-owned; enumerated, never resolved here. They are the input to Phase 5's latency / scale / security review.

| ID | MOD | Concern | Class | Owner | Discharge target |
|---|---|---|---|---|---|
| PC-01 | MOD-03 | persistence medium for rows and logs | production | developer | Phase 5 review |
| PC-02 | MOD-27 | transport infrastructure (realtime, presence, host election) | production | developer | Phase 5 review |
| PC-03 | MOD-08 | pack distribution, versioning and integrity, and content moderation for user-authored packs | production | developer | Phase 5 review |
| PC-04 | MOD-27 | identity and auth | production | developer | Phase 5 review |
| PC-05 | | billing and storefront | production | developer | Phase 5 review |
| PC-06 | MOD-29 | per-platform packaging | production | developer | Phase 5 review |
| PC-07 | MOD-32 | the E-2 asset pipeline and skin distribution | production | developer | Phase 5 review |
| PC-08 | | telemetry | production | developer | Phase 5 review |
| PC-09 | MOD-03 | tamper-evidence on the log | production | developer | Phase 5 review |

## 9. Open decision gates

Carried — all non-blocking; resolve ONLY at their recorded triggers.

- **ODG-4 BOTY migration** (greenfield vs refactor) — decided at the Phase 4 **C4 anchor**, on the record, never by
  momentum.
- **ODG-3** pattern-catalog shape — at M17 design (MOD-28).
- **ODG-5 + ODG-SE-01/02** abstract/code boundaries — at implementation.
- **AE-c12-CF** simultaneity — the first universe needing it.
- **ODG-e1** Clock seam — the TimeSource binding (MOD-11, MOD-35).
- **The EFX docket** (spawn_venture, draw_card, form_relation) — ExtensionContract cycles only (MOD-19).
- **ODG-p1** realization technique; **ODG-p2** second-bridge validation (the second universe's skin).

**RESOLVED in the v1.0 run:** ODG-A (partition) · AE-c6-CF (Transport shape) · the S5 contradiction (precondition
disjointness + REF-24).

## 10. Build order

Violating it is a defect, not a preference. **F1 → F2 → F3 → F4 → F5 → F7 → F6.** Kernel first; registry (F4) before
any dispatch consumer; presentation LAST and as its OWN package, touching the engine only through SeatProjector
(reads) + IntentEmitter (intents). F6 in the engine package = an S-6 breach at the repo level. Transport (F7) consumes
only the S-2 row contract and its declared consumer interface (subscribe, submit, resume); UX orchestration is
out-of-platform.

By module: MOD-01 → MOD-02 → MOD-03 → MOD-04 (F1) · MOD-05 → MOD-06 → MOD-07 → MOD-08 → MOD-09 (F2) · MOD-10 →
MOD-11 → MOD-12 → MOD-13 → MOD-14 (F3) · MOD-15 → MOD-16 → MOD-17 → MOD-18 → MOD-19 → MOD-20 → MOD-21 (F4) · MOD-22 →
MOD-23 → MOD-24 → MOD-25 → MOD-26 (F5) · MOD-27 → MOD-28 → MOD-29 (F7) · MOD-30 → MOD-31 → MOD-32 → MOD-33 → MOD-34 →
MOD-35 (F6).

## 11. Module completion checklist

A module counts COMPLETE only when ALL hold: (1) its facet's carried rules cited and honored in code (cite-or-admit —
no uncited law); (2) every refusal test it owns passes AND survives mutation testing; (3) every deferred vector it
owns is computed from the implementation and re-derived once; (4) every hook it owns is live, wired, and falsifiable;
(5) its seam contracts are exercised by at least one cross-facet test (the seam governs); (6) no open-interior gate
was silently resolved (ODGs stay open behind their interfaces); (7) the handoff log's "governed by" column names this
file for the work. Readiness below is the build's state at this re-emission; the completion ledger is the live record.

| MOD | CT-1 | CT-2 | CT-3 | CT-4 | CT-5 | CT-6 | PC enum | Readiness |
|---|---|---|---|---|---|---|---|---|
| MOD-01 | traces §2 | F1 rules | none invented | — | — | — | — | BUILT |
| MOD-02 | traces §2 | F1 rules | none invented | REF-01, REF-10 | VEC-01 | HOOK-01 | — | BUILT |
| MOD-03 | traces §2 | F1 rules | none invented | REF-09 | VEC-02 | HOOK-02 | PC-01, PC-09 | BUILT |
| MOD-04 | traces §2 | F1 rules | none invented | — | — | — | — | BUILT |
| MOD-05 | traces §2 | F2 rules | none invented | REF-08 | — | HOOK-03 | — | BUILT |
| MOD-06 | traces §2 | F2 rules | none invented | — | — | — | — | BUILT |
| MOD-07 | traces §2 | F2 rules | none invented | REF-06, REF-07 | — | HOOK-05 | — | BUILT |
| MOD-08 | traces §2 | F2 rules | none invented | REF-02 | — | HOOK-04 | PC-03 | BUILT |
| MOD-09 | traces §2 | F2 rules | none invented | REF-03, REF-24 | VEC-03 | — | — | BUILT |
| MOD-10 | traces §2 | F3 rules | none invented | REF-14 | — | — | — | BUILT |
| MOD-11 | traces §2 | F3 rules | ODG-e1 open | REF-11 | — | — | — | BUILT |
| MOD-12 | traces §2 | F3 rules | none invented | REF-12, REF-13 | — | HOOK-08 | — | BUILT |
| MOD-13 | traces §2 | F3 rules | none invented | — | VEC-06 | — | — | BUILT |
| MOD-14 | traces §2 | F3 rules | none invented | — | VEC-05 | HOOK-07 | — | BUILT |
| MOD-15 | traces §2 | F4 rules | none invented | REF-16, REF-17 | VEC-07, VEC-08 | HOOK-09 | — | BUILT |
| MOD-16 | traces §2 | F4 rules | none invented | — | — | — | — | BUILT |
| MOD-17 | traces §2 | F4 rules | none invented | REF-15 | — | — | — | BUILT |
| MOD-18 | traces §2 | F4 rules | none invented | REF-18 | — | — | — | BUILT |
| MOD-19 | traces §2 | F4 rules | docket open | — | — | — | — | BUILT |
| MOD-20 | traces §2 | F4 rules | none invented | — | — | — | — | BUILT |
| MOD-21 | traces §2 | F4 rules | none invented | — | — | — | — | BUILT |
| MOD-22 | traces §2 | F5 rules | none invented | — | — | — | — | BUILT |
| MOD-23 | traces §2 | F5 rules | none invented | — | — | — | — | BUILT |
| MOD-24 | traces §2 | F5 rules | none invented | REF-05 | — | — | — | BUILT |
| MOD-25 | traces §2 | F5 rules | none invented | — | — | — | — | BUILT |
| MOD-26 | traces §2 | F5 rules | none invented | — | — | — | — | BUILT |
| MOD-27 | traces §2 | F7 rules | none invented | — | — | — | PC-02, PC-04 | BUILT |
| MOD-28 | traces §2 | F7 rules | ODG-3 resolved on the record | — | VEC-04 | — | — | BUILT |
| MOD-29 | traces §2 | F7 rules | none invented | REF-04 | — | HOOK-06 | PC-06 | BUILT |
| MOD-30 | traces §2 | F6 rules | ODG-p1 on the record | — | — | — | — | BUILT |
| MOD-31 | traces §2 | F6 rules | none invented | REF-23 | — | — | — | BUILT |
| MOD-32 | traces §2 | F6 rules | none invented | REF-21, REF-22 | — | HOOK-12 | PC-07 | BUILT |
| MOD-33 | traces §2 | F6 rules | none invented | REF-19 | — | HOOK-10 | — | BUILT |
| MOD-34 | traces §2 | F6 rules | none invented | REF-20 | VEC-09 | HOOK-11 | — | BUILT |
| MOD-35 | traces §2 | F6 rules | ODG-e1 open | — | — | — | — | BUILT |

*End · CLAUDE_TABLETOP_Phase3.md, revision v1.3 · Companion: TABLETOP_Phase3_Specification.md (unchanged)*
