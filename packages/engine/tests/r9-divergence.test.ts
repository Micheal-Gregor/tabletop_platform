/** GBC-3 + GBC-4 / R-9 — rebuild byte-equality; divergence → full refusal, never patch (GX-3/GX-4). */
import { describe, expect, it } from 'vitest';
import { genesis, newCore, wire } from './fixture.js';
import { DivergenceError, rebuild } from '../src/index.js';
import type { GameRow, Intent } from '../src/index.js';

function playTenMoves() {
  const core = newCore('replay-seed');
  const moves: Intent[] = [
    { type: 'tally:add', seat: 'A', args: { n: 1 } },
    { type: 'dice:roll', seat: 'B', args: {} },
    { type: 'tally:add', seat: 'B', args: { n: 3 } },
    { type: 'tally:add', seat: 'A', args: { n: 2 } },
    { type: 'dice:roll', seat: 'A', args: {} },
    { type: 'tally:add', seat: 'B', args: { n: 1 } },
    { type: 'dice:roll', seat: 'B', args: {} },
    { type: 'tally:add', seat: 'A', args: { n: 3 } },
    { type: 'dice:roll', seat: 'A', args: {} },
    { type: 'tally:add', seat: 'B', args: { n: 2 } },
  ];
  for (const m of moves) {
    const r = core.submit(m);
    if ('refused' in r) throw new Error(`fixture defect: ${r.detail}`);
  }
  return core;
}

describe('GBC-3 · rebuild byte-equality (feeds V-2 — value computed, never hand-written)', () => {
  it('two rebuilds from the row hash identically to the live final state', () => {
    const live = playTenMoves();
    const row = live.toRow();

    const rebuilt1 = rebuild(row, genesis, wire);
    const rebuilt2 = rebuild(row, genesis, wire);

    expect(rebuilt1.getStateHash()).toBe(live.getStateHash());
    expect(rebuilt2.getStateHash()).toBe(live.getStateHash());
  });
});

describe('R-9 · replay divergence → full rebuild refusal', () => {
  it('a tampered row refuses as a whole; no partial state escapes', () => {
    const live = playTenMoves();
    const row = live.toRow();
    const tampered: GameRow = {
      ...row,
      moves: row.moves.map((m, i) =>
        i === 4 ? { ...m, type: 'tally:add', args: { n: 99 } } : m
      ),
    };

    expect(() => rebuild(tampered, genesis, wire)).toThrowError(DivergenceError);
    try {
      rebuild(tampered, genesis, wire);
    } catch (e) {
      expect((e as DivergenceError).index).toBe(4);
      // the thrown error is the ONLY observable — no core object was returned (no partial state)
    }
  });
});
