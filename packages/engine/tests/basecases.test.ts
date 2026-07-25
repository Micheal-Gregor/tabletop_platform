/** GBC-1 — the guarded intent path end-to-end (GX-1/GX-3). */
import { describe, expect, it } from 'vitest';
import { newCore, tally } from './fixture.js';

describe('GBC-1 · legal intent through the guarded path', () => {
  it('applies exactly the applier mutation, logs exactly the submitted intent', () => {
    const core = newCore();
    const intent = { type: 'tally:add', seat: 'A', args: { n: 2 } };
    const before = core.getLogLength();

    const result = core.submit(intent);

    expect('ok' in result && result.ok).toBe(true);
    expect(tally(core, 'A')).toBe(2);
    expect(tally(core, 'B')).toBe(0);
    expect(core.getLogLength()).toBe(before + 1);
    expect(core.toRow().moves.at(-1)).toEqual(intent);
  });
});
