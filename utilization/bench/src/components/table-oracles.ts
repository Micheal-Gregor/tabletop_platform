/**
 * TABLE-ORACLES (S-1, I-103 — the size-gate extraction, the table-draw.ts precedent):
 * the table component's PURE __GAME3D__ oracle functions, moved verbatim out of
 * table.ts's gate() when S-1's additions pushed it past the 300-line law. STATE and
 * geometry only, never pixels (I-57c); no module state — every function takes what it
 * reads as arguments. table.ts remains the sole owner of build/fidget/dispatch.
 */
import * as THREE from 'three';
import type { PlayAreaContext } from '../component.js';

/** T-1 (I-89), REWORKED at G-1 (I-101, closing K7-Q M2): the arrangement oracle reads
 *  the RENDER — it walks the live table group and inverts the placement formula (quad
 *  center + geometry → def units). The def is never consulted, so a face-revert mutant
 *  (layoutFace(TOWN_TABLE,…)) reports v1's numbers and FAILS. */
export function renderedRegionRects(tableRoot: THREE.Group | null): { id: string; x: number; y: number; w: number; h: number }[] | null {
  if (!tableRoot) return null;
  const out: { id: string; x: number; y: number; w: number; h: number }[] = [];
  for (const ch of tableRoot.children) {
    const rid = ch.userData?.['region'] as string | undefined;
    if (!rid) continue;
    // a stack GROUP's footprint is its ghost (child 0, PlaneGeometry(r.w, r.h));
    // a region QUAD carries its own PlaneGeometry(r.w, r.h).
    const mesh = (ch as THREE.Group).isGroup ? (ch.children[0] as THREE.Mesh) : (ch as THREE.Mesh);
    const geo = mesh?.geometry as THREE.PlaneGeometry | undefined;
    const pw = geo?.parameters?.width, ph = geo?.parameters?.height;
    if (typeof pw !== 'number' || typeof ph !== 'number') continue;
    out.push({ id: rid, x: ch.position.x - pw / 2 + 50, y: 50 - ch.position.y - ph / 2, w: pw, h: ph });
  }
  return out;
}

/** G-1 (I-101, closing K7-Q M1): the partition law's RENDER side — live mesh counts per
 *  family. Exactly-once = rendered ≡ derived, per family, asserted in VG8j. */
export function renderedPartitionCounts(ctx: PlayAreaContext): { pile: number; global: number; session: number } {
  const grp = ctx.theater.focusObject('table:discard');
  let pile = 0;
  if (grp) grp.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) pile++; });
  let global = 0, session = 0;
  ctx.scene.traverse((o: THREE.Object3D) => {
    if (o.userData?.['family'] === 'global') global++;
    else if (o.userData?.['family'] === 'session') session++;
  });
  return { pile, global, session };
}

/** S-1 (I-103): the abort law's orphan oracle — at draw-idle, ZERO grab meshes may
 *  survive in the scene (a dropped abort leaves one and fails by name). */
export function orphanGrabMeshCount(ctx: PlayAreaContext): number {
  let n = 0;
  ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['drawGrabMesh']) n++; });
  return n;
}

/** the count-true stack oracle (I-67a): rendered cards, top-5 world poses, top face. */
export function stackInfoOf(ctx: PlayAreaContext, rid: string, fidgetState: number) {
  const grp = ctx.theater.focusObject(`table:${rid}`);
  if (!grp) return null;
  const cards: THREE.Object3D[] = [];
  grp.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) cards.push(o); });
  cards.sort((a, b) => (a.userData['idx'] as number) - (b.userData['idx'] as number));
  return {
    count: cards.length,
    fidget: fidgetState,
    topFace: cards.length ? ((cards[cards.length - 1]!.userData['renderedLines'] as string[] | undefined)?.[0] ?? null) : null,
    top: cards.slice(-5).map((o) => { const w = new THREE.Vector3(); o.getWorldPosition(w); return { x: w.x, y: w.y, z: w.z }; }),
  };
}

/** VG8i's input-drive helper: a table region's center projected to canvas pixels. */
export function regionScreenXYOf(ctx: PlayAreaContext, rid: string): { x: number; y: number } | null {
  const o = ctx.theater.focusObject(`table:${rid}`);
  if (!o) return null;
  const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  ctx.camera.updateMatrixWorld();
  const v = c.project(ctx.camera);
  const r = ctx.renderer.domElement.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
}

/** I-112: a stack's TOP card uuid — the three-objects identity oracle (the P-2c
 *  precedent: a faked traveler cannot share the real card's uuid). */
export function stackTopUuidOf(ctx: PlayAreaContext, rid: string): string | null {
  const grp = ctx.theater.focusObject(`table:${rid}`);
  if (!grp) return null;
  const cards: THREE.Object3D[] = [];
  grp.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) cards.push(o); });
  cards.sort((a, b) => (a.userData['idx'] as number) - (b.userData['idx'] as number));
  return cards.length ? cards[cards.length - 1]!.uuid : null;
}
