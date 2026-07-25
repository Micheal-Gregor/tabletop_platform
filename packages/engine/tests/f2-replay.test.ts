/** GBC-17 — a full F2 scenario rebuilds byte-identical from the row (feeds V-2). */
import { describe, expect, it } from 'vitest';
import { EngineCore, rebuild } from '../src/index.js';
import { loadPack } from '../src/index.js';
import { F2_PACK, f2PackRef, f2Seats, newF2Core } from './f2-fixture.js';
import type { WindowRow } from '../src/index.js';

function playScenario(core: ReturnType<typeof newF2Core>): void {
  // A draws twice; if a gated window opened, resolve it; then pass; B draws; passes (wrap)
  for (let i = 0; i < 2; i++) {
    const r = core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } });
    if ('refused' in r) throw new Error(r.detail);
    for (const w of core.getState()['windows'] as readonly WindowRow[]) {
      if (w.status === 'open' && w.kind !== 'nested') {
        core.submit({ type: 'window:resolve', seat: w.decider, args: { window: w.id, option: 0 } });
      }
    }
  }
  core.submit({ type: 'turn:advance', seat: 'A', args: {} });
  const p1 = core.submit({ type: 'turn:pass', seat: 'A', args: {} });
  if ('refused' in p1) throw new Error(p1.detail);
  const d = core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'main' } });
  if ('refused' in d) throw new Error(d.detail);
  for (const w of core.getState()['windows'] as readonly WindowRow[]) {
    if (w.status === 'open' && w.kind !== 'nested') {
      core.submit({ type: 'window:resolve', seat: w.decider, args: { window: w.id, option: 1 } });
    }
  }
  const p2 = core.submit({ type: 'turn:pass', seat: 'B', args: {} });
  if ('refused' in p2) throw new Error(p2.detail);
}

// the trap card would halt a draw mid-scenario; use the pack minus the trap
const PACK = {
  ...F2_PACK,
  cards: Object.fromEntries(Object.entries(F2_PACK.cards).filter(([k]) => k !== 'trap')),
  decks: { main: { cards: F2_PACK.decks['main']!.cards.filter((c) => c !== 'trap') } },
};

describe('GBC-17 · F2 replay byte-equality (V-2 groundwork — value computed at the R gate)', () => {
  it('rebuild(row) twice ≡ live, hash-identical, through windows/effects/wrap', () => {
    const { genesis, wire } = loadPack(PACK);
    const live = new EngineCore(f2PackRef, f2Seats, 'replay-f2', genesis);
    wire(live);
    playScenario(live as ReturnType<typeof newF2Core>);

    const row = live.toRow();
    const r1 = rebuild(row, genesis, wire);
    const r2 = rebuild(row, genesis, wire);
    expect(r1.getStateHash()).toBe(live.getStateHash());
    expect(r2.getStateHash()).toBe(live.getStateHash());
    expect(row.packRef).toEqual(f2PackRef); // SUP-1: the row NAMES its pack
  });
});
