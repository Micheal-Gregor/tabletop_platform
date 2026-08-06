/** @tabletop/engine — public surface (F1 slot; grows per build order, never ahead of it). */
export * from './kernel/types.js';
export { freezeDeep, canonicalJson, hashState } from './kernel/statetree.js';
export { Guard } from './kernel/guard.js';
export type { IntentSpec, ArgsCheck, RuleCheck } from './kernel/guard.js';
export { IntentLog, DivergenceError } from './kernel/intentlog.js';
export { RNGStream, RNGStreams } from './kernel/rng.js';
export {
  EngineCore,
  rebuild,
  HookViolation,
  hookHk1BeforeMutation,
  hookHk2BeforeLogAppend,
} from './kernel/core.js';
export type { Applier, ApplyContext, SubmitResult } from './kernel/core.js';

// ── F2 Play Engine (public surface; per-descriptor mutators stay PRIVATE — R-24) ──
export { EFX_V1_1_1, EffectEngine, EffectRefusal, hookHk9BeforeEffectApply } from './play/effects.js';
export type { EffectDescriptor, EffectContext, EfxName } from './play/effects.js';
export {
  openWindows,
  openGatedWindows,
  hookHk5BeforeSeatAdvance,
  HookHk5Violation,
  resolveWindow,
  autoResolveWindow,
} from './play/windows.js';
export type { WindowRow } from './play/windows.js';
// forceRoundWrap deliberately NOT exported (K7 OBS-C): test-support surface only —
// R-8's forbidden input is proven on the real passSeat path (f2-k7-closures D2).
export { PHASES, turnRow, hookHk3AtRoundWrap, HookHk3Violation, passSeat, advancePhase } from './play/turn.js';
export type { TurnRow } from './play/turn.js';
export { decks, drawTop, shuffledOrder, toReserve } from './play/deck.js';
export type { DeckRow } from './play/deck.js';
export {
  SUPPORTED_EFX_VERSION,
  hookHk4ValidatePack,
  PackLoadRefusal,
  packGenesis,
  wirePack,
  loadPack,
} from './play/packloader.js';
export type { ContentPack, CardDef } from './play/packloader.js';

// ── F3 Ontology (public surface) ──
export { ROLES, bindingFor, usableBinding, RoleRefusal } from './ontology/roles.js';
export type { RoleName, RoleBinding } from './ontology/roles.js';
export { KindRegistry, KindRefusal, NAMED_ROSTER } from './ontology/kinds.js';
export type { KindDef } from './ontology/kinds.js';
export {
  RELATION_TYPES,
  RelationRefusal,
  hookHk8BeforeRelationForm,
  formRelation,
  dissolveRelation,
  readThroughRepresentation,
  writeThroughRepresentation,
} from './ontology/relations.js';
export type { RelationType, RelationSpec, RelationRow } from './ontology/relations.js';
export { TOPOLOGIES, SurfaceRefusal, positionValid, addSurface, placeComponent, composeSurface, retireComposedSurface } from './ontology/surfaces.js';
export type { Topology } from './ontology/surfaces.js';
export { AdmissibilityGate, hookHk7BeforeKindAdmission, seededRegistry } from './ontology/admission.js';
export { wireOntology } from './ontology/wire.js';

// ── F4 Rule System (public surface) ──
export { HOOK_POINTS_V1, VERB_SETS_V1, EFX_GOVERNED, VOCABULARIES } from './rules/vocabularies.js';
export type { GovernedVocabulary } from './rules/vocabularies.js';
export { validateContribution, validateUniqueDef, ContributionRefusal } from './rules/contributions.js';
export type { RuleContribution, Condition, SlotDecl, SlotWrite, UniqueDef } from './rules/contributions.js';
export { readSlot, writeSlot, resetSlots } from './rules/slots.js';
export { RuleRegistry, hookHk9BeforeRuleDispatch } from './rules/registry.js';
export type { HookEvent } from './rules/registry.js';
export { pumpRelationEvents, dispatchHook } from './rules/hookbus.js';
export { ExtensionContract, DOCKET } from './rules/extension.js';
export type { ContractCycle, CycleObligations } from './rules/extension.js';
export { renderRuleset } from './rules/rulesetview.js';
export type { RulesetViewModel } from './rules/rulesetview.js';
export { wireRules } from './rules/wire.js';

// ── F5 Mechanics Library (public surface; opt-in per QG1-Q2) ──
export { post, transfer, derivedBalances, ledgerLoaded, LedgerRefusal } from './library/ledger.js';
export type { LedgerLeg } from './library/ledger.js';
export { spawnVenture, routeVenture, completeIfDone, lapseExpired, ventures, receivablesOf, debtsOf, VentureRefusal } from './library/ventures.js';
export type { VentureSpec, PortionSpec } from './library/ventures.js';
export { assignCrew, workCrew, crewOf } from './library/outfit.js';
export type { CrewRow } from './library/outfit.js';
export { attachTimedFx, tickTimedEffects, timedEffects } from './library/timedfx.js';
export type { TimedFx } from './library/timedfx.js';
export { reckon, ClosingRefusal } from './library/closing.js';
export { wireLibrary } from './library/wire.js';

// ── F7 Transport (public surface; S-2 seam only) ──
export { LockstepController, TransportRefusal } from './transport/lockstep.js';
export type { MoveListener } from './transport/lockstep.js';
export { hireCrew, releaseCrew } from './library/outfit.js'; // K7-V B-1/B-2 closures: the pure fns drilled directly against nonzero fixtures
