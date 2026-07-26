/**
 * MR2 HookBus — consumes F3's RECORDED relation emissions (seam S-4, I-21) and routes
 * them through the registry. Turn/lifecycle emission weave = I-29 (F5).
 * Traces: S3 F4·MR2 ← S2 MR2.
 */
import type { JsonObject, State } from '../kernel/types.js';
import type { EffectContext } from '../play/effects.js';
import type { RuleRegistry, HookEvent } from './registry.js';

/**
 * Drain unprocessed relationEvents through the registry. The cursor
 * (`relationEventsProcessed`) lives on-state — replay-deterministic.
 */
export function pumpRelationEvents(state: State, registry: RuleRegistry, ctx: EffectContext): JsonObject {
  let next: JsonObject = state as JsonObject;
  const events = (next['relationEvents'] as readonly JsonObject[]) ?? [];
  let cursor = (next['relationEventsProcessed'] as number) ?? 0;
  while (cursor < events.length) {
    const e = events[cursor]!;
    const hookName = `${e['hook']}:${e['type']}`; // on-form:<Type> / on-dissolve:<Type>
    next = registry.dispatch(next, hookName, { ...e, hook: hookName } as HookEvent, ctx);
    cursor += 1;
    next = { ...next, relationEventsProcessed: cursor } as JsonObject;
  }
  return next;
}

/** Direct dispatch passthrough for turn/lifecycle hooks (engine weave at F5 — I-29). */
export function dispatchHook(
  state: State,
  registry: RuleRegistry,
  hookName: string,
  event: HookEvent,
  ctx: EffectContext
): JsonObject {
  return registry.dispatch(state, hookName, event, ctx);
}
