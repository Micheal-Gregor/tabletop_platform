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
import type { Condition, RuleContribution, SlotWrite } from './contributions.js';
import { validateContribution } from './contributions.js';
import { freezeDeep } from '../kernel/statetree.js';
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

type SlotBank = Record<string, Record<string, JsonValue>>;

/** K7-F4 D5: hasOwn-guarded bank lookup — a reserved-ish id can never key the prototype chain. */
function ownSlotsOf(state: State, contributionId: string): Readonly<Record<string, JsonValue>> {
  const bank = (state['ruleSlots'] as SlotBank) ?? {};
  return Object.hasOwn(bank, contributionId) ? bank[contributionId]! : {};
}

/** The value one slot write lands: a set, or an increment that never coerces (EXT3-B, refusal-not-repair). */
function slotWriteValue(c: RuleContribution, w: SlotWrite, current: JsonValue | undefined): JsonValue {
  if (w.increment === undefined) return w.set as JsonValue;
  if (typeof w.increment !== 'number') {
    // EXT3-B residual (3B): the increment VALUE itself must be a number.
    throw new EffectRefusal(c.id, 'GX-22', `increment value ${JSON.stringify(w.increment)} is not a number — refused, not coerced`);
  }
  if (current !== undefined && typeof current !== 'number') {
    // EXT3-B: refusal-not-repair — increment never coerces a non-numeric slot.
    throw new EffectRefusal(c.id, 'GX-22', `increment on non-numeric slot "${w.slot}" (holds ${JSON.stringify(current)}) — refused, not coerced`);
  }
  return ((current as number) ?? 0) + w.increment;
}

/** One declared slot write against the state as it stands after the writes before it (R-18 enforced by writeSlot). */
function applySlotWrite(state: JsonObject, c: RuleContribution, w: SlotWrite): JsonObject {
  const own = ownSlotsOf(state, c.id);
  const current = Object.hasOwn(own, w.slot) ? own[w.slot] : undefined;
  return writeSlot(state, c.id, w.slot, slotWriteValue(c, w, current), c.declaredSlots);
}

export class RuleRegistry {
  /** bearer-entry-seq = registration order — THE total-order tiebreak (V-7's law). */
  private readonly entries: RuleContribution[] = [];

  register(c: RuleContribution): void {
    // K7-F4 NEW-2: CLONE FIRST, validate the CLONE, store the clone — a getter can never
    // show validation one list and the seal another (D4 + NEW-2 together).
    const sealed = freezeDeep(structuredClone(c) as unknown as JsonObject) as unknown as RuleContribution;
    validateContribution(sealed);
    if (this.entries.some((e) => e.id === sealed.id)) {
      throw new EffectRefusal(sealed.id, 'GX-19/supersede-never-respec', 'contribution id already registered');
    }
    this.entries.push(sealed);
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
    for (const c of firing) next = this.fire(c, next, event, ctx);
    return next;
  }

  /** One contribution's turn in a firing: active → condition → effects → slot writes; else the state unchanged. */
  private fire(c: RuleContribution, state: JsonObject, event: HookEvent, ctx: EffectContext): JsonObject {
    if (!this.isActive(c, state)) return state;
    if (!evalCondition(c.condition, event, ownSlotsOf(state, c.id))) return state;
    const applied = EffectEngine.applyAll(state, c.effects, ctx); // R-24: the ONLY effect path
    return (c.slotWrites ?? []).reduce((next, w) => applySlotWrite(next, c, w), applied);
  }
}
