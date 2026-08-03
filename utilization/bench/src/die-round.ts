/**
 * DIE-ROUND (K-B, I-78) — the ROUND-CARD SEQUENCE (I-55a), extracted VERBATIM from die.ts
 * as a small subordinate module so die.ts stays under the ≤300-line size gate (tools/
 * check-size.mjs). BEHAVIOR-IDENTICAL: no logic change; die.ts re-exports these symbols
 * so its public surface (and components/die.ts) is unaffected.
 *
 * ROUND_PREAMBLE then ROUND_CARD rendered as card() modals through a camera-parented
 * reading board — the onion.ts card-modal pattern re-applied (a distinct modal from the
 * draw onion, which cannot be edited) under the I-70 OPAQUE discipline: the card faces
 * move INTO the transparent pass at opacity 1 with renderOrder ABOVE the veil, so the card
 * covers the 55% veil instead of being darkened by it. The lead-off callout is DERIVED
 * from the projected active seat the caller passes in (the K7-v1x D2 law — theater never
 * outruns truth). A bar button opens it; a stage click advances preamble -> round-card ->
 * dismiss.
 */
import * as THREE from 'three';
import { camera } from './stage.js';
import { card } from './surfaces.js';
import { ROUND_PREAMBLE, ROUND_CARD } from '../../../packs/boty/src/index.js';

// ── THE ROUND SEQUENCE (I-55a) — ROUND_PREAMBLE then ROUND_CARD as card() modals ──
let roundGroup: THREE.Group | null = null;
let roundStage: 'preamble' | 'round-card' | null = null;
let roundCtx: { round: number; leader: string; season: string } | null = null;

/** The onion.ts card-modal pattern re-applied under the I-70 opaque discipline: a 55%
 *  veil (renderOrder 90) with the card faces in the transparent pass at opacity 1,
 *  renderOrder 92 (ABOVE the veil) so the card covers it instead of being darkened. */
function mountRoundModal(scene: THREE.Group): void {
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(420, 260), new THREE.MeshBasicMaterial({ color: 0x14181c, transparent: true, opacity: 0.55, depthTest: false }));
  veil.renderOrder = 90;
  veil.userData['veil'] = true;
  scene.add(veil);
}
function opaqueOverVeil(grp: THREE.Group): void {
  grp.traverse((o) => {
    const mat = (o as THREE.Mesh).material as (THREE.MeshBasicMaterial | THREE.LineBasicMaterial) | undefined;
    if (mat && 'opacity' in mat) { mat.transparent = true; mat.opacity = 1; mat.depthTest = false; mat.depthWrite = false; o.renderOrder = 92; }
  });
}
function roundFills(stage: 'preamble' | 'round-card', ctx: { round: number; leader: string; season: string }): { def: typeof ROUND_PREAMBLE; fills: Readonly<Record<string, readonly string[]>> } {
  // The callout DERIVES from the projected active seat (I-55a / K7-v1x D2) — passed in.
  if (stage === 'preamble') {
    return {
      def: ROUND_PREAMBLE,
      fills: {
        art: ['🎲'],
        title: ['🎲 Who goes first?'],
        callout: [`${ctx.leader} leads off Round ${ctx.round}!`],
        text: ['lead-off rotates one seat clockwise each round'],
        action: ['Next ▶ (click to continue)'],
      },
    };
  }
  return {
    def: ROUND_CARD,
    fills: {
      title: [`Round ${ctx.round} · ${ctx.season}`],
      text: ['Maple Hollow lore'],
      callout: [`${ctx.leader} leads off this round.`],
      action: ['Next ▶ (click to continue)'],
    },
  };
}
function renderRound(): void {
  if (roundGroup) { camera.remove(roundGroup); roundGroup = null; }
  if (!roundStage || !roundCtx) return;
  const grp = new THREE.Group();
  mountRoundModal(grp);
  const { def, fills } = roundFills(roundStage, roundCtx);
  const cardGrp = card(def, fills);
  cardGrp.scale.set(0.72, 1, 1).multiplyScalar(0.86);
  cardGrp.position.z = 2;
  opaqueOverVeil(cardGrp);
  grp.add(cardGrp);
  grp.userData['roundCard'] = cardGrp;
  grp.position.z = -130;
  roundGroup = grp;
  camera.add(grp);
}
/** Open the sequence at the PREAMBLE (I-55a: preamble FIRST). */
export function openRoundSequence(round: number, leader: string, season: string): void {
  roundCtx = { round, leader, season };
  roundStage = 'preamble';
  renderRound();
}
/** Advance: preamble -> round-card -> dismiss. */
export function advanceRoundModal(): void {
  if (roundStage === 'preamble') { roundStage = 'round-card'; renderRound(); }
  else dismissRoundModal();
}
export function dismissRoundModal(): void {
  if (roundGroup) { camera.remove(roundGroup); roundGroup = null; }
  roundStage = null;
  roundCtx = null;
}
/** The gate surface: is the sequence open, on which stage, and the card's opaque/veil
 *  state + its title/callout stamps (read from the rendered card, the truth). */
export const roundModalState = () => {
  if (!roundGroup || !roundStage) return { open: false, stage: null as 'preamble' | 'round-card' | null, title: null as string | null, callout: null as string | null, opaque: false, overVeil: false };
  const cardGrp = roundGroup.userData['roundCard'] as THREE.Group;
  let title: string | null = null, callout: string | null = null;
  let minOpacity = 1, allTransparentPass = true, minCardOrder = Infinity;
  cardGrp.traverse((o: THREE.Object3D) => {
    const mat = (o as THREE.Mesh).material as (THREE.Material & { opacity: number; transparent: boolean }) | undefined;
    if (mat && 'opacity' in mat) {
      minOpacity = Math.min(minOpacity, mat.opacity);
      if (!mat.transparent) allTransparentPass = false;
      minCardOrder = Math.min(minCardOrder, o.renderOrder);
    }
    if (o.userData?.['back']) return;
    if (o.userData?.['region'] === 'title' && o.userData?.['renderedLines']) title = (o.userData['renderedLines'] as string[])[0] ?? null;
    if (o.userData?.['region'] === 'callout' && o.userData?.['renderedLines']) callout = (o.userData['renderedLines'] as string[])[0] ?? null;
  });
  let veilOrder = -Infinity;
  roundGroup.traverse((o: THREE.Object3D) => { if (o.userData?.['veil']) veilOrder = o.renderOrder; });
  return { open: true, stage: roundStage, title, callout, opaque: minOpacity === 1 && allTransparentPass, overVeil: minCardOrder > veilOrder };
};
