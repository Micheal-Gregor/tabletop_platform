/**
 * ME3 RelationEngine — five typed, first-class relations with formation/dissolution
 * predicates, state effects, and recorded emissions (seam S-4 supply).
 * Traces: S3 F3·ME3 ← S2 Relation family. Axioms: GX-15, GX-16. Refusals: R-12, R-13.
 * Hook: HK-8. I-21: emissions recorded on-state; the F4 HookBus consumes them later.
 * I-23: the type set is CLOSED (content cannot define relation types).
 */

import type { JsonObject, State } from '../kernel/types.js';

export const RELATION_TYPES = Object.freeze([
  'Placement',
  'Composition',
  'Attachment',
  'Overlay',
  'Representation',
] as const);
export type RelationType = (typeof RELATION_TYPES)[number];

export interface RelationSpec extends JsonObject {
  readonly type: string;
  readonly from: string; // component id
  readonly to: string; // component id / surface id / derived-state path (Representation)
  /** Representation only: EX-6 — the view's source path and mandatory read-only mode. */
  readonly sourcePath?: string;
  readonly mode?: string;
}

export interface RelationRow extends JsonObject {
  readonly id: string;
  readonly type: string;
  readonly from: string;
  readonly to: string;
  readonly sourcePath?: string;
  readonly mode?: string;
  readonly status: string; // 'formed' | 'dissolved'
}

export class RelationRefusal extends Error {
  constructor(readonly relation: string, readonly rule: string, detail: string) {
    super(`Relation refused [${rule}] ${relation}: ${detail}`);
    this.name = 'RelationRefusal';
  }
}

type Components = Readonly<Record<string, { kind: string; surface?: string } & JsonObject>>;

function components(state: State): Components {
  return (state['components'] as Components) ?? {};
}

/** Formation predicates — EX-5: every type carries one; a type without one is R-13. */
const FORMATION: Readonly<Record<RelationType, (state: State, spec: RelationSpec) => true | string>> = {
  Placement: (state, spec) => {
    if (!components(state)[spec.from]) return `unknown component "${spec.from}"`;
    const surfaces = (state['surfaces'] as Record<string, unknown>) ?? {};
    return spec.to in surfaces ? true : `unknown surface "${spec.to}"`;
  },
  Composition: (state, spec) => {
    const c = components(state);
    if (!c[spec.from]) return `unknown component "${spec.from}"`;
    if (!c[spec.to]) return `unknown component "${spec.to}"`;
    return spec.from !== spec.to ? true : 'a component cannot compose with itself';
  },
  Attachment: (state, spec) => {
    const c = components(state);
    if (!c[spec.from]) return `unknown component "${spec.from}"`;
    return c[spec.to] ? true : `unknown host "${spec.to}"`;
  },
  Overlay: (state, spec) => {
    const c = components(state);
    if (!c[spec.from]) return `unknown component "${spec.from}"`;
    return c[spec.to] ? true : `unknown component "${spec.to}"`;
  },
  Representation: (state, spec) => {
    // EX-6/GX-16: a view reads a derived-state path, read-only, always.
    // K7-F3 defect 3: the VIEW must exist as a component; the path must resolve INSIDE
    // the state tree (own properties only — no prototype-chain escape).
    if (!components(state)[spec.from]) return `unknown component "${spec.from}" (the view must exist)`;
    if (typeof spec.sourcePath !== 'string' || spec.sourcePath.length === 0) {
      return 'Representation requires a sourcePath (the derived state it displays)';
    }
    if (spec.mode !== 'read-only') {
      return `Representation mode must be "read-only" (view-never-owns), got ${JSON.stringify(spec.mode)}`;
    }
    if (resolveOwnPath(state, spec.sourcePath) === UNRESOLVED) {
      return `sourcePath "${spec.sourcePath}" does not resolve inside the state tree (own properties only)`;
    }
    return true;
  },
};

const UNRESOLVED = Symbol('unresolved');

/** Own-property path walk — a Representation can NEVER read outside the state tree. */
function resolveOwnPath(state: State, path: string): unknown {
  let value: unknown = state;
  for (const key of path.split('.')) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value as object, key)) {
      return UNRESOLVED;
    }
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

/** HK-8 — before relation form: the type is one of the five AND its predicate holds. */
export function hookHk8BeforeRelationForm(state: State, spec: RelationSpec): void {
  const predicate = FORMATION[spec.type as RelationType];
  if (!predicate) {
    // I-23: an unknown type IS a relation without a formation predicate — R-13.
    throw new RelationRefusal(spec.type, 'GX-15/R-13/HK-8', 'no formation predicate — the five types are closed');
  }
  const verdict = predicate(state, spec);
  if (verdict !== true) {
    throw new RelationRefusal(`${spec.type}(${spec.from}→${spec.to})`, 'GX-15/HK-8', verdict);
  }
  // K7-F3 defect 8: an identical FORMED relation is not formed twice (no duplicate rows).
  const relations = (state['relations'] as readonly RelationRow[]) ?? [];
  if (relations.some((r) => r.status === 'formed' && r.type === spec.type && r.from === spec.from && r.to === spec.to)) {
    throw new RelationRefusal(`${spec.type}(${spec.from}→${spec.to})`, 'GX-15/HK-8', 'identical relation already formed — duplicates refused');
  }
}

function emit(state: JsonObject, event: JsonObject): JsonObject {
  const events = (state['relationEvents'] as readonly JsonObject[]) ?? [];
  return { ...state, relationEvents: [...events, event] };
}

/** Form a relation: HK-8 gates; the on-form emission is RECORDED (S-4 / I-21). */
export function formRelation(state: State, spec: RelationSpec): JsonObject {
  hookHk8BeforeRelationForm(state, spec);
  const seq = ((state['relationSeq'] as number) ?? 0) + 1;
  const row: RelationRow = {
    id: `r${seq}`,
    type: spec.type,
    from: spec.from,
    to: spec.to,
    ...(spec.sourcePath !== undefined ? { sourcePath: spec.sourcePath } : {}),
    ...(spec.mode !== undefined ? { mode: spec.mode } : {}),
    status: 'formed',
  };
  const relations = (state['relations'] as readonly RelationRow[]) ?? [];
  const next = { ...state, relations: [...relations, row], relationSeq: seq } as JsonObject;
  return emit(next, { hook: 'on-form', relation: row.id, type: row.type, from: row.from, to: row.to });
}

/** Dissolve: the mirror path — predicate is existence + formed status; emission recorded. */
export function dissolveRelation(state: State, relationId: string): JsonObject {
  const relations = (state['relations'] as readonly RelationRow[]) ?? [];
  const row = relations.find((r) => r.id === relationId);
  if (!row || row.status !== 'formed') {
    throw new RelationRefusal(relationId, 'GX-15', 'no such formed relation to dissolve');
  }
  let next = {
    ...state,
    relations: relations.map((r) => (r.id === relationId ? { ...r, status: 'dissolved' } : r)),
  } as JsonObject;
  if (row.type === 'Placement') {
    // K7-F3 defect 8 + P11: clear the denormalized location ONLY when this relation IS
    // the component's current placement — a stale dissolve never wipes a live location.
    const comps = (next['components'] as Record<string, JsonObject>) ?? {};
    const comp = comps[row.from];
    if (comp && comp['surface'] === row.to) {
      const cleared: Record<string, unknown> = { ...comp };
      delete cleared['surface'];
      delete cleared['position'];
      next = { ...next, components: { ...comps, [row.from]: cleared as JsonObject } } as JsonObject;
    }
  }
  return emit(next, { hook: 'on-dissolve', relation: row.id, type: row.type, from: row.from, to: row.to });
}

/** GX-16 read side: resolve the derived value a Representation displays. */
export function readThroughRepresentation(state: State, relationId: string): unknown {
  const relations = (state['relations'] as readonly RelationRow[]) ?? [];
  const row = relations.find((r) => r.id === relationId && r.type === 'Representation' && r.status === 'formed');
  if (!row) throw new RelationRefusal(relationId, 'GX-16', 'no formed Representation with that id');
  const value = resolveOwnPath(state, row.sourcePath as string); // own-properties only (K7-F3 defect 3)
  if (value === UNRESOLVED) {
    throw new RelationRefusal(relationId, 'GX-16', `sourcePath "${row.sourcePath}" no longer resolves inside the state tree`);
  }
  return value;
}

/** GX-16 / R-12 — THE representation-write refusal: there is no write; asking refuses. */
export function writeThroughRepresentation(_state: State, relationId: string): never {
  throw new RelationRefusal(
    relationId,
    'GX-16/R-12',
    'a Representation is a VIEW of derived state — it displays, never owns; write refused'
  );
}
