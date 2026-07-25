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
