/**
 * External-audit round 1 closures (K7_AUDIT_REPORT-1):
 * EA-1 (MUT-H): the non-finite hash guard must be FALSIFIABLE — these tests fail if the
 * throw in canonicalJson is deleted.
 * EA-2 (obs-1): a refusing verdict without a refusal payload must throw, never return
 * undefined outside SubmitResult.
 */
import { describe, expect, it } from 'vitest';
import { canonicalJson, EngineCore, Guard, hashState, HookViolation } from '../src/index.js';
import { genesis, packRef, seats, wire } from './fixture.js';

describe('EA-1 · non-finite hash guard is load-bearing (kills MUT-H)', () => {
  it('hashState THROWS on a state containing NaN', () => {
    expect(() => hashState({ a: NaN })).toThrow(/non-finite/);
  });

  it('hashState THROWS on Infinity, at depth', () => {
    expect(() => hashState({ outer: { inner: [1, 2, Infinity] } })).toThrow(/non-finite/);
  });

  it('a null-bearing state still hashes — the guard refuses corruption, not null', () => {
    // Without the guard, JSON.stringify maps NaN → "null" and the two states would hash
    // EQUAL. The guard makes the corrupt state unhashable instead of null-identical.
    expect(() => hashState({ a: null })).not.toThrow();
    expect(canonicalJson({ a: null })).toBe('{"a":null}');
  });
});

describe('EA-2 · refusing verdict without a payload → loud engine fault (obs-1 closure)', () => {
  it('submit throws HookViolation, never returns undefined', () => {
    const brokenGuard = {
      register: () => undefined,
      check: () => ({ legal: false }), // refusing, but no refusal payload
    } as unknown as Guard;
    const core = new EngineCore(packRef, seats, 'obs1-seed', genesis, brokenGuard);
    wire(core);

    expect(() => core.submit({ type: 'tally:add', seat: 'A', args: { n: 1 } })).toThrow(
      HookViolation
    );
    expect(core.getLogLength()).toBe(0);
  });
});
