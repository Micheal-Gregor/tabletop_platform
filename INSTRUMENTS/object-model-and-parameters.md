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
