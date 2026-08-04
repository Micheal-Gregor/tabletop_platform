/**
 * VENTURES component (A6, I-136) — the projection's ventures as flat mini JOB cards in
 * the global-play zone (the certified SVG anatomy: job card + portion SLOT quads,
 * game.ts:135-142), the assign targets of the v4 loop. S-6: renders `v.ventures` only;
 * a slot click routes to crew-loop (selected crew → hop → `assign-crew` through the
 * doors). Non-persistent — rebuilt from the fresh projection every state change.
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { panelTexture } from '../surfaces.js';
import { TOWN_TABLE_V2 } from '../../../../packs/boty/src/index.js';
import * as loop from '../crew-loop.js';

let cx: PlayAreaContext | null = null;
let built: { id: string; status: string; portions: number }[] = [];
let root: THREE.Group | null = null;

export const ventures: Component = {
  id: 'ventures',
  placement: { kind: 'bound', surface: 'table', region: 'global-play' },

  build(ctx) {
    cx = ctx;
    built = [];
    if (root) { root.parent?.remove(root); root = null; }
    const v = ctx.projection();
    if (!v.ventures.length) return null;
    const t = ctx.theater.focusObject('table');
    if (!t) return null;
    t.updateWorldMatrix(true, true);
    const tb = new THREE.Box3().setFromObject(t);
    const sx = (tb.max.x - tb.min.x) / 100, sz = (tb.max.z - tb.min.z) / 100;
    const gp = TOWN_TABLE_V2.regions.find((r) => r.id === 'global-play')!;
    const g = new THREE.Group();
    v.ventures.forEach((vv, vi) => {
      built.push({ id: vv.id, status: vv.status, portions: vv.portions });
      // the job card — flat in the zone's RIGHT half (global cards fill from the left)
      const cardX = tb.min.x + (gp.x + gp.w * 0.55) * sx + vi * 120;
      const cardZ = tb.min.z + (gp.y + gp.h / 2) * sz;
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(92, 64),
        new THREE.MeshBasicMaterial({ map: panelTexture([`${vv.id} · ${vv.status}`, `${vv.portions} portion(s)`], 23, 16), side: THREE.DoubleSide }),
      );
      card.rotation.x = -Math.PI / 2;
      card.position.set(cardX, tb.max.y + 0.8, cardZ);
      card.userData['ventureCard'] = vv.id;
      g.add(card);
      // the PORTION SLOTS — the assign targets, in a row under the card face
      for (let pi = 0; pi < vv.portions; pi++) {
        const slot = new THREE.Mesh(
          new THREE.PlaneGeometry(20, 16),
          new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
        );
        slot.rotation.x = -Math.PI / 2;
        slot.position.set(cardX - 32 + pi * 26, tb.max.y + 1.2, cardZ + 44);
        slot.userData = { venture: vv.id, portion: pi };
        g.add(slot);
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(20, 16)), new THREE.LineBasicMaterial({ color: 0x888888 }));
        edge.rotation.x = -Math.PI / 2;
        edge.position.copy(slot.position).setY(slot.position.y + 0.1);
        g.add(edge);
      }
    });
    root = g;
    ctx.register(g);
    return null; // self-registered
  },

  // Phase 2: a slot hit with a crew selected → the hop + assign (crew-loop owns it).
  onPick(ctx, hit: PickInfo) {
    const venture = hit.tags['venture'], portion = hit.tags['portion'];
    if (typeof venture === 'string' && typeof portion === 'number') {
      const w = hit.object.getWorldPosition(new THREE.Vector3());
      return loop.slotClick(ctx, venture, portion, w, (key) => findSeatPlayMesh(ctx, key));
    }
    return false;
  },

  gate() {
    const ctx = cx!;
    return {
      /** A6 (I-136) oracle: rendered ventures ≡ the fresh projection (id/status/portions). */
      venturesInfo: () => {
        const v = ctx.projection();
        const want = v.ventures.map((x) => ({ id: x.id, status: x.status, portions: x.portions }));
        return { rendered: built, want, match: JSON.stringify(built) === JSON.stringify(want) };
      },
      venturePortionXY: (venture: string, portion: number) => {
        let hit: THREE.Object3D | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['venture'] === venture && o.userData?.['portion'] === portion) hit = o; });
        if (!hit) return null;
        const p = (hit as THREE.Object3D).getWorldPosition(new THREE.Vector3());
        ctx.camera.updateMatrixWorld();
        p.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
      },
      crewLoopState: loop.crewLoopState,
    };
  },
};

/** find a seat-play card mesh by its key (the crew-loop's mesh lookup seam). */
function findSeatPlayMesh(ctx: PlayAreaContext, key: string): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null;
  ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['seatPlayCard'] === key) hit = o; });
  return hit;
}
