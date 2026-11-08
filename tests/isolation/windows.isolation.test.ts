import { describe, it, expect } from 'vitest';
import { HookHk5Violation } from '../../packages/engine/src/play/windows.js';

// OS-12 isolation test for HookHk5Violation (MOD-07, packages/engine/src/play/windows.ts).
// Declared input: detail. Public members read: name, message, stack, instanceof Error.
// No environment, clock, globals or network is touched.

const ONE_WINDOW = 'seat advance with open gated window(s): w1';
const TWO_WINDOWS = 'seat advance with open gated window(s): w1, w2';

function refusalFor(detail: string): HookHk5Violation {
  return new HookHk5Violation(detail);
}

function stackOf(detail: string): string {
  return String(refusalFor(detail).stack);
}

describe('HookHk5Violation isolation: construction', () => {
  it.each([ONE_WINDOW, TWO_WINDOWS, ''])('detail %j builds a typed Error', (detail) => {
    const refusal = refusalFor(detail);
    expect(refusal).toBeInstanceOf(Error);
    expect(refusal).toBeInstanceOf(HookHk5Violation);
  });
});

describe('HookHk5Violation isolation: name (invariant to detail)', () => {
  it.each([ONE_WINDOW, TWO_WINDOWS, 'x'])('detail %j keeps the fixed name', (detail) => {
    expect(refusalFor(detail).name).toBe('HookHk5Violation');
  });
});

describe('HookHk5Violation isolation: message follows detail', () => {
  it.each([
    [ONE_WINDOW, `HK-5 violated: ${ONE_WINDOW}`],
    [TWO_WINDOWS, `HK-5 violated: ${TWO_WINDOWS}`],
    ['', 'HK-5 violated: '],
  ])('detail %j gives message %j', (detail, expected) => {
    expect(refusalFor(detail).message).toBe(expected);
  });

  it('a change of detail alone changes the message', () => {
    expect(refusalFor(ONE_WINDOW).message).not.toEqual(refusalFor(TWO_WINDOWS).message);
  });

  it('the same detail twice gives the same message', () => {
    expect(refusalFor(ONE_WINDOW).message).toEqual(refusalFor(ONE_WINDOW).message);
  });
});

describe('HookHk5Violation isolation: stack follows detail', () => {
  it('a change of detail alone changes the stack', () => {
    expect(stackOf(ONE_WINDOW)).not.toEqual(stackOf(TWO_WINDOWS));
  });

  it('the stack text carries the detail it was built from', () => {
    expect(stackOf(TWO_WINDOWS)).toContain(`HK-5 violated: ${TWO_WINDOWS}`);
  });
});

describe('HookHk5Violation isolation: thrown as a typed refusal', () => {
  const raise = (): never => {
    throw refusalFor('gate closed');
  };

  it('is caught by its own type, not as a broken call', () => {
    expect(raise).toThrow(HookHk5Violation);
  });

  it('is caught by its message', () => {
    expect(raise).toThrow('HK-5 violated: gate closed');
  });
});
