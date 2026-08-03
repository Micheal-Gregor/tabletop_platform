/**
 * BOX — A15: THE GAME BOX (owner-ruled 2026-08-03, I-80; SUPERSEDES the batch-1 box, I-75).
 * An OPEN board-game box — a base (a bottom slab + four walls, NO top) — plus a SEPARATE
 * LID set OFF the base beside it: the lid is a SHALLOW OPEN FRAME (four short rim walls
 * forming a lip on all four edges, NO bottom face), "lifted off, leaning beside it." STATIC
 * (the full unboxing-as-game-start animation is a recorded FUTURE upgrade — the A15 note).
 *
 * The caller (components/box.ts) DERIVES the base footprint (≥¼ the table) and the world
 * placement (to the RIGHT of the table, left edge clear of the table's right edge) from the
 * LIVE table bbox and passes the footprint in — nothing here is a magic size/place constant.
 *
 * LAW carried: DIFFUSED LIGHT ONLY — MeshBasicMaterial everywhere, no source lights, no
 * shadows (the bench already conforms). Unskinned (D-1) — placeholder tints, no assets.
 * SELECTABLE via the ladder (userData.focus='box' — a click anchors it), NOT fidgetable.
 */
import * as THREE from 'three';

export interface BoxDims {
  readonly bw: number; // base width  (world x)
  readonly bd: number; // base depth  (world z)
}

const WALL_H = 60; // the base walls — deep enough that components store away inside
const LID_H = 22; // the shallow lid rim (a lip, not a deep wall)
const T = 6; // panel / wall thickness

const BASE_TINT = 0xcabfa6; // unskinned placeholder (D-1) — a kraft-board tone
const LID_TINT = 0xb9ad92;

/** A slab with edge lines (the panel idiom) — diffused MeshBasic, no lights. */
function slab(w: number, h: number, d: number, tint: number, part: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: tint }));
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x77705f })));
  m.userData['boxPart'] = part;
  return m;
}

/** THE BASE — an OPEN box: a bottom slab + four walls, NO top. Bottom rests at group y=0. */
function openBase(bw: number, bd: number): THREE.Group {
  const base = new THREE.Group();
  const bottom = slab(bw, T, bd, BASE_TINT, 'base-bottom'); // the single horizontal panel
  bottom.position.y = T / 2;
  base.add(bottom);
  const wE = slab(T, WALL_H, bd, BASE_TINT, 'base-wall'); wE.position.set(bw / 2 - T / 2, WALL_H / 2, 0); base.add(wE);
  const wW = slab(T, WALL_H, bd, BASE_TINT, 'base-wall'); wW.position.set(-bw / 2 + T / 2, WALL_H / 2, 0); base.add(wW);
  const wS = slab(bw, WALL_H, T, BASE_TINT, 'base-wall'); wS.position.set(0, WALL_H / 2, bd / 2 - T / 2); base.add(wS);
  const wN = slab(bw, WALL_H, T, BASE_TINT, 'base-wall'); wN.position.set(0, WALL_H / 2, -bd / 2 + T / 2); base.add(wN);
  base.userData['boxBase'] = true;
  return base;
}

/** THE LID — a SHALLOW OPEN FRAME: four short rim walls (a lip on all four edges), NO bottom
 *  and NO top face. Bottomless by construction — the gate asserts zero horizontal panels. */
function openLid(lw: number, ld: number): THREE.Group {
  const lid = new THREE.Group();
  const rE = slab(T, LID_H, ld, LID_TINT, 'lid-rim'); rE.position.set(lw / 2 - T / 2, LID_H / 2, 0); lid.add(rE);
  const rW = slab(T, LID_H, ld, LID_TINT, 'lid-rim'); rW.position.set(-lw / 2 + T / 2, LID_H / 2, 0); lid.add(rW);
  const rS = slab(lw, LID_H, T, LID_TINT, 'lid-rim'); rS.position.set(0, LID_H / 2, ld / 2 - T / 2); lid.add(rS);
  const rN = slab(lw, LID_H, T, LID_TINT, 'lid-rim'); rN.position.set(0, LID_H / 2, -ld / 2 + T / 2); lid.add(rN);
  lid.userData['lid'] = true;
  return lid;
}

/**
 * The open game box + its detached bottomless lid. Returns a group the caller places in the
 * world; userData.box marks it for the gate (box-present) + the raycast (selectable anchor),
 * userData.focus='box' names the ladder anchor. The base group carries userData.boxBase, the
 * lid group userData.lid — two DISTINCT objects, the lid sitting OFF the base (lifted off).
 */
export function buildBox(dims: BoxDims): THREE.Group {
  const { bw, bd } = dims;
  const grp = new THREE.Group();

  const base = openBase(bw, bd);
  grp.add(base);

  // the lid: a bottomless rim slightly larger than the base (a lid fits OVER it), set OFF
  // the base to its right with a CLEAR gap (beyond the base half-footprint), leaning back.
  const lw = bw + 14, ld = bd + 14;
  const lid = openLid(lw, ld);
  const gap = Math.max(60, bw * 0.35);
  lid.position.set(bw / 2 + gap + lw / 2, LID_H, 0); // OFF the base — clear of its half-footprint
  lid.rotation.z = -0.32; // the lean — leaning beside the base, as if just lifted off
  grp.add(lid);

  grp.userData['box'] = true; // the gate's box-present surface + the raycast selection tag
  grp.userData['focus'] = 'box'; // the ladder anchor key (selectable-not-fidgetable)
  return grp;
}
