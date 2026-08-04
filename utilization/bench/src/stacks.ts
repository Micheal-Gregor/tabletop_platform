/**
 * STACKS — COUNT-TRUE card stacks (I-67a), the shared card-back texture, and the pure
 * fidget LCG. Split VERBATIM out of game3d.ts (pure refactor). The ONE deliberate
 * signature change of the whole split lives here: cardStack takes the fidget value as a
 * trailing `fidgetState` parameter instead of reading the module-global `fidget[rid]`;
 * the caller (buildScene) passes `fidget[rid]`.
 */
import * as THREE from 'three';
import { panelTexture } from './surfaces.js';
import { TOWN_TABLE_V2 } from '../../../packs/boty/src/index.js'; // T-1 (I-89): the v2 table child

// ── COUNT-TRUE CARD STACKS (I-67a): one real mesh per card; shared back texture ──
let cardBackTex: THREE.CanvasTexture | null = null;
export function cardBack(): THREE.CanvasTexture {
  if (cardBackTex) return cardBackTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#efe9dd'; g.fillRect(0, 0, 256, 384);
  g.strokeStyle = '#8a7f6a'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 368);
  g.strokeStyle = '#ccc3b0'; g.lineWidth = 2;
  for (let i = -384; i < 640; i += 26) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 384, 384); g.stroke();
    g.beginPath(); g.moveTo(i + 384, 0); g.lineTo(i, 384); g.stroke();
  }
  cardBackTex = new THREE.CanvasTexture(c);
  return cardBackTex;
}

// ── FIDGET (I-67e): PURE THEATER — seeded offsets, meshes only, never state ──
export function lcg(seed: number): () => number {
  let t = seed >>> 0;
  return () => { t = (Math.imul(t, 1664525) + 1013904223) >>> 0; return t / 4294967296; };
}

/** A count-true stack at a table region. faces[0] = top of the pile (face-up); null faces = card backs. */
export function cardStack(r: { x: number; y: number; w: number; h: number }, rid: string, count: number, faces: readonly string[] | null, fidgetState: number | undefined): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(r.x + r.w / 2 - 50, 50 - (r.y + r.h / 2), 0.2);
  grp.userData = { region: rid, role: rid, def: TOWN_TABLE_V2.id };
  // the footprint ghost: keeps the region clickable and boxed even at zero cards
  const ghost = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshBasicMaterial({ color: 0xdfe7df, transparent: true, opacity: 0.5 }));
  grp.add(ghost);
  const state = fidgetState ?? 0;
  const rnd = lcg(1069 * (state + 1) + (rid === 'deck' ? 7 : 131));
  // A2b (the owner's playtest report "the decks not visible"): a card is a THIN BOX
  // with edge lines — the pile has PHYSICAL height (CARD_T per card), not paper planes
  // that foreshorten to a sliver. Thickness is realization freedom (I-48b); the
  // footprint stays the def's region. Count-true is now also HEIGHT-true.
  const CARD_T = 0.9;
  const sideMat = new THREE.MeshBasicMaterial({ color: 0xd8cfbc });
  for (let i = 0; i < count; i++) {
    const fromTop = count - 1 - i;
    const face = faces ? faces[fromTop] ?? null : null;
    const topMat = new THREE.MeshBasicMaterial({ map: face ? panelTexture([face], 10, 16) : cardBack() });
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(10, 16, CARD_T),
      [sideMat, sideMat, sideMat, sideMat, topMat, sideMat], // +z (the table's UP) wears the face
    );
    if (face) m.userData['renderedLines'] = [face]; // the asked-text stamp (I-62b)
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x77705f })));
    // resting irregularity for every card; the FIDGET states move the TOP FIVE more
    let amp = 0.18, rot = 0.02, dx = 0;
    if (fromTop < 5 && state > 0) {
      if (rid === 'deck') { amp = state === 1 ? 2.2 : 3.4; rot = state === 1 ? 0.14 : 0.22; } // loose pile → re-scatter
      else { dx = (state === 1 ? 2.6 : 5.2) * (fromTop + 1); amp = 0.4; rot = state === 1 ? 0.06 : 0.1; } // peek → spread the last 5
    }
    m.position.set(dx + (rnd() - 0.5) * 2 * amp, (rnd() - 0.5) * 2 * amp, 0.5 + CARD_T / 2 + i * (CARD_T + 0.08));
    m.rotation.z = (rnd() - 0.5) * 2 * rot;
    m.userData = { ...m.userData, card: true, idx: i };
    grp.add(m);
  }
  return grp;
}

// ── R-1a2 (I-110) — THE STACK PROOF (owner: "prove to the player it's an actual stack
// of cards and not just the image of a stack"): a TAP nudges the TOP FIVE cards to
// slightly shifted PERSISTING poses (local ±0.5 → world ≈±4u · rot ±0.05 rad ≈ ±3°),
// tweened ~11 frames; the next rebuild re-canonicalizes. Pure theater, generic to any
// stack group. Seeded per tap (deterministic for the gate's first-tap assertion).
let nudge: { items: { m: THREE.Object3D; fx: number; tx: number; fy: number; ty: number; fr: number; tr: number }[]; t: number } | null = null;
let nudgeCount = 0;
export function nudgeStack(grp: THREE.Object3D | null): boolean {
  if (!grp || nudge) return false;
  const cards: THREE.Object3D[] = [];
  grp.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) cards.push(o); });
  cards.sort((a, b) => (a.userData['idx'] as number) - (b.userData['idx'] as number));
  const top = cards.slice(-5);
  if (!top.length) return false;
  const rnd = lcg(0x57ac + Math.imul(++nudgeCount, 40503));
  // R-1a3 (I-111, owner-ruled): every THIRD tap RE-CENTERS the top five to the neat
  // column ("so the pile doesn't get too loose") — same tween, same purity.
  const recenter = nudgeCount % 3 === 0;
  nudge = {
    t: 0,
    items: top.map((m) => recenter
      ? { m, fx: m.position.x, tx: 0, fy: m.position.y, ty: 0, fr: m.rotation.z, tr: 0 }
      : {
        m, fx: m.position.x, tx: m.position.x + (rnd() - 0.5) * 1.0,
        fy: m.position.y, ty: m.position.y + (rnd() - 0.5) * 1.0,
        fr: m.rotation.z, tr: m.rotation.z + (rnd() - 0.5) * 0.1,
      }),
  };
  return true;
}
export const stackNudging = (): boolean => nudge !== null;
export function tickStackNudge(): void {
  if (!nudge) return;
  nudge.t = Math.min(1, nudge.t + 0.09);
  const e = nudge.t * nudge.t * (3 - 2 * nudge.t);
  for (const it of nudge.items) {
    it.m.position.x = it.fx + (it.tx - it.fx) * e;
    it.m.position.y = it.fy + (it.ty - it.fy) * e;
    it.m.rotation.z = it.fr + (it.tr - it.fr) * e;
  }
  if (nudge.t >= 1) nudge = null;
}
