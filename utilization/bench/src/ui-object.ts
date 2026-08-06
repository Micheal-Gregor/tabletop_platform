/**
 * UI OBJECT (G-C, I-168 — the owner's object ontology): THE BASE-CASE for what a 3D-UI
 * object IS. Three kingdoms: the SPACE (the grid — virtual, queried, never rendered),
 * SURFACES (boards/play areas — immutable, no physics, aligned to their anchor, default
 * 0,0,0), and PIECES (cards/dice/tokens — free bodies: socket-anchored for POSITION,
 * orientation their own, physics-obeying). Every object: a placement on the parent
 * grid, a SPHERICAL bound in grid points (density is complexity — more points, more
 * form, more sockets; all virtual, per the I-162 GPU-light doctrine), an optional
 * CHILD GRID with named sockets (the parent/child chain), a physics class, and its
 * AFFORDANCES. THE SCRIPTS SPLIT (I-168's guardrail): what an object does TO THE GAME
 * is ENGINE pack data (fx/EFX — R-24/S5); what it does IN YOUR HAND is the affordance
 * data here — whose only output is an INTENT (R-23). Pure data + pure checks.
 */
import { OBJECT_SCALE } from './playarea.js';
import { gridSpacing, type GridPoint } from './anchor-grid.js';

export type Kind = 'space' | 'surface' | 'piece';
export type PhysicsClass = 'immutable' | 'kinematic' | 'dynamic';

export type Placement =
  | { readonly kind: 'origin'; readonly above?: boolean } // anchored at 0,0,0 (above: resting face at y=0, body ABOVE — the table's law)
  | { readonly kind: 'ring'; readonly slot: number; readonly of: number } // a ring occupant (seats, the box, the dice home)
  | { readonly kind: 'span'; readonly parent: string; readonly span: string } // a named span on a parent surface (folder → ledger span)
  | { readonly kind: 'socket'; readonly parent: string; readonly socket: string } // the parent/child chain (equipment → a card's socket)
  | { readonly kind: 'free' }; // physics decides (a tossed die, a sliding card)

export interface Socket { readonly id: string; readonly at: GridPoint } // in the CHILD grid's own units
export interface ChildGrid { readonly spacing: number; readonly sockets: readonly Socket[] }
export interface Affordances {
  readonly grab?: boolean; readonly flick?: boolean; readonly stick?: boolean;
  readonly socketable?: boolean; readonly click?: string; // the intent VERB a click emits — never an outcome
}

export interface UIObjectDef {
  readonly id: string;
  readonly kind: Kind;
  readonly placement: Placement;
  readonly boundGp: number; // the spherical bound's radius, in GRID POINTS
  readonly physics: PhysicsClass;
  readonly affordances: Affordances;
  readonly childGrid?: ChildGrid;
}

const gp = (worldRadius: number): number => Math.ceil(worldRadius / gridSpacing());
const card = OBJECT_SCALE.card;

/** THE PARENT LIBRARY — the existing bench objects, expressed as children of the
 *  base-case (each was built concrete first; the ontology now names them — the next
 *  object is a few lines of data here, not a new module). */
export const UI_OBJECTS: readonly UIObjectDef[] = [
  { id: 'table', kind: 'surface', placement: { kind: 'origin', above: true }, boundGp: gp(570), physics: 'immutable', affordances: {} },
  { id: 'seat-board', kind: 'surface', placement: { kind: 'ring', slot: 0, of: 7 }, boundGp: gp(184), physics: 'immutable', affordances: {} },
  { id: 'seat-surface', kind: 'surface', placement: { kind: 'ring', slot: 0, of: 7 }, boundGp: gp(300), physics: 'immutable', affordances: { stick: true },
    childGrid: { spacing: card.w + 12, sockets: [] } }, // its sockets ARE the 7×4 cells (seat-grid.ts — the span module)
  { id: 'game-box', kind: 'piece', placement: { kind: 'ring', slot: 6, of: 7 }, boundGp: gp(180), physics: 'kinematic', affordances: {} },
  { id: 'card', kind: 'piece', placement: { kind: 'socket', parent: 'seat-surface', socket: 'posting' }, boundGp: gp(Math.hypot(card.w, card.h) / 2),
    physics: 'dynamic', affordances: { grab: true, flick: true, stick: true, socketable: true },
    childGrid: { spacing: 8, sockets: [
      { id: 'equipment-under', at: { x: 0, y: -(card.h / 2 - 10), z: 0 } }, // 'the equipment under and to the side' — the pair's socket
      { id: 'token-tl', at: { x: -(card.w / 2 - 8), y: card.h / 2 - 8, z: 0 } }, // a modifier chip's perch
      { id: 'token-tr', at: { x: card.w / 2 - 8, y: card.h / 2 - 8, z: 0 } },
    ] } },
  { id: 'die', kind: 'piece', placement: { kind: 'free' }, boundGp: gp(OBJECT_SCALE.die / 2), physics: 'dynamic', affordances: { grab: true, flick: true } },
  { id: 'folder', kind: 'piece', placement: { kind: 'span', parent: 'seat-surface', span: 'ledger' }, boundGp: gp(Math.hypot(OBJECT_SCALE.folder.w, OBJECT_SCALE.folder.h) / 2),
    physics: 'kinematic', affordances: { click: 'open-ledger' } },
  { id: 'medal', kind: 'piece', placement: { kind: 'span', parent: 'table', span: 'medal' }, boundGp: gp(60), physics: 'kinematic', affordances: {} },
] as const;

export const uiObject = (id: string): UIObjectDef | undefined => UI_OBJECTS.find((o) => o.id === id);

/** the CHAIN LAW: every span/socket placement names a real parent; a socket names a
 *  real socket on that parent's child grid (referential integrity — the hierarchy
 *  builds out from declared relationships, never dangling). */
export function chainIntegrity(): { ok: boolean; broken: string[] } {
  const broken: string[] = [];
  for (const o of UI_OBJECTS) {
    if (o.placement.kind === 'span' || o.placement.kind === 'socket') {
      const parent = uiObject(o.placement.parent);
      if (!parent) { broken.push(`${o.id}→${o.placement.parent} (no parent)`); continue; }
      if (o.placement.kind === 'socket' && o.placement.socket !== 'posting'
        && !(parent.childGrid?.sockets.some((s) => s.id === (o.placement as { socket: string }).socket)))
        broken.push(`${o.id}→${o.placement.parent}.${o.placement.socket} (no socket)`);
    }
  }
  return { ok: broken.length === 0, broken };
}

/** the KINGDOM LAW: surfaces are immutable and grabless; pieces are never immutable;
 *  immutables carry no physics affordances (the I-168 taxonomy, checkable). */
export function kingdomIntegrity(): { ok: boolean; broken: string[] } {
  const broken: string[] = [];
  for (const o of UI_OBJECTS) {
    if (o.kind === 'surface' && (o.physics !== 'immutable' || o.affordances.grab || o.affordances.flick)) broken.push(`${o.id} (surface must be immutable+grabless)`);
    if (o.kind === 'piece' && o.physics === 'immutable') broken.push(`${o.id} (a piece is never immutable)`);
  }
  return { ok: broken.length === 0, broken };
}
