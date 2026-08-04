/**
 * DRAW-ROUTE (R-1a6, I-115 — the size-gate extraction K7-R ruled OWED, not another
 * trim): the draw theater's PURE routing helpers, moved VERBATIM out of table-draw.ts.
 * THE ROUTING LAW (I-90/I-92): the destination is the DERIVED VIEW's placement of the
 * card — CARD_FAMILY (content data) partitions the projection's discard: global → the
 * table's GLOBAL CARDS IN PLAY slots · session → the active seat's session row · else
 * the discard pile. Derived-never-stored; no invented state. No module state here.
 */
import * as THREE from 'three';
import type { PlayAreaContext } from './component.js';
import { CARD_FAMILY } from '../../../packs/boty/src/index.js';

/** the DERIVED VIEW's destination for the card (I-90/I-92; derived-never-stored). */
export const routeDestFor = (cardId: string): 'global' | 'session' | 'discard' => CARD_FAMILY[cardId] ?? 'discard';

/** the card's OWN rendered mesh in the derived view — the route target + reveal handle. */
export function findCardMesh(ctx: PlayAreaContext, cardId: string, dest: 'global' | 'session' | 'discard'): { mesh: THREE.Object3D | null; pos: THREE.Vector3 } {
  if (dest === 'discard') return stackTop(ctx, 'discard');
  let found: THREE.Object3D | null = null;
  ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['slotCard'] === cardId && o.userData?.['family'] === dest) found = o; });
  if (!found) return stackTop(ctx, 'discard'); // defensive: the view didn't render it — the pile is truth
  return { mesh: found, pos: (found as THREE.Object3D).getWorldPosition(new THREE.Vector3()) };
}

/** a stack's TOP card mesh (world). */
export function stackTop(ctx: PlayAreaContext, rid: string): { mesh: THREE.Object3D | null; pos: THREE.Vector3 } {
  const grp = ctx.theater.focusObject(`table:${rid}`);
  if (!grp) return { mesh: null, pos: new THREE.Vector3() };
  const cards: THREE.Object3D[] = [];
  grp.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) cards.push(o); });
  cards.sort((a, b) => (a.userData['idx'] as number) - (b.userData['idx'] as number));
  const top = cards[cards.length - 1] ?? null;
  const pos = top ? top.getWorldPosition(new THREE.Vector3())
    : new THREE.Box3().setFromObject(grp).getCenter(new THREE.Vector3());
  return { mesh: top, pos };
}
