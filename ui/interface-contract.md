# Interface contract — TABLETOP class object library

*Phase 4's deliverable beside the library (roster v0.14, RD-33): what exists, what a caller may do, what it may only
read, and how each operation refuses. A listing, copied from the signatures and the object model
(`INSTRUMENTS/object-model-and-parameters.md`), against the S3 revision v1.3. A Phase 5 view reads the engine only
through `project` and changes it only by submitting an intent (S-6).*

## Objects

| Object | Module | File | Constructed with |
|---|---|---|---|
| EngineCore | MOD-02 | `packages/engine/src/kernel/core.ts` | packRef, seats, seed, genesis, guard |
| Guard | MOD-02 | `packages/engine/src/kernel/guard.ts` | nothing |
| IntentLog | MOD-03 | `packages/engine/src/kernel/intentlog.ts` | nothing |
| RNGStreams | MOD-04 | `packages/engine/src/kernel/rng.ts` | gameSeed |
| RNGStream | MOD-04 | `packages/engine/src/kernel/rng-stream.ts` | name, gameSeed |
| EffectEngine | MOD-09 | `packages/engine/src/play/effects.ts` | nothing |
| KindRegistry | MOD-10 | `packages/engine/src/ontology/kinds.ts` | nothing |
| AdmissibilityGate | MOD-14 | `packages/engine/src/ontology/admission.ts` | registry |
| RuleRegistry | MOD-15 | `packages/engine/src/rules/registry.ts` | nothing |
| ExtensionContract | MOD-19 | `packages/engine/src/rules/extension.ts` | nothing |
| LockstepController | MOD-27 | `packages/engine/src/transport/lockstep.ts` | core, seats (private; built by `host` or `resume`) |
| TransportRefusal, HookViolation, DivergenceError, EffectRefusal, KindRefusal, UnboxRefusal | MOD-27, 02, 03, 09, 10, 33 | each in its own file since R1 (one class per file) | as the object model declares |
| Timeline | MOD-35 | `packages/presentation/src/clock.ts` | nothing |
| SeatView (data) | MOD-33 | `packages/presentation/src/projector.ts` | built only by `project` |

## Actions

| Operation | Inputs | Returns | Refusals | Side effects | Determinism | Invariant to |
|---|---|---|---|---|---|---|
| EngineCore.registerIntent | type, spec, applier | nothing | Error (type already registered: supersede, never respec) | registers a guard spec and an applier | deterministic | |
| EngineCore.supersedeIntent | type, ground, spec, applier | nothing | Error (no existing registration; no named ground) | replaces a registration on the record | deterministic | |
| EngineCore.getState | none | the deep-frozen State | none | none | deterministic | |
| EngineCore.getStateHash | none | the state's FNV-1a 64 hash | none | none | deterministic | |
| EngineCore.getLogLength | none | the number of logged intents | none | none | deterministic | |
| EngineCore.toRow | none | the GameRow {packRef, seed, seats, moves} | none | none | deterministic | |
| EngineCore.submit | intent | SubmitResult: ok with the new state, or the typed refusal | Refusal value (REF-01: state byte-unchanged, nothing logged); HookViolation (HOOK-01, HOOK-02) | on success: state replaced, intent appended to the log | deterministic over (packRef, seed, seats, log) | |
| Guard.register | type, spec | nothing | Error (type already registered) | records the spec | deterministic | |
| Guard.supersede | type, spec | nothing | Error (type not registered) | replaces the spec | deterministic | |
| Guard.check | state, intent, seats | Verdict: LEGAL, or a typed refusal naming the rule | none (refusal is the returned verdict) | none | deterministic | |
| IntentLog.append | intent | nothing | none | appends one intent | deterministic | |
| IntentLog.length | none | the count | none | none | deterministic | |
| IntentLog.snapshot | none | the frozen intent list | none | none | deterministic | |
| IntentLog.toRow | packRef, seed, seats | the GameRow | none | none | deterministic | |
| RNGStreams.stream | name | the named RNGStream | none | creates the stream on first use | deterministic per (gameSeed, name) | |
| RNGStream.next | none | a float in [0, 1) | none | advances the stream | deterministic per (gameSeed, name, call count) | |
| RNGStream.nextInt | n | an integer in [0, n) | Error (n not a positive integer) | advances the stream | deterministic per (gameSeed, name, call count) | |
| EffectEngine.apply | state, d, ctx | the next state | EffectRefusal (REF-03 unknown descriptor, halt; REF-24) | none: returns a new state | deterministic | |
| EffectEngine.applyAll | state, fxList, ctx | the next state | EffectRefusal (as apply) | none: returns a new state | deterministic | |
| KindRegistry.has | name | boolean | none | none | deterministic | |
| KindRegistry.get | name | the KindDef, or undefined | none | none | deterministic | |
| KindRegistry.enroll | def | nothing | KindRefusal (HOOK-07: the EX-2 predicate fails; REF-14 respec) | admits the kind | deterministic | |
| KindRegistry.supersede | def, reason | nothing | KindRefusal GX-18 (nothing to supersede; no recorded reason) | supersedes on the record | deterministic | |
| KindRegistry.supersessionChain | none | the supersession record | none | none | deterministic | |
| KindRegistry.names | none | the admitted kind names | none | none | deterministic | |
| AdmissibilityGate.admit | def | nothing | KindRefusal naming the defect | admits into the registry | deterministic | |
| AdmissibilityGate.decide | def | the admission decision (VEC-05) | none | none | deterministic | registry (the EX-2 predicate reads only the def) |
| RuleRegistry.register | c | nothing | EffectRefusal GX-19 (id already registered: supersede, never respec); contributions are validated at the MR3 door first (REF-15) | registers a contribution | deterministic | |
| RuleRegistry.list | none | the registered contributions | none | none | deterministic | |
| RuleRegistry.dispatch | state, hookName, event, ctx | the next state | EffectRefusal (HOOK-09: unknown hook, halt; GX-22 non-numeric increment; REF-16, REF-17) | none: returns a new state | deterministic: per-firing snapshot, total order (VEC-07) | |
| ExtensionContract.propose | vocabulary, member, obligations | the opened ContractCycle | EffectRefusal GX-23/S-7 (unknown vocabulary; already a member; missing obligations) | records a cycle | deterministic | |
| ExtensionContract.approve | cycleId, ownerNote | the approved ContractCycle | EffectRefusal GX-23 (no such cycle; no owner note) | records the approval; never mutates a sealed vocabulary | deterministic | |
| ExtensionContract.record | none | every cycle | none | none | deterministic | |
| LockstepController.host | packRef, seats, seed, genesis, wire | a controller hosting a new EngineCore, its intents wired | none | builds the engine; wire registers its intents | deterministic over (packRef, seed, seats) | |
| LockstepController.resume | row, loadedPackRef, genesis, wire | a controller rebuilt from the row (self-heal) | TransportRefusal GX-31/SUP-1 (packRef id, version or hash mismatch: divergence refused whole, REF-09) | rebuilds the engine from the row | deterministic over the row | |
| LockstepController.join | clientId, seat | nothing | TransportRefusal GX-32 (unknown seat; seat held by a present client) | presence | deterministic | |
| LockstepController.leave | clientId | nothing | none | presence | deterministic | |
| LockstepController.takeover | clientId, seat | nothing | TransportRefusal GX-32 (the holder is still present) | presence | deterministic | |
| LockstepController.submit | clientId, intent | SubmitResult | TransportRefusal (writer discipline); the engine's refusals | as EngineCore.submit, then notifies listeners | deterministic | |
| LockstepController.listenerFaults | none | the recorded listener faults | none | none | deterministic | |
| LockstepController.subscribe | listener | the unsubscribe function | none | adds a listener | deterministic | |
| LockstepController.row | none | the GameRow | none | none | deterministic | |
| LockstepController.stateHash | none | the state hash | none | none | deterministic | |
| LockstepController.holderOf | seat | the holding client id, or undefined | none | none | deterministic | |
| Timeline.now | none | the local animation time | none | none | deterministic | |
| Timeline.advance | ms | the new local time | Error (ms not finite or negative) | advances the local clock; never writes game state | deterministic | |
| project | state, seat | the branded, frozen, redacted SeatView | ProjectionBreach (REF-19, HOOK-10) | none | deterministic | |
| unbox | view, what, ref | the revealed value | UnboxRefusal (not the viewer's own ref) | none | deterministic | |
| emit | verb, seat, args | the intent {type, seat, args} | EmissionRefusal (REF-23: unknown verb, non-intent) | none | deterministic | |

## What a seat may change (intents, through `emit` then `submit`)

upkeep · draw (`deck:draw`) · spawn-venture · route-venture · assign-crew · work · attach-effect (`tfx:attach`) · hire
(`crew:hire`) · buy-equipment (`outfit:buy`) · pool-draw · release-crew · sell-equipment · attach-gear · detach-gear ·
play-networking (`hand:play`) · decide (`window:resolve`) · end-turn (`turn:end`) · reckon (`closing:reckon`). Each is
turn-disciplined and guarded (HOOK-01); a refused intent changes nothing and is not logged (REF-01).

## Read-only

Everything in a SeatView. Opponents' deck contents and hands are absent (counts only); window options are visible to
the decider alone; the log is the truth and is never edited (REF-09).

## Error states

Refusals are typed values or errors naming their rule: GuardRefusal verdicts, HookViolation, DivergenceError,
EffectRefusal, PackLoadRefusal, HookHk3Violation, HookHk5Violation, KindRefusal, RoleRefusal, RelationRefusal,
SurfaceRefusal, ContributionRefusal, VentureRefusal, LedgerRefusal, ClosingRefusal, TransportRefusal, PatternRefusal,
EmissionRefusal, LayoutRefusal, SkinRefusal, ProjectionBreach, UnboxRefusal, TheaterRefusal. A refusal is correct
behaviour, never a missing object.
