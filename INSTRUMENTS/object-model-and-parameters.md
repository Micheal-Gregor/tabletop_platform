# Object Model & Parameters — TABLETOP build

Rule: every module appears here BEFORE it is written; if it isn't here, propose the addition
first. Every entry traces to an admitted S3/S2 node (CC-1).

## Modules — F1 Kernel & Determinism (build slot 1, ACTIVE)

| Module | File | Traces to | Responsibility | Status |
|---|---|---|---|---|
| kernel/types | packages/engine/src/kernel/types.ts | S3 F1 (StateTree/Guard interfaces); I-1 (PackRef); I-2 (Genesis) | Shared kernel types: State, PackRef, Seat, Intent, Refusal (typed), Verdict, GameRow | built |
| M1 StateTree | packages/engine/src/kernel/statetree.ts | S3 F1·M1 ← S2 M1 | One root; on-state ids; derived-never-stored; deep-frozen exposure (R-10 structural) | built |
| M2 Guard | packages/engine/src/kernel/guard.ts | S3 F1·M2 ← S2 M2 | Central legality; two-level check (structural → rule); typed refusal; refusal-not-repair; state byte-unchanged on refuse | built |
| M3 IntentLog | packages/engine/src/kernel/intentlog.ts | S3 F1·M3 ← S2 M3; I-1 | Record-after-success; rebuild(packRef, seed, seats, log); divergence → full rebuild never patch (R-9) | built |
| M4 RNGStreams | packages/engine/src/kernel/rng.ts | S3 F1·M4 ← S2 M4 | Named streams, deterministic, fixed per-stream offsets; human inputs as ARGUMENTS never entropy | built |
| kernel/core | packages/engine/src/kernel/core.ts | S3 S-1 seam (guarded intent path); HK-1/HK-2 | The ONLY mutation path: submit(intent) → Guard → apply → log; hooks wired here | built |

F2–F7 rows seeded when their build slot opens (build order S3 §2).

**Scaffold ratification (EA-4):** the empty package barrels
(`packages/patterns/src/index.ts`, `packages/presentation/src/index.ts`, both `export {}`)
are ratified placeholders from the C4 Stack resolution — they hold the monorepo shape
until their build slots open, own no behavior, and gain instrument rows when they do.

## Modules — F2 Play Engine (build slot 2, ACTIVE)

| Module | File | Traces to | Responsibility | Status |
|---|---|---|---|---|
| M9 EffectEngine | packages/engine/src/play/effects.ts | S3 F2·M9 ← S2 M9 · S-3 · R-3/R-24 · HK-9 (M9 side) | SOLE applier of effects; EFX v1.1.1 sealed; unknown → refusal at HK-9, halt-not-skip; per-descriptor typed mutations PRIVATE (structural R-24); open_window delegates with depth-1 law (R-17 engine side) | built |
| M7 WindowManager | packages/engine/src/play/windows.ts | S3 F2·M7 ← S2 M7 · S-8 · R-6/R-7 · HK-5 | IWN region on state; open/resolve/auto lifecycle; gated windows block advance; auto-policy for eliminated deciders decides AND logs (as an intent) | built |
| M5 TurnMachine | packages/engine/src/play/turn.ts | S3 F2·M5 ← S2 M5 · R-8 · HK-3 | Five phases; seat pass; round wrap EXACTLY once (wrap-flag law); end-trigger + Closing slot flag; both-check before advance (Guard rules + HK-5) | built |
| M6 Deck | packages/engine/src/play/deck.ts | S3 F2·M6 ← S2 M6 | Draw/discard/reserve; shuffle + draw from named streams; living inject order-preserving; empty draw legal | built |
| M8 PackLoader | packages/engine/src/play/packloader.ts | S3 F2·M8 ← S2 M8 · S-5 · R-2 · HK-4 · I-2 | validate() names defects (EFX closure, schema, versions); genesis() builds engine state from the pack; wire() registers F2 intents; flavor attaches, never read | built |

## Modules — F3 Ontology (build slot 3, ACTIVE)

| Module | File | Traces to | Responsibility | Status |
|---|---|---|---|---|
| ME1 KindRegistry | packages/engine/src/ontology/kinds.ts | S3 F3·ME1 ← S2 ME1 · R-14 | Admitted KindDefs (identity, state shape, roles, relations-grantable); supersede-never-respec; seeded with the named roster THROUGH the gate (dogfood) | built |
| ME5 AdmissibilityGate | packages/engine/src/ontology/admission.ts | S3 F3·ME5 ← S2 ME5 · S-5 · HK-7 · EX-2 | Admission-by-rule: the EX-2 predicate (identity+shape ∧ bindable roles ∧ relations ⊆ the five); refusal NAMES the defect; V-5's decision surface | built |
| ME2 RoleBinder | packages/engine/src/ontology/roles.ts | S3 F3·ME2 ← S2 ME2 · R-11 · EX-3 · ODG-e1 | Role→primitive bindings (Randomizer→RNGStreams · Tracker→derived state · Reference→ruleset presentation · TimeSource→DEFERRED behind ODG-e1); unbindable → refuse | built |
| ME3 RelationEngine | packages/engine/src/ontology/relations.ts | S3 F3·ME3 ← S2 Relation family · S-4 · HK-8 · R-12/R-13 · EX-5/EX-6 | Five typed relations w/ formation/dissolution predicates + state effects; on-form/on-dissolve EMISSION recorded for the F4 HookBus (S-4 supply); Representation = read-only view (view-never-owns) | built |
| ME4 SurfaceManager | packages/engine/src/ontology/surfaces.ts | S3 F3·ME4 ← S2 ME4 · EX-4 | Surfaces w/ five topologies (grid·hex·track·slots·freeform); topology-aware placement; **composition-forms-a-Surface recursion** (V-6's law) | built |
| ontology/wire | packages/engine/src/ontology/wire.ts | S-1 (guarded intents for ontology ops) · I-24 | relation:form / relation:dissolve / surface:add / component:place / surface:compose intents, turn-disciplined — HK-8 on the REAL path; HK-7's doors are the registry itself (every door gated, DF3-1/2) *(row corrected append-only per DF3-10; original claim superseded)* | built |

## Modules — F4 Rule System (build slot 4, ACTIVE)

| Module | File | Traces to | Responsibility | Status |
|---|---|---|---|---|
| rules/vocabularies | packages/engine/src/rules/vocabularies.ts | S3 F4 · S-7 · GovernedVocabulary «interface» | Sealed governed vocabularies: EFX v1.1.1 (wrapped) · HookPoints v1.0 (7 turn + 6 lifecycle + 10 relation, names = I-28) · VerbSets v1.0 | built |
| MR1 RuleRegistry | packages/engine/src/rules/registry.ts | S3 F4·MR1 ← S2 MR1 · S-3 · R-16/R-17/R-24 · HK-9 FULL | Sole dispatcher of CONTRIBUTIONS; per-firing snapshot; total order (hook, bearer-entry-seq); bounded condition eval; effects ONLY via EffectEngine; relation-borne activation derived from formed relations (V-8) | built |
| MR2 HookBus | packages/engine/src/rules/hookbus.ts | S3 F4·MR2 · S-4 (consume) · I-21 | Consumes F3's recorded relationEvents (processed cursor on state) → dispatch on-form:/on-dissolve:<type>; turn/lifecycle weave = I-29 (F5) | built |
| MR3 ContributionLoader | packages/engine/src/rules/contributions.ts | S3 F4·MR3 · R-15 · HK-4 (MR3 side) · R-16 static | validateContribution: trigger ∈ HookPoints ∧ effects ⊆ EFX ∧ versions known ∧ condition paths bounded ∧ slots declared — refusals NAME defects; UniqueDef (RE-7 catalog artifact) validated here | built |
| MR4 StateSlotManager | packages/engine/src/rules/slots.ts | S3 F4·MR4 · R-18 | Declared slots on state.ruleSlots; four reset classes (never/per-turn/per-round/per-game); undeclared write → refused | built |
| MR5 ExtensionContract | packages/engine/src/rules/extension.ts | S3 F4·MR5 · S-7 · ODG docket | Governance cycles: propose(member, obligations{refusal test + vector plan + hook spec}) → owner review record; NEVER mutates sealed vocabularies at runtime (growth = repo-time version bump); docket seeded (spawn_venture, draw_card, form_relation) | built |
| MR6 RulesetView | packages/engine/src/rules/rulesetview.ts | S3 F4·MR6 · RE-12 seam (→ MP7) | Total exposure: vocabularies + registered contributions as a derivable view | built |
| rules/wire | packages/engine/src/rules/wire.ts | S-1 · I-29 | rules:pump intent (turn-disciplined) driving the HookBus cursor | built |

## Modules — F5 Mechanics Library (build slot 5, ACTIVE — opt-in per QG1-Q2)

| Module | File | Traces to | Responsibility | Status |
|---|---|---|---|---|
| M13 Ledger | packages/engine/src/library/ledger.ts | S3 F5·M13 · R-5 · RC-3/RC-D | loaded flag; BALANCED posts only (legs sum to zero, R-5); application via EffectEngine pay/levy (S5 law held); derivedBalances = per-seat leg sums (RC-D) | built |
| M10 Venture + M11 Routing | packages/engine/src/library/ventures.ts | S3 F5·M10/M11 · RC-A′ · RC-E (Stage-2b; T2/T3 excised per DF5-7) | spawn (general + single-portion degenerate; door-validated per DF5-2); portions (party, task-role, funding); windowed routing gates advance, decision effectuated by the logged route intent (I-36/I-38); completion → payoff receivables + carried debts; deadline → lapse (status flip + crew release per DF5-9; penalty = pack policy, N/A) | built |
| M12a Outfit + M12b Crew | packages/engine/src/library/outfit.ts | S3 F5·M12a/b · EX-3 roles · CRW law | seat roles; crew one-portion-at-a-time (assign refuses if busy); work burns portions; viability policies = pack policy args | built |
| M14 TimedEffects | packages/engine/src/library/timedfx.ts | S3 F5·M14 · RC-G · RE-10 | attach (scope outfit|table); tick at round wrap: charges post through the Ledger when loaded (RC-D) else EffectEngine; duration expiry | built |
| M15 ClosingRound | packages/engine/src/library/closing.ts | S3 F5·M15 · QG1-Q1 · RCK | reckon at status 'closing': trailing-first order, close-books force-collects receivables (balanced posts), rank by cash, champion; status → 'ended' (I-17 CLOSES) | built |
| library/wire | packages/engine/src/library/wire.ts | S-1 · I-29/I-33 | upkeep · venture:spawn/route · crew:assign/work · tfx:attach · turn:end (THE WEAVE: pass + on-round-wrap dispatch + TFX tick + per-round/per-turn slot resets) · closing:reckon — all turn-disciplined | built |

**S3 F2 note:** EffectEngine "fed by BOTH registry-dispatched contributions and
module-native library effects" — the registry feed arrives at F4, library feeds at F5;
at F2 the feeds are card-borne fx (pack content through the closed vocabulary). Explicit
deferral, not omission (I-11).

**V-1 ownership correction (on the record):** the MINIMAL game exercises Venture/Routing/
Ledger/TFX/Reckoning — F5 modules. V-1 discharges after F5, not F2. V-2/V-3 discharge at
F2 (R gate required — vector computation is load-bearing).

**S3 "self-heal" (F1·M3 wording) — destination recorded (K7 D-5):** self-heal is
Transport's CONSUMPTION of `rebuild()` on divergence, at F7·M16. The kernel supplies the
mechanism (rebuild, DivergenceError); the healing policy is F7's. Explicit deferral, not
an omission.

## Parameters / extension points

- **Genesis (I-2):** `genesis(packRef, seats, seed) → State` — injected; PackLoader (F2)
  supplies the real one; kernel stays pack-agnostic.
- **Appliers:** intent-type → applier registry, INTERNAL to core (not exported); F2+ modules
  register through core, never mutate directly.
- **RNG algorithm:** splitmix-derived per-stream seeding (deterministic, portable);
  algorithm choice = benign interpretation I-4 (registered).
