/**
 * R-3 / GBC-9 — runtime unknown descriptor → refusal, halt-not-skip (HK-9 is THE gate).
 * R-24 / GBC-15 — sole-applier law: no per-descriptor mutator escapes the module.
 * GBC-10 — each EFX descriptor performs exactly its typed mutation (feeds V-3).
 * GBC-16 — depth-1 law (R-17 engine side).
 */
import { describe, expect, it } from 'vitest';
import * as engine from '../src/index.js';
import { EFX_V1_1_1, EffectEngine, EffectRefusal } from '../src/index.js';
import { F2_PACK, forgedTrapGenesis, newF2Core, seat } from './f2-fixture.js';

const draw = (core: ReturnType<typeof newF2Core>) => {
  const r = core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
  if ('refused' in r) throw new Error(r.detail);
  return r.state;
};

describe('R-3 · unknown descriptor at runtime → halt, never skip (GX-7/HK-9)', () => {
  it('EffectEngine.apply refuses loudly with the descriptor named', () => {
    const core = newF2Core();
    expect(() =>
      EffectEngine.apply(core.getState(), { fx: 'hack_the_bank' }, { windowDepth: 0 })
    ).toThrow(EffectRefusal);
    expect(() =>
      EffectEngine.apply(core.getState(), { fx: 'hack_the_bank' }, { windowDepth: 0 })
    ).toThrow(/hack_the_bank/);
  });

  it('mid-list unknown halts the WHOLE application — nothing after it applies', () => {
    const core = newF2Core();
    const state = core.getState();
    expect(() =>
      EffectEngine.applyAll(
        state,
        [{ fx: 'pay', to: 'A', amount: 1 }, { fx: 'mystery' }, { fx: 'pay', to: 'A', amount: 100 }],
        { windowDepth: 0 }
      )
    ).toThrow(EffectRefusal);
  });
});

describe('R-24 · sole applier — structural (GBC-15)', () => {
  it('no per-descriptor mutator is exported from the engine surface', () => {
    const exported = Object.keys(engine);
    for (const name of exported) {
      expect(name).not.toMatch(/^fx[A-Z]/); // fxPay, fxLevy, … must not escape
    }
    // the ONLY effect application surfaces are EffectEngine.apply/applyAll
    expect(typeof EffectEngine.apply).toBe('function');
    expect(typeof EffectEngine.applyAll).toBe('function');
  });

  it('the vocabulary is sealed — EFX cannot be extended at runtime', () => {
    expect(Object.isFrozen(EFX_V1_1_1)).toBe(true);
    expect(() => {
      (EFX_V1_1_1 as unknown as string[]).push('spawn_venture'); // the docket stays a docket
    }).toThrow();
  });
});

describe('GBC-10 · each descriptor = exactly its typed mutation (feeds V-3)', () => {
  it('pay / capitalize / grant_favor / levy / grant_sue_right / deck_inject / open_window', () => {
    const core = newF2Core();
    let s = core.getState();
    s = EffectEngine.apply(s, { fx: 'pay', to: 'A', amount: 3 }, { windowDepth: 0 });
    s = EffectEngine.apply(s, { fx: 'pay', to: 'B', from: 'A', amount: 1 }, { windowDepth: 0 });
    s = EffectEngine.apply(s, { fx: 'capitalize', owner: 'B', asset: 'ship', amount: 4 }, { windowDepth: 0 });
    s = EffectEngine.apply(s, { fx: 'grant_favor', to: 'B', n: 2 }, { windowDepth: 0 });
    s = EffectEngine.apply(s, { fx: 'levy', scope: 'table', amount: 1 }, { windowDepth: 0 });
    s = EffectEngine.apply(s, { fx: 'grant_sue_right', holder: 'A', against: 'B', window: 'court' }, { windowDepth: 0 });
    s = EffectEngine.apply(s, { fx: 'deck_inject', deck: 'main', card: 'payday', policy: 'top' }, { windowDepth: 0 });
    s = EffectEngine.apply(
      s,
      { fx: 'open_window', kind: 'choice', decider: 'A', options: [], auto: 0 },
      { windowDepth: 0 }
    );

    const seats = s['seats'] as readonly { id: string; cash: number; favor: number; assets: unknown[]; sueRights: unknown[] }[];
    const A = seats.find((x) => x.id === 'A')!;
    const B = seats.find((x) => x.id === 'B')!;
    expect(A.cash).toBe(3 - 1 - 1); // +3 pay, −1 transfer out, −1 table levy
    expect(B.cash).toBe(1 - 1); // +1 transfer in, −1 table levy
    expect(B.assets).toEqual([{ ref: 'ship', value: 4 }]);
    expect(B.favor).toBe(2);
    expect(A.sueRights).toEqual([{ against: 'B', window: 'court' }]);
    const main = (s['decks'] as Record<string, { draw: readonly string[] }>)['main']!;
    expect(main.draw[0]).toBe('payday'); // top-inject preserves the rest of the order
    expect((s['windows'] as unknown[]).length).toBe(1);
  });

  it('levy skips eliminated seats', () => {
    const core = newF2Core();
    let s = core.getState() as Record<string, unknown>;
    const seats = (s['seats'] as Array<Record<string, unknown>>).map((row) =>
      row['id'] === 'B' ? { ...row, eliminated: true } : row
    );
    s = { ...s, seats };
    const out = EffectEngine.apply(s as never, { fx: 'levy', scope: 'table', amount: 2 }, { windowDepth: 0 });
    const rows = out['seats'] as readonly { id: string; cash: number }[];
    expect(rows.find((x) => x.id === 'A')!.cash).toBe(-2);
    expect(rows.find((x) => x.id === 'B')!.cash).toBe(0);
  });
});

describe('GBC-16 · depth-1 window law (GX-11 = R-17 engine side)', () => {
  it('open_window inside a window application → refused', () => {
    const core = newF2Core();
    expect(() =>
      EffectEngine.apply(
        core.getState(),
        { fx: 'open_window', kind: 'inner', decider: 'A', options: [], auto: 0 },
        { windowDepth: 1 }
      )
    ).toThrow(/R-17|depth|inside/);
  });

  it('end-to-end (forged genesis — nested content is load-refused per F2-R2-1): resolving a recursing option → loud refusal, state intact, unlogged', () => {
    const { EngineCore, wirePack } = engine;
    const genesis = forgedTrapGenesis('A', [
      { id: 'A', eliminated: false },
      { id: 'B', eliminated: false },
    ]);
    const core = new EngineCore(
      { id: 'forged', version: '0', hash: '00' },
      [{ id: 'A' }, { id: 'B' }],
      'trap-seed',
      genesis as never
    );
    wirePack(core, { ...F2_PACK });

    const hashBefore = core.getStateHash();
    const logBefore = core.getLogLength();
    expect(() =>
      core.submit({ type: 'window:resolve', seat: 'A', args: { window: 'w1', option: 0 } })
    ).toThrow(EffectRefusal);
    expect(core.getStateHash()).toBe(hashBefore); // appliers are pure — old state intact
    expect(core.getLogLength()).toBe(logBefore); // never logged (GX-3)
  });
});
