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
export { PHASES, turnRow, hookHk3AtRoundWrap, HookHk3Violation, passSeat, advancePhase, forceRoundWrap } from './play/turn.js';
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
