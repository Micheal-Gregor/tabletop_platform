/**
 * SEATS component (K-A adapter, I-77) — the two-sided SHOP boards (I-65). Wraps the
 * EXISTING pure builders (surfaces.layoutFace/panel) UNCHANGED; builds one board per
 * seat, registers each under its own `seat-i` ladder anchor via ctx.register (so the
 * per-board registration is byte-identical to today's SEATS.forEach loop), and returns
 * null (self-registered). Placement: bound{surface:'table',region:'seat'} (K-A metadata).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { layoutFace, panel } from '../surfaces.js';
import { SHOP_BOARD, BOTY_PACK6 } from '../../../../packs/boty/src/index.js';

const SEATS = BOTY_PACK6.seats.map((s) => s.id);

let cx: PlayAreaContext | null = null;

export const seats: Component = {
  id: 'seats',
  placement: { kind: 'bound', surface: 'table', region: 'seat' },

  build(ctx) {
    cx = ctx;
    const v = ctx.projection();
    const active = v.seats[v.turn.seatIdx]!.id;
    // shop boards standing at the edges — click-to-focus targets. TWO-SIDED (I-65):
    // seats 0-2 near row (+z, the certified A1 placement), seats 3+ far row (−z),
    // each board rotated to face ITS OWN player beyond its table edge.
    SEATS.forEach((s, i) => {
      const seat = v.seats.find((x) => x.id === s)!;
      const b = layoutFace(SHOP_BOARD, 0xffffff, {
        identity: [`${s}${s === active ? ' ★' : ''} · [trade]`],
        counters: [`$${seat.cash} · ♥${seat.favor}`],
      });
      b.scale.set(2.6, 2.6, 1);
      const far = i >= 3;
      b.position.set(((i % 3) - 1) * 420, 130, far ? -420 : 420);
      if (far) {
        // the near-board pose flipped π about world Y: face −z, tilt back toward the far player
        b.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.25)));
      } else {
        b.rotation.x = -0.25;
      }
      // the BACK of a seat screen shows ONLY the shop graphic (I-65c) — which shop, no data
      const back = panel(['[shop art]'], 100, 100, s);
      back.rotation.y = Math.PI;
      back.position.z = -0.2;
      back.userData['back'] = s; // never a region — the redaction-consistent shop face
      b.add(back);
      b.userData['seatIdx'] = i;
      ctx.register(b, { anchorKey: `seat-${i}` });
    });
    return null;
  },

  // Phase 2: a board hit → its seat preset (I-65b). seatIdx wins over the accumulated region.
  onPick(ctx, hit: PickInfo) {
    const idx = hit.tags['seatIdx'];
    if (typeof idx === 'number') { ctx.theater.glideTo(`seat-${idx}`); return true; }
    return false;
  },

  gate() {
    const ctx = cx!;
    return {
      seatGroupKeys: () => SEATS.map((_, i) => `seat-${i}`).sort(),
      /** I-65c's contrast surface: seat board i's front data stamp vs its back stamp */
      boardStamps: (i: number) => {
        const grp = ctx.theater.focusObject(`seat-${i}`);
        if (!grp) return null;
        let front: readonly string[] | null = null;
        let back: readonly string[] | null = null;
        grp.traverse((o: THREE.Object3D) => {
          if (o.userData?.['region'] === 'counters' && o.userData?.['renderedLines']) front = o.userData['renderedLines'] as string[];
          if (o.userData?.['back'] && o.userData?.['renderedLines']) back = o.userData['renderedLines'] as string[];
        });
        return { front, back };
      },
      /** K7-A1c D2: the back face must FACE BACKWARD — world-normal dot vs the board front */
      backFacingDot: (i: number) => {
        const grp = ctx.theater.focusObject(`seat-${i}`);
        if (!grp) return null;
        let backMesh: THREE.Object3D | null = null;
        grp.traverse((o: THREE.Object3D) => { if (o.userData?.['back']) backMesh = o; });
        if (!backMesh) return null;
        grp.updateMatrixWorld(true);
        const fq = new THREE.Quaternion();
        grp.getWorldQuaternion(fq);
        const bq = new THREE.Quaternion();
        (backMesh as THREE.Object3D).getWorldQuaternion(bq);
        const fn = new THREE.Vector3(0, 0, 1).applyQuaternion(fq);
        const bn = new THREE.Vector3(0, 0, 1).applyQuaternion(bq);
        return fn.dot(bn);
      },
      /** VG8e's input-drive helper: a board's center projected to canvas pixel coords. */
      boardScreenXY: (i: number) => {
        let hit: THREE.Object3D | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['seatIdx'] === i) hit = o; });
        if (!hit) return null;
        const v = new THREE.Vector3();
        (hit as THREE.Object3D).getWorldPosition(v);
        v.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
    };
  },
};
