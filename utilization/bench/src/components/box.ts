/**
 * BOX component (K-A adapter, I-77) — A15 (I-75): THE GAME BOX. Wraps the EXISTING
 * box.ts (buildBox) UNCHANGED, delegating. STATIC, open, lid off, to the RIGHT of the
 * viewing seat's board; SELECTABLE via the ladder (a click anchors it), NOT fidgetable.
 * Placement: pile{beside:'seat-0',side:'right'} — the CURRENT position (−140/0/470) and
 * size are PRESERVED (K-A is behavior-preserving; the too-small/mis-placed fix is K-D).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { buildBox } from '../box.js';

let cx: PlayAreaContext | null = null;

export const box: Component = {
  id: 'box',
  anchorKey: 'box',
  placement: { kind: 'pile', beside: 'seat-0', side: 'right' },

  build(ctx) {
    cx = ctx;
    // A15 (I-75): to the RIGHT of the VIEWING seat's board (world +x beyond seat-0's
    // board at x=-420). The harness registers focusGroups['box'] + builtRoots.
    const b = buildBox();
    b.position.set(-140, 0, 470);
    return b;
  },

  // Phase 2: the game box is SELECTABLE via the ladder — a click ANCHORS it (the ladder
  // then reads it), and does NOTHING else: no fidget, no verb, no state change (I-75).
  onPick(ctx, hit: PickInfo) {
    if (hit.tags['box']) { ctx.theater.setLastFocus('box'); ctx.status('anchored: the game box — zoom in to read it (A15)'); return true; }
    return false;
  },

  gate() {
    const ctx = cx!;
    return {
      /** A15 (I-75): the game box's scene STATE for VG8o — presence, the base/lid distinct
       *  objects, the lid OFF the base (horizontal xz-distance beyond the base half-footprint),
       *  the box world x vs the VIEWING seat's board x (seat-0 = viewSeat). Never pixels (I-57c). */
      boxProbe: () => {
        let boxGrp: THREE.Object3D | null = null, baseObj: THREE.Object3D | null = null, lidObj: THREE.Object3D | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => {
          if (o.userData?.['box']) boxGrp = o;
          if (o.userData?.['boxBase']) baseObj = o;
          if (o.userData?.['lid']) lidObj = o;
        });
        if (!boxGrp) return { present: false };
        const ctr = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
        const size = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
        const baseC = baseObj ? ctr(baseObj) : null;
        const baseS = baseObj ? size(baseObj) : null;
        const lidC = lidObj ? ctr(lidObj) : null;
        const boardGrp = ctx.theater.focusObject('seat-0'); // seat-0 is the viewing seat (viewSeat = SEATS[0])
        const boardC = boardGrp ? ctr(boardGrp) : null;
        let offBase = false;
        if (baseC && baseS && lidC) {
          const dxz = Math.hypot(lidC.x - baseC.x, lidC.z - baseC.z);
          offBase = dxz > Math.max(baseS.x, baseS.z) / 2; // beyond the base half-footprint = not on it
        }
        return {
          present: true,
          hasBase: baseObj !== null,
          hasLid: lidObj !== null,
          distinct: baseObj !== null && lidObj !== null && baseObj !== lidObj,
          offBase,
          boxX: baseC ? baseC.x : ctr(boxGrp).x, // the box's world x (its base) — for box-right-of-board
          boardX: boardC ? boardC.x : null,
          baseCenter: baseC ? { x: baseC.x, y: baseC.y, z: baseC.z } : null,
          lidCenter: lidC ? { x: lidC.x, y: lidC.y, z: lidC.z } : null,
        };
      },
      /** VG8o's input-drive helper: the box's BASE center projected to canvas pixels (a solid
       *  mesh the raycast can hit — not the combined bbox center, which sits in the base↔lid gap). */
      boxScreenXY: () => {
        let baseObj: THREE.Object3D | null = null, boxGrp: THREE.Object3D | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['boxBase']) baseObj = o; if (o.userData?.['box']) boxGrp = o; });
        const target = baseObj ?? boxGrp;
        if (!target) return null;
        const c = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3());
        ctx.camera.updateMatrixWorld();
        const v = c.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
    };
  },
};
