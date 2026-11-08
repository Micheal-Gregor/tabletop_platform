import { describe, it, expect } from 'vitest';
import { AdmissibilityGate } from '../../packages/engine/src/ontology/admission.js';
import { KindRefusal, KindRegistry, type KindDef } from '../../packages/engine/src/ontology/kinds.js';

// OS-12 isolation test for AdmissibilityGate (MOD-14, packages/engine/src/ontology/admission.ts).
// Declared input: registry (a KindRegistry). Public operations called: admit, decide. The gate is
// constructed with a registry and nothing else; no environment, clock, globals or network is touched.
// Registry varied: admit's outcome and the registry it writes change with the registry handed in.
// decide reads only its def, so its answer is invariant to the registry (shown below, not assumed).
// Def varied: both operations answer from the def they are given.

const STANDEE: KindDef = { name: 'Standee', stateShape: { facing: 'string' }, roles: ['Tracker'], relationsGrantable: ['Placement', 'Attachment'] };
const LANTERN: KindDef = { name: 'Lantern', stateShape: { lit: 'boolean' }, roles: [], relationsGrantable: ['Overlay'] };
const NO_NAME: KindDef = { ...STANDEE, name: '' };
const BAD_ROLE: KindDef = { ...STANDEE, roles: ['Chronomancer'] };
const BAD_RELATION: KindDef = { ...STANDEE, relationsGrantable: ['Teleport'] };

type Verdict = ReturnType<AdmissibilityGate['decide']>;

function emptyRegistry(): KindRegistry {
  return new KindRegistry();
}

function registryHolding(def: KindDef): KindRegistry {
  const registry = new KindRegistry();
  registry.enroll(def);
  return registry;
}

function gateOver(registry: KindRegistry): AdmissibilityGate {
  return new AdmissibilityGate(registry);
}

function admitOutcome(gate: AdmissibilityGate, def: KindDef): string {
  try {
    gate.admit(def);
    return 'admitted';
  } catch (e) {
    if (e instanceof KindRefusal) return e.message;
    throw e;
  }
}

function defectsOf(verdict: Verdict): string {
  return verdict.admissible ? '' : verdict.defects;
}

const REFUSED_DEFS: ReadonlyArray<readonly [string, KindDef, string]> = [
  ['a missing name', NO_NAME, 'identity: missing kind name'],
  ['an unbindable role', BAD_ROLE, '"Chronomancer" is unbindable'],
  ['a relation outside the five', BAD_RELATION, '"Teleport" is not one of the five'],
];

describe('AdmissibilityGate isolation: construction', () => {
  it('is constructed from a registry alone and answers on both operations', () => {
    const registry = emptyRegistry();
    const gate = gateOver(registry);
    expect(gate.decide(STANDEE)).toEqual({ admissible: true });
    gate.admit(STANDEE);
    expect(registry.has('Standee')).toBe(true);
  });
});

describe('AdmissibilityGate isolation: admit follows the registry', () => {
  it('a fresh registry admits a def that a registry already holding it refuses', () => {
    const fresh = admitOutcome(gateOver(emptyRegistry()), STANDEE);
    const held = admitOutcome(gateOver(registryHolding(STANDEE)), STANDEE);
    expect(fresh).toBe('admitted');
    expect(held).toContain('already admitted');
    expect(fresh).not.toEqual(held);
  });

  it('writes into the registry it was handed and into no other', () => {
    const first = emptyRegistry();
    const second = emptyRegistry();
    gateOver(first).admit(STANDEE);
    expect(first.names()).toEqual(['Standee']);
    expect(second.names()).toEqual([]);
    expect(first.names()).not.toEqual(second.names());
  });

  it('two registries holding different kinds answer the same def differently', () => {
    const holdsLantern = admitOutcome(gateOver(registryHolding(LANTERN)), LANTERN);
    const holdsStandee = admitOutcome(gateOver(registryHolding(STANDEE)), LANTERN);
    expect(holdsLantern).toContain('already admitted');
    expect(holdsStandee).toBe('admitted');
    expect(holdsLantern).not.toEqual(holdsStandee);
  });
});

describe('AdmissibilityGate isolation: admit follows the def', () => {
  it('two defs offered to fresh registries enroll different kinds', () => {
    const standeeRegistry = emptyRegistry();
    const lanternRegistry = emptyRegistry();
    gateOver(standeeRegistry).admit(STANDEE);
    gateOver(lanternRegistry).admit(LANTERN);
    expect(standeeRegistry.names()).not.toEqual(lanternRegistry.names());
  });

  it.each(REFUSED_DEFS)('%s is refused naming the defect and enrolls nothing', (_label, def, named) => {
    const registry = emptyRegistry();
    expect(admitOutcome(gateOver(registry), def)).toContain(named);
    expect(registry.names()).toEqual([]);
  });

  it('each defective def gives its own refusal message', () => {
    const messages = REFUSED_DEFS.map(([, def]) => admitOutcome(gateOver(emptyRegistry()), def));
    expect(new Set(messages).size).toBe(REFUSED_DEFS.length);
  });
});

describe('AdmissibilityGate isolation: decide follows the def', () => {
  it('an admissible def and a defective def get different verdicts', () => {
    const gate = gateOver(emptyRegistry());
    expect(gate.decide(STANDEE)).toEqual({ admissible: true });
    expect(gate.decide(BAD_ROLE).admissible).toBe(false);
    expect(gate.decide(STANDEE)).not.toEqual(gate.decide(BAD_ROLE));
  });

  it.each(REFUSED_DEFS)('%s: the verdict names the defect', (_label, def, named) => {
    const verdict = gateOver(emptyRegistry()).decide(def);
    expect(verdict.admissible).toBe(false);
    expect(defectsOf(verdict)).toContain(named);
  });

  it('each defective def gives its own defects text', () => {
    const gate = gateOver(emptyRegistry());
    const texts = REFUSED_DEFS.map(([, def]) => defectsOf(gate.decide(def)));
    expect(new Set(texts).size).toBe(REFUSED_DEFS.length);
  });

  it('the same def twice gives the same verdict', () => {
    const gate = gateOver(emptyRegistry());
    expect(gate.decide(BAD_RELATION)).toEqual(gate.decide(BAD_RELATION));
  });
});

describe('AdmissibilityGate isolation: decide against the registry', () => {
  it('judges without enrolling: the registry is left as it was', () => {
    const registry = emptyRegistry();
    gateOver(registry).decide(STANDEE);
    expect(registry.names()).toEqual([]);
  });

  it('reads only its def: registries that differ give the same verdict (invariant to registry)', () => {
    const fresh = gateOver(emptyRegistry()).decide(STANDEE);
    const held = gateOver(registryHolding(STANDEE)).decide(STANDEE);
    expect(fresh).toEqual(held);
  });
});

describe('AdmissibilityGate isolation: decide agrees with admit', () => {
  it.each(REFUSED_DEFS)('%s: decide gives the defects text admit refuses with', (_label, def) => {
    const verdict = gateOver(emptyRegistry()).decide(def);
    const outcome = admitOutcome(gateOver(emptyRegistry()), def);
    expect(outcome).toContain(defectsOf(verdict));
  });

  it('an admissible def: decide says admissible and admit admits', () => {
    expect(gateOver(emptyRegistry()).decide(LANTERN).admissible).toBe(true);
    expect(admitOutcome(gateOver(emptyRegistry()), LANTERN)).toBe('admitted');
  });
});
