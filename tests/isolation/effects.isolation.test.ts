import { describe, it, expect } from 'vitest';
import {
  EffectEngine,
  EffectRefusal,
  hookHk9BeforeEffectApply,
  type EffectContext,
  type EffectDescriptor,
} from '../../packages/engine/src/play/effects.js';
import type { JsonObject, State } from '../../packages/engine/src/kernel/types.js';

// OS-12 isolation test for EffectEngine (MOD-09, packages/engine/src/play/effects.ts).
// Declared inputs: none (static operations only). Operations called: apply(state, descriptor,
// ctx) and applyAll(state, fxList, ctx), plus the HK-9 hook they run first. Each of state,
// descriptor and ctx is varied alone and the answers differ. No environment, clock, globals
// or network is touched.

const TOP: EffectContext = { windowDepth: 0 };
const INSIDE_WINDOW: EffectContext = { windowDepth: 1 };

function seatRow(id: string, cash: number): JsonObject {
  return { id, cash, favor: 0, assets: [], sueRights: [], eliminated: false };
}

function stateWithCash(cashOfA: number): State {
  return {
    seats: [seatRow('A', cashOfA), seatRow('B', 10)],
    decks: { main: { draw: ['c1'], discard: [], reserve: [] } },
    windows: [],
    windowSeq: 0,
  };
}

function cashOf(state: JsonObject, seatId: string): number {
  const seats = state['seats'] as readonly { id: string; cash: number }[];
  return seats.find((s) => s.id === seatId)?.cash ?? Number.NaN;
}

function pay(to: string, amount: number): EffectDescriptor {
  return { fx: 'pay', to, amount };
}

const OPEN_WINDOW: EffectDescriptor = { fx: 'open_window', kind: 'sue', decider: 'A', options: [], auto: 0 };

describe('EffectEngine isolation: apply follows state', () => {
  it('the same descriptor over two states gives two different results', () => {
    const rich = EffectEngine.apply(stateWithCash(50), pay('A', 5), TOP);
    const poor = EffectEngine.apply(stateWithCash(8), pay('A', 5), TOP);
    expect(rich).not.toEqual(poor);
    expect(cashOf(rich, 'A')).toBe(55);
    expect(cashOf(poor, 'A')).toBe(13);
  });

  it('it answers a new state and leaves the state it was handed unchanged', () => {
    const before = stateWithCash(50);
    const after = EffectEngine.apply(before, pay('A', 5), TOP);
    expect(after).not.toBe(before);
    expect(cashOf(before, 'A')).toBe(50);
  });
});

describe('EffectEngine isolation: apply follows descriptor', () => {
  it('a change of amount alone changes the result', () => {
    const small = EffectEngine.apply(stateWithCash(50), pay('A', 5), TOP);
    const large = EffectEngine.apply(stateWithCash(50), pay('A', 9), TOP);
    expect(small).not.toEqual(large);
  });

  it('a change of target seat alone changes the result', () => {
    const toA = EffectEngine.apply(stateWithCash(50), pay('A', 5), TOP);
    const toB = EffectEngine.apply(stateWithCash(50), pay('B', 5), TOP);
    expect(toA).not.toEqual(toB);
    expect(cashOf(toB, 'B')).toBe(15);
  });

  it('a change of effect alone changes the result', () => {
    const paid = EffectEngine.apply(stateWithCash(50), pay('A', 5), TOP);
    const levied = EffectEngine.apply(stateWithCash(50), { fx: 'levy', scope: 'A', amount: 5 }, TOP);
    expect(paid).not.toEqual(levied);
    expect(cashOf(levied, 'A')).toBe(45);
  });
});

describe('EffectEngine isolation: apply follows ctx', () => {
  it('open_window at depth 0 opens a window', () => {
    const next = EffectEngine.apply(stateWithCash(50), OPEN_WINDOW, TOP);
    expect(next['windows']).toHaveLength(1);
    expect(next['windowSeq']).toBe(1);
  });

  it('the same open_window from inside a window is refused, not applied', () => {
    expect(() => EffectEngine.apply(stateWithCash(50), OPEN_WINDOW, INSIDE_WINDOW)).toThrow(EffectRefusal);
  });

  it('pay is invariant to the window depth: both contexts give the same answer', () => {
    const top = EffectEngine.apply(stateWithCash(50), pay('A', 5), TOP);
    const inside = EffectEngine.apply(stateWithCash(50), pay('A', 5), INSIDE_WINDOW);
    expect(top).toEqual(inside);
  });
});

describe('EffectEngine isolation: applyAll follows state, list and ctx', () => {
  const LIST = [pay('A', 5), pay('B', 2)];

  it('the same list over two states gives two different results', () => {
    const rich = EffectEngine.applyAll(stateWithCash(50), LIST, TOP);
    const poor = EffectEngine.applyAll(stateWithCash(8), LIST, TOP);
    expect(rich).not.toEqual(poor);
  });

  it('a longer list over the same state gives a different result', () => {
    const one = EffectEngine.applyAll(stateWithCash(50), [pay('A', 5)], TOP);
    const two = EffectEngine.applyAll(stateWithCash(50), LIST, TOP);
    expect(one).not.toEqual(two);
    expect(cashOf(two, 'B')).toBe(12);
  });

  it('an empty list answers the state it was handed', () => {
    const state = stateWithCash(50);
    expect(EffectEngine.applyAll(state, [], TOP)).toEqual(state);
  });

  it('the same list gives a result at depth 0 and a refusal inside a window', () => {
    const list = [pay('A', 5), OPEN_WINDOW];
    const opened = EffectEngine.applyAll(stateWithCash(50), list, TOP);
    expect(opened['windowSeq']).toBe(1);
    expect(() => EffectEngine.applyAll(stateWithCash(50), list, INSIDE_WINDOW)).toThrow(EffectRefusal);
  });
});

describe('EffectEngine isolation: the unknown-descriptor refusal (R-3, halt-not-skip)', () => {
  const UNKNOWN: EffectDescriptor = { fx: 'summon_dragon' };

  it('apply refuses an unknown descriptor with a typed refusal naming it', () => {
    expect(() => EffectEngine.apply(stateWithCash(50), UNKNOWN, TOP)).toThrow(EffectRefusal);
    expect(() => EffectEngine.apply(stateWithCash(50), UNKNOWN, TOP)).toThrow(/descriptor "summon_dragon"/);
  });

  it('the refusal names a different descriptor when a different one is handed in', () => {
    const named = (fx: string): string => {
      try {
        EffectEngine.apply(stateWithCash(50), { fx }, TOP);
      } catch (error) {
        return (error as EffectRefusal).descriptor;
      }
      return 'applied';
    };
    expect(named('summon_dragon')).not.toBe(named('hack_the_bank'));
  });

  it('applyAll halts on an unknown descriptor after applying the known ones before it, never skips it', () => {
    expect(() => EffectEngine.applyAll(stateWithCash(50), [pay('A', 5), UNKNOWN, pay('B', 2)], TOP)).toThrow(
      EffectRefusal,
    );
  });

  it('the HK-9 hook accepts a sealed member and refuses an unknown one', () => {
    expect(() => hookHk9BeforeEffectApply(pay('A', 5))).not.toThrow();
    expect(() => hookHk9BeforeEffectApply(UNKNOWN)).toThrow(EffectRefusal);
  });
});
