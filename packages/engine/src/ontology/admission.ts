/**
 * ME5 AdmissibilityGate — admission by RULE (EX-2), never enumeration.
 * Traces: S3 F3·ME5 ← S2 ME5 · seam S-5. Axioms: GX-13. Hook: HK-7. Vector: V-5.
 * The refusal NAMES the failing leg — validation names defects, everywhere.
 */

import type { KindDef } from './kinds.js';
import { KindRegistry, KindRefusal, NAMED_ROSTER } from './kinds.js';
import { bindingFor, RoleRefusal } from './roles.js';
import { RELATION_TYPES } from './relations.js';

/**
 * HK-7 — before kind admission: the EX-2 predicate must hold:
 * (a) identity + state shape declared; (b) every role EX-3-bindable (deferred bindings
 * admissible per RD-e5); (c) grantable relations ⊆ the five.
 */
export function hookHk7BeforeKindAdmission(def: KindDef): void {
  const defects: string[] = [];
  if (!def.name || typeof def.name !== 'string') defects.push('(a) identity: missing kind name');
  if (def.stateShape === undefined || typeof def.stateShape !== 'object' || def.stateShape === null) {
    defects.push('(a) state shape: must be declared (an empty {} is a declaration; absence is not)');
  } else {
    for (const [field, ty] of Object.entries(def.stateShape)) {
      if (!['number', 'string', 'boolean', 'json'].includes(ty)) {
        defects.push(`(a) state shape: field "${field}" has unknown type "${ty}"`);
      }
    }
  }
  if (!Array.isArray(def.roles)) {
    defects.push('(b) roles: must be an array (empty is a declaration)');
  } else {
    for (const role of def.roles) {
      try {
        bindingFor(role); // deferred is ADMISSIBLE (RD-e5) — unbindable is not
      } catch (e) {
        if (e instanceof RoleRefusal) defects.push(`(b) roles: "${role}" is unbindable (${e.message})`);
        else throw e;
      }
    }
  }
  if (!Array.isArray(def.relationsGrantable)) {
    defects.push('(c) relations: must be an array');
  } else {
    for (const rel of def.relationsGrantable) {
      if (!RELATION_TYPES.includes(rel as (typeof RELATION_TYPES)[number])) {
        defects.push(`(c) relations: "${rel}" is not one of the five`);
      }
    }
  }
  if (defects.length > 0) {
    throw new KindRefusal(String(def.name ?? '<unnamed>'), 'GX-13/EX-2/HK-7', defects.join(' · '));
  }
}

export class AdmissibilityGate {
  constructor(private readonly registry: KindRegistry) {}

  /** The ONLY door into the registry: HK-7 gates, then enrollment (R-14 inside). */
  admit(def: KindDef): void {
    hookHk7BeforeKindAdmission(def);
    this.registry.enroll(def);
  }

  /** V-5's decision surface: the predicate's verdict WITHOUT enrolling. */
  decide(def: KindDef): { admissible: true } | { admissible: false; defects: string } {
    try {
      hookHk7BeforeKindAdmission(def);
      return { admissible: true };
    } catch (e) {
      if (e instanceof KindRefusal) return { admissible: false, defects: e.message };
      throw e;
    }
  }
}

/** Build the platform registry by pushing the NAMED roster through its own gate. */
export function seededRegistry(): KindRegistry {
  const registry = new KindRegistry();
  const gate = new AdmissibilityGate(registry);
  for (const def of NAMED_ROSTER) gate.admit(def); // dogfood: the seed obeys EX-2
  return registry;
}
