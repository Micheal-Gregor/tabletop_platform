/**
 * MR1 RuleRegistry — the SOLE dispatcher of contributions (the S5 boundary law).
 * Traces: S3 F4·MR1 ← S2 MR1 (supersedes the EVT switch). Axioms: GX-19, GX-21 (runtime),
 * GX-24. Refusals: R-16 (runtime leg), R-17 (MR1 side), R-24. Hook: HK-9 FULL.
 * Dispatch: per-firing SNAPSHOT · total order (hook, bearer-entry-seq) · bounded
 * condition eval · effects ONLY via EffectEngine · declared slot writes only (R-18).
 */
import type { JsonObject, JsonValue, State } from '../kernel/types.js';
import { EffectEngine, EffectRefusal } from '../play/effects.js';
import type { EffectContext } from '../play/effects.js';
import type { Condition, RuleContribution, SlotDecl } from './contributions.js';
import { validateContribution } from './contributions.js';
import { writeSlot } from './slots.js';
import { HOOK_POINTS_V1 } from './vocabularies.js';
import type { RelationRow } from '../ontology/relations.js';

export interface HookEvent extends JsonObject {
  readonly hook: string;
  readonly [k: string]: JsonValue;
}

/** HK-9 (MR1 side) — dispatch integrity: the hook must be a vocabulary member. */
export function hookHk9BeforeRuleDispatch(hookName: string): void {
  if (!HOOK_POINTS_V1.members.includes(hookName)) {
    throw new EffectRefusal(hookName, 'GX-19/HK-9', 'dispatch on unknown hook — halt, never skip');
  }
}

/** GX-21 runtime — condition paths resolve bounded: event.* and slots.* ONLY, hasOwn walk. */
function resolveBounded(path: string, event: HookEvent, ownSlots: Readonly<Record<string, JsonValue>>): JsonValue | undefined {
  const [head, ...rest] = path.split('.');
  let value: unknown = head === 'event' ? event : head === 'slots' ? ownSlots : undefined;
  if (value === undefined) return undefined;
  for (const key of rest) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value as object, key)) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value as JsonValue;
}

function evalCondition(c: Condition, event: HookEvent, ownSlots: Readonly<Record<string, JsonValue>>): boolean {
  switch (c.op) {
    case 'always':
      return true;
    case 'and':
      return c.terms.every((t) => evalCondition(t, event, ownSlots));
    case 'or':
      return c.terms.some((t) => evalCondition(t, event, ownSlots));
    default: {
      const v = resolveBounded(c.path, event, ownSlots);
      if (c.op === 'eq') return v === c.value;
      if (c.op === 'ne') return v !== c.value;
      if (typeof v !== 'number' || typeof c.value !== 'number') return false;
      return c.op === 'gte' ? v >= c.value : v <= c.value;
    }
  }
}

export class RuleRegistry {
  /** bearer-entry-seq = registration order — THE total-order tiebreak (V-7's law). */
  private readonly entries: RuleContribution[] = [];

  register(c: RuleContribution): void {
    validateContribution(c);
    if (this.entries.some((e) => e.id === c.id)) {
      throw new EffectRefusal(c.id, 'GX-19/R-14', 'contribution id already registered — supersede, never respec');
    }
    this.entries.push(c);
  }

  declarations(): ReadonlyMap<string, readonly SlotDecl[]> {
    return new Map(this.entries.map((e) => [e.id, e.declaredSlots]));
  }

  list(): readonly RuleContribution[] {
    return [...this.entries];
  }

  /** GX-24 — relation-borne activation is DERIVED: a formed relation of the type exists. */
  private isActive(c: RuleContribution, state: State): boolean {
    if (c.bearer.relationType === undefined) return true; // kind-borne: always active
    const relations = (state['relations'] as readonly RelationRow[]) ?? [];
    return relations.some((r) => r.status === 'formed' && r.type === c.bearer.relationType);
  }

  /**
   * THE dispatch (GX-19): snapshot → order → condition → effects via EffectEngine →
   * declared slot writes. R-17 (MR1 side): the EffectContext's windowDepth travels into
   * every applied effect — open_window from a depth ≥ 1 dispatch refuses in the engine.
   */
  dispatch(state: State, hookName: string, event: HookEvent, ctx: EffectContext): JsonObject {
    hookHk9BeforeRuleDispatch(hookName);
    const firing = this.entries.filter((c) => c.trigger === hookName); // per-firing SNAPSHOT
    let next: JsonObject = state as JsonObject;
    for (const c of firing) {
      if (!this.isActive(c, next)) continue;
      const ownSlots = ((next['ruleSlots'] as Record<string, Record<string, JsonValue>>) ?? {})[c.id] ?? {};
      if (!evalCondition(c.condition, event, ownSlots)) continue;
      next = EffectEngine.applyAll(next, c.effects, ctx); // R-24: the ONLY effect path
      for (const w of c.slotWrites ?? []) {
        const current = ((next['ruleSlots'] as Record<string, Record<string, JsonValue>>) ?? {})[c.id]?.[w.slot];
        const value: JsonValue =
          w.increment !== undefined ? ((current as number) ?? 0) + w.increment : (w.set as JsonValue);
        next = writeSlot(next, c.id, w.slot, value, c.declaredSlots); // R-18 enforced
      }
    }
    return next;
  }
}
