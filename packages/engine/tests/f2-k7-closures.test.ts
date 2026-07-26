/**
 * K7-F2 round-1 closures — regression + falsifiability tests for defects 1–8, 11, 12.
 * Each BLOCKING closure is written as the distinguishing test its mutation demands.
 */
import { describe, expect, it } from 'vitest';
import {
  EngineCore,
  Guard,
  EffectRefusal,
  HookHk3Violation,
  HookHk5Violation,
  PackLoadRefusal,
  autoResolveWindow,
  resolveWindow,
  passSeat,
  loadPack,
  wirePack,
  hookHk4ValidatePack,
} from '../src/index.js';
import type { Genesis, JsonObject } from '../src/index.js';
import { F2_PACK, f2PackRef, f2Seats, forgedTrapGenesis } from './f2-fixture.js';

const PACK_CHOICE = {
  ...F2_PACK,
  cards: { crossroads: F2_PACK.cards['crossroads']! },
  decks: { main: { cards: ['crossroads'] } },
};

describe('D1 · HK-5 on the REAL pass path (kills MUT-2)', () => {
  it('a suborned Guard cannot carry a pass over an open gated window — HK-5 blocks in the applier', () => {
    const lyingGuard = { register: () => undefined, check: () => ({ legal: true }) } as unknown as Guard;
    const { genesis } = loadPack(PACK_CHOICE);
    const core = new EngineCore(f2PackRef, f2Seats, 'd1-seed', genesis, lyingGuard);
    wirePack(core, PACK_CHOICE);

    core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } }); // gated window opens
    const logBefore = core.getLogLength();
    // the Guard-rule leg is suborned (lying LEGAL) — only HK-5 in the applier stands:
    expect(() => core.submit({ type: 'turn:pass', seat: 'A', args: {} })).toThrow(HookHk5Violation);
    expect(core.getLogLength()).toBe(logBefore); // the violated pass was never logged
  });
});

describe('D2 · HK-3 on the REAL passSeat path (kills MUT-4)', () => {
  it('passSeat over a forged already-wrapped round → HookHk3Violation', () => {
    const forged = {
      seats: [
        { id: 'A', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
        { id: 'B', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
      ],
      turn: { round: 2, seatIdx: 1, phase: 'cleanup', wrappedRound: 2, maxRounds: 5, status: 'playing' },
      decks: {},
      windows: [],
      windowSeq: 0,
    };
    // seatIdx 1 is the last seat → this pass WRAPS → the wired HK-3 call must block
    expect(() => passSeat(forged as never)).toThrow(HookHk3Violation);
  });
});

describe('D3 · depth-1 law on the AUTO path (kills MUT-13)', () => {
  it('auto-resolving an option that opens a window → refused (R-17 on the auto path; forged genesis per F2-R2-1)', () => {
    const genesis = forgedTrapGenesis('B', [
      { id: 'A', eliminated: false },
      { id: 'B', eliminated: true }, // decider eliminated → auto-eligible
    ]);
    const core = new EngineCore(f2PackRef, f2Seats, 'd3-seed', genesis as never);
    wirePack(core, { ...F2_PACK });
    expect(() =>
      core.submit({ type: 'window:auto', seat: 'A', args: { window: 'w1' } })
    ).toThrow(/R-17|depth|inside/);
  });
});

describe('D4 · HK-4 schema leg — malformed args never reach the tree (kills INJ-2)', () => {
  it('pay without amount → load refusal NAMING the arg', () => {
    const bad = {
      ...F2_PACK,
      cards: { broke: { fx: [{ fx: 'pay', to: 'A' }] } },
      decks: { main: { cards: ['broke'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(PackLoadRefusal);
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/amount/);
  });

  it('non-finite amount / unknown seat / bad nested option — ALL named', () => {
    const bad = {
      ...F2_PACK,
      cards: {
        c1: { fx: [{ fx: 'pay', to: 'A', amount: Infinity }] },
        c2: { fx: [{ fx: 'levy', scope: 'Z', amount: 1 }] },
        c3: {
          fx: [
            {
              fx: 'open_window',
              kind: 'k',
              decider: 'A',
              options: [{ label: 'o', fx: [{ fx: 'grant_favor', to: 'A' }] }],
              auto: 0,
            },
          ],
        },
      },
      decks: { main: { cards: ['c1', 'c2', 'c3'] } },
    };
    try {
      hookHk4ValidatePack(bad as never);
      throw new Error('should refuse');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('c1');
      expect(msg).toContain('c2');
      expect(msg).toMatch(/option 0/);
    }
  });
});

describe('D5 · undecidable windows are unconstructible / auto-eligible (kills INJ-4)', () => {
  it('open_window with a nonexistent decider → load refusal', () => {
    const bad = {
      ...F2_PACK,
      cards: {
        ghost: {
          fx: [
            { fx: 'open_window', kind: 'k', decider: 'Z', options: [{ label: 'o', fx: [] }], auto: 0 },
          ],
        },
      },
      decks: { main: { cards: ['ghost'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/decider/);
  });

  it('NEW-1: a ZERO-OPTION window is unconstructible — load refusal (no path to decision)', () => {
    const bad = {
      ...F2_PACK,
      cards: {
        brick: { fx: [{ fx: 'open_window', kind: 'k', decider: 'A', options: [], auto: 0 }] },
      },
      decks: { main: { cards: ['brick'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/at least one option|undecidable/);
  });

  it('runtime: a window whose decider does not exist is ABSENT → auto-eligible, never deadlocked', () => {
    const forged = {
      seats: [{ id: 'A', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false }],
      windows: [
        {
          id: 'w1',
          kind: 'k',
          decider: 'Z',
          options: [{ label: 'o', fx: [] }],
          auto: 0,
          gated: true,
          status: 'open',
        },
      ],
    };
    const out = autoResolveWindow(forged as never, 'w1');
    const wins = out['windows'] as readonly { status: string }[];
    expect(wins[0]!.status).toBe('closed'); // decision taken — the game breathes
  });
});

describe('D6 · refusal-not-repair on the auto index (kills INJ-5)', () => {
  it('out-of-range auto → refused, never silently option 0', () => {
    const forged = {
      seats: [{ id: 'B', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: true }],
      windows: [
        { id: 'w1', kind: 'k', decider: 'B', options: [{ label: 'o', fx: [] }], auto: 9, gated: true, status: 'open' },
      ],
    };
    expect(() => autoResolveWindow(forged as never, 'w1')).toThrow(/out of range|refused/);
  });

  it('at load: out-of-range auto in content → refusal', () => {
    const bad = {
      ...F2_PACK,
      cards: {
        c: { fx: [{ fx: 'open_window', kind: 'k', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 5 }] },
      },
      decks: { main: { cards: ['c'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/auto/);
  });
});

describe('D7 · no card smuggling; uncataloged draw HALTS (kills INJ-3)', () => {
  it('deck_inject of an uncataloged card → load refusal', () => {
    const bad = {
      ...F2_PACK,
      cards: { smuggler: { fx: [{ fx: 'deck_inject', deck: 'main', card: 'GHOST', policy: 'top' }] } },
      decks: { main: { cards: ['smuggler'] } },
    };
    expect(() => hookHk4ValidatePack(bad as never)).toThrow(/GHOST|smuggling|cataloged/);
  });

  it('runtime: drawing a card absent from the catalog → loud halt, state intact, unlogged', () => {
    const ghostGenesis: Genesis = () =>
      ({
        seats: [{ id: 'A', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false }],
        turn: { round: 1, seatIdx: 0, phase: 'start', wrappedRound: 0, maxRounds: 2, status: 'playing' },
        decks: { main: { draw: ['GHOST'], discard: [], reserve: [] } },
        windows: [],
        windowSeq: 0,
      }) as JsonObject;
    const core = new EngineCore(f2PackRef, [{ id: 'A' }], 'd7-seed', ghostGenesis);
    wirePack(core, PACK_CHOICE);
    const hashBefore = core.getStateHash();
    expect(() => core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } })).toThrow(
      EffectRefusal
    );
    expect(core.getStateHash()).toBe(hashBefore);
    expect(core.getLogLength()).toBe(0);
  });
});

describe('D8 · the pack is SEALED at the door (kills INJ-TOCTOU)', () => {
  it('post-load mutation of the caller’s pack object is inert', () => {
    const raw = structuredClone(PACK_CHOICE) as typeof PACK_CHOICE;
    const { genesis, wire } = loadPack(raw);
    const core = new EngineCore(f2PackRef, f2Seats, 'd8-seed', genesis);
    wire(core);
    // the attack: swell the payout AFTER validation
    (raw.cards['crossroads'] as { fx: Array<Record<string, unknown>> }).fx[0]!['options'] = [
      { label: 'take gold', fx: [{ fx: 'pay', to: 'A', amount: 999999 }] },
    ];
    core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
    const win = (core.getState()['windows'] as readonly { id: string }[])[0]!;
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 0 } });
    const A = (core.getState()['seats'] as readonly { id: string; cash: number }[]).find((s) => s.id === 'A')!;
    expect(A.cash).toBe(2); // the SEALED amount, not the tampered one
  });
});

describe('D11 · wirePack’s own HK-4 leg (kills MUT-6b)', () => {
  it('wirePack directly with an invalid pack → refusal, nothing registered', () => {
    const core = new EngineCore(f2PackRef, f2Seats, 'd11-seed', () => ({ seats: [] }));
    const bad = { ...F2_PACK, efxVersion: 'nope' };
    expect(() => wirePack(core, bad as never)).toThrow(PackLoadRefusal);
  });
});

describe('D12 · one window, ONE legal decider (I-16)', () => {
  it('an eliminated seat may not resolve its own window — auto-policy owns it', () => {
    const forged = {
      seats: [{ id: 'B', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: true }],
      windows: [
        { id: 'w1', kind: 'k', decider: 'B', options: [{ label: 'o', fx: [] }], auto: 0, gated: true, status: 'open' },
      ],
    };
    expect(() => resolveWindow(forged as never, 'w1', 0, 'B')).toThrow(/I-16|auto-policy/);
  });
});
