/**
 * R-6 / GBC-11 — open gated window blocks pass; resolution unblocks (GX-8, HK-5).
 * R-7 / GBC-12 — eliminated decider: pass refused; window:auto decides AND logs.
 */
import { describe, expect, it } from 'vitest';
import { newF2Core, F2_PACK } from './f2-fixture.js';
import type { WindowRow } from '../src/index.js';

// dedicated single-card pack: the ONLY draw opens the 'choice' window (decider A)
const PACK_CHOICE = {
  ...F2_PACK,
  cards: { crossroads: F2_PACK.cards['crossroads']! },
  decks: { main: { cards: ['crossroads'] } },
};

function openChoiceWindow(core: ReturnType<typeof newF2Core>): WindowRow {
  const r = core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
  if ('refused' in r) throw new Error(`fixture defect: ${r.detail}`);
  const win = (core.getState()['windows'] as readonly WindowRow[]).find(
    (w) => w.kind === 'choice' && w.status === 'open'
  );
  if (!win) throw new Error('fixture defect: choice window did not open');
  return win;
}

describe('R-6 · open gated window blocks advance (GX-8)', () => {
  it('pass over an open window → typed refusal NAMING the window; resolve → pass proceeds', () => {
    const core = newF2Core('r6-seed', PACK_CHOICE);
    const win = openChoiceWindow(core);

    const refused = core.submit({ type: 'turn:pass', seat: 'A', args: {} });
    expect('refused' in refused && refused.code === 'RULE_REFUSED').toBe(true);
    if ('refused' in refused) expect(refused.detail).toContain(win.id);

    const resolved = core.submit({
      type: 'window:resolve',
      seat: 'A',
      args: { window: win.id, option: 0 },
    });
    expect('ok' in resolved && resolved.ok).toBe(true);

    const passed = core.submit({ type: 'turn:pass', seat: 'A', args: {} });
    expect('ok' in passed && passed.ok).toBe(true);
  });

  it('a non-decider cannot resolve another seat’s window', () => {
    const core = newF2Core('r6-seed', PACK_CHOICE);
    const win = openChoiceWindow(core);
    // decider is A; B tries to take the decision — refused loudly by the window law
    expect(() =>
      core.submit({ type: 'window:resolve', seat: 'B', args: { window: win.id, option: 0 } })
    ).toThrow(/decider/);
  });

  it('resolving applies the chosen option’s fx (choice 0 = pay A +2)', () => {
    const core = newF2Core('r6-seed', PACK_CHOICE);
    const win = openChoiceWindow(core);
    const cashBefore = (core.getState()['seats'] as readonly { id: string; cash: number }[]).find(
      (s) => s.id === 'A'
    )!.cash;
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 0 } });
    const cashAfter = (core.getState()['seats'] as readonly { id: string; cash: number }[]).find(
      (s) => s.id === 'A'
    )!.cash;
    expect(cashAfter).toBe(cashBefore + 2);
  });
});

describe('R-7 · eliminated decider: auto-policy decides AND logs (GX-8)', () => {
  // a pack variant where the window's decider (B) starts eliminated
  const PACK_B_OUT = {
    ...F2_PACK,
    seats: [{ id: 'A' }, { id: 'B', eliminated: true }],
    cards: {
      summons: {
        fx: [
          {
            fx: 'open_window',
            kind: 'b-choice',
            decider: 'B',
            options: [
              { label: 'gold', fx: [{ fx: 'pay', to: 'B', amount: 5 }] },
              { label: 'favor', fx: [{ fx: 'grant_favor', to: 'B', n: 1 }] },
            ],
            auto: 1,
          },
        ],
      },
    },
    decks: { main: { cards: ['summons'] } },
  };

  it('pass refused over the orphan window; auto takes option[auto]; the decision is IN the log', () => {
    const core = newF2Core('r7-seed', PACK_B_OUT);
    const r = core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
    if ('refused' in r) throw new Error(r.detail);
    const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.status === 'open')!;
    expect(win.decider).toBe('B');

    // R-7 first half: the window may NOT be skipped
    const refused = core.submit({ type: 'turn:pass', seat: 'A', args: {} });
    expect('refused' in refused).toBe(true);

    // auto-policy takes the decision — option 1 (favor), NOT option 0
    const auto = core.submit({ type: 'window:auto', seat: 'A', args: { window: win.id } });
    expect('ok' in auto && auto.ok).toBe(true);
    const B = (core.getState()['seats'] as readonly { id: string; favor: number; cash: number }[]).find(
      (s) => s.id === 'B'
    )!;
    expect(B.favor).toBe(1);
    expect(B.cash).toBe(0);

    // R-7 second half: the decision IS logged — it is an intent in the row
    const moves = core.toRow().moves;
    expect(moves.some((m) => m.type === 'window:auto' && m.args['window'] === win.id)).toBe(true);

    // and pass now proceeds
    const passed = core.submit({ type: 'turn:pass', seat: 'A', args: {} });
    expect('ok' in passed && passed.ok).toBe(true);
  });

  it('auto-policy may NOT usurp a live decider', () => {
    const core = newF2Core('r6-seed', PACK_CHOICE);
    const win = openChoiceWindow(core); // decider A is alive
    expect(() =>
      core.submit({ type: 'window:auto', seat: 'B', args: { window: win.id } })
    ).toThrow(/usurp|present/);
  });
});
