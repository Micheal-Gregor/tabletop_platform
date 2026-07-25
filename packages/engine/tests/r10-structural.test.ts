/** GBC-5 / R-10 — mutation bypassing Guard is STRUCTURALLY impossible: exposed state is deep-frozen. */
import { describe, expect, it } from 'vitest';
import { newCore } from './fixture.js';

describe('R-10 · structural immutability', () => {
  it('direct mutation of the exposed root throws', () => {
    const core = newCore();
    const state = core.getState() as Record<string, unknown>;
    expect(() => {
      state['round'] = 99;
    }).toThrow();
  });

  it('direct mutation at depth throws (deep freeze, not shallow)', () => {
    const core = newCore();
    core.submit({ type: 'tally:add', seat: 'A', args: { n: 1 } });
    const rows = core.getState()['seats'] as Array<{ id: string; tally: number }>;
    const first = rows[0]!;
    expect(() => {
      first.tally = 999;
    }).toThrow();
    expect(() => {
      (rows as unknown as unknown[]).push({ id: 'ghost', tally: 0 });
    }).toThrow();
  });

  it('post-submit state objects are frozen too (every exposure, not just genesis)', () => {
    const core = newCore();
    const r = core.submit({ type: 'dice:roll', seat: 'B', args: {} });
    expect('ok' in r && r.ok).toBe(true);
    if ('ok' in r) {
      const lastRoll = r.state['lastRoll'] as Record<string, unknown>;
      expect(Object.isFrozen(r.state)).toBe(true);
      expect(Object.isFrozen(lastRoll)).toBe(true);
    }
  });
});
