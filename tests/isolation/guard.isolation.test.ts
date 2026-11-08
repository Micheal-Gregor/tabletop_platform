import { describe, it, expect } from 'vitest';
import { Guard, type IntentSpec } from '../../packages/engine/src/kernel/guard.js';
import type { Intent, Seat, State, Verdict } from '../../packages/engine/src/kernel/types.js';

// OS-12 isolation test for Guard (MOD-02, packages/engine/src/kernel/guard.ts).
// Declared inputs: none at construction. Operations: register(type, spec), supersede(type, spec),
// check(state, intent, seats). Each is called with two answers that differ in one input only.
// No environment, clock, globals or network is touched.

const SEATS: readonly Seat[] = [{ id: 'a' }, { id: 'b' }];
const OTHER_SEATS: readonly Seat[] = [{ id: 'z' }];
const OPEN: State = { open: true };
const CLOSED: State = { open: false };
const PASS: Intent = { type: 'pass', seat: 'a', args: { n: 1 } };

const ALWAYS: IntentSpec = { args: () => true, rules: [] };
const WHEN_OPEN: IntentSpec = {
  args: () => true,
  rules: [(state) => state.open === true || { rule: 'R-OPEN', detail: 'the table is closed' }],
};
const N_IS_ONE: IntentSpec = {
  args: (_state, intent) => intent.args.n === 1 || 'n must be 1',
  rules: [],
};

function guardWith(type: string, spec: IntentSpec): Guard {
  const guard = new Guard();
  guard.register(type, spec);
  return guard;
}

function thrownBy(attempt: () => void): string {
  try {
    attempt();
  } catch (error) {
    return (error as Error).message;
  }
  return 'did not throw';
}

describe('Guard isolation: register(type, spec)', () => {
  it('a type already held collides; a new type does not', () => {
    const guard = guardWith('pass', ALWAYS);
    const held = thrownBy(() => guard.register('pass', ALWAYS));
    const fresh = thrownBy(() => guard.register('move', ALWAYS));
    expect(held).toContain('already registered');
    expect(fresh).toBe('did not throw');
    expect(held).not.toEqual(fresh);
  });

  it('the spec registered decides the verdict later given', () => {
    const lenient = guardWith('pass', ALWAYS).check(CLOSED, PASS, SEATS);
    const strict = guardWith('pass', WHEN_OPEN).check(CLOSED, PASS, SEATS);
    expect(lenient).toEqual({ legal: true });
    expect(strict).not.toEqual(lenient);
  });

  it('the type registered decides which intents are known', () => {
    const asPass = guardWith('pass', ALWAYS).check(OPEN, PASS, SEATS);
    const asMove = guardWith('move', ALWAYS).check(OPEN, PASS, SEATS);
    expect(asMove).not.toEqual(asPass);
  });
});

describe('Guard isolation: supersede(type, spec)', () => {
  it('a registered type is replaced; an unregistered one is refused', () => {
    const guard = guardWith('pass', ALWAYS);
    const replaced = thrownBy(() => guard.supersede('pass', WHEN_OPEN));
    const missing = thrownBy(() => guard.supersede('move', WHEN_OPEN));
    expect(replaced).toBe('did not throw');
    expect(missing).toContain('cannot supersede unregistered');
    expect(missing).not.toEqual(replaced);
  });

  it('the spec superseded in changes the verdict the type gets', () => {
    const before = guardWith('pass', ALWAYS);
    const after = guardWith('pass', ALWAYS);
    after.supersede('pass', WHEN_OPEN);
    expect(after.check(CLOSED, PASS, SEATS)).not.toEqual(before.check(CLOSED, PASS, SEATS));
  });

  it('two different specs superseded in give different verdicts', () => {
    const byState = guardWith('pass', ALWAYS);
    const byArgs = guardWith('pass', ALWAYS);
    byState.supersede('pass', WHEN_OPEN);
    byArgs.supersede('pass', N_IS_ONE);
    expect(byState.check(CLOSED, PASS, SEATS)).not.toEqual(byArgs.check(CLOSED, PASS, SEATS));
  });
});

describe('Guard isolation: check(state, intent, seats)', () => {
  const guard = guardWith('pass', WHEN_OPEN);

  it('the state decides a rule-level verdict', () => {
    const open = guard.check(OPEN, PASS, SEATS);
    const closed = guard.check(CLOSED, PASS, SEATS);
    expect(open).toEqual({ legal: true });
    expect(closed).not.toEqual(open);
  });

  it('the intent decides: a known type is judged, an unknown one is refused', () => {
    const known = guard.check(OPEN, PASS, SEATS);
    const unknown = guard.check(OPEN, { ...PASS, type: 'teleport' }, SEATS);
    expect(unknown).not.toEqual(known);
  });

  it('the seats decide: a held seat is legal, an unheld one is refused', () => {
    const held = guard.check(OPEN, PASS, SEATS);
    const unheld = guard.check(OPEN, PASS, OTHER_SEATS);
    expect(unheld).not.toEqual(held);
  });

  it('the same inputs twice give the same verdict, and the state is left as it was', () => {
    const before = JSON.stringify(CLOSED);
    expect(guard.check(CLOSED, PASS, SEATS)).toEqual(guard.check(CLOSED, PASS, SEATS));
    expect(JSON.stringify(CLOSED)).toBe(before);
  });
});

function refusalCode(verdict: Verdict): string {
  return verdict.legal ? 'LEGAL' : verdict.refusal.code;
}

describe('Guard isolation: check answers each refusal with its own typed code', () => {
  const guard = guardWith('pass', N_IS_ONE);

  it('an unknown type, an unknown seat and malformed args are told apart', () => {
    const unknownType = guard.check(OPEN, { ...PASS, type: 'teleport' }, SEATS);
    const unknownSeat = guard.check(OPEN, { ...PASS, seat: 'q' }, SEATS);
    const malformed = guard.check(OPEN, { ...PASS, args: { n: 2 } }, SEATS);
    expect(refusalCode(unknownType)).toBe('ILLEGAL_TYPE');
    expect(refusalCode(unknownSeat)).toBe('UNKNOWN_SEAT');
    expect(refusalCode(malformed)).toBe('MALFORMED_ARGS');
    expect(refusalCode(unknownSeat)).not.toBe(refusalCode(malformed));
  });

  it('a rule-level refusal carries the rule and detail the spec named', () => {
    const rules = guardWith('pass', WHEN_OPEN).check(CLOSED, PASS, SEATS);
    expect(rules).toEqual({
      legal: false,
      refusal: { refused: true, code: 'RULE_REFUSED', rule: 'R-OPEN', detail: 'the table is closed' },
    });
  });
});
