/**
 * MEDAL component (L-3, I-130) — the 3D BOTY medal standing in the freed bottom-right
 * `medal` region ("a 3-d model of the BOTY medal that I'll later skin", owner
 * 2026-08-04). UNSKINNED PLACEHOLDER by law (D-1 — the skin era is closed): the FORM is
 * real (a beveled disc on a draped two-tail ribbon, the owner's reference at
 * governance/assets/boty-medal-skin-reference.png), the surfaces are flat diffuse
 * colors (no source lights, no shadows — the standing light law). Geometry derives from
 * the LIVE medal region on the table (I-60a: LayoutDefs are the only geometry source).
 * Selectable through the ladder (the region is an anchor); not fidgetable yet.
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext } from '../component.js';
import { TOWN_TABLE_V2 } from '../../../../packs/boty/src/index.js';

let cx: PlayAreaContext | null = null;
let parts = 0;

const BRASS = 0xb08d3e, GREEN = 0x2e5744, RED = 0x8e1f2f, GOLD_TRIM = 0xc9a94e; // the reference's palette, flat

export const medal: Component = {
  id: 'medal',
  placement: { kind: 'bound', surface: 'table', region: 'medal' },

  build(ctx) {
    cx = ctx;
    parts = 0;
    const r = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'medal')!;
    const t = ctx.theater.focusObject('table');
    if (!t) return null;
    t.updateWorldMatrix(true, true);
    const tb = new THREE.Box3().setFromObject(t);
    const sx = (tb.max.x - tb.min.x) / 100, sz = (tb.max.z - tb.min.z) / 100;
    const cxw = tb.min.x + (r.x + r.w / 2) * sx;
    const czw = tb.min.z + (r.y + r.h / 2) * sz;
    const grp = new THREE.Group();
    const add = (m: THREE.Mesh): void => { grp.add(m); parts++; };
    // the RIBBON: two flat tails (red, gold-trim edges) fanning from under the disc,
    // lying nearly flat on the felt — the unboxed-medal pose of the reference.
    const tail = (ang: number): void => {
      const g = new THREE.BoxGeometry(46, 1.6, 110);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: RED }));
      m.position.set(Math.sin(ang) * 38, 3, Math.cos(ang) * 38);
      m.rotation.y = -ang;
      add(m);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(46, 1.8, 8), new THREE.MeshBasicMaterial({ color: GOLD_TRIM }));
      trim.position.set(Math.sin(ang) * 76, 3.2, Math.cos(ang) * 76);
      trim.rotation.y = -ang;
      add(trim);
    };
    tail(0.5);
    tail(-0.5);
    tail(2.6);
    tail(-2.6);
    // the BOW knot the disc sits on
    const knot = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 4, 24), new THREE.MeshBasicMaterial({ color: RED }));
    knot.position.y = 5;
    add(knot);
    // the MEDAL: brass rim disc + inset green face + a small raised brass core (the
    // relief reads as FORM, not texture — the skin carries the lettering later).
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 5, 32), new THREE.MeshBasicMaterial({ color: BRASS }));
    rim.position.y = 9;
    add(rim);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(21, 21, 5.4, 32), new THREE.MeshBasicMaterial({ color: GREEN }));
    face.position.y = 9.2;
    add(face);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 5.8, 24), new THREE.MeshBasicMaterial({ color: BRASS }));
    core.position.y = 9.4;
    add(core);
    grp.position.set(cxw, tb.max.y, czw);
    const s = Math.min((r.w * sx) / 200, (r.h * sz) / 200); // fit the region footprint
    grp.scale.set(s, s, s);
    grp.userData['medal'] = true; // never `region` — the table's footprint quad owns the count law
    ctx.register(grp);
    return null; // self-registered
  },

  gate() {
    const ctx = cx!;
    return {
      /** L-3 (I-130) oracle: the medal's presence, part count, and REGION CONTAINMENT —
       *  geometry state, never pixels (I-57c). */
      medalInfo: () => {
        let grp: THREE.Object3D | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['medal'] && !grp) grp = o; });
        if (!grp) return null;
        const b = new THREE.Box3().setFromObject(grp);
        const r = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'medal')!;
        const t = ctx.theater.focusObject('table')!;
        t.updateWorldMatrix(true, true);
        const tb = new THREE.Box3().setFromObject(t);
        const sx = (tb.max.x - tb.min.x) / 100, sz = (tb.max.z - tb.min.z) / 100;
        const rect = {
          minX: tb.min.x + r.x * sx, maxX: tb.min.x + (r.x + r.w) * sx,
          minZ: tb.min.z + r.y * sz, maxZ: tb.min.z + (r.y + r.h) * sz,
        };
        const c = b.getCenter(new THREE.Vector3());
        return {
          parts,
          center: { x: c.x, z: c.z },
          onTable: b.min.y >= tb.max.y - 1,
          inRegion: c.x > rect.minX && c.x < rect.maxX && c.z > rect.minZ && c.z < rect.maxZ,
        };
      },
    };
  },
};
