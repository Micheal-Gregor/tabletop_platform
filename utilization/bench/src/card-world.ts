/**
 * THE CARD WORLD (C-1a, I-149) — the persistent instance registry of the permanence
 * constitution: every physical card is created ONCE at genesis and NEVER recreated —
 * state changes MOVE and REGROUP instances ('nothing is created or destroyed'). The
 * conservation oracle proves it: the instance count is constant for the whole game and
 * the recreate counter stays 0 (any second create of an id is COUNTED as a violation,
 * never silently honored).
 */
import * as THREE from 'three';
import { makeCard3D, type CardHandle, type DeckClass } from './card3d.js';

const instances = new Map<string, CardHandle>();
let createdAtGenesis = 0;
let recreateAttempts = 0;
let genesisDone = false;

export interface CardDef { readonly id: string; readonly cls: DeckClass }

/** GENESIS ONLY: create the whole physical card set. A second call is a no-op for
 *  existing ids (counted — the conservation oracle surfaces any attempt). */
export function createCardWorld(defs: readonly CardDef[]): void {
  for (const d of defs) {
    if (instances.has(d.id)) { recreateAttempts++; continue; }
    instances.set(d.id, makeCard3D(d.id, d.cls));
  }
  if (!genesisDone) { createdAtGenesis = instances.size; genesisDone = true; }
}

/** claim an instance for positioning — the SAME object every time (permanence). */
export function cardInstance(id: string): CardHandle | null {
  return instances.get(id) ?? null;
}

/** park an instance out of sight (its location-holder isn't rendered this frame) —
 *  the object PERSISTS, detached; never disposed. */
export function parkCard(id: string): void {
  const h = instances.get(id);
  if (h) h.group.parent?.remove(h.group);
}

/** all instance ids of a deck class (sorted — deterministic membership). */
export function instancesOfClass(cls: string): string[] {
  return [...instances.entries()].filter(([, h]) => h.group.userData['deckClass'] === cls).map(([id]) => id).sort();
}

export const cardWorldInfo = () => ({
  instances: instances.size,
  createdAtGenesis,
  recreateAttempts, // MUST stay 0 — the constitution's teeth
  inScene: [...instances.values()].filter((h) => h.group.parent !== null).length,
});
