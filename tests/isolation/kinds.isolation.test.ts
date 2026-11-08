import { describe, it, expect } from 'vitest';
import { KindRefusal, KindRegistry, type KindDef } from '../../packages/engine/src/ontology/kinds.js';

// OS-12 isolation test for KindRegistry (MOD-10, packages/engine/src/ontology/kinds.ts).
// Declared inputs: none (the constructor takes nothing). Public operations called: has, get, enroll,
// supersede, supersessionChain, names. Each operation is called with inputs that differ in one thing
// (the name asked, the def offered, the reason given, what the registry already holds) and the
// answers are shown to differ. No environment, clock, globals or network is touched.

const STANDEE: KindDef = { name: 'Standee', stateShape: { facing: 'string' }, roles: ['Tracker'], relationsGrantable: ['Placement', 'Attachment'] };
const LANTERN: KindDef = { name: 'Lantern', stateShape: { lit: 'boolean' }, roles: [], relationsGrantable: ['Overlay'] };
const STANDEE_REDRAWN: KindDef = { ...STANDEE, stateShape: { facing: 'number' }, relationsGrantable: ['Placement'] };
const NO_NAME: KindDef = { ...STANDEE, name: '' };
const EVERY_DEFECT: KindDef = { name: '', stateShape: { facing: 'float' }, roles: ['Chronomancer'], relationsGrantable: ['Teleport'] };

type Chain = readonly { name: string; reason: string }[];

function holding(...defs: KindDef[]): KindRegistry {
  const registry = new KindRegistry();
  for (const def of defs) registry.enroll(def);
  return registry;
}

function outcomeOf(action: () => void): string {
  try {
    action();
    return 'accepted';
  } catch (e) {
    if (e instanceof KindRefusal) return e.message;
    throw e;
  }
}

function indexesIn(text: string, fragments: readonly string[]): number[] {
  return fragments.map((fragment) => text.indexOf(fragment));
}

describe('KindRegistry isolation: construction', () => {
  it('is constructed from nothing and answers on every operation, empty', () => {
    const registry = new KindRegistry();
    expect(registry.has('Standee')).toBe(false);
    expect(registry.get('Standee')).toBeUndefined();
    expect(registry.names()).toEqual([]);
    expect(registry.supersessionChain()).toEqual([]);
  });

  it('two registries are separate: enrolling in one leaves the other as it was', () => {
    const first = new KindRegistry();
    const second = new KindRegistry();
    first.enroll(STANDEE);
    expect(first.names()).toEqual(['Standee']);
    expect(second.names()).toEqual([]);
    expect(first.names()).not.toEqual(second.names());
  });
});

describe('KindRegistry isolation: has', () => {
  it('answers from the name asked', () => {
    const registry = holding(STANDEE);
    expect(registry.has('Standee')).toBe(true);
    expect(registry.has('Lantern')).toBe(false);
    expect(registry.has('Standee')).not.toBe(registry.has('Lantern'));
  });

  it('answers from what the registry holds: the same name, a fresh and a holding registry', () => {
    expect(new KindRegistry().has('Standee')).not.toBe(holding(STANDEE).has('Standee'));
  });

  it('is false for a kind that was only refused', () => {
    const registry = new KindRegistry();
    outcomeOf(() => registry.enroll(EVERY_DEFECT));
    expect(registry.has(EVERY_DEFECT.name)).toBe(false);
  });
});

describe('KindRegistry isolation: get', () => {
  it('answers from the name asked', () => {
    const registry = holding(STANDEE, LANTERN);
    expect(registry.get('Standee')).toEqual(STANDEE);
    expect(registry.get('Lantern')).toEqual(LANTERN);
    expect(registry.get('Standee')).not.toEqual(registry.get('Lantern'));
    expect(registry.get('Lamppost')).toBeUndefined();
  });

  it('answers from what the registry holds: the same name, a fresh and a holding registry', () => {
    expect(new KindRegistry().get('Standee')).not.toEqual(holding(STANDEE).get('Standee'));
  });

  it('answers with the current def once the kind is superseded', () => {
    const registry = holding(STANDEE);
    const before = registry.get('Standee');
    registry.supersede(STANDEE_REDRAWN, 'facing becomes a number');
    expect(registry.get('Standee')).toEqual(STANDEE_REDRAWN);
    expect(registry.get('Standee')).not.toEqual(before);
  });
});

describe('KindRegistry isolation: enroll follows the def', () => {
  it('two defs enrolled in fresh registries leave different names', () => {
    expect(holding(STANDEE).names()).not.toEqual(holding(LANTERN).names());
    expect(holding(STANDEE).get('Standee')).not.toEqual(holding(LANTERN).get('Standee'));
  });

  it('an admissible def is accepted and a defective def is refused: different outcomes', () => {
    const accepted = outcomeOf(() => new KindRegistry().enroll(STANDEE));
    const refused = outcomeOf(() => new KindRegistry().enroll(NO_NAME));
    expect(accepted).toBe('accepted');
    expect(refused).toContain('identity: missing kind name');
    expect(accepted).not.toEqual(refused);
  });

  it('a refused def enrolls nothing', () => {
    const registry = new KindRegistry();
    outcomeOf(() => registry.enroll(NO_NAME));
    expect(registry.names()).toEqual([]);
  });

  it('names every defect, leg (a) then (b) then (c), under the HK-7 rule', () => {
    const message = outcomeOf(() => new KindRegistry().enroll(EVERY_DEFECT));
    expect(message).toContain('[GX-13/EX-2/HK-7]');
    const at = indexesIn(message, ['(a) identity', '(a) state shape', '(b) roles', '(c) relations']);
    expect(at.every((index) => index >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });
});

describe('KindRegistry isolation: enroll follows what the registry holds', () => {
  it('the same def is accepted by a fresh registry and refused by one already holding it', () => {
    const fresh = outcomeOf(() => new KindRegistry().enroll(STANDEE));
    const held = outcomeOf(() => holding(STANDEE).enroll(STANDEE));
    expect(fresh).toBe('accepted');
    expect(held).toContain('[GX-18/R-14]');
    expect(held).toContain('already admitted');
    expect(fresh).not.toEqual(held);
  });

  it('a respec under a held name is refused and the held def is untouched', () => {
    const registry = holding(STANDEE);
    expect(outcomeOf(() => registry.enroll(STANDEE_REDRAWN))).toContain('supersede on the record, never respec');
    expect(registry.get('Standee')).toEqual(STANDEE);
  });
});

describe('KindRegistry isolation: supersede follows the def and the reason', () => {
  it('replaces the held def, keeps the name, and records one entry', () => {
    const registry = holding(STANDEE);
    registry.supersede(STANDEE_REDRAWN, 'facing becomes a number');
    expect(registry.names()).toEqual(['Standee']);
    expect(registry.get('Standee')).toEqual(STANDEE_REDRAWN);
    expect(registry.supersessionChain()).toEqual([{ name: 'Standee', reason: 'facing becomes a number' }]);
  });

  it('two reasons give two different records', () => {
    const first = holding(STANDEE);
    const second = holding(STANDEE);
    first.supersede(STANDEE_REDRAWN, 'facing becomes a number');
    second.supersede(STANDEE_REDRAWN, 'placement only');
    expect(first.supersessionChain()).not.toEqual(second.supersessionChain());
  });

  it('two kinds superseded give two different records', () => {
    const standee = holding(STANDEE);
    const lantern = holding(LANTERN);
    standee.supersede(STANDEE_REDRAWN, 'redrawn');
    lantern.supersede({ ...LANTERN, stateShape: { lit: 'number' } }, 'redrawn');
    expect(standee.supersessionChain()).not.toEqual(lantern.supersessionChain());
  });
});

describe('KindRegistry isolation: supersede refusals', () => {
  it('refuses a def nothing holds, leaving the registry as it was', () => {
    const registry = holding(LANTERN);
    const message = outcomeOf(() => registry.supersede(STANDEE, 'redrawn'));
    expect(message).toContain('nothing to supersede');
    expect(registry.names()).toEqual(['Lantern']);
    expect(registry.supersessionChain()).toEqual([]);
  });

  it.each([['an empty reason', ''], ['a blank reason', '   ']])('refuses %s, leaving the held def', (_label, reason) => {
    const registry = holding(STANDEE);
    expect(outcomeOf(() => registry.supersede(STANDEE_REDRAWN, reason))).toContain('without a recorded reason');
    expect(registry.get('Standee')).toEqual(STANDEE);
    expect(registry.supersessionChain()).toEqual([]);
  });

  it('runs the EX-2 predicate: a defective def never launders through supersession', () => {
    const registry = holding(STANDEE);
    const message = outcomeOf(() => registry.supersede({ ...STANDEE, roles: ['Chronomancer'] }, 'redrawn'));
    expect(message).toContain('[GX-13/EX-2/HK-7]');
    expect(registry.get('Standee')).toEqual(STANDEE);
    expect(registry.supersessionChain()).toEqual([]);
  });

  it('answers a missing kind and a missing reason differently', () => {
    const registry = holding(STANDEE);
    const missingKind = outcomeOf(() => registry.supersede(LANTERN, 'redrawn'));
    const missingReason = outcomeOf(() => registry.supersede(STANDEE_REDRAWN, ''));
    expect(missingKind).not.toEqual(missingReason);
  });
});

describe('KindRegistry isolation: supersessionChain', () => {
  it('is empty before any supersession and carries the record after', () => {
    const registry = holding(STANDEE);
    const before = registry.supersessionChain();
    registry.supersede(STANDEE_REDRAWN, 'redrawn');
    expect(before).toEqual([]);
    expect(registry.supersessionChain()).not.toEqual(before);
  });

  it('keeps each supersession in the order it was made', () => {
    const registry = holding(STANDEE, LANTERN);
    registry.supersede(LANTERN, 'first');
    registry.supersede(STANDEE, 'second');
    expect(registry.supersessionChain().map((entry) => entry.reason)).toEqual(['first', 'second']);
    expect(registry.supersessionChain().map((entry) => entry.name)).toEqual(['Lantern', 'Standee']);
  });

  it('answers with a copy: changing it leaves the registry record as it was', () => {
    const registry = holding(STANDEE);
    registry.supersede(STANDEE_REDRAWN, 'redrawn');
    (registry.supersessionChain() as { name: string; reason: string }[]).push({ name: 'Forged', reason: 'forged' });
    const chain: Chain = registry.supersessionChain();
    expect(chain).toEqual([{ name: 'Standee', reason: 'redrawn' }]);
  });
});

describe('KindRegistry isolation: names', () => {
  it('is empty when fresh and lists what was enrolled', () => {
    expect(new KindRegistry().names()).not.toEqual(holding(STANDEE, LANTERN).names());
    expect(holding(STANDEE, LANTERN).names()).toEqual(['Standee', 'Lantern']);
  });

  it('follows the order of enrollment', () => {
    expect(holding(STANDEE, LANTERN).names()).not.toEqual(holding(LANTERN, STANDEE).names());
  });

  it('does not grow when a kind is superseded', () => {
    const registry = holding(STANDEE);
    const before = registry.names();
    registry.supersede(STANDEE_REDRAWN, 'redrawn');
    expect(registry.names()).toEqual(before);
  });

  it('answers with a copy: changing it leaves the registry as it was', () => {
    const registry = holding(STANDEE);
    (registry.names() as string[]).push('Forged');
    expect(registry.names()).toEqual(['Standee']);
  });
});
