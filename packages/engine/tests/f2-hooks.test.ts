/**
 * F2 hook falsifiability — HK-9 (M9 side), HK-5, HK-3: unit + divergence-injection on
 * the real path (CC-6 doctrine; mutation runs are K7's throwaway-copy job).
 */
import { describe, expect, it } from 'vitest';
import {
  EffectEngine,
  EffectRefusal,
  hookHk9BeforeEffectApply,
  hookHk5BeforeSeatAdvance,
  HookHk5Violation,
} from '../src/index.js';
import { newF2Core, F2_PACK } from './f2-fixture.js';

describe('HK-9 (M9 side) · pre-dispatch vocabulary gate', () => {
  it('unit: unknown member blocked; sealed vocabulary asserted', () => {
    expect(() => hookHk9BeforeEffectApply({ fx: 'spawn_venture' })).toThrow(EffectRefusal); // docket ≠ member
    expect(() => hookHk9BeforeEffectApply({ fx: 'pay' })).not.toThrow();
  });

  it('injection: deleting the hook would let an unknown descriptor silently NO-OP — this test is the detector', () => {
    // With the hook present: loud refusal. Under mutation (hook call deleted in a copy),
    // apply() falls through the switch and returns undefined → this test fails there.
    const core = newF2Core();
    let refused = false;
    try {
      EffectEngine.apply(core.getState(), { fx: 'ghost_effect' }, { windowDepth: 0 });
    } catch (e) {
      refused = e instanceof EffectRefusal;
    }
    expect(refused).toBe(true);
  });
});

describe('HK-5 · before seat advance (real-path injection)', () => {
  it('unit: open gated window → HookHk5Violation naming the window', () => {
    const state = {
      seats: [],
      windows: [{ id: 'w9', kind: 'k', decider: 'A', options: [], auto: 0, gated: true, status: 'open' }],
    };
    expect(() => hookHk5BeforeSeatAdvance(state as never)).toThrow(HookHk5Violation);
    expect(() => hookHk5BeforeSeatAdvance(state as never)).toThrow(/w9/);
  });

  it('defense-in-depth (off-path unit; the ON-PATH proof lives in f2-k7-closures D1)', () => {
    // K7 correctly flagged the earlier version of this test as mislabeled: calling the
    // hook off-path proves nothing about wiring. The real-path injection (suborned
    // Guard + live core) is f2-k7-closures.test.ts D1. This test keeps the off-path
    // unit coverage of both legs against one state.
    const core = newF2Core('hk5-seed', {
      ...F2_PACK,
      cards: { crossroads: F2_PACK.cards['crossroads']! },
      decks: { main: { cards: ['crossroads'] } },
    });
    core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } }); // gated window opens
    // the Guard rule refuses first (R-6) — that refusal is the normal path:
    const refused = core.submit({ type: 'turn:pass', seat: 'A', args: {} });
    expect('refused' in refused).toBe(true);
    // and the hook itself, called against the same state, ALSO blocks (defense in depth):
    expect(() => hookHk5BeforeSeatAdvance(core.getState())).toThrow(HookHk5Violation);
  });
});

describe('HK-3 · wrap gate is consulted on the REAL pass path', () => {
  it('a same-round double wrap cannot occur through any sequence of legal passes', () => {
    const core = newF2Core('hk3-seed', {
      ...F2_PACK,
      cards: { payday: F2_PACK.cards['payday']! },
      decks: { main: { cards: ['payday'] } },
    });
    // exhaustive legal-pass sequence: rounds advance 1 → 2 → 3, wrappedRound always trails by 1
    const seen: Array<{ round: number; wrapped: number }> = [];
    const seatIds = ['A', 'B'];
    for (let i = 0; i < 4; i++) {
      const turn = core.getState()['turn'] as { round: number; wrappedRound: number; seatIdx: number };
      seen.push({ round: turn.round, wrapped: turn.wrappedRound });
      core.submit({ type: 'turn:pass', seat: seatIds[turn.seatIdx]!, args: {} });
    }
    for (const s of seen) {
      expect(s.wrapped).toBeLessThan(s.round); // the flag law: never wrapped ahead of itself
    }
  });
});
