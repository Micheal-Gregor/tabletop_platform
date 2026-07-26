/** GBC-18/19/20 — admission by rule (V-5 groundwork), role bindings, supersede-never-respec. */
import { describe, expect, it } from 'vitest';
import {
  AdmissibilityGate,
  KindRegistry,
  KindRefusal,
  NAMED_ROSTER,
  RoleRefusal,
  bindingFor,
  usableBinding,
  seededRegistry,
  hookHk7BeforeKindAdmission,
} from '../src/index.js';
import type { KindDef } from '../src/index.js';

const STANDEE: KindDef = {
  name: 'Standee',
  stateShape: { art: 'string' },
  roles: ['Tracker'],
  relationsGrantable: ['Placement', 'Attachment'],
};

describe('GBC-18 · admission by RULE, never enumeration (GX-13/EX-2/HK-7 — feeds V-5)', () => {
  it('the "standee" proof: a novel kind with all three legs admits', () => {
    const registry = seededRegistry();
    const gate = new AdmissibilityGate(registry);
    gate.admit(STANDEE);
    expect(registry.has('Standee')).toBe(true);
  });

  it('each missing leg is refused NAMING the leg — THROUGH the admission door (kills MUT-F3-1)', () => {
    const gate = new AdmissibilityGate(seededRegistry());
    expect(() => gate.admit({ ...STANDEE, stateShape: undefined as never })).toThrow(/state shape/);
    expect(() => gate.admit({ ...STANDEE, roles: ['Chronomancer'] })).toThrow(/unbindable/);
    expect(() => gate.admit({ ...STANDEE, relationsGrantable: ['Teleport'] })).toThrow(/not one of the five/);
    expect(() => gate.admit({ ...STANDEE, name: '' as never })).toThrow(/identity/);
  });

  it('unit: the predicate function itself refuses the same legs', () => {
    expect(() => hookHk7BeforeKindAdmission({ ...STANDEE, stateShape: undefined as never })).toThrow(/state shape/);
    expect(() => hookHk7BeforeKindAdmission({ ...STANDEE, roles: ['Chronomancer'] })).toThrow(/unbindable/);
  });

  it('EVERY registry door is gated (K7-F3 defect 2): enroll and supersede refuse inadmissible defs', () => {
    const registry = seededRegistry();
    const bad: KindDef = { name: 'Ghost', stateShape: {}, roles: ['Chronomancer'], relationsGrantable: ['Teleport'] };
    expect(() => registry.enroll(bad)).toThrow(/unbindable/); // the P1 bypass, closed
    const badBoard: KindDef = { ...bad, name: 'Board' };
    expect(() => registry.supersede(badBoard, 'laundering attempt')).toThrow(/unbindable/); // P2, closed
    expect(registry.get('Board')?.roles).toEqual([]); // Board untouched
  });

  it('the platform roster itself passed through the gate (dogfood) — all named kinds admitted', () => {
    const registry = seededRegistry();
    for (const def of NAMED_ROSTER) expect(registry.has(def.name)).toBe(true);
    expect(registry.names().length).toBe(NAMED_ROSTER.length); // I-20: 11 named, count flagged
  });

  it('a TimeSource-bearing kind is ADMISSIBLE (RD-e5: admit the kind, defer the binding)', () => {
    const timerish: KindDef = { name: 'Hourglass', stateShape: { sand: 'number' }, roles: ['TimeSource'], relationsGrantable: ['Placement'] };
    const gate = new AdmissibilityGate(seededRegistry());
    expect(() => gate.admit(timerish)).not.toThrow();
  });
});

describe('GBC-19 · role bindings (GX-14/EX-3)', () => {
  it('Randomizer/Tracker/Reference bind; TimeSource defers behind ODG-e1', () => {
    expect(bindingFor('Randomizer')).toEqual({ status: 'bound', primitive: 'RNGStreams (M4)' });
    expect(bindingFor('Tracker').status).toBe('bound');
    expect(bindingFor('Reference').status).toBe('bound');
    expect(bindingFor('TimeSource')).toEqual({ status: 'deferred', gate: 'ODG-e1' });
  });

  it('R-11: an unknown role refuses', () => {
    expect(() => bindingFor('Chronomancer')).toThrow(RoleRefusal);
    expect(() => bindingFor('Chronomancer')).toThrow(/R-11/);
  });

  it('USING the deferred TimeSource binding refuses, citing the open gate', () => {
    expect(() => usableBinding('TimeSource')).toThrow(/ODG-e1/);
    expect(usableBinding('Randomizer').primitive).toContain('RNGStreams');
  });
});

describe('GBC-20 · supersede, never respec (GX-18/R-14)', () => {
  it('re-admitting an admitted kind refuses', () => {
    const gate = new AdmissibilityGate(seededRegistry());
    expect(() => gate.admit({ ...NAMED_ROSTER[0]! })).toThrow(KindRefusal);
    expect(() => gate.admit({ ...NAMED_ROSTER[0]! })).toThrow(/R-14|supersede/);
  });

  it('supersession replaces WITH a recorded chain; reason-less supersession refuses', () => {
    const registry = seededRegistry();
    const better = { ...NAMED_ROSTER[0]!, stateShape: { orientation: 'string' } };
    expect(() => registry.supersede(better, '')).toThrow(/reason/);
    registry.supersede(better, 'ext ruling: boards carry orientation');
    expect(registry.get('Board')?.stateShape).toEqual({ orientation: 'string' });
    expect(registry.supersessionChain()).toEqual([{ name: 'Board', reason: 'ext ruling: boards carry orientation' }]);
  });

  it('superseding a never-admitted kind refuses (no phantom chains)', () => {
    const registry = new KindRegistry();
    expect(() => registry.supersede(STANDEE, 'why not')).toThrow(/admit it first/);
  });
});
