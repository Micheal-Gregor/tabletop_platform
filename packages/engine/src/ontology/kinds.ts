/**
 * ME1 KindRegistry — the admitted kind catalog: supersede, never respec.
 * Traces: S3 F3·ME1 ← S2 ME1. Axioms: GX-13, GX-18. Refusals: R-14.
 * The registry is engine-side and derived (platform seed + pack admissions) — never
 * stored on the state tree (I-22 / derived-never-stored).
 */

import type { JsonObject } from '../kernel/types.js';
import { RELATION_TYPES } from './relations.js';

export interface KindDef extends JsonObject {
  readonly name: string;
  /** Declared state shape: field name → 'number' | 'string' | 'boolean' | 'json'. */
  readonly stateShape: Readonly<Record<string, string>>;
  readonly roles: readonly string[];
  readonly relationsGrantable: readonly string[];
}

export class KindRefusal extends Error {
  constructor(readonly kind: string, readonly rule: string, detail: string) {
    super(`Kind refused [${rule}] "${kind}": ${detail}`);
    this.name = 'KindRefusal';
  }
}

export class KindRegistry {
  private readonly defs = new Map<string, KindDef>();
  private readonly supersessions: Array<{ name: string; reason: string }> = [];

  has(name: string): boolean {
    return this.defs.has(name);
  }

  get(name: string): KindDef | undefined {
    return this.defs.get(name);
  }

  /** Internal enrollment — ONLY the AdmissibilityGate calls this (admission-by-rule). */
  enroll(def: KindDef): void {
    if (this.defs.has(def.name)) {
      // GX-18 / R-14: an admitted node is never respecified in place.
      throw new KindRefusal(def.name, 'GX-18/R-14', 'already admitted — supersede on the record, never respec');
    }
    this.defs.set(def.name, def);
  }

  /** The lawful redefinition path: records the chain, then replaces. */
  supersede(def: KindDef, reason: string): void {
    if (!this.defs.has(def.name)) {
      throw new KindRefusal(def.name, 'GX-18', 'nothing to supersede — admit it first');
    }
    if (!reason || reason.trim().length === 0) {
      throw new KindRefusal(def.name, 'GX-18', 'a supersession without a recorded reason is a respec');
    }
    this.supersessions.push({ name: def.name, reason });
    this.defs.set(def.name, def);
  }

  supersessionChain(): readonly { name: string; reason: string }[] {
    return [...this.supersessions];
  }

  names(): readonly string[] {
    return [...this.defs.keys()];
  }
}

/**
 * The NAMED platform roster (I-20: the record counts "12", names 11 — flagged to the
 * owner; admission-by-rule makes the count non-load-bearing). Seeded THROUGH the gate
 * by ontology/admission.ts — the platform eats its own admission rule.
 */
export const NAMED_ROSTER: readonly KindDef[] = [
  { name: 'Board', stateShape: {}, roles: [], relationsGrantable: ['Placement', 'Overlay'] },
  { name: 'PlayerBoard', stateShape: {}, roles: ['Tracker'], relationsGrantable: ['Placement', 'Attachment', 'Overlay'] },
  { name: 'Card', stateShape: { faceUp: 'boolean' }, roles: [], relationsGrantable: ['Placement', 'Attachment', 'Overlay'] },
  { name: 'Token', stateShape: { value: 'number' }, roles: ['Tracker'], relationsGrantable: ['Placement', 'Attachment', 'Representation'] },
  { name: 'Die', stateShape: { face: 'number' }, roles: ['Randomizer'], relationsGrantable: ['Placement'] },
  { name: 'Tile', stateShape: { edges: 'json' }, roles: [], relationsGrantable: [...RELATION_TYPES] },
  { name: 'Figure', stateShape: { pose: 'string' }, roles: [], relationsGrantable: ['Placement', 'Attachment'] },
  { name: 'Spinner', stateShape: { sector: 'number' }, roles: ['Randomizer'], relationsGrantable: ['Placement'] },
  { name: 'Slider', stateShape: { position: 'number' }, roles: ['Tracker'], relationsGrantable: ['Placement', 'Representation'] },
  { name: 'Dial', stateShape: { setting: 'number' }, roles: ['Randomizer', 'Tracker'], relationsGrantable: ['Placement', 'Representation'] }, // the dual-role exemplar
  { name: 'Timer', stateShape: { remaining: 'number' }, roles: ['TimeSource'], relationsGrantable: ['Placement', 'Representation'] }, // admitted; binding DEFERRED (ODG-e1)
];
