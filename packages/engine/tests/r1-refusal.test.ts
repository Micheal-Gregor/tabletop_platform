/** R-1 / GBC-2 — illegal intent → TYPED refusal, state byte-unchanged, NOT logged (GX-2). */
import { describe, expect, it } from 'vitest';
import { newCore } from './fixture.js';
import type { Refusal } from '../src/index.js';

const CASES: Array<{ name: string; intent: { type: string; seat: string; args: Record<string, number> }; code: Refusal['code'] }> = [
  { name: 'unknown intent type', intent: { type: 'nope:nope', seat: 'A', args: {} }, code: 'ILLEGAL_TYPE' },
  { name: 'unknown seat', intent: { type: 'tally:add', seat: 'Z', args: { n: 2 } }, code: 'UNKNOWN_SEAT' },
  { name: 'malformed args', intent: { type: 'tally:add', seat: 'A', args: {} }, code: 'MALFORMED_ARGS' },
  { name: 'rule-level refusal', intent: { type: 'tally:add', seat: 'A', args: { n: 9 } }, code: 'RULE_REFUSED' },
];

describe('R-1 · refusal-not-repair', () => {
  for (const c of CASES) {
    it(`${c.name} → ${c.code}, state unchanged, unlogged`, () => {
      const core = newCore();
      const hashBefore = core.getStateHash();
      const logBefore = core.getLogLength();

      const result = core.submit(c.intent);

      expect('refused' in result && result.refused).toBe(true);
      const refusal = result as Refusal;
      expect(refusal.code).toBe(c.code);
      expect(refusal.rule.length).toBeGreaterThan(0);
      expect(core.getStateHash()).toBe(hashBefore); // byte-unchanged
      expect(core.getLogLength()).toBe(logBefore); // never logged
    });
  }
});
