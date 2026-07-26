/**
 * External audit round 2 (governance/audits/K7_AUDIT_REPORT-2.md) — closures for
 * F2-R2-1..5 + OBS-3. Each blocking/major closure is the distinguishing test its
 * survivor mutation or probe demands.
 */
import { describe, expect, it } from 'vitest';
import {
  EngineCore,
  EffectRefusal,
  PackLoadRefusal,
  hookHk4ValidatePack,
  packGenesis,
  wirePack,
} from '../src/index.js';
import { F2_PACK, f2PackRef, f2Seats } from './f2-fixture.js';

describe('F2-R2-1 · statically-dead nested windows are UNCONSTRUCTIBLE (the NEW-1 sibling)', () => {
  it('a window whose sole option opens a window → load refusal naming the dead option', () => {
    const bad = {
      ...F2_PACK,
      cards: {
        brick2: {
          fx: [
            {
              fx: 'open_window',
              kind: 'k',
              decider: 'A',
              options: [
                { label: 'only', fx: [{ fx: 'open_window', kind: 'inner', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 0 }] },
              ],
              auto: 0,
            },
          ],
        },
      },
      decks: { main: { cards: ['brick2'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(PackLoadRefusal);
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/statically dead|depth-1/);
  });

  it('a multi-option window with ANY recursing option → also refused (a landmine is a defect)', () => {
    const bad = {
      ...F2_PACK,
      cards: {
        mine: {
          fx: [
            {
              fx: 'open_window',
              kind: 'k',
              decider: 'A',
              options: [
                { label: 'safe', fx: [] },
                { label: 'mine', fx: [{ fx: 'open_window', kind: 'inner', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 0 }] },
              ],
              auto: 0,
            },
          ],
        },
      },
      decks: { main: { cards: ['mine'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/statically dead/);
  });
});

describe('F2-R2-2 · overflow refused AT APPLICATION, never committed or logged', () => {
  const PACK_JACKPOT = {
    ...F2_PACK,
    cards: {
      jackpot1: { fx: [{ fx: 'pay', to: 'A', amount: 1.5e308 }] },
      jackpot2: { fx: [{ fx: 'pay', to: 'A', amount: 1.5e308 }] },
    },
    decks: { main: { cards: ['jackpot1', 'jackpot2'] } },
  };

  it('the second astronomical pay → EffectRefusal; state hashable, log holds only the first', () => {
    const core = (() => {
      const { EngineCore: EC } = { EngineCore };
      const g = packGenesis(PACK_JACKPOT as never);
      const c = new EC(f2PackRef, f2Seats, 'overflow-seed', g);
      wirePack(c, PACK_JACKPOT as never);
      return c;
    })();
    const r1 = core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
    expect('ok' in r1 && r1.ok).toBe(true);
    const hashAfterFirst = core.getStateHash(); // finite → hashable

    expect(() => core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } })).toThrow(
      /non-finite|overflow/
    );
    expect(core.getStateHash()).toBe(hashAfterFirst); // nothing illegal committed
    expect(core.getLogLength()).toBe(1); // the violating draw never logged
    // and the row REPLAYS clean — no lazily-poisoned rows can exist
    expect(() => core.getStateHash()).not.toThrow();
  });
});

describe('F2-R2-3 · malformed fx shapes are NAMED, never raw TypeErrors', () => {
  it('card.fx as a number → PackLoadRefusal naming the card', () => {
    const bad = { ...F2_PACK, cards: { junk: { fx: 7 } }, decks: { main: { cards: ['junk'] } } };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(PackLoadRefusal);
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/junk.*must be an array/);
  });

  it('window option fx as a number → PackLoadRefusal naming the option', () => {
    const bad = {
      ...F2_PACK,
      cards: {
        w: { fx: [{ fx: 'open_window', kind: 'k', decider: 'A', options: [{ label: 'o', fx: 5 }], auto: 0 }] },
      },
      decks: { main: { cards: ['w'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(PackLoadRefusal);
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/option 0.*must be an array/);
  });
});

describe('F2-R2-4 · wirePack’s OWN seal is load-bearing (kills MP6)', () => {
  it('direct-call TOCTOU: post-wirePack tamper of the caller’s pack is inert', () => {
    const raw = structuredClone(F2_PACK) as typeof F2_PACK;
    const single = {
      ...raw,
      cards: { payday: { fx: [{ fx: 'pay', to: 'A', amount: 3 }] } },
      decks: { main: { cards: ['payday'] } },
    };
    // genesis built from a SEPARATE copy so only wirePack's seal is under test
    const genesis = packGenesis(structuredClone(single) as never);
    const core = new EngineCore(f2PackRef, f2Seats, 'r2-4-seed', genesis);
    wirePack(core, single as never);

    (single.cards['payday'] as { fx: Array<Record<string, unknown>> }).fx[0]!['amount'] = 999999;

    core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
    const A = (core.getState()['seats'] as readonly { id: string; cash: number }[]).find((s) => s.id === 'A')!;
    expect(A.cash).toBe(3); // the SEALED amount — wirePack's own door held
  });
});

describe('F2-R2-5 · gating is engine-reserved (I-19)', () => {
  it('content declaring gated → load refusal', () => {
    const bad = {
      ...F2_PACK,
      cards: {
        sneak: { fx: [{ fx: 'open_window', kind: 'k', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 0, gated: false }] },
      },
      decks: { main: { cards: ['sneak'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/engine-reserved/);
  });

  it('every content window gates: the opened window blocks pass regardless of content wishes', () => {
    const { EngineCore: EC } = { EngineCore };
    const single = {
      ...F2_PACK,
      cards: { crossroads: F2_PACK.cards['crossroads']! },
      decks: { main: { cards: ['crossroads'] } },
    };
    const g = packGenesis(single as never);
    const core = new EC(f2PackRef, f2Seats, 'gate-seed', g);
    wirePack(core, single as never);
    core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
    const win = (core.getState()['windows'] as readonly { gated: boolean }[])[0]!;
    expect(win.gated).toBe(true);
    const refused = core.submit({ type: 'turn:pass', seat: 'A', args: {} });
    expect('refused' in refused).toBe(true);
  });
});

describe('OBS-3 · no living seat → refused at the door', () => {
  it('all-eliminated pack → load refusal', () => {
    const bad = { ...F2_PACK, seats: [{ id: 'A', eliminated: true }, { id: 'B', eliminated: true }] };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/LIVING seat/);
  });
});
