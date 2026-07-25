/** R-8 / GBC-13 — round wraps EXACTLY once; second wrap-tick refused (GX-9, HK-3). */
import { describe, expect, it } from 'vitest';
import { forceRoundWrap, HookHk3Violation, turnRow, hookHk3AtRoundWrap } from '../src/index.js';
import { F2_PACK, newF2Core } from './f2-fixture.js';

const PACK_PLAIN = {
  ...F2_PACK,
  cards: { payday: F2_PACK.cards['payday']! },
  decks: { main: { cards: ['payday'] } },
};

describe('R-8 · wrap-once (GX-9)', () => {
  it('A pass → B pass wraps the round once, flag set; end-trigger flips status at maxRounds', () => {
    const core = newF2Core('r8-seed', PACK_PLAIN);
    expect(turnRow(core.getState()).round).toBe(1);

    core.submit({ type: 'turn:pass', seat: 'A', args: {} }); // A → B, same round
    expect(turnRow(core.getState()).round).toBe(1);
    core.submit({ type: 'turn:pass', seat: 'B', args: {} }); // B → A, WRAP
    const t1 = turnRow(core.getState());
    expect(t1.round).toBe(2);
    expect(t1.wrappedRound).toBe(1); // HK-3's flag

    core.submit({ type: 'turn:pass', seat: 'A', args: {} });
    core.submit({ type: 'turn:pass', seat: 'B', args: {} }); // wrap past maxRounds=2
    const t2 = turnRow(core.getState());
    expect(t2.round).toBe(3);
    expect(t2.status).toBe('closing'); // the Closing Round SLOT (M15 opts in at F5)
  });

  it('a forced second wrap-tick in the same round → HK-3 blocks (R-8)', () => {
    const core = newF2Core('r8-seed2', PACK_PLAIN);
    core.submit({ type: 'turn:pass', seat: 'A', args: {} });
    core.submit({ type: 'turn:pass', seat: 'B', args: {} }); // legitimate wrap → round 2, wrappedRound 1
    const wrapped = core.getState();
    // forge the divergent state: pretend we are back in the already-wrapped round
    const forged = {
      ...wrapped,
      turn: { ...(wrapped['turn'] as object), round: 1, wrappedRound: 1 },
    };
    expect(() => forceRoundWrap(forged as never)).toThrow(HookHk3Violation);
  });

  it('unit: the HK-3 predicate itself', () => {
    expect(() =>
      hookHk3AtRoundWrap({ round: 3, wrappedRound: 3, seatIdx: 0, phase: 'start', maxRounds: 5, status: 'playing' })
    ).toThrow(HookHk3Violation);
    expect(() =>
      hookHk3AtRoundWrap({ round: 3, wrappedRound: 2, seatIdx: 0, phase: 'start', maxRounds: 5, status: 'playing' })
    ).not.toThrow();
  });

  it('eliminated seats are skipped in rotation (I-12)', () => {
    const core = newF2Core('r8-seed3', {
      ...PACK_PLAIN,
      seats: [{ id: 'A' }, { id: 'B', eliminated: true }],
    });
    core.submit({ type: 'turn:pass', seat: 'A', args: {} }); // B skipped → back to A, wraps
    const t = turnRow(core.getState());
    expect(t.seatIdx).toBe(0);
    expect(t.round).toBe(2);
  });
});
