/**
 * ME4 SurfaceManager — Surfaces, five topologies, topology-aware placement, and the
 * recursion: composed components FORM a Surface (the built map IS a Surface).
 * Traces: S3 F3·ME4 ← S2 ME4. Axioms: GX-17 (EX-4, ER-e3 — V-6's law).
 */

import type { JsonObject, JsonValue, State } from '../kernel/types.js';
import { dissolveRelation, formRelation } from './relations.js';
import type { RelationRow } from './relations.js';

export const TOPOLOGIES = Object.freeze(['grid', 'hex', 'track', 'slots', 'freeform'] as const);
export type Topology = (typeof TOPOLOGIES)[number];

export class SurfaceRefusal extends Error {
  constructor(readonly surface: string, readonly rule: string, detail: string) {
    super(`Surface refused [${rule}] "${surface}": ${detail}`);
    this.name = 'SurfaceRefusal';
  }
}

type SurfaceRow = { topology: string; composedOf?: readonly string[] } & JsonObject;

function surfaces(state: State): Readonly<Record<string, SurfaceRow>> {
  return (state['surfaces'] as Record<string, SurfaceRow>) ?? {};
}

/** One topology's position check: whether a position is valid, and the refusal wording when it is not. */
interface PositionCheck {
  readonly holds: (position: JsonObject) => boolean;
  readonly refusal: string;
}

/** The five topologies' position checks, one entry each (GBC-23). The five are closed. */
const POSITION_CHECKS: Readonly<Record<Topology, PositionCheck>> = Object.freeze({
  grid: {
    holds: (position) => Number.isInteger(position['x']) && Number.isInteger(position['y']),
    refusal: 'grid positions are integer {x, y}',
  },
  hex: {
    holds: (position) => Number.isInteger(position['q']) && Number.isInteger(position['r']),
    refusal: 'hex positions are integer {q, r}',
  },
  track: {
    holds: (position) => Number.isInteger(position['index']) && (position['index'] as number) >= 0,
    refusal: 'track positions are non-negative integer {index}',
  },
  slots: {
    holds: (position) => typeof position['slot'] === 'string',
    refusal: 'slot positions are string {slot}',
  },
  freeform: {
    holds: (position) =>
      typeof position['x'] === 'number' && typeof position['y'] === 'number' &&
      Number.isFinite(position['x']) && Number.isFinite(position['y']),
    refusal: 'freeform positions are finite numeric {x, y}',
  },
});

/** Topology-aware position validity (GBC-23). */
export function positionValid(topology: string, position: JsonObject): true | string {
  if (!TOPOLOGIES.includes(topology as Topology)) {
    return `unknown topology "${topology}" — the five are closed`;
  }
  const check = POSITION_CHECKS[topology as Topology];
  return check.holds(position) ? true : check.refusal;
}

export function addSurface(state: State, id: string, topology: string): JsonObject {
  if (!TOPOLOGIES.includes(topology as Topology)) {
    throw new SurfaceRefusal(id, 'GX-17', `unknown topology "${topology}" — {${TOPOLOGIES.join('|')}} are the platform capabilities`);
  }
  const all = surfaces(state);
  if (all[id]) throw new SurfaceRefusal(id, 'GX-18', `surface "${id}" exists — supersede, never respec`);
  return { ...state, surfaces: { ...all, [id]: { topology } } } as JsonObject;
}

/** Place a component on a surface: topology-valid position + a formed Placement relation. */
export function placeComponent(state: State, componentId: string, surfaceId: string, position: JsonObject): JsonObject {
  const surf = surfaces(state)[surfaceId];
  if (!surf) throw new SurfaceRefusal(surfaceId, 'GX-17', 'unknown surface');
  const v = positionValid(surf.topology, position);
  if (v !== true) throw new SurfaceRefusal(surfaceId, 'GX-17', v);
  // K7-F3 P11 closure: a component sits in ONE place — placing an already-placed
  // component refuses (dissolve its Placement first, on the record).
  const existing = ((state['components'] as Record<string, { surface?: string }>) ?? {})[componentId];
  if (existing?.surface !== undefined) {
    throw new SurfaceRefusal(
      surfaceId,
      'GX-17/P11',
      `component "${componentId}" is already placed on "${existing.surface}" — dissolve its Placement first`
    );
  }

  // the Placement relation carries the formation predicate (HK-8 fires inside)
  const related = formRelation(state, { type: 'Placement', from: componentId, to: surfaceId });
  const comps = (related['components'] as Record<string, JsonObject>) ?? {};
  const comp = comps[componentId];
  if (!comp) throw new SurfaceRefusal(surfaceId, 'GX-17', `unknown component "${componentId}"`);
  return {
    ...related,
    components: { ...comps, [componentId]: { ...comp, surface: surfaceId, position: position as JsonValue } },
  } as JsonObject;
}

/**
 * THE RECURSION (EX-4 / ER-e3 — V-6's law): components composed side-by-side FORM a
 * Surface. Forms pairwise Composition relations along the chain, then creates the new
 * Surface whose substrate is the composed set. The built map IS a Surface.
 */
export function composeSurface(state: State, newSurfaceId: string, componentIds: readonly string[], topology: string): JsonObject {
  if (componentIds.length < 2) {
    throw new SurfaceRefusal(newSurfaceId, 'GX-17', 'composition needs at least two components side-by-side');
  }
  if (new Set(componentIds).size !== componentIds.length) {
    // K7-F3 defect 8: duplicate ids in a composition are refused.
    throw new SurfaceRefusal(newSurfaceId, 'GX-17', 'duplicate component ids in composition — refused');
  }
  if (!TOPOLOGIES.includes(topology as Topology)) {
    throw new SurfaceRefusal(newSurfaceId, 'GX-17', `unknown topology "${topology}"`);
  }
  let next: JsonObject = state as JsonObject;
  for (let i = 0; i < componentIds.length - 1; i++) {
    next = formRelation(next, { type: 'Composition', from: componentIds[i]!, to: componentIds[i + 1]! });
  }
  const all = surfaces(next);
  if (all[newSurfaceId]) throw new SurfaceRefusal(newSurfaceId, 'GX-18', `surface "${newSurfaceId}" exists`);
  return {
    ...next,
    surfaces: { ...all, [newSurfaceId]: { topology, composedOf: [...componentIds] } },
  } as JsonObject;
}

/**
 * Dissolving the composition retires the composed Surface (GBC-24's mirror) —
 * K7-F3 defect 8 closure: retirement DISSOLVES the pairwise Composition relations
 * (emitting on-dissolve for each) before removing the Surface. One coupled act.
 */
export function retireComposedSurface(state: State, surfaceId: string): JsonObject {
  const surf = surfaces(state)[surfaceId];
  if (!surf || !surf.composedOf) {
    throw new SurfaceRefusal(surfaceId, 'GX-17', 'not a composed surface');
  }
  return withoutSurface(dissolveWithSurface(state, surfaceId, surf.composedOf), surfaceId);
}

/** A formed Composition relation joining two components of the composed set. */
function isCompositionWithin(r: RelationRow, composed: ReadonlySet<string>): boolean {
  return r.status === 'formed' && r.type === 'Composition' && composed.has(r.from) && composed.has(r.to);
}

/**
 * A formed Placement ONTO the retired surface (K7-F3 P12 closure): retirement also dissolves
 * Placements onto it — no component strands on a surface that no longer exists (locations
 * cleared by the Placement-dissolve rule).
 */
function isPlacementOnto(r: RelationRow, surfaceId: string): boolean {
  return r.status === 'formed' && r.type === 'Placement' && r.to === surfaceId;
}

/** Dissolve, in relation order, every Composition of the composed set and every Placement onto the surface. */
function dissolveWithSurface(state: State, surfaceId: string, composedOf: readonly string[]): JsonObject {
  const composed = new Set(composedOf);
  let next: JsonObject = state as JsonObject;
  for (const r of (state['relations'] as readonly RelationRow[]) ?? []) {
    if (isCompositionWithin(r, composed) || isPlacementOnto(r, surfaceId)) {
      next = dissolveRelation(next, r.id);
    }
  }
  return next;
}

/** The state with the one surface removed and every other surface kept. */
function withoutSurface(state: JsonObject, surfaceId: string): JsonObject {
  const rest: Record<string, SurfaceRow> = {};
  for (const [id, s] of Object.entries(surfaces(state))) if (id !== surfaceId) rest[id] = s;
  return { ...state, surfaces: rest } as JsonObject;
}
