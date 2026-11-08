import { describe, it, expect } from 'vitest';
import { RuleRegistry, hookHk9BeforeRuleDispatch, type HookEvent } from '../../packages/engine/src/rules/registry.js';
import { ContributionRefusal, type Condition, type RuleContribution, type SlotWrite } from '../../packages/engine/src/rules/contributions.js';
import { EffectRefusal, type EffectContext, type EffectDescriptor } from '../../packages/engine/src/play/effects.js';
import type { JsonObject, JsonValue, State } from '../../packages/engine/src/kernel/types.js';

// OS-12 isolation test for RuleRegistry (MOD-15, packages/engine/src/rules/registry.ts).
// Declared inputs: none (the object-model row reads "RuleRegistry: none"). The registry is built with
// nothing and every public operation is called: register, list, dispatch (and the HK-9 hook function).
// register varies its contribution; list varies with what was registered; dispatch varies each of its
// four inputs in turn (state, hook name, event, context), and the answers are shown to differ.
// No environment, clock, globals or network is touched.

const VOCABS = { efx: '1.1.1', hooks: '1.0' };
const DRAWN = 'on-card-drawn';
const ROUND_START = 'on-round-start';
const TOP_LEVEL: EffectContext = { windowDepth: 0 };
const INSIDE_WINDOW: EffectContext = { windowDepth: 1 };

function favor(to: string, n: number): EffectDescriptor {
  return { fx: 'grant_favor', to, n };
}

function seatRow(id: string, favorHeld: number): JsonObject {
  return { id, cash: 0, favor: favorHeld, assets: [], sueRights: [], eliminated: false };
}

function tableState(favorOfA: number, extra: JsonObject): State {
  const decks = { main: { draw: [], discard: [], reserve: [] } };
  return { seats: [seatRow('A', favorOfA), seatRow('B', 0)], relations: [], decks, windows: [], windowSeq: 0, ruleSlots: {}, ...extra };
}

function contribution(id: string, trigger: string, rest: Partial<RuleContribution>): RuleContribution {
  return { id, bearer: { kind: 'Card' }, trigger, condition: { op: 'always' }, effects: [favor('A', 1)], declaredSlots: [], vocabVersions: VOCABS, ...rest };
}

function registryWith(contributions: readonly RuleContribution[]): RuleRegistry {
  const registry = new RuleRegistry();
  for (const c of contributions) registry.register(c);
  return registry;
}

function eventOf(hook: string, rest: JsonObject): HookEvent {
  return { hook, ...rest };
}

function favorOf(state: JsonObject, seat: string): number {
  const rows = state['seats'] as readonly { id: string; favor: number }[];
  return rows.find((s) => s.id === seat)!.favor;
}

function slotOf(state: JsonObject, id: string, slot: string): unknown {
  const bank = state['ruleSlots'] as Record<string, Record<string, unknown>>;
  return bank[id]?.[slot];
}

function outcomeOf(run: () => unknown): string {
  try {
    return `ok ${String(JSON.stringify(run()))}`;
  } catch (e) {
    if (e instanceof Error) return `${e.name}: ${e.message}`;
    throw e;
  }
}

function idsOf(registry: RuleRegistry): string[] {
  return registry.list().map((c) => c.id);
}

function drawnBy(registry: RuleRegistry, state: State): JsonObject {
  return registry.dispatch(state, DRAWN, eventOf(DRAWN, {}), TOP_LEVEL);
}

function firedOn(condition: Condition, event: HookEvent): boolean {
  const registry = registryWith([contribution('probe', DRAWN, { condition })]);
  return favorOf(registry.dispatch(tableState(0, {}), DRAWN, event, TOP_LEVEL), 'A') === 1;
}

describe('RuleRegistry isolation: construction', () => {
  it('is constructed with no input and starts empty', () => {
    const registry = new RuleRegistry();
    expect(registry.list()).toEqual([]);
    expect(drawnBy(registry, tableState(0, {}))).toEqual(tableState(0, {}));
  });

  it('two registries do not share what is registered', () => {
    const first = registryWith([contribution('c1', DRAWN, {})]);
    const second = new RuleRegistry();
    expect(idsOf(first)).toEqual(['c1']);
    expect(idsOf(second)).toEqual([]);
    expect(idsOf(first)).not.toEqual(idsOf(second));
  });
});

describe('RuleRegistry isolation: register and list', () => {
  it('a registered contribution appears in the list', () => {
    const registry = new RuleRegistry();
    const before = idsOf(registry);
    registry.register(contribution('c1', DRAWN, {}));
    expect(idsOf(registry)).toEqual(['c1']);
    expect(idsOf(registry)).not.toEqual(before);
  });

  it('different contributions give different lists', () => {
    const one = registryWith([contribution('c1', DRAWN, {})]);
    const other = registryWith([contribution('c2', DRAWN, {})]);
    expect(idsOf(one)).not.toEqual(idsOf(other));
  });

  it('the list keeps registration order, and the opposite order lists differently', () => {
    const forward = registryWith([contribution('first', DRAWN, {}), contribution('second', DRAWN, {})]);
    const backward = registryWith([contribution('second', DRAWN, {}), contribution('first', DRAWN, {})]);
    expect(idsOf(forward)).toEqual(['first', 'second']);
    expect(idsOf(forward)).not.toEqual(idsOf(backward));
  });

  it('the list is a copy: changing what list returned changes nothing registered', () => {
    const registry = registryWith([contribution('c1', DRAWN, {})]);
    (registry.list() as RuleContribution[]).length = 0;
    expect(idsOf(registry)).toEqual(['c1']);
  });
});

describe('RuleRegistry isolation: register stores a sealed clone', () => {
  it('a change to the original after register never reaches the registry', () => {
    const original = contribution('c1', DRAWN, {}) as { -readonly [K in keyof RuleContribution]: RuleContribution[K] };
    const registry = registryWith([original]);
    original.trigger = ROUND_START;
    expect(registry.list()[0]!.trigger).toBe(DRAWN);
    expect(registry.list()[0]!.trigger).not.toEqual(original.trigger);
  });

  it('the stored contribution is frozen', () => {
    const stored = registryWith([contribution('c1', DRAWN, {})]).list()[0]!;
    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored.effects)).toBe(true);
  });
});

describe('RuleRegistry isolation: register refuses a duplicate id', () => {
  it('names the supersede rule and keeps the first contribution', () => {
    const registry = registryWith([contribution('c1', DRAWN, {})]);
    const again = (): void => registry.register(contribution('c1', ROUND_START, {}));
    expect(again).toThrow(EffectRefusal);
    expect(again).toThrow(/GX-19\/supersede-never-respec/);
    expect(registry.list().map((c) => c.trigger)).toEqual([DRAWN]);
  });

  it('a new id is accepted where the repeated id is refused', () => {
    const registry = registryWith([contribution('c1', DRAWN, {})]);
    const repeated = outcomeOf(() => registry.register(contribution('c1', DRAWN, {})));
    const fresh = outcomeOf(() => registry.register(contribution('c2', DRAWN, {})));
    expect(repeated).toContain('already registered');
    expect(fresh).toBe('ok undefined');
    expect(repeated).not.toEqual(fresh);
  });
});

const DEFECTS: ReadonlyArray<readonly [string, Partial<RuleContribution>, string]> = [
  ['a trigger outside HookPoints', { trigger: 'on-solar-eclipse' }, 'on-solar-eclipse'],
  ['an effect outside EFX', { effects: [{ fx: 'summon_dragon' }] }, 'summon_dragon'],
  ['an unknown vocabulary version', { vocabVersions: { efx: '9.9', hooks: '1.0' } }, '9.9'],
  ['a slot write to an undeclared slot', { slotWrites: [{ slot: 'ghost', increment: 1 }] }, 'undeclared slot "ghost"'],
  ['a condition reaching beyond event and slots (R-16)', { condition: { op: 'eq', path: 'seats.0.cash', value: 0 } }, 'bounded meta'],
  ['a condition reaching an undeclared slot (R-16)', { condition: { op: 'eq', path: 'slots.ghost', value: 0 } }, 'bounded meta'],
];

function refusalMessage(rest: Partial<RuleContribution>): string {
  return outcomeOf(() => new RuleRegistry().register(contribution('bad', DRAWN, rest)));
}

describe('RuleRegistry isolation: register refuses an invalid contribution', () => {
  it.each(DEFECTS)('%s is refused naming the defect and registers nothing', (_label, rest, named) => {
    const registry = new RuleRegistry();
    const refuse = (): void => registry.register(contribution('bad', DRAWN, rest));
    expect(refuse).toThrow(ContributionRefusal);
    expect(refuse).toThrow(named);
    expect(registry.list()).toEqual([]);
  });

  it('each defective contribution gives its own message, and a sound one gives none', () => {
    const messages = DEFECTS.map(([, rest]) => refusalMessage(rest));
    expect(new Set(messages).size).toBe(DEFECTS.length);
    expect(refusalMessage({})).toBe('ok undefined');
    expect(refusalMessage({})).not.toEqual(messages[0]);
  });
});

describe('RuleRegistry isolation: dispatch follows the hook name', () => {
  it('fires only the contributions whose trigger is the hook', () => {
    const registry = registryWith([contribution('c1', DRAWN, { effects: [favor('A', 1)] }), contribution('c2', ROUND_START, { effects: [favor('B', 5)] })]);
    const drawn = drawnBy(registry, tableState(0, {}));
    const started = registry.dispatch(tableState(0, {}), ROUND_START, eventOf(ROUND_START, {}), TOP_LEVEL);
    expect([favorOf(drawn, 'A'), favorOf(drawn, 'B')]).toEqual([1, 0]);
    expect([favorOf(started, 'A'), favorOf(started, 'B')]).toEqual([0, 5]);
    expect(drawn).not.toEqual(started);
  });

  it('a hook nothing is registered on returns the state as it came', () => {
    const registry = registryWith([contribution('c1', DRAWN, {})]);
    const state = tableState(3, {});
    expect(registry.dispatch(state, 'on-game-closing', eventOf('on-game-closing', {}), TOP_LEVEL)).toEqual(state);
  });

  it('an unknown hook halts with a typed refusal, where a known hook answers', () => {
    const registry = registryWith([contribution('c1', DRAWN, {})]);
    const unknown = (): JsonObject => registry.dispatch(tableState(0, {}), 'on-solar-eclipse', eventOf('on-solar-eclipse', {}), TOP_LEVEL);
    expect(unknown).toThrow(EffectRefusal);
    expect(unknown).toThrow(/GX-19\/HK-9/);
    expect(outcomeOf(unknown)).not.toEqual(outcomeOf(() => drawnBy(registry, tableState(0, {}))));
  });

  it('the HK-9 hook function passes a vocabulary member and refuses any other', () => {
    expect(() => hookHk9BeforeRuleDispatch(DRAWN)).not.toThrow();
    expect(() => hookHk9BeforeRuleDispatch('on-solar-eclipse')).toThrow(/dispatch on unknown hook/);
  });
});

describe('RuleRegistry isolation: dispatch follows the state', () => {
  it('the answer follows the state handed in', () => {
    const registry = registryWith([contribution('c1', DRAWN, {})]);
    const poor = drawnBy(registry, tableState(0, {}));
    const rich = drawnBy(registry, tableState(5, {}));
    expect([favorOf(poor, 'A'), favorOf(rich, 'A')]).toEqual([1, 6]);
    expect(poor).not.toEqual(rich);
  });

  it('never changes the state it was handed', () => {
    const registry = registryWith([contribution('c1', DRAWN, { declaredSlots: [{ name: 'n', reset: 'never' }], slotWrites: [{ slot: 'n', increment: 1 }] })]);
    const state = tableState(0, {});
    const before = JSON.stringify(state);
    const out = drawnBy(registry, state);
    expect(JSON.stringify(state)).toBe(before);
    expect(JSON.stringify(out)).not.toBe(before);
  });

  it('a failing effect refuses and leaves the handed state as it was', () => {
    const registry = registryWith([contribution('c1', DRAWN, { effects: [favor('Nobody', 1)] })]);
    const state = tableState(0, {});
    const before = JSON.stringify(state);
    expect(() => drawnBy(registry, state)).toThrow(EffectRefusal);
    expect(JSON.stringify(state)).toBe(before);
  });
});

const RELATION_STATES: ReadonlyArray<readonly [string, readonly JsonObject[], number]> = [
  ['no relation', [], 0],
  ['a formed relation of the bearer type', [{ status: 'formed', type: 'Attachment' }], 1],
  ['a dissolved relation of the bearer type', [{ status: 'dissolved', type: 'Attachment' }], 0],
  ['a formed relation of another type', [{ status: 'formed', type: 'Overlay' }], 0],
];

describe('RuleRegistry isolation: dispatch derives relation-borne activation from the state', () => {
  it.each(RELATION_STATES)('%s', (_label, relations, expected) => {
    const registry = registryWith([contribution('monster', DRAWN, { bearer: { relationType: 'Attachment' } })]);
    expect(favorOf(drawnBy(registry, tableState(0, { relations })), 'A')).toBe(expected);
  });

  it('a kind-borne contribution fires whatever relations the state holds', () => {
    const registry = registryWith([contribution('c1', DRAWN, {})]);
    const bare = drawnBy(registry, tableState(0, {}));
    const related = drawnBy(registry, tableState(0, { relations: [{ status: 'formed', type: 'Overlay' }] }));
    expect(favorOf(bare, 'A')).toBe(favorOf(related, 'A'));
  });
});

describe('RuleRegistry isolation: dispatch reads the contribution own slots in the state', () => {
  const GATED = contribution('gate', DRAWN, { declaredSlots: [{ name: 'count', reset: 'never' }], condition: { op: 'gte', path: 'slots.count', value: 2 } });

  it.each([[0, 0], [1, 0], [2, 1], [7, 1]])('a count of %j in the bank gives %j favor', (count, expected) => {
    const registry = registryWith([GATED]);
    const state = tableState(0, { ruleSlots: { gate: { count } } });
    expect(favorOf(drawnBy(registry, state), 'A')).toBe(expected);
  });

  it('another contribution slots never answer for this one', () => {
    const registry = registryWith([GATED]);
    const own = drawnBy(registry, tableState(0, { ruleSlots: { gate: { count: 2 } } }));
    const foreign = drawnBy(registry, tableState(0, { ruleSlots: { other: { count: 2 } } }));
    expect(favorOf(own, 'A')).not.toEqual(favorOf(foreign, 'A'));
  });
});

const CONDITIONS: ReadonlyArray<readonly [string, Condition, JsonObject, boolean]> = [
  ['always', { op: 'always' }, {}, true],
  ['eq on a matching field', { op: 'eq', path: 'event.kind', value: 'a' }, { kind: 'a' }, true],
  ['eq on another value', { op: 'eq', path: 'event.kind', value: 'a' }, { kind: 'b' }, false],
  ['ne on another value', { op: 'ne', path: 'event.kind', value: 'a' }, { kind: 'b' }, true],
  ['ne on a missing field', { op: 'ne', path: 'event.kind', value: 'a' }, {}, true],
  ['gte at the bound', { op: 'gte', path: 'event.n', value: 2 }, { n: 2 }, true],
  ['gte below the bound', { op: 'gte', path: 'event.n', value: 2 }, { n: 1 }, false],
  ['gte on a non-number', { op: 'gte', path: 'event.n', value: 2 }, { n: '9' }, false],
  ['lte at the bound', { op: 'lte', path: 'event.n', value: 2 }, { n: 2 }, true],
  ['lte above the bound', { op: 'lte', path: 'event.n', value: 2 }, { n: 3 }, false],
  ['a nested event path', { op: 'eq', path: 'event.card.rank', value: 4 }, { card: { rank: 4 } }, true],
  ['a prototype path never resolves', { op: 'eq', path: 'event.constructor', value: 'x' }, {}, false],
];

describe('RuleRegistry isolation: dispatch follows the event through the condition', () => {
  it.each(CONDITIONS)('%s', (_label, condition, fields, fires) => {
    expect(firedOn(condition, eventOf(DRAWN, fields))).toBe(fires);
  });

  it('two events differing only in a field give different results', () => {
    const registry = registryWith([contribution('c1', DRAWN, { condition: { op: 'eq', path: 'event.kind', value: 'a' } })]);
    const hit = registry.dispatch(tableState(0, {}), DRAWN, eventOf(DRAWN, { kind: 'a' }), TOP_LEVEL);
    const miss = registry.dispatch(tableState(0, {}), DRAWN, eventOf(DRAWN, { kind: 'b' }), TOP_LEVEL);
    expect(hit).not.toEqual(miss);
  });
});

const BOTH: Condition = { op: 'and', terms: [{ op: 'eq', path: 'event.a', value: 1 }, { op: 'eq', path: 'event.b', value: 2 }] };
const EITHER: Condition = { op: 'or', terms: [{ op: 'eq', path: 'event.a', value: 1 }, { op: 'eq', path: 'event.b', value: 2 }] };

describe('RuleRegistry isolation: dispatch composes conditions', () => {
  it.each([
    ['and with both terms true', BOTH, { a: 1, b: 2 }, true],
    ['and with one term false', BOTH, { a: 1, b: 9 }, false],
    ['or with one term true', EITHER, { a: 9, b: 2 }, true],
    ['or with both terms false', EITHER, { a: 9, b: 9 }, false],
  ] as const)('%s', (_label, condition, fields, fires) => {
    expect(firedOn(condition, eventOf(DRAWN, fields))).toBe(fires);
  });
});

describe('RuleRegistry isolation: dispatch follows the context (R-17, the MR1 side)', () => {
  const OPENS: EffectDescriptor = { fx: 'open_window', kind: 'sue', decider: 'A', options: [{ label: 'ok' }], auto: 0 };

  it('opens a window at depth 0 and refuses at depth 1, so the answers differ', () => {
    const registry = registryWith([contribution('w', DRAWN, { effects: [OPENS] })]);
    const state = tableState(0, {});
    const top = outcomeOf(() => registry.dispatch(state, DRAWN, eventOf(DRAWN, {}), TOP_LEVEL));
    const inside = outcomeOf(() => registry.dispatch(state, DRAWN, eventOf(DRAWN, {}), INSIDE_WINDOW));
    expect(top).toContain('"windowSeq":1');
    expect(inside).toContain('GX-11/R-17');
    expect(top).not.toEqual(inside);
  });
});

describe('RuleRegistry isolation: dispatch order is registration order', () => {
  const inject = (card: string): EffectDescriptor => ({ fx: 'deck_inject', deck: 'main', card, policy: 'top' });
  const drawOrder = (out: JsonObject): unknown => (out['decks'] as Record<string, { draw: unknown }>)['main']!.draw;

  it('non-commutative effects land in the order registered, and the opposite order differs', () => {
    const xThenY = registryWith([contribution('x', DRAWN, { effects: [inject('X')] }), contribution('y', DRAWN, { effects: [inject('Y')] })]);
    const yThenX = registryWith([contribution('y', DRAWN, { effects: [inject('Y')] }), contribution('x', DRAWN, { effects: [inject('X')] })]);
    expect(drawOrder(drawnBy(xThenY, tableState(0, {})))).toEqual(['Y', 'X']);
    expect(drawOrder(drawnBy(yThenX, tableState(0, {})))).toEqual(['X', 'Y']);
  });
});

describe('RuleRegistry isolation: dispatch writes declared slots', () => {
  const COUNT = [{ name: 'count', reset: 'never' as const }];
  const counting = (slotWrites: readonly SlotWrite[]): RuleRegistry =>
    registryWith([contribution('c1', DRAWN, { effects: [], declaredSlots: COUNT, slotWrites })]);

  it('a set lands the value it was given, and another value lands differently', () => {
    const seven = drawnBy(counting([{ slot: 'count', set: 7 }]), tableState(0, {}));
    const nine = drawnBy(counting([{ slot: 'count', set: 9 }]), tableState(0, {}));
    expect([slotOf(seven, 'c1', 'count'), slotOf(nine, 'c1', 'count')]).toEqual([7, 9]);
  });

  it('an increment adds to the value the state holds, from zero when none is held', () => {
    const registry = counting([{ slot: 'count', increment: 2 }]);
    const first = drawnBy(registry, tableState(0, {}));
    const second = drawnBy(registry, first);
    expect([slotOf(first, 'c1', 'count'), slotOf(second, 'c1', 'count')]).toEqual([2, 4]);
  });

  it('a later write in the list sees what the earlier write left', () => {
    const out = drawnBy(counting([{ slot: 'count', set: 1 }, { slot: 'count', increment: 2 }]), tableState(0, {}));
    expect(slotOf(out, 'c1', 'count')).toBe(3);
  });
});

describe('RuleRegistry isolation: dispatch refuses a slot write it cannot make (GX-22)', () => {
  const COUNT = [{ name: 'count', reset: 'never' as const }];
  const incrementing = (increment: unknown): RuleRegistry =>
    registryWith([contribution('c1', DRAWN, { effects: [], declaredSlots: COUNT, slotWrites: [{ slot: 'count', increment: increment as number }] })]);
  const withCount = (count: JsonValue): State => tableState(0, { ruleSlots: { c1: { count } } });

  it('an increment onto a non-numeric slot is refused, not coerced; a numeric slot takes it', () => {
    const refused = outcomeOf(() => drawnBy(incrementing(1), withCount('text')));
    const taken = outcomeOf(() => drawnBy(incrementing(1), withCount(4)));
    expect(refused).toContain('increment on non-numeric slot "count"');
    expect(taken).toContain('"count":5');
    expect(refused).not.toEqual(taken);
  });

  it('an increment value that is not a number is refused, not coerced', () => {
    const refuse = (): JsonObject => drawnBy(incrementing('2'), tableState(0, {}));
    expect(refuse).toThrow(EffectRefusal);
    expect(refuse).toThrow(/increment value "2" is not a number/);
  });

  it('a non-finite slot value is refused at the write', () => {
    const refuse = (): JsonObject => drawnBy(incrementing(Infinity), tableState(0, {}));
    expect(refuse).toThrow(ContributionRefusal);
    expect(refuse).toThrow(/non-finite/);
  });
});

describe('RuleRegistry isolation: a false condition writes nothing', () => {
  it('effects and slot writes both wait on the condition', () => {
    const never: Condition = { op: 'eq', path: 'event.kind', value: 'a' };
    const slotWrites = [{ slot: 'count', increment: 1 }];
    const registry = registryWith([contribution('c1', DRAWN, { condition: never, declaredSlots: [{ name: 'count', reset: 'never' }], slotWrites })]);
    const skipped = registry.dispatch(tableState(0, {}), DRAWN, eventOf(DRAWN, { kind: 'b' }), TOP_LEVEL);
    const fired = registry.dispatch(tableState(0, {}), DRAWN, eventOf(DRAWN, { kind: 'a' }), TOP_LEVEL);
    expect(skipped).toEqual(tableState(0, {}));
    expect(slotOf(fired, 'c1', 'count')).toBe(1);
    expect(skipped).not.toEqual(fired);
  });
});
