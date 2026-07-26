/**
 * ME5 AdmissibilityGate — admission by RULE (EX-2), never enumeration.
 * Traces: S3 F3·ME5 ← S2 ME5 · seam S-5. Axioms: GX-13. Hook: HK-7. Vector: V-5.
 * The refusal NAMES the failing leg — validation names defects, everywhere.
 */

import type { KindDef } from './kinds.js';
import { KindRegistry, KindRefusal, NAMED_ROSTER, hookHk7BeforeKindAdmission } from './kinds.js';

/**
 * HK-7 now lives in kinds.ts and gates EVERY registry door (enroll + supersede) —
 * K7-F3 defects 1+2 closure. Re-exported here for the public surface.
 */
export { hookHk7BeforeKindAdmission };

export class AdmissibilityGate {
  constructor(private readonly registry: KindRegistry) {}

  /** The admission door: enrollment is itself gated (HK-7 fires inside enroll). */
  admit(def: KindDef): void {
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
