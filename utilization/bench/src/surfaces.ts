/**
 * SURFACES — the PURE mesh/texture builders, split VERBATIM out of game3d.ts (pure
 * refactor, no logic change). No module state. The defs are the SOLE geometry source
 * (the I-60a charter carries).
 */
import * as THREE from 'three';
import type { LayoutDef } from '@tabletop/presentation';
import { CARD_BACK_PARENT } from '@tabletop/presentation';
import { FORTUNE_CARD } from '../../../packs/boty/src/index.js';

// ── mesh builders (defs are the SOLE geometry source — the I-60a charter carries) ──
/** The panel canvas → texture; the caller STAMPS the lines it ASKED to draw (I-62b). */
export function panelTexture(lines: readonly string[], w: number, h: number, head?: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.max(64, Math.round((h / w) * 512));
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#999'; g.strokeRect(1, 1, c.width - 2, c.height - 2);
  g.fillStyle = '#333'; g.font = 'bold 22px system-ui';
  let y = 28;
  if (head) { g.fillText(head, 10, y); y += 30; }
  g.font = '20px system-ui'; g.fillStyle = '#444';
  for (const ln of lines) { g.fillText(ln, 10, y); y += 26; }
  return new THREE.CanvasTexture(c);
}

/** A multi-line panel mesh; STAMPS the lines it was ASKED to draw (I-62b). */
export function panel(lines: readonly string[], w: number, h: number, head?: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: panelTexture(lines, w, h, head), transparent: false }));
  m.userData['renderedLines'] = [...(head ? [head] : []), ...lines]; // the asked-text stamp
  return m;
}

/** A layout as a face: region quads from the def, optional per-region line fills. */
export function layoutFace(def: LayoutDef, tint: number, fills: Readonly<Record<string, readonly string[]>> = {}, skip: readonly string[] = []): THREE.Group {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ color: 0xfbfaf7 })));
  grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(100, 100)), new THREE.LineBasicMaterial({ color: 0x444444 })));
  for (const r of def.regions) {
    if (skip.includes(r.id)) continue; // a richer object (a card STACK) stands in for the quad
    const fill = fills[r.id];
    const quad = fill
      ? panel(fill, r.w, r.h)
      : new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshBasicMaterial({ color: tint }));
    quad.position.set(r.x + r.w / 2 - 50, 50 - (r.y + r.h / 2), 0.2 + (r.z ?? 0) * 0.2);
    quad.userData = { ...quad.userData, region: r.id, role: r.role, def: def.id };
    grp.add(quad);
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(r.w, r.h)), new THREE.LineBasicMaterial({ color: 0x999999 })).translateX(quad.position.x).translateY(quad.position.y).translateZ(quad.position.z + 0.01));
  }
  return grp;
}

/**
 * A3 (I-69) — the FORTUNE CARD as a front/back mesh (the spike-proven `card()` brought
 * into the playable bench): front = the child's measured anatomy via layoutFace; back =
 * CARD_BACK_PARENT flipped π about Y. The reading board presents this as the modal-as-card
 * (I-51a) — v1's drawn-card popup is a CARD CHILD at a camera focus, never a dialog.
 */
export function card(front: LayoutDef, frontFills: Readonly<Record<string, readonly string[]>> = {}): THREE.Group {
  const grp = new THREE.Group();
  const f = layoutFace(front, 0xffffff, frontFills);
  f.position.z = 0.3;
  grp.add(f);
  const b = layoutFace(CARD_BACK_PARENT, 0xe8e2d8, { emblem: ['BOTY'] });
  b.rotation.y = Math.PI; // the back faces −z (the spike/I-65c π-about-Y pattern)
  b.position.z = -0.3;
  b.traverse((o) => { o.userData['back'] = true; }); // the front/back contrast surface
  grp.add(b);
  return grp;
}

/**
 * A3 (I-69) — the flight's mid-flip reveal as a fortune FACE texture whose art band and
 * title/subtitle boxes are read FROM FORTUNE_CARD.regions (I-60a: the def is the sole
 * geometry source), so the flip reveals an art-dominant fortune card, not bare text.
 */
export function fortuneFaceTexture(title: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 358; // card-ish aspect; the 0..100 unit regions map proportionally
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbfaf7'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#444'; g.strokeRect(1, 1, c.width - 2, c.height - 2);
  const reg = (id: string) => FORTUNE_CARD.regions.find((r) => r.id === id);
  const px = (v: number) => (v / 100) * c.width;
  const py = (v: number) => (v / 100) * c.height;
  const art = reg('art');
  if (art) {
    g.fillStyle = '#e7e2d8'; g.fillRect(px(art.x), py(art.y), px(art.w), py(art.h));
    g.fillStyle = '#8a8577'; g.font = '15px system-ui'; g.fillText('[fortune art]', px(art.x) + 8, py(art.y + art.h / 2));
  }
  const t = reg('title');
  if (t) { g.fillStyle = '#1c1c1c'; g.font = 'bold 19px system-ui'; g.fillText(title, px(t.x) + 4, py(t.y) + 17); }
  const sub = reg('subtitle');
  if (sub) { g.fillStyle = '#6b6b6b'; g.font = 'italic 13px system-ui'; g.fillText('Fortune', px(sub.x) + 4, py(sub.y) + 12); }
  return new THREE.CanvasTexture(c);
}
