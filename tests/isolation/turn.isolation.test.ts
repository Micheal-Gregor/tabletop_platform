import { describe, it, expect } from 'vitest';
import { HookHk3Violation } from '../../packages/engine/src/play/turn.js';

// OS-12 isolation test for HookHk3Violation (MOD-05, packages/engine/src/play/turn.ts).
// Declared input: detail. Public members read: name, message, stack, instanceof Error.
// No environment, clock, globals or network is touched.

function construct(detail: string): HookHk3Violation {
  return new HookHk3Violation(detail);
}

describe('HookHk3Violation isolation (OS-12)', () => {
  it('constructs from its one declared input and is an Error', () => {
    const refusal = construct('second wrap-tick in round 2');
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal).toBeInstanceOf(HookHk3Violation);
  });

  it('reads name: a fixed typed-refusal name, invariant to detail', () => {
    const a = construct('alpha');
    const b = construct('beta');
    expect(a.name).toBe('HookHk3Violation');
    expect(b.name).toBe(a.name);
  });

  it('reads message: carries the HK-3 prefix and the detail', () => {
    const refusal = construct('second wrap-tick in round 2');
    expect(refusal.message).toBe('HK-3 violated: second wrap-tick in round 2');
  });

  it('two constructions differing only in detail differ in message', () => {
    const a = construct('second wrap-tick in round 2 (last wrapped: 2)');
    const b = construct('second wrap-tick in round 3 (last wrapped: 3)');
    expect(a.message).not.toBe(b.message);
    expect(a.message).not.toEqual(b.message);
  });

  it('reads stack: the first line carries the detail, so it differs with detail', () => {
    const a = construct('alpha');
    const b = construct('beta');
    expect(typeof a.stack).toBe('string');
    expect(a.stack).not.toBe(b.stack);
    expect(String(a.stack)).toContain('HK-3 violated: alpha');
  });

  it('two constructions with the same detail answer the same message and name', () => {
    const a = construct('same');
    const b = construct('same');
    expect(a.message).toBe(b.message);
    expect(a.name).toBe(b.name);
  });

  it('throws as a typed refusal that a caller can tell from a broken call', () => {
    const raise = (): never => {
      throw construct('gate closed');
    };
    expect(raise).toThrow(HookHk3Violation);
    expect(raise).toThrow('HK-3 violated: gate closed');
  });
});
