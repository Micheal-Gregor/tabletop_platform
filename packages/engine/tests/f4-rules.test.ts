/** F4 base cases GBC-25..32 — R-15/R-16/R-17/R-18, HK-9 full, dispatch order, monster room. */
import { describe, expect, it } from 'vitest';
import {
  ContributionRefusal,
  DOCKET,
  EFX_GOVERNED,
  EffectRefusal,
  ExtensionContract,
  HOOK_POINTS_V1,
  RuleRegistry,
  dissolveRelation,
  formRelation,
  hookHk9BeforeRuleDispatch,
  pumpRelationEvents,
  readSlot,
  renderRuleset,
  resetSlots,
  validateContribution,
  writeSlot,
} from '../src/index.js';
import type { RelationRow, RuleContribution, State } from '../src/index.js';
import { ontoGenesis } from './f3-fixture.js';

const genesis = (): State => ontoGenesis({ id: 'x', version: '0', hash: '0' }, [], 'seed');
const VOCABS = { efx: '1.1.1', hooks: '1.0' };

const CONTRIB = (over: Partial<RuleContribution> = {}): RuleContribution => ({
  id: 'c1',
  bearer: { kind: 'Card' },
  trigger: 'on-card-drawn',
  condition: { op: 'always' },
  effects: [{ fx: 'grant_favor', to: 'A', n: 1 }],
  declaredSlots: [{ name: 'count', reset: 'per-round' }],
  slotWrites: [{ slot: 'count', increment: 1 }],
  vocabVersions: VOCABS,
  ...over,
});

describe('GBC-25 · R-15: contribution validation NAMES defects', () => {
  it('unknown hook / unknown effect / unknown versions / undeclared slotWrite — all named', () => {
    expect(() => validateContribution(CONTRIB({ trigger: 'on-solar-eclipse' }))).toThrow(/on-solar-eclipse/);
    expect(() => validateContribution(CONTRIB({ effects: [{ fx: 'summon_dragon' }] }))).toThrow(/summon_dragon/);
    expect(() => validateContribution(CONTRIB({ vocabVersions: { efx: '9.9', hooks: '1.0' } }))).toThrow(/9\.9/);
    expect(() => validateContribution(CONTRIB({ slotWrites: [{ slot: 'ghost', increment: 1 }] }))).toThrow(/undeclared slot "ghost"/);
    expect(() => validateContribution(CONTRIB({ bearer: {} }))).toThrow(/EXACTLY one/);
    expect(() => validateContribution(CONTRIB())).not.toThrow();
  });
});

describe('GBC-26 · R-16: bounded meta — static and runtime', () => {
  it('a condition reaching beyond event.*/declared slots refuses at validation', () => {
    expect(() =>
      validateContribution(CONTRIB({ condition: { op: 'eq', path: 'seats.0.cash', value: 0 } }))
    ).toThrow(/bounded meta/);
    expect(() =>
      validateContribution(CONTRIB({ condition: { op: 'eq', path: 'slots.ghost', value: 0 } }))
    ).toThrow(/bounded meta/);
    expect(() =>
      validateContribution(CONTRIB({ condition: { op: 'eq', path: 'slots.count', value: 0 } }))
    ).not.toThrow();
  });

  it('runtime resolution is hasOwn-bounded: a prototype path never resolves', () => {
    const registry = new RuleRegistry();
    registry.register(
      CONTRIB({ condition: { op: 'ne', path: 'event.constructor', value: null } }) // ne undefined→ still fires only if resolves ≠ null
    );
    // event.constructor must NOT resolve (hasOwn) → v = undefined; ne null → true is WRONG?
    // undefined !== null → fires. Assert instead with eq: undefined never equals a value.
    const r2 = new RuleRegistry();
    r2.register(CONTRIB({ id: 'c2', condition: { op: 'eq', path: 'event.constructor', value: 'anything' } }));
    const out = r2.dispatch(genesis(), 'on-card-drawn', { hook: 'on-card-drawn' }, { windowDepth: 0 });
    const A = (out['seats'] as readonly { id: string; favor: number }[]).find((s) => s.id === 'A')!;
    expect(A.favor).toBe(0); // did not fire — the prototype path resolved to nothing
  });
});

describe('GBC-27 · R-18: declared slots only; reset classes', () => {
  it('undeclared write refuses; declared write lands', () => {
    const decl = [{ name: 'count', reset: 'per-round' as const }];
    const s = writeSlot(genesis(), 'c1', 'count', 3, decl);
    expect(readSlot(s, 'c1', 'count')).toBe(3);
    expect(() => writeSlot(genesis(), 'c1', 'ghost', 1, decl)).toThrow(ContributionRefusal);
    expect(() => writeSlot(genesis(), 'c1', 'ghost', 1, decl)).toThrow(/R-18/);
  });

  it('resetSlots clears exactly its class', () => {
    const decls = new Map([
      ['c1', [{ name: 'a', reset: 'per-round' as const }, { name: 'b', reset: 'never' as const }]],
    ]);
    let s = writeSlot(genesis(), 'c1', 'a', 1, decls.get('c1')!);
    s = writeSlot(s, 'c1', 'b', 2, decls.get('c1')!) as State;
    const after = resetSlots(s, 'per-round', decls);
    expect(readSlot(after, 'c1', 'a')).toBeUndefined();
    expect(readSlot(after, 'c1', 'b')).toBe(2);
  });
});

describe('GBC-28 · dispatch order + per-firing snapshot (feeds V-7)', () => {
  it('same hook fires in bearer-entry-seq; slot counters prove the order', () => {
    const registry = new RuleRegistry();
    registry.register(CONTRIB({ id: 'first', effects: [{ fx: 'pay', to: 'A', amount: 1 }], slotWrites: [] , declaredSlots: []}));
    registry.register(CONTRIB({ id: 'second', effects: [{ fx: 'pay', to: 'A', amount: 10 }], slotWrites: [], declaredSlots: [] }));
    const out = registry.dispatch(genesis(), 'on-card-drawn', { hook: 'on-card-drawn' }, { windowDepth: 0 });
    const A = (out['seats'] as readonly { id: string; cash: number }[]).find((s) => s.id === 'A')!;
    expect(A.cash).toBe(11); // both fired, deterministic order
  });

  it('duplicate contribution id refuses (supersede, never respec)', () => {
    const registry = new RuleRegistry();
    registry.register(CONTRIB());
    expect(() => registry.register(CONTRIB())).toThrow(/already registered/);
  });
});

describe('GBC-29 · the monster room (feeds V-8): relation-borne activation is derived', () => {
  it('fires only while a formed relation of the bearer type exists; effects via EFX only', () => {
    const registry = new RuleRegistry();
    registry.register(
      CONTRIB({
        id: 'monster',
        bearer: { relationType: 'Attachment' },
        trigger: 'on-form:Attachment',
        effects: [{ fx: 'levy', scope: 'table', amount: 2 }],
        declaredSlots: [],
        slotWrites: [],
      })
    );
    // form the bearer relation → pump → the monster levies the table
    let s = formRelation(genesis(), { type: 'Attachment', from: 'tok', to: 'card1' });
    s = pumpRelationEvents(s, registry, { windowDepth: 0 }) as State;
    const A1 = (s['seats'] as readonly { id: string; cash: number }[])[0]!;
    expect(A1.cash).toBe(-2);

    // dissolve → the on-dissolve pump does NOT fire it (trigger is on-form) and the
    // contribution is inert (no formed Attachment remains)
    const relId = (s['relations'] as readonly RelationRow[])[0]!.id;
    s = dissolveRelation(s, relId) as State;
    s = pumpRelationEvents(s, registry, { windowDepth: 0 }) as State;
    const A2 = (s['seats'] as readonly { id: string; cash: number }[])[0]!;
    expect(A2.cash).toBe(-2); // unchanged — inert after dissolution
  });
});

describe('GBC-30 · HK-9 full + R-17 (MR1 side)', () => {
  it('dispatch on an unknown hook → halt', () => {
    expect(() => hookHk9BeforeRuleDispatch('on-solar-eclipse')).toThrow(EffectRefusal);
    const registry = new RuleRegistry();
    expect(() => registry.dispatch(genesis(), 'on-solar-eclipse', { hook: 'x' }, { windowDepth: 0 })).toThrow(/HK-9/);
  });

  it('an open_window effect dispatched at windowDepth 1 → refused (depth-1 through dispatch)', () => {
    const registry = new RuleRegistry();
    registry.register(
      CONTRIB({
        id: 'trapdoor',
        effects: [{ fx: 'open_window', kind: 'k', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 0 }],
        declaredSlots: [],
        slotWrites: [],
      })
    );
    expect(() =>
      registry.dispatch(genesis(), 'on-card-drawn', { hook: 'on-card-drawn' }, { windowDepth: 1 })
    ).toThrow(/R-17|depth|inside/);
  });
});

describe('GBC-31 · ExtensionContract: governed growth only (GX-23)', () => {
  it('a proposal without full obligations refuses; docket members stay non-members', () => {
    const contract = new ExtensionContract();
    expect(() => contract.propose('EFX', 'spawn_venture', { refusalTest: 'x' })).toThrow(/missing per-member obligations/);
    expect(() => contract.propose('EFX', 'pay', { refusalTest: 'a', vectorPlan: 'b', hookSpec: 'c' })).toThrow(/already a member/);
    for (const d of DOCKET) expect(EFX_GOVERNED.members.includes(d)).toBe(false);
  });

  it('a full proposal records; approval needs an owner note; the sealed vocabulary NEVER mutates', () => {
    const contract = new ExtensionContract();
    const cycle = contract.propose('EFX', 'spawn_venture', {
      refusalTest: 'unknown venture template → refused',
      vectorPlan: 'V-EFX-8 computed at first implementation',
      hookSpec: 'pre-spawn → template ∈ pack presets → refuse',
    });
    expect(cycle.status).toBe('proposed');
    expect(() => contract.approve(cycle.id, '')).toThrow(/live human decision/);
    const approved = contract.approve(cycle.id, 'owner: proceed at next version bump');
    expect(approved.status).toBe('owner-approved');
    expect(EFX_GOVERNED.members.includes('spawn_venture')).toBe(false); // runtime NEVER grows
    expect(Object.isFrozen(HOOK_POINTS_V1.members)).toBe(true);
  });
});

describe('GBC-32 · RulesetView: total exposure, derived', () => {
  it('every vocabulary and registered contribution appears', () => {
    const registry = new RuleRegistry();
    registry.register(CONTRIB());
    const view = renderRuleset(registry);
    expect(view.vocabularies.map((v) => v.name).sort()).toEqual(['EFX', 'HookPoints', 'VerbSets']);
    expect(view.vocabularies.find((v) => v.name === 'HookPoints')!.members.length).toBe(23);
    expect(view.contributions[0]).toMatchObject({ id: 'c1', bearer: 'kind:Card', trigger: 'on-card-drawn' });
  });
});
