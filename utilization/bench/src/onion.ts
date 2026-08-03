/**
 * ONION — the READING BOARD (I-67b): a camera-parented overlay presenting the drawn
 * card as the FORTUNE ANATOMY (A3/I-69), rendered OPAQUE over the transparent veil
 * (A3b/I-70). Split VERBATIM out of game3d.ts (pure refactor). Owns the onion state
 * and the two __GAME3D__ accessors (onionState/onionRegions); the draw theater in
 * game3d.ts drives it via openOnion/closeOnion/setOnionVerdict.
 */
import * as THREE from 'three';
import { camera } from './stage.js';
import { card } from './surfaces.js';
import { FORTUNE_CARD, BOTY_PACK6 } from '../../../packs/boty/src/index.js';

// ── THE READING BOARD (I-67b): a camera-parented onion — dark translucent surround,
// the card centered; ANY click closes it; the ladder runs unchanged beneath it ──
let onion: THREE.Group | null = null;
let onionCard: THREE.Object3D | null = null;
let onionVerdict: { mismatch: boolean; displayed: string; seeded: string } | null = null;
// A3 (I-69): the reading board presents the drawn card as the FORTUNE ANATOMY (a
// front/back `card()` of FORTUNE_CARD), not a plain text panel — v1's modal-as-card
// (I-51a). `cardId` is the truth-wins result (the SEEDED id even under a forced
// mismatch, R-20); `mismatch` rides the stamp so the gate reads the verdict.
export function openOnion(cardId: string, mismatch: boolean): void {
  closeOnion();
  onion = new THREE.Group();
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(420, 260), new THREE.MeshBasicMaterial({ color: 0x14181c, transparent: true, opacity: 0.55, depthTest: false }));
  veil.renderOrder = 90;
  veil.userData['veil'] = true; // A3b (I-70): the gate reads its renderOrder to prove the card sorts ABOVE it
  onion.add(veil);
  const flavor = BOTY_PACK6.cards[cardId]?.flavor ?? '';
  // fills follow the certified SVG bench's fortune modal (game.ts, I-51a): title + 'Fortune'
  // subtitle MIRROR it; `text` renders the card's OWN flavor line — richer than game.ts's
  // constant, NOT a mirror of it (I-69(b)/I-58 strike 11; comment aligned per K7-A3b D2);
  // art + payout stay honest placeholders (D-1 — the slice carries no art asset or payout).
  const grp = card(FORTUNE_CARD, {
    title: [cardId],
    subtitle: ['Fortune'],
    text: flavor ? [flavor] : ['the card takes effect through the engine'],
  });
  grp.scale.set(0.72, 1, 1).multiplyScalar(0.86); // card aspect (I-48b); regions stay proportional
  grp.position.z = 2;
  // OPAQUE OVER THE VEIL (owner playtest): the veil is transparent (55%), and three.js
  // renders the ENTIRE opaque pass BEFORE the transparent pass — so an opaque card draws
  // FIRST and the veil then paints 55% dark over it ("the card looks transparent"). Put
  // the card in the TRANSPARENT pass at FULL opacity with a renderOrder ABOVE the veil
  // (90): it sorts AFTER the veil and fully covers it. depthTest off keeps the whole onion
  // above the 3D scene; depthWrite off + the reverse-painter z-sort keeps the card's own
  // regions layered (base behind, fills in front).
  grp.traverse((o) => {
    const mat = (o as THREE.Mesh).material as (THREE.MeshBasicMaterial | THREE.LineBasicMaterial) | undefined;
    if (mat && 'opacity' in mat) { mat.transparent = true; mat.opacity = 1; mat.depthTest = false; mat.depthWrite = false; o.renderOrder = 92; }
  });
  // the onionState stamp (I-67 contract): renderedLines[0] MUST be the shown card id so
  // the HK-11 gate reads the truth-wins result; the mismatch flag rides after it.
  grp.userData['renderedLines'] = [cardId, 'Fortune', ...(mismatch ? ['⚑ mismatch — truth shown'] : [])];
  onionCard = grp;
  onion.add(grp);
  onion.position.z = -130;
  camera.add(onion);
}
export function closeOnion(): void {
  if (onion) { camera.remove(onion); onion = null; onionCard = null; onionVerdict = null; } // verdict dies with the board (K7-A2 D5)
}
/** The draw theater sets the verdict just before opening the board (I-67c). */
export function setOnionVerdict(v: { mismatch: boolean; displayed: string; seeded: string } | null): void { onionVerdict = v; }

export const onionState = () => ({
  open: onion !== null,
  title: onionCard ? (onionCard.userData['renderedLines'] as string[])[0] ?? null : null,
  verdict: onionVerdict,
});
/** A3/I-69: the reading-board fortune card's RENDERED anatomy — per-region rendered
 *  height (art-dominance is a rendered property, I-57a, not a def claim), the front/back
 *  presence (the spike-proven `card()`), and the title/subtitle/text fills (mirroring the
 *  certified SVG bench). Null when the board is closed. */
export const onionRegions = () => {
  if (!onion || !onionCard) return null;
  const regions: Record<string, { h: number; lines: readonly string[] | null }> = {};
  let hasBack = false;
  // A3b (I-70): the reading card must render OPAQUE OVER the transparent veil. Read the
  // paint state so the gate PROVES it (not a pixel hash — material/order state, I-57c): every
  // card face fully opaque (opacity 1) AND in the transparent pass (transparent:true) AND
  // sorted ABOVE the veil (renderOrder) — the three conditions that make it cover the veil.
  let minOpacity = 1, allTransparentPass = true, minCardOrder = Infinity;
  onionCard.traverse((o: THREE.Object3D) => {
    const mat = (o as THREE.Mesh).material as (THREE.Material & { opacity: number; transparent: boolean }) | undefined;
    if (mat && 'opacity' in mat) {
      minOpacity = Math.min(minOpacity, mat.opacity);
      if (!mat.transparent) allTransparentPass = false;
      minCardOrder = Math.min(minCardOrder, o.renderOrder);
    }
    if (o.userData?.['back']) { hasBack = true; return; } // back sub-tree — not a front region
    const rid = o.userData?.['region'];
    if (typeof rid === 'string') {
      const b = new THREE.Box3().setFromObject(o);
      regions[rid] = { h: b.max.y - b.min.y, lines: (o.userData['renderedLines'] as string[]) ?? null };
    }
  });
  let veilOrder = -Infinity;
  onion.traverse((o: THREE.Object3D) => { if (o.userData?.['veil']) veilOrder = o.renderOrder; });
  const fb = new THREE.Box3().setFromObject(onionCard);
  return {
    ids: Object.keys(regions).sort(), regions, hasBack, cardH: fb.max.y - fb.min.y,
    opaque: minOpacity === 1 && allTransparentPass, minOpacity, transparentPass: allTransparentPass, overVeil: minCardOrder > veilOrder, cardOrder: minCardOrder, veilOrder,
  };
};
