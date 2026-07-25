/**
 * HK-1 / HK-2 — divergence-injection on the REAL orchestrated path (CC-6, RD-8):
 * force the guarded component to misbehave and prove the hook catches it.
 * (Mutation testing — delete the guarded call → these named tests fail — is K7's throwaway-copy run.)
 */
import { describe, expect, it } from 'vitest';
import {
  EngineCore,
  Guard,
  HookViolation,
  hookHk1BeforeMutation,
  hookHk2BeforeLogAppend,
} from '../src/index.js';
import { genesis, packRef, seats, wire } from './fixture.js';
import type { State, Verdict } from '../src/index.js';

describe('HK-1 · before any mutation → Guard verdict LEGAL', () => {
  it('unit: a lying/malformed verdict is blocked', () => {
    expect(() => hookHk1BeforeMutation(undefined as unknown as Verdict)).toThrow(HookViolation);
    expect(() => hookHk1BeforeMutation({} as Verdict)).toThrow(HookViolation);
    expect(() =>
      hookHk1BeforeMutation({ legal: 'yes' } as unknown as Verdict)
    ).toThrow(HookViolation);
  });

  it('injection: a lying Guard (LEGAL for an unregistered intent) is caught on the submit path', () => {
    const lyingGuard = {
      register: () => undefined,
      check: () => ({ legal: true }),
    } as unknown as Guard;
    const core = new EngineCore(packRef, seats, 'seed-inject', genesis, lyingGuard);
    // no applier registered for this type — a lying LEGAL verdict must not slip into a silent no-op
    expect(() => core.submit({ type: 'ghost:move', seat: 'A', args: {} })).toThrow(HookViolation);
    expect(core.getLogLength()).toBe(0); // nothing was logged on the violated path
  });

  it('injection (K7 recipe, on-path): truthy-but-not-LEGAL verdict WITH an applier registered → HK-1 blocks', () => {
    // The distinguishing test for mutation A: delete the hookHk1BeforeMutation call in
    // core.submit and this MUST fail — the lying verdict would reach apply + log.
    const lyingGuard = {
      register: () => undefined,
      check: () => ({ legal: 'yes' }), // truthy, but not the LEGAL verdict
    } as unknown as Guard;
    const core = new EngineCore(packRef, seats, 'seed-inject3', genesis, lyingGuard);
    wire(core); // appliers ARE registered — nothing masks the hook
    const hashBefore = core.getStateHash();

    expect(() => core.submit({ type: 'tally:add', seat: 'A', args: { n: 2 } })).toThrow(
      HookViolation
    );
    expect(core.getStateHash()).toBe(hashBefore); // no mutation happened
    expect(core.getLogLength()).toBe(0); // nothing was logged
  });
});

describe('HK-2 · before log append → apply succeeded', () => {
  it('unit: append without a succeeded apply is blocked', () => {
    expect(() => hookHk2BeforeLogAppend(null)).toThrow(HookViolation);
    expect(() => hookHk2BeforeLogAppend(undefined)).toThrow(HookViolation);
  });

  it('injection: an applier that produces no state is caught; state and log untouched', () => {
    const core = new EngineCore(packRef, seats, 'seed-inject2', genesis);
    core.registerIntent(
      'broken:apply',
      { args: () => true, rules: [] },
      // a misbehaving applier returning nothing
      () => undefined as unknown as State
    );
    const hashBefore = core.getStateHash();

    expect(() => core.submit({ type: 'broken:apply', seat: 'A', args: {} })).toThrow(HookViolation);
    expect(core.getStateHash()).toBe(hashBefore); // old state intact
    expect(core.getLogLength()).toBe(0); // nothing logged
  });
});
