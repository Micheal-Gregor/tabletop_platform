/**
 * CARD3D (C-1a, I-149) — THE ONE CARD OBJECT of the permanence constitution: 'there is
 * one of each type of object, created at the start of the game, each obeying physics'.
 * A physical card = a thin-box BODY (the A2b lesson — never a paper plane) + a FACE
 * plane (stamped) + a BACK plane (deck-class colored, data-less — redaction by form).
 * Every card in play is an INSTANCE of this and only this; child characteristics (skin,
 * mechanics) layer on top without changing the object.
 */
import * as THREE from 'three';
import { panelTexture } from './surfaces.js';
import { OBJECT_SCALE } from './playarea.js'; // I-150: the scale control table

export const CARD_T = OBJECT_SCALE.card.t; // I-150: derived from the control table
export type DeckClass = 'event' | 'tradesperson' | 'equipment' | 'bbb' | 'networking';

/** the deck-class BACK colors (data-less backs — which deck, never what card). */
const BACKS: Record<DeckClass, number> = {
  event: 0x9a8a6a, tradesperson: 0x5a7a8a, equipment: 0x7a6a58, bbb: 0x6a7a5a, networking: 0x7a5a6c,
};

export interface CardHandle {
  readonly group: THREE.Group;
  setFace(lines: readonly string[]): void; // re-stamp (status chips etc.) — the object persists
}

export function makeCard3D(cardId: string, cls: DeckClass, w = OBJECT_SCALE.card.w, h = OBJECT_SCALE.card.h): CardHandle {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, CARD_T), new THREE.MeshBasicMaterial({ color: 0xf7f4ec }));
  grp.add(body);
  grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, CARD_T)), new THREE.LineBasicMaterial({ color: 0x777777 })));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w - 3, h - 3),
    new THREE.MeshBasicMaterial({ map: panelTexture([cardId, cls], 10, 15), transparent: true }),
  );
  face.position.z = CARD_T / 2 + 0.15;
  face.userData['cardFace'] = true;
  grp.add(face);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w - 3, h - 3), new THREE.MeshBasicMaterial({ color: BACKS[cls] }));
  back.rotation.y = Math.PI;
  back.position.z = -(CARD_T / 2 + 0.15);
  grp.add(back);
  grp.userData = { card3d: true, cardId, deckClass: cls };
  return {
    group: grp,
    setFace(lines) {
      (face.material as THREE.MeshBasicMaterial).map = panelTexture(lines, 10, 15);
      (face.material as THREE.MeshBasicMaterial).needsUpdate = true;
      grp.userData['renderedLines'] = [...lines];
    },
  };
}
