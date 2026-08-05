/**
 * STACKS-3D (C-1b, I-149) — a supply deck as a LITERAL STACK of its Card3D instances
 * ('made each deck an actual deck of cards'): the class's instances, minus those
 * visible elsewhere, face DOWN in a world-space pile at the region's live rect. The
 * stack group carries the region tag (the count law + anchors + oracles + tap-nudge
 * generalize through focusObject's scene fallback). Instances whose location is
 * another player's hidden area are PARKED — unrendered, never destroyed (redaction by
 * absence; presence arrives with transport/F7).
 */
import * as THREE from 'three';
import type { PlayAreaContext } from './component.js';
import { cardInstance, instancesOfClass } from './card-world.js';
import { CARD_T } from './card3d.js';
import { TOWN_TABLE_V2 } from '../../../packs/boty/src/index.js';

export function worldPoolStack(
  ctx: PlayAreaContext, rid: string, cls: string, count: number, excluded: ReadonlySet<string>,
): THREE.Group | null {
  const r = TOWN_TABLE_V2.regions.find((rg) => rg.id === rid);
  const t = ctx.theater.focusObject('table');
  if (!r || !t) return null;
  t.updateWorldMatrix(true, true);
  const tb = new THREE.Box3().setFromObject(t);
  const sx = (tb.max.x - tb.min.x) / 100, sz = (tb.max.z - tb.min.z) / 100;
  const cxw = tb.min.x + (r.x + r.w / 2) * sx;
  const czw = tb.min.z + (r.y + r.h / 2) * sz;
  const grp = new THREE.Group();
  grp.userData = { region: rid, role: rid, def: TOWN_TABLE_V2.id }; // the count-law object
  const members = instancesOfClass(cls).filter((id) => !excluded.has(id)).slice(0, Math.max(0, count));
  members.forEach((id, k) => {
    const h = cardInstance(id);
    if (!h) return;
    // flat, FACE DOWN (the back up — which deck, never what card), stacked by thickness
    h.group.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    h.group.position.set(cxw, tb.max.y + CARD_T / 2 + k * CARD_T, czw);
    h.group.userData = { ...h.group.userData, card: true, idx: k };
    grp.add(h.group);
  });
  return grp;
}
