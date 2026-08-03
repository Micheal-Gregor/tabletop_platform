/**
 * BOX — A15: THE GAME BOX (owner-ruled 2026-08-02, I-75). An OPEN board-game box —
 * a base (a bottom slab + four LOW walls, no top) — plus a SEPARATE LID set down OFF
 * the base beside it, "lid off, as if unpacked." STATIC first (the full unboxing-as-
 * game-start animation is a recorded FUTURE upgrade — the roadmap A15 note). Positioned
 * by the caller to the RIGHT of the viewing seat's board (world +x beyond the board).
 *
 * LAW carried: DIFFUSED LIGHT ONLY — MeshBasicMaterial everywhere, no source lights, no
 * shadows (the bench already conforms). Unskinned (D-1) — placeholder tints, no assets.
 * SELECTABLE via the ladder (userData.focus='box' — a click anchors it), NOT fidgetable:
 * seat + table + box are selectable-not-fidgetable (the fidget grammar is deck/discard/
 * cards only). The box carries no region (VG8a's def-count is untouched by construction).
 */
import * as THREE from 'three';

// Box footprint — realization tuning (I-48b freedom), smaller than a seat board (2.6×100).
const BW = 170; // base width  (x)
const BD = 120; // base depth  (z)
const WALL_H = 26; // the low walls
const T = 4; // panel/wall thickness

const BASE_TINT = 0xcabfa6; // unskinned placeholder (D-1) — a kraft-board tone
const LID_TINT = 0xb9ad92;

/** A thin slab with edge lines (the card/panel idiom) — diffused MeshBasic, no lights. */
function slab(w: number, h: number, d: number, tint: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: tint }));
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x77705f })));
  return m;
}

/**
 * The open game box + its detached lid. Returns a group the caller places in the world;
 * userData.box marks it for the gate (box-present) and the raycast (selectable anchor),
 * userData.focus='box' names the ladder anchor. The base group carries userData.boxBase,
 * the lid group userData.lid — the two are distinct objects, the lid sitting OFF the base.
 */
export function buildBox(): THREE.Group {
  const grp = new THREE.Group();

  // THE BASE — an OPEN box: a bottom slab + four low walls, NO top (unpacked, contents
  // implied by the recorded future upgrade). Bottom face rests at the group's y=0.
  const base = new THREE.Group();
  const bottom = slab(BW, T, BD, BASE_TINT);
  bottom.position.y = T / 2;
  base.add(bottom);
  const wallEast = slab(T, WALL_H, BD, BASE_TINT); wallEast.position.set(BW / 2 - T / 2, WALL_H / 2, 0); base.add(wallEast);
  const wallWest = slab(T, WALL_H, BD, BASE_TINT); wallWest.position.set(-BW / 2 + T / 2, WALL_H / 2, 0); base.add(wallWest);
  const wallSouth = slab(BW, WALL_H, T, BASE_TINT); wallSouth.position.set(0, WALL_H / 2, BD / 2 - T / 2); base.add(wallSouth);
  const wallNorth = slab(BW, WALL_H, T, BASE_TINT); wallNorth.position.set(0, WALL_H / 2, -BD / 2 + T / 2); base.add(wallNorth);
  base.userData['boxBase'] = true;
  grp.add(base);

  // THE LID — a SEPARATE shallow tray (a top slab + a thin rim so it reads as a lid, not
  // a card), set down OFF the base to its right with a gap and a slight lean ("lid off").
  const lid = new THREE.Group();
  const lidTop = slab(BW + 8, T, BD + 8, LID_TINT);
  lidTop.position.y = T / 2;
  lid.add(lidTop);
  const rim = slab(BW + 8, 8, T, LID_TINT);
  rim.position.set(0, 8 / 2 + T, (BD + 8) / 2 - T / 2);
  lid.add(rim);
  lid.userData['lid'] = true;
  // OFF the base: beside it in +x with a clear gap (the base ends at +BW/2; the lid, half
  // (BW+8)/2 wide, starts past a 30-unit gap), leaning back a touch — visibly unpacked.
  lid.position.set(BW / 2 + 30 + (BW + 8) / 2, 6, 0);
  lid.rotation.z = -0.28; // the lean
  grp.add(lid);

  grp.userData['box'] = true; // the gate's box-present surface + the raycast selection tag
  grp.userData['focus'] = 'box'; // the ladder anchor key (selectable-not-fidgetable)
  return grp;
}
