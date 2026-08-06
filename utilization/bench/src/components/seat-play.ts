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
import { planPostings, cellLocal, cellW, cellD, cellAt, surfaceSize, POSTING_SPAN } from '../seat-grid.js'; // G-B2/G-B3 (I-164/I-165): the 7×4 grid IS the layout law
import { CARD_FAMILY } from '../../../../packs/boty/src/index.js';
import * as loop from '../crew-loop.js'; // A6 (I-136): the v4 working loop's state machine
import { cardInstance } from '../card-world.js'; // C-1a (I-149): the permanence world
import { uiObject } from '../ui-object.js'; // G-C (I-169): the base-case library — the card's sockets
import { poseOrArrive } from '../arrivals.js'; // PB-9b (I-201): claims travel, never teleport
import { OBJECT_SCALE, STATION_BOX } from '../playarea.js'; // I-150/I-177: the scale control table + the reposition clamp
import { seatPlayOracles } from './seat-play-oracles.js'; // O-2 (I-146): the size-gate oracle extraction

let cx: PlayAreaContext | null = null;
let root: THREE.Group | null = null; // purged each build (the K7-P D2 pattern)
let cards: { key: string; mesh: THREE.Object3D; anchor: THREE.Vector3 }[] = [];
export const seatPlayCards = () => cards; // the oracle module's read (O-2 size extraction)

// ── the grab/reset state machine ──
let grab: { card: (typeof cards)[number]; plane: THREE.Plane; ray: THREE.Raycaster } | null = null;
let resetting: { card: (typeof cards)[number]; from: THREE.Vector3; t: number } | null = null;
let lastReset: { moved: number; returned: boolean; frames: number } | null = null; // frames: G-1 (I-101) glide trace — a snap mutant records ≤1
let lastReturn: { id: string; pile: string } | null = null; // I-157: the last bottom-return (oracle)
const sticky = new Map<string, { row: number; col: number }>(); // G-B2: the viewer's STUCK anchors (presentation state, survives rebuilds)
let handUp = false; // C-1d (I-171): the flip-all pickup — face-down grouped ↔ all face up (theater state)
let handOffset: { lat: number; out: number } | null = null; // PB-3 (I-177): the dragged hand's claim
let lastHandPlay: { id: string } | null = null;
export const handUpState = () => handUp;
export const seatPlayLastHandPlay = () => lastHandPlay;
let lastStick: { id: string; row: number; col: number } | null = null;
export const seatPlayLastStick = () => lastStick;
export const seatPlayLastReturn = () => lastReturn;

/** L-5b (I-132): THE SEAT FRAME — 'the rows for the cards … needs to be parallel to the
 *  board seat'. Everything at a seat lays out in the BOARD'S OWN frame: `n` = the
 *  board's horizontal normal (toward the player), `lat` = its side axis, `yaw` its
 *  heading. Rows step toward the table along −n; cards yaw with the board. */
export function seatFrame(ctx: PlayAreaContext, i: number): { c: THREE.Vector3; n: THREE.Vector3; lat: THREE.Vector3; yaw: number } | null {
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
      const crew = v.crew.filter((m) => m.outfit === seat.id);
      const mine = seat.id === ctx.viewSeat;
      // G-B2 (I-164, the I-158/I-159 grid): the seat's cards as DATA — grouped by the
      // owner's sort (BBB → tradesperson → equipment) and PLACED by planPostings on the
      // 7×4 child grid; sticky claims (the drag-down-and-STICK) hold their anchors.
      const seatCards = [
        ...(mine ? session.map((id) => ({ id, kind: 'bbb' as const, label: id })) : []),
        ...crew.map((m) => ({ id: m.id, kind: 'trades' as const, label: m.id })),
        ...(mine ? seat.assets.map((a, k) => ({ id: `${a.ref}:${k}`, kind: 'equipment' as const, label: a.ref })) : []),
      ]; // G-C2 (I-170): a GEARED crew member is ONE grouped object — its equipment left
      // the rack in STATE (crew:attach moved it), so the pair claims one anchor for free.
      const plan = planPostings(seatCards, mine ? sticky : new Map());
      // the transparent SURFACE — the child grid made lightly visible (I-162: readability
      // is the polish; no lighting theater). Its extent IS the law's (surfaceSize).
      const ss = surfaceSize();
      const BASE = 60; // row 1's center, out from the board (toward the player)
      const surf = new THREE.Mesh(
        new THREE.PlaneGeometry(ss.w, ss.d),
        new THREE.MeshBasicMaterial({ color: 0x8fa39a, transparent: true, opacity: 0.1, side: THREE.DoubleSide }),
      );
      const sc = sf.c.clone().addScaledVector(sf.n, BASE + ss.d / 2 - cellD() / 2);
      surf.position.set(sc.x, 0.8, sc.z);
      surf.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sf.yaw)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)));
      surf.userData = { seatSurface: i, focus: `seat-${i}` };
      g.add(surf);
      // G-B3 (I-165): the HAND ZONE marked (row 4, cols 1–2) — C-1d's landing strip,
      // a subtle outline so the player knows where the hand lives (I-162 readability).
      if (mine) {
        const hz = new THREE.Mesh(
          new THREE.PlaneGeometry(2 * cellW() - 8, cellD() - 8),
          new THREE.MeshBasicMaterial({ color: 0x7a8fa0, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
        );
        const hc = sf.c.clone().addScaledVector(sf.lat, (1.5 - 4) * cellW()).addScaledVector(sf.n, BASE + 3 * cellD());
        hz.position.set(hc.x, 1.0, hc.z);
        hz.quaternion.copy(surf.quaternion);
        hz.userData = { handZone: true, focus: `seat-${i}` };
        g.add(hz);
      }
      for (const c of seatCards) {
        const cell = plan.get(c.id);
        if (!cell) continue; // over capacity — parked (20 anchors; the overflow law is future)
        const lc = cellLocal(cell.row, cell.col);
        const pos = sf.c.clone().addScaledVector(sf.lat, lc.lat).addScaledVector(sf.n, BASE + lc.out);
        const assigned = c.kind === 'trades' && crew.find((m) => m.id === c.id)?.assignedTo !== undefined;
        // C-1a (I-149): the card is the persistent instance, re-claimed and posed.
        const inst = cardInstance(c.label) ?? cardInstance(`${ctx.viewSeat}::${c.label}`);
        let mesh: THREE.Object3D;
        if (inst) {
          inst.setFace([c.label, assigned ? '⚒ working' : `${seat.id}'s ${c.kind}`]);
          mesh = inst.group;
        } else {
          mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(44, 66),
            new THREE.MeshBasicMaterial({ map: panelTexture([c.label, `${seat.id}'s ${c.kind}`], 10, 16), side: THREE.DoubleSide }),
          );
        }
        // the owner's law: 'the ledger and cards all lay FLAT in the seat play space' —
        // every posted card lies flat, face up, yawed with the board (the seat frame law).
        // PB-9b (I-201): the claim TRAVELS — a card that stood elsewhere (the flicked
        // draw, the detached gear, the returned pile card) arrives along a path.
        const hadParent = inst ? inst.group.parent !== null : false;
        const targetQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sf.yaw)
          .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
        poseOrArrive(mesh, new THREE.Vector3(pos.x, 2.5, pos.z), targetQ, hadParent);
        const key = `${c.kind === 'trades' ? 'crew' : c.kind === 'equipment' ? 'asset' : 'local'}:${c.id}`;
        mesh.userData = { ...mesh.userData, seatPlayCard: key, focus: `seat-${i}` }; // MERGED — the card3d identity persists (I-149)
        if (c.kind === 'bbb') mesh.userData = { ...mesh.userData, card: true, slotCard: c.id, family: 'session' }; // the partition oracle's walk
        cards.push({ key, mesh, anchor: mesh.position.clone() });
        g.add(mesh);
        // G-C2 (I-170): the PAIR — the attached gear's instance snaps to the card's
        // equipment-under SOCKET (ui-object.ts: 'under and to the side'), beneath and
        // offset, flat, ONE grouped object on ONE anchor (I-159's law made real).
        const gearRef = c.kind === 'trades' ? crew.find((m) => m.id === c.id)?.gear : undefined;
        if (gearRef) {
          const gi = cardInstance(gearRef);
          if (gi) {
            gi.setFace([gearRef, `⚙ on ${c.id}`]);
            const sock = uiObject('card')!.childGrid!.sockets.find((sk) => sk.id === 'equipment-under')!;
            const gp2 = pos.clone().addScaledVector(sf.n, -sock.at.y).addScaledVector(sf.lat, 14); // beneath + to the side
            poseOrArrive(gi.group, new THREE.Vector3(gp2.x, 1.4, gp2.z), mesh.quaternion.clone(), gi.group.parent !== null); // PB-9b: the gear travels to its socket
            gi.group.userData = { ...gi.group.userData, seatPlayCard: `gear:${c.id}`, attachedGear: c.id, focus: `seat-${i}` };
            cards.push({ key: `gear:${c.id}`, mesh: gi.group, anchor: gi.group.position.clone() });
            g.add(gi.group);
          }
        }
      }
      // C-1d (I-171, the I-149 grammar): THE HAND — the viewer's networking cards,
      // 'grouped in the hand face down on the board', fanned across the HAND strip
      // (row 4, cols 1–2); the flip-all pickup turns them ALL face up (theater state,
      // survives rebuilds); face-up cards drag-and-drop into play (the play verb).
      if (mine && v.ownHand.length) {
        const a1 = cellLocal(4, 1), a2 = cellLocal(4, 2);
        v.ownHand.forEach((hid, hIdx) => {
          const hi = cardInstance(hid);
          if (!hi) return;
          hi.setFace([hid, 'networking']);
          const t2 = v.ownHand.length > 1 ? hIdx / (v.ownHand.length - 1) : 0.5;
          const lat2 = (handOffset?.lat ?? 0) + a1.lat + (a2.lat - a1.lat) * t2; // PB-3: the claim shifts the whole fan
          const hp = sf.c.clone().addScaledVector(sf.lat, lat2).addScaledVector(sf.n, (handOffset?.out ?? (BASE + a1.out)));
          const hq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sf.yaw)
            .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), handUp ? -Math.PI / 2 : Math.PI / 2));
          poseOrArrive(hi.group, new THREE.Vector3(hp.x, handUp ? 6 : 2.2, hp.z), hq, hi.group.parent !== null); // PB-9b: drawn networking travels to the fan
          hi.group.userData = { ...hi.group.userData, seatPlayCard: `hand:${hid}`, focus: `seat-${i}` };
          cards.push({ key: `hand:${hid}`, mesh: hi.group, anchor: hi.group.position.clone() });
          g.add(hi.group);
        });
      }
    }
    root = g;
    ctx.scene.add(g);
    return null; // self-added (rebuilt every state change via the purge above)
  },

  // PB-1 (I-176): clicking the PLAY AREA anchors it — the read ladder then pans to
  // the DIRECT OVERHEAD of THIS surface (never the ledger's stale anchor — the hijack
  // the owner caught: 'the reading view looks like it is on The Books point of center').
  onPick(ctx, hit: PickInfo) {
    const idx = hit.tags['seatSurface'];
    if (typeof idx !== 'number') return false;
    ctx.theater.setLastFocus(`seat-area-${idx}`);
    ctx.status(`anchored: your play area — reading mode now reads it straight down`);
    return true;
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
    // C-1d (I-171): the HAND — a click FLIPS ALL ('picked up by the player flipping
    // all cards in a hand'); a face-up card dragged into play and RELEASED plays it:
    // dropped, revealed (status), then to the networking deck's BOTTOM (the engine).
    if (grab.card.key.startsWith('hand:')) {
      const hid = grab.card.key.slice(5);
      const card = grab.card;
      if (moved < 8) {
        grab = null;
        card.mesh.position.copy(card.anchor);
        handUp = !handUp;
        ctx.rebuild();
        ctx.status(handUp ? 'hand picked up — all cards face up; drag one into play' : 'hand set down — face down, grouped');
        return true;
      }
      const vH = ctx.projection();
      const myTurnH = vH.seats[vH.turn.seatIdx]!.id === ctx.viewSeat;
      if (handUp && myTurnH && moved > 30) {
        grab = null;
        if (ctx.submit('play-networking', { card: hid })) {
          lastHandPlay = { id: hid };
          ctx.rebuild(); // the card leaves the hand for the pool's BOTTOM — the same instance
          ctx.status(`${hid} played — revealed, then to the bottom of the NETWORKING deck`);
          return true;
        }
        ctx.status('refused — not your turn or not in your hand');
        return true;
      }
      if (!handUp && moved >= 8) {
        // PB-3 (I-177): dragging the FACE-DOWN hand slides the whole fan — the claim
        // (board-frame, clamped to the station) survives rebuilds, like a card's stick.
        const vH2 = ctx.projection();
        const myIdx2 = vH2.seats.findIndex((s2) => s2.id === ctx.viewSeat);
        const sfH = myIdx2 >= 0 ? seatFrame(ctx, myIdx2) : null;
        if (sfH) {
          const rel = card.mesh.position.clone().sub(sfH.c);
          handOffset = {
            lat: Math.max(-STATION_BOX.halfW + 80, Math.min(STATION_BOX.halfW - 80, rel.dot(sfH.lat))),
            out: Math.max(40, Math.min(STATION_BOX.depth - 30, rel.dot(sfH.n))),
          };
          grab = null;
          ctx.rebuild();
          ctx.status('the hand settles at its new spot — your claim holds');
          return true;
        }
      }
      resetting = { card, from: card.mesh.position.clone(), t: 0 };
      lastReset = { moved, returned: false, frames: 0 };
      grab = null;
      ctx.status(handUp ? 'a short toss — it returns to the hand' : 'the hand is face down — click to pick it up');
      return true;
    }
    // G-C2 (I-170): a CLICK on attached gear detaches it — back to the rack (the
    // grammar's return path); the engine refuses if it isn't yours or isn't your turn.
    if (moved < 8 && grab.card.key.startsWith('gear:')) {
      const crewId = grab.card.key.slice(5);
      const card = grab.card;
      grab = null;
      card.mesh.position.copy(card.anchor);
      if (ctx.submit('detach-gear', { crew: crewId })) {
        ctx.rebuild();
        ctx.status(`detached — the equipment returns to your rack`);
      } else ctx.status('refused — not yours to detach (or not your turn)');
      return true;
    }
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
    // I-157 (the I-149 grammar): dropping the VIEWER'S OWN tradesperson/equipment card
    // ON its supply pile is the BOTTOM-RETURN — the real verb through the doors; the
    // rebuild seats the same instance at the pile's bottom. Anywhere else: the glide.
    const key = grab.card.key;
    const pileFor = key.startsWith('crew:') ? 'tradespeople-pile' : key.startsWith('asset:') ? 'equipment-pile' : null; // I-164: the I-157 'equipment:' key never existed — asset: is the prefix (drill-caught)
    if (pileFor) {
      const pile = ctx.theater.focusObject(`table:${pileFor}`);
      if (pile) {
        const pb = new THREE.Box3().setFromObject(pile).expandByScalar(14);
        const cp = grab.card.mesh.position;
        if (cp.x >= pb.min.x && cp.x <= pb.max.x && cp.z >= pb.min.z && cp.z <= pb.max.z) {
          const vNow = ctx.projection();
          const myTurn = vNow.seats[vNow.turn.seatIdx]!.id === ctx.viewSeat;
          const id = key.startsWith('crew:') ? key.slice(5) : key.slice(6).split(':')[0]!;
          const own = key.startsWith('crew:')
            ? vNow.crew.some((m) => m.id === id && m.outfit === ctx.viewSeat)
            : vNow.seats.find((s2) => s2.id === ctx.viewSeat)!.assets.some((a) => a.ref === id);
          if (myTurn && own) {
            const verb = key.startsWith('crew:') ? 'release-crew' : 'sell-equipment';
            const args = key.startsWith('crew:') ? { crew: id } : { ref: id };
            const cardRef = grab.card;
            grab = null;
            if (ctx.submit(verb, args)) {
              lastReturn = { id, pile: pileFor };
              ctx.rebuild(); // truth: the SAME instance re-claimed at the pile's BOTTOM
              ctx.status(`${id} returns to the bottom of the deck (the only move out — I-149)`);
              return true;
            }
            // refused (e.g. assigned crew) → the glide home says so
            resetting = { card: cardRef, from: cardRef.mesh.position.clone(), t: 0 };
            lastReset = { moved, returned: false, frames: 0 };
            ctx.status('refused — a working card stays anchored to its venture');
            return true;
          }
        }
      }
    }
    // G-C2 (I-170): dropping YOUR equipment ON one of YOUR tradesperson cards ATTACHES
    // it (the equipment-under socket; crew:attach through the doors). Checked BEFORE
    // the stick — a card is a more specific target than a cell.
    if (key.startsWith('asset:')) {
      const vA = ctx.projection();
      const myTurnA = vA.seats[vA.turn.seatIdx]!.id === ctx.viewSeat;
      if (myTurnA) {
        const cp = grab.card.mesh.position;
        const target = cards.find((c2) => c2.key.startsWith('crew:')
          && c2.mesh.userData['focus'] === grab!.card.mesh.userData['focus']
          && Math.hypot(c2.mesh.position.x - cp.x, c2.mesh.position.z - cp.z) < 45);
        if (target) {
          const crewId = target.key.slice(5);
          const ref = key.slice(6).split(':')[0]!;
          const own = vA.crew.some((m) => m.id === crewId && m.outfit === ctx.viewSeat);
          if (own) {
            grab = null;
            if (ctx.submit('attach-gear', { crew: crewId, ref })) {
              ctx.rebuild(); // the pair renders — one grouped object on one anchor
              ctx.status(`${ref} attaches beneath ${crewId} — a grouped object now`);
              return true;
            }
            ctx.status('refused — the socket is taken or the piece is not yours');
            return true;
          }
        }
      }
    }
    // G-B2 (I-164, the owner's law): the active player DRAGS a card down and releases —
    // 'it will now STICK to the new location'. A release over the VIEWER'S OWN surface
    // on a POSTING cell claims that anchor (sticky, presentation state); the rebuild
    // seats it there and the flow fills around it. Off the postings: the glide home.
    {
      const vS = ctx.projection();
      const myIdx = vS.seats.findIndex((s2) => s2.id === ctx.viewSeat);
      const sfS = myIdx >= 0 ? seatFrame(ctx, myIdx) : null;
      const own = grab.card.mesh.userData['focus'] === `seat-${myIdx}`;
      const myTurn = vS.seats[vS.turn.seatIdx]!.id === ctx.viewSeat;
      if (sfS && own && myTurn) {
        const rel = grab.card.mesh.position.clone().sub(sfS.c);
        const cell = cellAt(rel.dot(sfS.lat), rel.dot(sfS.n) - 60);
        if (cell && cell.col >= POSTING_SPAN.c0) {
          const id = key.startsWith('crew:') ? key.slice(5) : key.startsWith('asset:') ? key.slice(6) : key.slice(6);
          sticky.set(id, cell);
          lastStick = { id, row: cell.row, col: cell.col };
          grab = null;
          ctx.rebuild(); // the plan seats it at the stuck anchor — the render obeys
          ctx.status(`stuck at row ${cell.row}, col ${cell.col} — the flow fills around it`);
          return true;
        }
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
      seatPlayGrabState: () => ({ grabbing: !!grab, resetting: !!resetting, lastReset }), // stays home — private state
      ...seatPlayOracles(() => cx!), // O-2 size extraction (the table-oracles precedent) — crewRows · seatRowsInfo · stationBoxInfo · handInfo live in seat-play-oracles.ts VERBATIM
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
