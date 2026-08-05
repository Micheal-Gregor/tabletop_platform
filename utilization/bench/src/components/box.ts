/**
 * BOX component (K-A adapter, I-77) — A15 (I-80, SUPERSEDES the batch-1 box I-75): THE GAME
 * BOX. Wraps the pure box.ts (buildBox) UNCHANGED, delegating. STATIC, OPEN (base + four
 * walls, no top), with a SEPARATE bottomless lipped LID set OFF the base; to the RIGHT of
 * the whole TABLE (its left edge clear of the table's right edge); SELECTABLE via the ladder
 * (a click anchors it), NOT fidgetable. Placement: pile{beside:'table',side:'right'}.
 *
 * The SIZE (≥¼ the table footprint — the table "folds in four") and the PLACEMENT (right of
 * the table) are DERIVED from the LIVE table group's world bbox (the SAME object buildScene
 * places), NOT magic constants — the batch-1 too-small / mis-placed fix. ctx-pure binding:
 * this adapter imports only THREE + the component types + ../box.js.
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { propSlot } from '../playarea.js'; // PA-2/F-5 (I-142/I-148): footprint-aware
import { RING_N, SEATS } from '../stage.js';
const SEATS_N = SEATS.length; // the box's slot index (the first prop slot)
import { buildBox } from '../box.js';

let cx: PlayAreaContext | null = null;

/** The table's world footprint, DERIVED from the live table group (COMPONENTS order builds
 *  the table before the box, so focusObject('table') resolves). Returns EDGES + area, not a
 *  centre — the batch-1 miss was a centre-vs-centre compare. */
function tableBounds(ctx: PlayAreaContext): { rightX: number; centerZ: number; area: number } {
  const t = ctx.theater.focusObject('table');
  if (t) {
    t.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(t);
    const s = b.getSize(new THREE.Vector3());
    return { rightX: b.max.x, centerZ: (b.min.z + b.max.z) / 2, area: s.x * s.z };
  }
  // defensive fallback (the table always builds first): its face is a 100×100 LayoutDef
  // plane under scale(9,7) → 900×700, right edge +450, centred at z=0.
  return { rightX: 450, centerZ: 0, area: 900 * 700 };
}

export const box: Component = {
  id: 'box',
  anchorKey: 'box',
  placement: { kind: 'pile', beside: 'table', side: 'right' },

  build(ctx) {
    cx = ctx;
    const tb = tableBounds(ctx);
    // SIZE — target ~0.30× the table footprint (a margin over the ¼ minimum); the box runs
    // slightly landscape (bw = 1.25·bd). DERIVED from the real table area.
    const bd = Math.sqrt((tb.area * 0.3) / 1.25);
    const bw = 1.25 * bd;
    const b = buildBox({ bw, bd });
    // PA-2 (I-142, owner-ruled — superseding the beside-the-table placement): the box
    // is a RING OCCUPANT — slot 6 (past seat-5), tangent like a board, yawed to its
    // angle. The template's radius already clears the table; no gap constant survives.
    const slot = propSlot(SEATS_N, RING_N, 320); // F-5 (I-148): pushed out by its footprint — clear of seat-0's station
    b.position.set(slot.x, 0, slot.z);
    b.rotation.y = slot.yaw;
    return b;
  },

  // Phase 2: the game box is SELECTABLE via the ladder — a click ANCHORS it (the ladder then
  // reads it), and does NOTHING else: no fidget, no verb, no state change (I-75/I-80).
  onPick(ctx, hit: PickInfo) {
    if (hit.tags['box']) { ctx.theater.setLastFocus('box'); ctx.status('anchored: the game box — zoom in to read it (A15)'); return true; }
    return false;
  },

  gate() {
    const ctx = cx!;
    const box3 = (o: THREE.Object3D) => { o.updateWorldMatrix(true, true); return new THREE.Box3().setFromObject(o); };
    // classify a subtree's BoxGeometry meshes by their thinnest axis: thin-in-Y = a
    // horizontal FACE (bottom/top); thin-in-X or -Z = a WALL. Geometry-based (local params),
    // so a lid lean never reclassifies a rim wall.
    const classify = (root: THREE.Object3D): { walls: number; hpanels: number } => {
      let walls = 0, hpanels = 0;
      root.traverse((o: THREE.Object3D) => {
        if (!(o as unknown as { isMesh?: boolean }).isMesh) return;
        const g = (o as THREE.Mesh).geometry as unknown as { type?: string; parameters?: { width: number; height: number; depth: number } };
        if (!g || g.type !== 'BoxGeometry' || !g.parameters) return;
        const p = g.parameters;
        const minA = Math.min(p.width, p.height, p.depth);
        if (minA === p.height) hpanels++; else walls++;
      });
      return { walls, hpanels };
    };
    return {
      /** A15 (I-80): the game box's scene STATE for VG8o — presence; the base/lid distinct
       *  objects; the lid OFF the base; open-base (walls + a single bottom face, no top) +
       *  bottomless-lid (rim walls, no face) classification; and the box's LEFT edge vs the
       *  LIVE TABLE's RIGHT edge + the two footprint areas (EDGES/areas from real bboxes,
       *  never centres — the batch-1 miss). Never pixels (I-57c). */
      boxProbe: () => {
        let boxGrp: THREE.Object3D | null = null, baseObj: THREE.Object3D | null = null, lidObj: THREE.Object3D | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => {
          if (o.userData?.['box']) boxGrp = o;
          if (o.userData?.['boxBase']) baseObj = o;
          if (o.userData?.['lid']) lidObj = o;
        });
        if (!boxGrp) return { present: false };
        const baseB = baseObj ? box3(baseObj) : null;
        const lidB = lidObj ? box3(lidObj) : null;
        const baseC = baseB ? baseB.getCenter(new THREE.Vector3()) : null;
        const baseS = baseB ? baseB.getSize(new THREE.Vector3()) : null;
        const lidC = lidB ? lidB.getCenter(new THREE.Vector3()) : null;
        const tObj = ctx.theater.focusObject('table');
        const tB = tObj ? box3(tObj) : null;
        const tS = tB ? tB.getSize(new THREE.Vector3()) : null;
        let offBase = false;
        if (baseC && baseS && lidC) {
          const dxz = Math.hypot(lidC.x - baseC.x, lidC.z - baseC.z);
          offBase = dxz > Math.max(baseS.x, baseS.z) / 2; // beyond the base half-footprint = not on it
        }
        const baseCls = baseObj ? classify(baseObj) : { walls: 0, hpanels: 0 };
        const lidCls = lidObj ? classify(lidObj) : { walls: 0, hpanels: 0 };
        return {
          present: true,
          hasBase: baseObj !== null,
          hasLid: lidObj !== null,
          distinct: baseObj !== null && lidObj !== null && baseObj !== lidObj,
          offBase,
          boxLeftX: baseB ? baseB.min.x : box3(boxGrp).min.x, // the box BASE's left edge
          boxCenter: (() => { const bb = box3(boxGrp); return { x: (bb.min.x + bb.max.x) / 2, z: (bb.min.z + bb.max.z) / 2 }; })(), // PA-2: the ring-slot oracle
          boxRightX: baseB ? baseB.max.x : null,
          tableFound: tB !== null,
          tableRightX: tB ? tB.max.x : null,
          tableLeftX: tB ? tB.min.x : null,
          boxArea: baseS ? baseS.x * baseS.z : null, // footprint x·z from the real bbox
          tableArea: tS ? tS.x * tS.z : null,
          baseWalls: baseCls.walls,
          baseHPanels: baseCls.hpanels, // want 1 (bottom) — >1 means a top was added
          lidRimWalls: lidCls.walls, // want ≥4 (the four-edge lip)
          lidHPanels: lidCls.hpanels, // want 0 (bottomless)
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
