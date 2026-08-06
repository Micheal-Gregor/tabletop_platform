/**
 * STACKS-3D (C-1b/C-1b2, I-149/I-154) — every table pile as a LITERAL STACK of Card3D
 * instances ('made each deck an actual deck of cards'): world-space groups at the
 * region's live rect, one persistent instance per card, posed — never recreated. The
 * stack group carries the region tag + a footprint GHOST (clickable at zero cards);
 * the count law, anchors, oracles and tap-nudge generalize through focusObject's scene
 * fallback. Instances whose location isn't rendered are PARKED — unrendered, never
 * destroyed (redaction by absence). Poses are EULER (x-flat, z-scatter) so the fidget
 * tween's rotation.z convention (Q-6) carries over unchanged.
 */
import * as THREE from 'three';
import { cardInstance, instancesOfClass } from './card-world.js';
import { CARD_T } from './card3d.js';
import { lcg } from './stacks.js';
import { poseOrArrive } from './arrivals.js'; // PB-9b (I-201): a card claimed into a pile TRAVELS there
import { TOWN_TABLE_V2 } from '../../../packs/boty/src/index.js';

interface Frame { r: { x: number; y: number; w: number; h: number }; cxw: number; czw: number; topY: number; sx: number; sz: number }

/** the region's live WORLD frame, measured off the given table group (I-153: the
 *  just-built table is passed in — never a previous build's scene lookup). */
function regionFrame(t: THREE.Object3D, rid: string): Frame | null {
  const rg = TOWN_TABLE_V2.regions.find((x) => x.id === rid);
  if (!rg || !t) return null;
  const r = { x: rg.x, y: rg.y, w: rg.w, h: rg.h };
  t.updateWorldMatrix(true, true);
  const tb = new THREE.Box3().setFromObject(t);
  const sx = (tb.max.x - tb.min.x) / 100, sz = (tb.max.z - tb.min.z) / 100;
  return { r, cxw: tb.min.x + (r.x + r.w / 2) * sx, czw: tb.min.z + (r.y + r.h / 2) * sz, topY: tb.max.y, sx, sz };
}

/** per-card poses — the cardStack scatter/fidget formulas (I-67a/e), world-scaled
 *  (def-local ×9 in x, ×7 in z — the table's scale). idx 0 = bottom. */
export function stackPoses(rid: string, count: number, state: number, f: Frame): { x: number; y: number; z: number; rz: number }[] {
  const rnd = lcg(1069 * (state + 1) + (rid === 'deck' ? 7 : 131));
  const out: { x: number; y: number; z: number; rz: number }[] = [];
  for (let i = 0; i < count; i++) {
    const fromTop = count - 1 - i;
    let amp = 0.18, rot = 0.02, dx = 0;
    if (fromTop < 5 && state > 0) {
      if (rid === 'deck') { amp = state === 1 ? 2.2 : 3.4; rot = state === 1 ? 0.14 : 0.22; }
      else { dx = (state === 1 ? 2.6 : 5.2) * (fromTop + 1); amp = 0.4; rot = state === 1 ? 0.06 : 0.1; }
    }
    out.push({
      x: f.cxw + (dx + (rnd() - 0.5) * 2 * amp) * 9,
      z: f.czw + (rnd() - 0.5) * 2 * amp * 7,
      y: f.topY + 0.5 + CARD_T / 2 + i * (CARD_T + 0.08),
      rz: (rnd() - 0.5) * 2 * rot,
    });
  }
  return out;
}

/** the fidget tween's targets for a live world stack (Q-6 via C-1b2): pure poses. */
export function eventStackTargets(t: THREE.Object3D, rid: string, count: number, state: number): { x: number; y: number; z: number; rz: number }[] | null {
  const f = regionFrame(t, rid);
  return f ? stackPoses(rid, count, state, f) : null;
}

function stackGroup(rid: string, f: Frame): THREE.Group {
  const grp = new THREE.Group();
  grp.userData = { region: rid, role: rid, def: TOWN_TABLE_V2.id, worldStack: true, focus: 'table' }; // the count-law object · I-155: the FOCUS TAG — onPick gates on it; without it every world pile was click-dead (owner-caught)
  // the footprint GHOST: keeps the region clickable/boxed even at zero cards (I-67a's
  // ghost, carried to world space) — and the arrangement oracle's render-true rect.
  const ghost = new THREE.Mesh(
    new THREE.PlaneGeometry(f.r.w * f.sx, f.r.h * f.sz),
    new THREE.MeshBasicMaterial({ color: 0xdfe7df, transparent: true, opacity: 0.4, side: THREE.DoubleSide }),
  );
  ghost.rotation.x = -Math.PI / 2;
  ghost.position.set(f.cxw, f.topY + 0.25, f.czw);
  ghost.userData = { ghost: true };
  grp.add(ghost);
  return grp;
}

/** a SUPPLY deck (C-1b): the class's instances minus those visible elsewhere, face down. */
export function worldPoolStack(
  t: THREE.Object3D, rid: string, cls: string, count: number, excluded: ReadonlySet<string>,
  order: readonly string[] | null = null,
): THREE.Group | null {
  const f = regionFrame(t, rid);
  if (!f) return null;
  const grp = stackGroup(rid, f);
  // C-1c (I-156): with the pool's remaining ORDER (order[0] = next popped) the stack is
  // identity-true bottom→top; without it, membership-by-class (the C-1b fallback).
  const members = order
    ? order.slice(0, Math.max(0, count)).slice().reverse()
    : instancesOfClass(cls).filter((id) => !excluded.has(id)).slice(0, Math.max(0, count));
  const poses = stackPoses(rid, members.length, 0, f);
  members.forEach((id, k) => {
    const h = cardInstance(id);
    if (!h) return;
    const p = poses[k]!;
    const hadParent = h.group.parent !== null;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, p.rz));
    grp.add(h.group);
    poseOrArrive(h.group, new THREE.Vector3(p.x, p.y, p.z), q, hadParent); // PB-9b
    h.group.userData = { ...h.group.userData, card: true, idx: k };
  });
  return grp;
}

/** C-1b2 (I-154): the EVENT DECK / DISCARD as instance stacks.
 *  - `faces` (discard): exact pile ids, faces[0] = top — FACE UP, stamped.
 *  - `order` (the viewer's own deck): the remaining draw order, order[0] = next —
 *    FACE DOWN, but the top instance IS the next card (identity holds through the
 *    flick-to-flip: the object that turns over is the card that was drawn).
 *  - neither (another seat's deck): membership by class prefix, identity unrevealed
 *    (backs only — redaction honest; only the viewer can draw). */
export function worldEventStack(
  t: THREE.Object3D, rid: string, prefix: string, count: number,
  faces: readonly string[] | null, order: readonly string[] | null, state: number,
): THREE.Group | null {
  const f = regionFrame(t, rid);
  if (!f) return null;
  const grp = stackGroup(rid, f);
  let ids: string[]; // bottom → top
  if (faces) ids = [...faces].reverse().map((id) => `${prefix}${id}`);
  else if (order) ids = order.slice(0, count).reverse().map((id) => `${prefix}${id}`);
  else ids = instancesOfClass('event').filter((id) => id.startsWith(prefix)).slice(0, Math.max(0, count));
  const poses = stackPoses(rid, ids.length, state, f);
  ids.forEach((id, k) => {
    const h = cardInstance(id);
    if (!h) return;
    const p = poses[k]!;
    const hadParent = h.group.parent !== null;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(faces ? -Math.PI / 2 : Math.PI / 2, 0, p.rz));
    grp.add(h.group);
    poseOrArrive(h.group, new THREE.Vector3(p.x, p.y, p.z), q, hadParent); // PB-9b: the routed/returned card journeys to its slot
    h.group.userData = { ...h.group.userData, card: true, idx: k };
    if (faces) h.setFace([id.slice(prefix.length)]); // the pile reads true (renderedLines ≡ the card)
  });
  return grp;
}
