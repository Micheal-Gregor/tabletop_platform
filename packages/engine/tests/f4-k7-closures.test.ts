/** K7-F4 round-1 closures — D1 (brick classes at the contribution door), D4 (seal), D5 (proto bank), D7 (shapes). */
import { describe, expect, it } from 'vitest';
import {
  ContributionRefusal,
  RuleRegistry,
  formRelation,
  pumpRelationEvents,
  readSlot,
  validateContribution,
} from '../src/index.js';
import type { RuleContribution, State } from '../src/index.js';
import { ontoGenesis } from './f3-fixture.js';

const genesis = (): State => ontoGenesis({ id: 'x', version: '0', hash: '0' }, [], 'seed');
const VOCABS = { efx: '1.1.1', hooks: '1.0' };
const BASE = (over: Partial<RuleContribution> = {}): RuleContribution => ({
  id: 'c1',
  bearer: { kind: 'Card' },
  trigger: 'on-card-drawn',
  condition: { op: 'always' },
  effects: [],
  declaredSlots: [],
  vocabVersions: VOCABS,
  ...over,
});

describe('D1 · the brick classes are refused at the CONTRIBUTION door (kills P1/P2/P3)', () => {
  it('P1: zero-option window in a contribution → load refusal', () => {
    expect(() =>
      validateContribution(BASE({ effects: [{ fx: 'open_window', kind: 'k', decider: 'A', options: [], auto: 0 }] }))
    ).toThrow(/zero options|no path to decision/);
  });

  it('P2: nested open_window (statically dead) → load refusal', () => {
    expect(() =>
      validateContribution(
        BASE({
          effects: [
            {
              fx: 'open_window', kind: 'k', decider: 'A', auto: 0,
              options: [{ label: 'only', fx: [{ fx: 'open_window', kind: 'inner', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 0 }] }],
            },
          ],
        })
      )
    ).toThrow(/statically dead/);
  });

  it('P3: unknown fx nested inside an option → load refusal naming it', () => {
    expect(() =>
      validateContribution(
        BASE({
          effects: [
            { fx: 'open_window', kind: 'k', decider: 'A', auto: 0, options: [{ label: 'o', fx: [{ fx: 'summon_dragon' }] }] },
          ],
        })
      )
    ).toThrow(/summon_dragon/);
  });

  it('gated stays engine-reserved and auto stays in range at this door too', () => {
    expect(() =>
      validateContribution(BASE({ effects: [{ fx: 'open_window', kind: 'k', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 0, gated: false }] }))
    ).toThrow(/engine-reserved/);
    expect(() =>
      validateContribution(BASE({ effects: [{ fx: 'open_window', kind: 'k', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 5 }] }))
    ).toThrow(/out of range/);
  });
});

describe('D4 · the register door SEALS (kills P6/P8)', () => {
  it('post-registration mutation of the caller’s contribution is inert', () => {
    const registry = new RuleRegistry();
    const mine: RuleContribution = {
      ...BASE({ id: 'sneak', bearer: { relationType: 'Attachment' }, trigger: 'on-form:Attachment' }),
      effects: [{ fx: 'pay', to: 'A', amount: 1 }],
    };
    registry.register(mine);
    (mine.effects as Array<Record<string, unknown>>).push({ fx: 'capitalize', owner: 'A', asset: 'x', amount: Infinity });

    let s = formRelation(genesis(), { type: 'Attachment', from: 'tok', to: 'card1' });
    s = pumpRelationEvents(s, registry, { windowDepth: 0 }) as State;
    const A = (s['seats'] as readonly { id: string; cash: number; assets: unknown[] }[])[0]!;
    expect(A.cash).toBe(1); // the SEALED effect list ran
    expect(A.assets.length).toBe(0); // the smuggled Infinity never applied
    expect(() => s).not.toThrow();
    expect(Object.isFrozen(registry.list()[0])).toBe(true); // list() hands out sealed rows
  });
});

describe('D5 · prototype-keyed bank closed (kills P5)', () => {
  it('reserved contribution ids and slot names refuse at validation', () => {
    expect(() => validateContribution(BASE({ id: '__proto__' }))).toThrow(/reserved/);
    expect(() =>
      validateContribution(BASE({ declaredSlots: [{ name: 'constructor', reset: 'never' }] }))
    ).toThrow(/reserved/);
  });

  it('readSlot never walks the prototype chain', () => {
    expect(readSlot(genesis(), '__proto__', 'constructor')).toBeUndefined();
    expect(readSlot(genesis(), 'constructor', 'name')).toBeUndefined();
  });
});

describe('D7 · malformed shapes are NAMED, never raw TypeErrors', () => {
  it('condition missing path / non-array terms / non-array effects / unknown op — all named', () => {
    expect(() => validateContribution(BASE({ condition: { op: 'eq', value: 1 } as never }))).toThrow(ContributionRefusal);
    expect(() => validateContribution(BASE({ condition: { op: 'eq', value: 1 } as never }))).toThrow(/"path" must be a string/);
    expect(() => validateContribution(BASE({ condition: { op: 'and', terms: 5 } as never }))).toThrow(/"terms" must be an array/);
    expect(() => validateContribution(BASE({ effects: 7 as never }))).toThrow(/"effects" must be an array/);
    expect(() => validateContribution(BASE({ condition: { op: 'xor', terms: [] } as never }))).toThrow(/unknown/);
    expect(() => validateContribution(BASE({ declaredSlots: 3 as never }))).toThrow(/"declaredSlots" must be an array/);
  });
});

describe('NEW-2 · clone-first: a lying getter cannot split validation from the seal', () => {
  it('an effects getter that alternates lists cannot smuggle an unvalidated descriptor', () => {
    let reads = 0;
    const evil = {
      id: 'getter', bearer: { kind: 'Card' }, trigger: 'on-card-drawn',
      condition: { op: 'always' }, declaredSlots: [], vocabVersions: { efx: '1.1.1', hooks: '1.0' },
      get effects() {
        reads += 1;
        return reads <= 1
          ? [{ fx: 'open_window', kind: 'k', decider: 'A', options: [], auto: 0 }] // the brick — seen FIRST by the clone
          : [{ fx: 'pay', to: 'A', amount: 1 }];
      },
    } as unknown as RuleContribution;
    const registry = new RuleRegistry();
    // whichever list the clone captures IS the list validated — the brick is refused
    expect(() => registry.register(evil)).toThrow(/zero options|no path to decision/);
    expect(registry.list().length).toBe(0);
  });
});
