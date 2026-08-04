/**
 * SEAT-PLAY component (Q-3, I-93) — the play area IN FRONT of each seat board (v1's
 * middle column, split out per the owner's board ruling): each seat's CREW as a
 * count-true row of mini standing cards (from view.crew — the I-93 public projection
 * field, R-19 honored), and the VIEWER'S seat assets as a compact face-up group at the
 * row's right end. Equipment ATTACHMENT state does not exist in the slice — assets
 * render UNATTACHED until the attach/detach verbs land (I-82f); nothing false.
 *
 * GRAB + RESET (the contract-v2 protocol): any seat-play card grabs, drags freely on
 * the ground plane, and on release GLIDES BACK to its anchor — "they will reset to the
 * anchor place they're supposed to sit." Pure theater: rowHash/moveCount invariant.
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { panelTexture } from '../surfaces.js';

let cx: PlayAreaContext | null = null;
let root: THREE.Group | null = null; // purged each build (the K7-P D2 pattern)
let cards: { key: string; mesh: THREE.Mesh; anchor: THREE.Vector3 }[] = [];

// ── the grab/reset state machine ──
let grab: { card: (typeof cards)[number]; plane: THREE.Plane; ray: THREE.Raycaster } | null = null;
let resetting: { card: (typeof cards)[number]; from: THREE.Vector3; t: number } | null = null;
let lastReset: { moved: number; returned: boolean; frames: number } | null = null; // frames: G-1 (I-101) glide trace — a snap mutant records ≤1

function seatFront(ctx: PlayAreaContext, i: number): { c: THREE.Vector3; dir: number } | null {
  const b = ctx.theater.focusObject(`seat-${i}`);
  if (!b) return null;
  b.updateWorldMatrix(true, true);
  const bb = new THREE.Box3().setFromObject(b);
  const c = bb.getCenter(new THREE.Vector3());
  return { c, dir: c.z > 0 ? -1 : 1 }; // toward the table
}

export const seatPlay: Component = {
  id: 'seat-play',
  placement: { kind: 'bound', surface: 'ground', region: 'seat-front' },

  build(ctx) {
    cx = ctx;
    if (root) { root.parent?.remove(root); root = null; } // purge (K7-P D2)
    if (grab || resetting) { grab = null; resetting = null; } // a rebuild drops any live gesture
    cards = [];
    const v = ctx.projection();
    const g = new THREE.Group();
    for (let i = 0; i < v.seats.length; i++) {
      const seat = v.seats[i]!;
      const sf = seatFront(ctx, i);
      if (!sf) continue;
      // the CREW row — count-true from the projection (view.crew by outfit)
      const crew = v.crew.filter((m) => m.outfit === seat.id);
      crew.forEach((m, k) => {
        const mesh = new THREE.Mesh(
          new THREE.PlaneGeometry(44, 66),
          new THREE.MeshBasicMaterial({ map: panelTexture([m.id, `${seat.id}'s crew`], 10, 16), side: THREE.DoubleSide }),
        );
        mesh.position.set(sf.c.x - 120 + k * 56, 34, sf.c.z + sf.dir * 46); // standing, in front of the board
        if (sf.dir < 0) mesh.rotation.y = Math.PI; // far row faces the table
        mesh.userData = { seatPlayCard: `crew:${m.id}`, focus: `seat-${i}` };
        cards.push({ key: `crew:${m.id}`, mesh, anchor: mesh.position.clone() });
        g.add(mesh);
      });
      // the VIEWER'S assets — a compact face-up group at the row's RIGHT end (UNATTACHED
      // until the attach verbs land, I-82f; assets are per-seat public projection data)
      if (seat.id === ctx.viewSeat) {
        seat.assets.forEach((a, k) => {
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(38, 56),
            new THREE.MeshBasicMaterial({ map: panelTexture([a.ref, `$${a.value}`], 10, 16), side: THREE.DoubleSide }),
          );
          mesh.rotation.x = -Math.PI / 2; // flat on the felt
          mesh.position.set(sf.c.x + 140 + (k % 3) * 44, 2.5, sf.c.z + sf.dir * (46 + Math.floor(k / 3) * 62));
          mesh.userData = { seatPlayCard: `asset:${a.ref}:${k}`, focus: `seat-${i}` };
          cards.push({ key: `asset:${a.ref}:${k}`, mesh, anchor: mesh.position.clone() });
          g.add(mesh);
        });
      }
    }
    root = g;
    ctx.scene.add(g);
    return null; // self-added (rebuilt every state change via the purge above)
  },

  // GRAB (contract v2): any seat-play card — drag on the ground plane, reset on release.
  onGrabStart(ctx, hit: PickInfo) {
    if (grab || resetting) return false;
    const key = hit.tags['seatPlayCard'] as string | undefined;
    if (!key) return false;
    const card = cards.find((c) => c.key === key);
    if (!card) return false;
    grab = { card, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -6), ray: new THREE.Raycaster() };
    ctx.status(`picked up ${key} — it will reset where it belongs`);
    return true;
  },
  onGrabMove(ctx, ev: PointerEvent) {
    if (!grab) return;
    const r = ctx.renderer.domElement.getBoundingClientRect();
    grab.ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
    const p = new THREE.Vector3();
    if (grab.ray.ray.intersectPlane(grab.plane, p)) grab.card.mesh.position.set(p.x, Math.max(10, p.y + 14), p.z);
  },
  onGrabEnd(ctx, _ev: PointerEvent) {
    if (!grab) return false;
    const moved = grab.card.mesh.position.distanceTo(grab.card.anchor);
    resetting = { card: grab.card, from: grab.card.mesh.position.clone(), t: 0 };
    lastReset = { moved, returned: false, frames: 0 };
    grab = null;
    ctx.status(moved > 8 ? 'tossed — the card glides back to its spot' : 'a nudge — it settles back');
    return true; // the gesture consumed the click
  },

  tick() {
    if (!resetting) return;
    resetting.t = Math.min(1, resetting.t + 0.07);
    const e = resetting.t * resetting.t * (3 - 2 * resetting.t);
    const { card, from } = resetting;
    const before = card.mesh.position.clone(); // G-1 (I-101): the glide trace
    card.mesh.position.lerpVectors(from, card.anchor, e);
    card.mesh.position.y += Math.sin(resetting.t * Math.PI) * 18; // a small carry arc
    if (lastReset && card.mesh.position.distanceTo(before) > 1e-6) lastReset.frames++;
    if (resetting.t >= 1) {
      card.mesh.position.copy(card.anchor); // RESET — the anchor place it's supposed to sit
      if (lastReset) lastReset.returned = true;
      resetting = null;
    }
  },

  gate() {
    const ctx = cx!;
    return {
      /** count-true crew rows: per seat — want (projection) vs got (meshes) + in-front. */
      crewRows: () => {
        const v = ctx.projection();
        return v.seats.map((s, i) => {
          const want = v.crew.filter((m) => m.outfit === s.id).length;
          const got = cards.filter((c) => c.key.startsWith('crew:') && c.mesh.userData['focus'] === `seat-${i}`).length;
          const sf = seatFront(ctx, i);
          const row = cards.find((c) => c.key.startsWith('crew:') && c.mesh.userData['focus'] === `seat-${i}`);
          const inFront = !!(row && sf) && Math.abs(row.mesh.position.z) < Math.abs(sf.c.z); // between board and table
          return { seat: s.id, want, got, inFront };
        });
      },
      assetsCount: () => {
        const v = ctx.projection();
        const want = v.seats.find((s) => s.id === ctx.viewSeat)?.assets.length ?? 0;
        return { want, got: cards.filter((c) => c.key.startsWith('asset:')).length };
      },
      seatPlayGrabState: () => ({ grabbing: !!grab, resetting: !!resetting, lastReset }),
      seatPlayCardXY: (key: string) => {
        const card = cards.find((c) => c.key === key || c.key.startsWith(key));
        if (!card) return null;
        const w = card.mesh.getWorldPosition(new THREE.Vector3());
        ctx.camera.updateMatrixWorld();
        const p = w.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height, key: card.key };
      },
      seatPlayCardPos: (key: string) => {
        const card = cards.find((c) => c.key === key || c.key.startsWith(key));
        if (!card) return null;
        return {
          x: card.mesh.position.x, y: card.mesh.position.y, z: card.mesh.position.z,
          ax: card.anchor.x, ay: card.anchor.y, az: card.anchor.z,
        };
      },
    };
  },
};
