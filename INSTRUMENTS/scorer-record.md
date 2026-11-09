# Scorer record

Amendment H-1.7 (roster v0.11). At the end of each build stretch, before K7, the oop-standards scorer for the
build's language (python-code-scorer, typescript-code-scorer or php-code-scorer) grades each class the stretch
built. One row per class. The grade informs K7; it gates nothing unless the owner has ruled that it does, in
`RESOLUTION_RECORD.md`. A grade is a model's judgment against a fixed deduction table, so the scorer's version and
the model are part of the record.

| Stretch | Tree | Module | Class | File | Scorer (version) | Model | Score /10 | Main deductions |
|---|---|---|---|---|---|---|---|---|
| R1 repair | 036c9632c23d | MOD-02 | EngineCore | packages/engine/src/kernel/core.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.4 | W3 private keyword not # (core.ts:60-64); M6 getX() methods getState/getStateHash/getLogLength (core.ts:113-123) |
| R1 repair | 036c9632c23d | MOD-02 | HookViolation | packages/engine/src/kernel/hook-violation.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-02 | Guard | packages/engine/src/kernel/guard.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.5 | W3 private specs map not # (guard.ts:26); M3 register/supersede throw with no @throws (guard.ts:28-43) |
| R1 repair | 036c9632c23d | MOD-03 | IntentLog | packages/engine/src/kernel/intentlog.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.7 | W3 private entries array not # (intentlog.ts:14) |
| R1 repair | 036c9632c23d | MOD-03 | DivergenceError | packages/engine/src/kernel/divergence-error.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.9 | M1 message line over 80 cols (divergence-error.ts:10) |
| R1 repair | 036c9632c23d | MOD-04 | RNGStreams | packages/engine/src/kernel/rng.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.7 | W3 private streams map not # (rng.ts:16) |
| R1 repair | 036c9632c23d | MOD-04 | RNGStream | packages/engine/src/kernel/rng-stream.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.6 | W3 private next32 not # (rng-stream.ts:30); M3 nextInt throws with no @throws (rng-stream.ts:42-47) |
| R1 repair | 036c9632c23d | MOD-05 | HookHk3Violation | packages/engine/src/play/turn.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-07 | HookHk5Violation | packages/engine/src/play/windows.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-08 | PackLoadRefusal | packages/engine/src/play/packloader.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-09 | EffectEngine | packages/engine/src/play/effects.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.6 | W4 static-only container class (effects.ts:199-227); M3 apply() throws via HK-9 with no @throws (effects.ts:201) |
| R1 repair | 036c9632c23d | MOD-09 | EffectRefusal | packages/engine/src/play/effect-refusal.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-10 | KindRegistry | packages/engine/src/ontology/kinds.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 8.5 | D2 get() hands out the stored KindDef object (mutable roles/relationsGrantable arrays) unfrozen, uncopied (kinds.ts:92-94); W3 private defs map not # (kinds.ts:85) |
| R1 repair | 036c9632c23d | MOD-10 | KindRefusal | packages/engine/src/ontology/kind-refusal.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-11 | RoleRefusal | packages/engine/src/ontology/roles.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-12 | RelationRefusal | packages/engine/src/ontology/relations.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-13 | SurfaceRefusal | packages/engine/src/ontology/surfaces.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-14 | AdmissibilityGate | packages/engine/src/ontology/admission.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.6 | W3 private registry param property not # (admission.ts:17); M3 admit() throws via enroll with no @throws (admission.ts:20-22) |
| R1 repair | 036c9632c23d | MOD-15 | RuleRegistry | packages/engine/src/rules/registry.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.5 | W3 private entries array not # (registry.ts:91); M3 register() throws EffectRefusal with no @throws (registry.ts:93-102) |
| R1 repair | 036c9632c23d | MOD-17 | ContributionRefusal | packages/engine/src/rules/contributions.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-19 | ExtensionContract | packages/engine/src/rules/extension.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 8.5 | D2 propose()/approve() return the same cycle object stored internally, uncopied (extension.ts:44-62); W3 private cycles array not # (extension.ts:29) |
| R1 repair | 036c9632c23d | MOD-22 | VentureRefusal | packages/engine/src/library/ventures.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-24 | LedgerRefusal | packages/engine/src/library/ledger.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-26 | ClosingRefusal | packages/engine/src/library/closing.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-27 | LockstepController | packages/engine/src/transport/lockstep.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.5 | W3 private listeners/holders/present/faults not # (lockstep.ts:23-27); M3 join()/submit() throw with no @throws (lockstep.ts:76-112) |
| R1 repair | 036c9632c23d | MOD-27 | TransportRefusal | packages/engine/src/transport/transport-refusal.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-28 | PatternRefusal | packages/patterns/src/index.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-35 | Timeline | packages/presentation/src/clock.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 9.6 | W3 private t not # (clock.ts:31); M3 advance() throws with no @throws (clock.ts:36) |
| R1 repair | 036c9632c23d | MOD-31 | EmissionRefusal | packages/presentation/src/emitter.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-30 | LayoutRefusal | packages/presentation/src/layout.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-33 | ProjectionBreach | packages/presentation/src/projector.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-33 | UnboxRefusal | packages/presentation/src/unbox-refusal.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-32 | SkinRefusal | packages/presentation/src/skin.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none |
| R1 repair | 036c9632c23d | MOD-34 | TheaterRefusal | packages/presentation/src/theater.ts | typescript-code-scorer (oop-standards 1.2.2) | claude-sonnet-5-5 | 10.0 | none; scored by reading the code directly — class_facts.cjs was not run (no shell access in this process) |
