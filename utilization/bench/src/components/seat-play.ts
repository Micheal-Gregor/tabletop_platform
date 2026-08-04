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
import { planSeatRows } from '../seat-rows.js'; // L-4 (I-131): the pure row planner
import { CARD_FAMILY } from '../../../../packs/boty/src/index.js';
import * as loop from '../crew-loop.js'; // A6 (I-136): the v4 working loop's state machine

let cx: PlayAreaContext | null = null;
let root: THREE.Group | null = null; // purged each build (the K7-P D2 pattern)
let cards: { key: string; mesh: THREE.Mesh; anchor: THREE.Vector3 }[] = [];

// ── the grab/reset state machine ──
let grab: { card: (typeof cards)[number]; plane: THREE.Plane; ray: THREE.Raycaster } | null = null;
let resetting: { card: (typeof cards)[number]; from: THREE.Vector3; t: number } | null = null;
let lastReset: { moved: number; returned: boolean; frames: number } | null = null; // frames: G-1 (I-101) glide trace — a snap mutant records ≤1

/** L-5b (I-132): THE SEAT FRAME — 'the rows for the cards … needs to be parallel to the
 *  board seat'. Everything at a seat lays out in the BOARD'S OWN frame: `n` = the
 *  board's horizontal normal (toward the player), `lat` = its side axis, `yaw` its
 *  heading. Rows step toward the table along −n; cards yaw with the board. */
function seatFrame(ctx: PlayAreaContext, i: number): { c: THREE.Vector3; n: THREE.Vector3; lat: THREE.Vector3; yaw: number } | null {
  const b = ctx.theater.focusObject(`seat-${i}`);
  if (!b) return null;
  b.updateWorldMatrix(true, true);
  const c = new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3());
  const q = b.getWorldQuaternion(new THREE.Quaternion());
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  n.y = 0; n.normalize();
  return { c, n, lat: new THREE.Vector3(n.z, 0, -n.x), yaw: Math.atan2(n.x, n.z) };
}

export const seatPlay: Component = {
  id: 'seat-play',
  placement: { kind: 'bound', surface: 'ground', region: 'seat-front' },

  build(ctx) {
    cx = ctx;
    if (root) { root.parent?.remove(root); root = null; } // purge (K7-P D2)
    if (grab || resetting) { grab = null; resetting = null; } // a rebuild drops any live gesture
    loop.resetCrewLoop(); // A6: theater drops; the SELECTION survives (the SVG's law)
    cards = [];
    const v = ctx.projection();
    const g = new THREE.Group();
    // the viewer's LOCAL (session) cards — moved here from the table's in-play area by
    // the I-131 seat-front ruling ('if a local card is drawn, it is added as a bottom
    // row'); ownDiscard is the VIEWER'S, so the bottom row is the VIEWER'S seat (the
    // Q-2c active-seat placement superseded on the record, I-131). Family tags are
    // PRESERVED so renderedPartition keeps counting (the oracle walks by family).
    const session = v.ownDiscard.filter((id) => CARD_FAMILY[id] === 'session');
    for (let i = 0; i < v.seats.length; i++) {
      const seat = v.seats[i]!;
      const sf = seatFrame(ctx, i);
      if (!sf) continue;
      // L-4 (I-131): THE ROW PLAN — pure data in, rows out (unit-tested). Trades = the
      // public crew (pairs STAGED at zero until the attach verbs land, I-82f); the
      // viewer adds unattached equipment (assets) + the local bottom row.
      const crew = v.crew.filter((m) => m.outfit === seat.id);
      const mine = seat.id === ctx.viewSeat;
      const rows = planSeatRows(
        crew.map((m) => ({ id: m.id, paired: false })),
        mine ? seat.assets.map((a, k) => ({ id: `${a.ref}:${k}` })) : [],
        mine ? session.map((id) => ({ id })) : [],
      );
      const total = rows.length;
      rows.forEach((row, r) => {
        // the FRONT TOP row (trades) sits nearest the table; later rows step back
        // toward the board — the owner's top-to-bottom order (I-130).
        const zOff = 46 + (total - 1 - r) * 68;
        const widths = row.items.map((it) => it.w * 56);
        const natural = widths.reduce((a, b) => a + b, 0);
        const MAXW = 380; // the row's space — beyond it, respace to OVERLAP (I-130)
        const scale = row.overlap || natural > MAXW ? MAXW / natural : 1;
        let cum = 0;
        row.items.forEach((it) => {
          const w = widths[row.items.indexOf(it)]! * scale;
          const latOff = -(natural * scale) / 2 + cum + w / 2; // along the board's side axis
          cum += w;
          const isLocal = it.kind === 'local';
          const label = it.kind === 'equipment' ? it.id.split(':')[0]! : it.id;
          // A6 (I-136): an ASSIGNED tradesperson wears its status (the SVG's crew-busy)
          const assigned = (it.kind === 'trades' || it.kind === 'pair') && crew.find((m) => m.id === it.id)?.assignedTo !== undefined;
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(it.kind === 'pair' ? 62 : 44, isLocal ? 60 : 66),
            new THREE.MeshBasicMaterial({ map: panelTexture([label, assigned ? '⚒ working' : `${seat.id}'s ${it.kind}`], 10, 16), side: THREE.DoubleSide }),
          );
          // L-5b (I-132): the SEAT FRAME LAW — position in the board's frame (lateral +
          // toward-table steps), orientation yawed WITH the board (corner rows run at 45°).
          const pos = sf.c.clone().addScaledVector(sf.lat, latOff).addScaledVector(sf.n, -zOff);
          if (isLocal || it.kind === 'equipment') {
            mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sf.yaw)
              .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2))); // flat, footprint parallel
            mesh.position.set(pos.x, 2.5, pos.z);
          } else {
            mesh.rotation.y = sf.yaw; // standing, facing the player like the board
            mesh.position.set(pos.x, 34, pos.z);
          }
          const key = `${it.kind === 'pair' ? 'crew' : it.kind === 'trades' ? 'crew' : it.kind === 'equipment' ? 'asset' : 'local'}:${it.id}`;
          mesh.userData = { seatPlayCard: key, focus: `seat-${i}` };
          if (isLocal) mesh.userData = { ...mesh.userData, card: true, slotCard: it.id, family: 'session' }; // the partition oracle's walk
          cards.push({ key, mesh, anchor: mesh.position.clone() });
          g.add(mesh);
        });
      });
      // L-4 (I-131): the HAND stages BELOW THE BOOKS — the viewer's face-down mini
      // stack (count = the SVG hand law: ownDiscard top-3). A9's fan/fidget rides its
      // own increment; exact books alignment refines there (registered).
      if (mine) {
        const ledger = ctx.theater.focusObject('ledger');
        if (ledger) {
          ledger.updateWorldMatrix(true, true);
          const lc = new THREE.Box3().setFromObject(ledger).getCenter(new THREE.Vector3());
          const n = Math.min(3, v.ownDiscard.length);
          for (let k = 0; k < n; k++) {
            const mesh = new THREE.Mesh(
              new THREE.PlaneGeometry(40, 60),
              new THREE.MeshBasicMaterial({ color: 0x5a4a3a, side: THREE.DoubleSide }), // face DOWN — a back, no data (redaction)
            );
            // L-5b (I-132): below the books = a step AWAY from the table along the seat
            // frame's normal; the stagger runs along the side axis; footprint parallel.
            mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sf.yaw)
              .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)));
            const hp = lc.clone().addScaledVector(sf.n, 95 + k * 4).addScaledVector(sf.lat, k * 6);
            mesh.position.set(hp.x, 2 + k * 0.8, hp.z);
            mesh.userData = { seatPlayCard: `hand:${k}`, focus: `seat-${i}`, hand: true };
            cards.push({ key: `hand:${k}`, mesh, anchor: mesh.position.clone() });
            g.add(mesh);
          }
        }
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
    // A6 (I-136): a sub-8u release on the VIEWER'S OWN crew card is a CLICK — it routes
    // to the v4 loop (assigned → work; else toggle select). The VG8p reset drive moves
    // >40u, so the grab/reset law is untouched by predicate; equipment/local/hand keep
    // the nudge-settle.
    if (moved < 8 && grab.card.key.startsWith('crew:')) {
      const crewId = grab.card.key.slice(5);
      const v = ctx.projection();
      const member = v.crew.find((m) => m.id === crewId);
      if (member && member.outfit === ctx.viewSeat) {
        const card = grab.card;
        grab = null;
        card.mesh.position.copy(card.anchor); // the un-moved click leaves no offset behind
        loop.crewClick(ctx, crewId, card.mesh, member.assignedTo !== undefined);
        return true;
      }
    }
    resetting = { card: grab.card, from: grab.card.mesh.position.clone(), t: 0 };
    lastReset = { moved, returned: false, frames: 0 };
    grab = null;
    ctx.status(moved > 8 ? 'tossed — the card glides back to its spot' : 'a nudge — it settles back');
    return true; // the gesture consumed the click
  },

  // CONTRACT v3 (S-1, I-103) — the ABORT: a cancelled/rebuilt-under grab starts the same
  // reset glide the release would have (never a snap; the fresh build re-anchors truth).
  onGrabAbort(_ctx) {
    if (!grab) return;
    const moved = grab.card.mesh.position.distanceTo(grab.card.anchor);
    resetting = { card: grab.card, from: grab.card.mesh.position.clone(), t: 0 };
    lastReset = { moved, returned: false, frames: 0 };
    grab = null;
  },

  tick() {
    // A6 (I-136): the loop's theater — hop → assign-at-arrival · bounce · re-lift
    loop.tickCrewLoop((key) => cards.find((c) => c.key === key)?.mesh ?? null);
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
          const sf = seatFrame(ctx, i);
          const row = cards.find((c) => c.key.startsWith('crew:') && c.mesh.userData['focus'] === `seat-${i}`);
          // L-5b (I-132): in-front is FRAME-relative — the row sits on the TABLE side of
          // the board (its offset along the board normal is negative).
          const inFront = !!(row && sf) && row.mesh.position.clone().sub(sf.c).dot(sf.n) < 0;
          return { seat: s.id, want, got, inFront };
        });
      },
      assetsCount: () => {
        const v = ctx.projection();
        const want = v.seats.find((s) => s.id === ctx.viewSeat)?.assets.length ?? 0;
        return { want, got: cards.filter((c) => c.key.startsWith('asset:')).length };
      },
      seatPlayGrabState: () => ({ grabbing: !!grab, resetting: !!resetting, lastReset }),
      /** L-4 (I-131) oracles: the PLAN vs the RENDER for a seat (row kinds/counts/
       *  overlap ≡ meshes by key prefix), and the hand's below-the-books geometry. */
      seatRowsInfo: (i: number) => {
        const v = ctx.projection();
        const seat = v.seats[i];
        if (!seat) return null;
        const mine = seat.id === ctx.viewSeat;
        const session = v.ownDiscard.filter((id) => CARD_FAMILY[id] === 'session');
        const plan = planSeatRows(
          v.crew.filter((m) => m.outfit === seat.id).map((m) => ({ id: m.id, paired: false })),
          mine ? seat.assets.map((a, k) => ({ id: `${a.ref}:${k}` })) : [],
          mine ? session.map((id) => ({ id })) : [],
        );
        const of = (p: string) => cards.filter((c) => c.key.startsWith(p) && c.mesh.userData['focus'] === `seat-${i}` && !c.mesh.userData['hand']).length;
        return {
          plan: plan.map((r) => ({ kind: r.kind, n: r.items.length, overlap: r.overlap })),
          got: { crew: of('crew:'), equipment: of('asset:'), local: of('local:') },
          match: plan.filter((r) => r.kind === 'trades').reduce((a, r) => a + r.items.length, 0) === of('crew:')
            && plan.filter((r) => r.kind === 'equipment').reduce((a, r) => a + r.items.length, 0) === of('asset:')
            && plan.filter((r) => r.kind === 'local').reduce((a, r) => a + r.items.length, 0) === of('local:'),
        };
      },
      handInfo: () => {
        const hand = cards.filter((c) => c.mesh.userData['hand']);
        const ledger = ctx.theater.focusObject('ledger');
        const sf = seatFrame(ctx, 0); // the viewer's seat frame
        if (!ledger || !sf) return { count: hand.length, belowBooks: false };
        const lc = new THREE.Box3().setFromObject(ledger).getCenter(new THREE.Vector3());
        // L-5b (I-132): below the books = a POSITIVE step along the seat frame's normal
        // (away from the table) from the ledger — frame-relative, corner-safe.
        const belowBooks = hand.length === 0 || hand.every((c) => c.mesh.position.clone().sub(lc).dot(sf.n) > 0);
        return { count: hand.length, belowBooks, want: Math.min(3, ctx.projection().ownDiscard.length) };
      },
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
