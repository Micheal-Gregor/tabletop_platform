/**
 * SUPPLY-DRAW (C-1c, I-156) — THE FLICK-MOVE DOOR, owner-ruled at I-150: "the act of
 * hiring someone now would be selecting the tradesperson card, flipping the card with a
 * flick and it changes anchor point from the deck to the tradesperson area. Same with
 * equipment area, or global area, or to the hand." The event deck's flick-to-flip
 * (Q-2b/I-91) generalized to the four supply piles: GRAB the top card on your turn,
 * drag it (lean with the pull), FLICK → the verb submits (hire · buy-equipment ·
 * pool-draw), the card FLIPS at the pile (its own face — the deck carries the pool's
 * remaining ORDER, so the object that turns over IS the card the engine popped), then
 * it TRAVELS to the seat area and the rebuild seats it in its exact row slot. A weak
 * flick settles back face down — refusal-not-repair; no verb, state invariant.
 */
import * as THREE from 'three';
import type { PlayAreaContext, PickInfo } from './component.js';
import { stackTop } from './draw-route.js';
import { cardInstance } from './card-world.js';
import { nudgeStack } from './stacks.js';
import { seatFrame } from './components/seat-play.js';

const FLICK_T = 0.35; // px/ms — the deck's own threshold (I-91)
const TILT_MAX = 0.9;

const VERBS: Record<string, { verb: string; args: Record<string, unknown>; done: string }> = {
  'tradespeople-pile': { verb: 'hire', args: {}, done: 'hired — the tradesperson takes the anchor at your crew row' },
  'equipment-pile': { verb: 'buy-equipment', args: {}, done: 'bought — the equipment takes the anchor at your rack' },
  'bbb-pile': { verb: 'pool-draw', args: { pool: 'bbb' }, done: 'drawn — the BBB card anchors to your local row' },
  'networking-pile': { verb: 'pool-draw', args: { pool: 'networking' }, done: 'drawn — networking (the HAND anchor lands at C-1d)' },
};
const POOL_KEY: Record<string, 'tradespeople' | 'equipment' | 'bbb' | 'networking'> = {
  'tradespeople-pile': 'tradespeople', 'equipment-pile': 'equipment', 'bbb-pile': 'bbb', 'networking-pile': 'networking',
};

type Phase = 'idle' | 'grabbing' | 'flipping' | 'routing' | 'settling';
let phase: Phase = 'idle';
type Theater = {
  mesh: THREE.Object3D; rid: string; from: THREE.Vector3;
  homeGroup: THREE.Object3D | null; homeLocal: { pos: THREE.Vector3; quat: THREE.Quaternion };
  bound: { minX: number; maxX: number; minZ: number; maxZ: number } | null;
  samples: { x: number; y: number; t: number }[]; angle: number;
  newId: string | null; identityOk: boolean | null;
  t: number; flipDir: number; flipSpeed: number; flipLift: number; flipped: boolean;
  routeFrom: THREE.Vector3 | null; routeTo: THREE.Vector3 | null; settleFrom: THREE.Vector3 | null;
};
let theater: Theater | null = null;
let lastGestureRec: { verdict: 'flicked' | 'weak'; velocity: number } | null = null;
let lastMoveRec: { rid: string; id: string; identityOk: boolean; endX: number; endY: number; endZ: number; targetX: number; targetY: number; targetZ: number } | null = null;

export function grabStart(ctx: PlayAreaContext, hit: PickInfo): boolean {
  if (phase !== 'idle') return false;
  const spec = hit.region ? VERBS[hit.region] : undefined;
  if (!spec || !hit.region) return false;
  const v = ctx.projection();
  if (v.seats[v.turn.seatIdx]!.id !== ctx.viewSeat) return false; // off-turn: the tap-nudge keeps the click
  if ((v.pools[POOL_KEY[hit.region]!] ?? 0) < 1) return false;
  const st = stackTop(ctx, hit.region);
  if (!st.mesh) return false;
  const m = st.mesh;
  const homeGroup = m.parent;
  const homeLocal = { pos: m.position.clone(), quat: m.quaternion.clone() };
  ctx.scene.attach(m);
  m.userData['drawGrabMesh'] = true; // the S-1 orphan oracle counts this tag at idle
  let bound: Theater['bound'] = null;
  const tbl = ctx.theater.focusObject('table');
  if (tbl) { const bb = new THREE.Box3().setFromObject(tbl); bound = { minX: bb.min.x + 30, maxX: bb.max.x - 30, minZ: bb.min.z + 40, maxZ: bb.max.z - 40 }; }
  theater = {
    mesh: m, rid: hit.region, from: st.pos.clone(), homeGroup, homeLocal, bound,
    samples: [{ x: hit.event.clientX, y: hit.event.clientY, t: performance.now() }], angle: 0,
    newId: null, identityOk: null, t: 0, flipDir: 0, flipSpeed: 0.06, flipLift: 16, flipped: false,
    routeFrom: null, routeTo: null, settleFrom: null,
  };
  phase = 'grabbing';
  ctx.status(`grabbed the ${POOL_KEY[hit.region]} top card — flick to take it`);
  return true;
}

export function grabMove(ctx: PlayAreaContext, ev: PointerEvent): void {
  if (phase !== 'grabbing' || !theater) return;
  theater.samples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
  if (theater.samples.length > 6) theater.samples.shift();
  const d = Math.hypot(ev.clientX - theater.samples[0]!.x, ev.clientY - theater.samples[0]!.y);
  const lean = ev.clientX - theater.samples[0]!.x >= 0 ? 1 : -1;
  theater.angle = lean * Math.min(TILT_MAX, d / 90);
  let fx = theater.from.x, fz = theater.from.z;
  const r = ctx.renderer.domElement.getBoundingClientRect();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -theater.from.y);
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(plane, p)) {
    fx = theater.bound ? Math.max(theater.bound.minX, Math.min(theater.bound.maxX, p.x)) : p.x;
    fz = theater.bound ? Math.max(theater.bound.minZ, Math.min(theater.bound.maxZ, p.z)) : p.z;
  }
  theater.mesh.position.set(fx, theater.from.y + 6 + Math.abs(theater.angle) * 22, fz);
  theater.mesh.rotation.set(Math.PI / 2, 0, 0); // face DOWN (instances only out here)
  theater.mesh.rotateY(theater.angle);
}

export function grabEnd(ctx: PlayAreaContext, ev: PointerEvent): boolean {
  if (phase !== 'grabbing' || !theater) return false;
  theater.samples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
  const a = theater.samples[0]!, z = theater.samples[theater.samples.length - 1]!;
  const dt = Math.max(1, z.t - a.t);
  const vel = Math.hypot(z.x - a.x, z.y - a.y) / dt;
  const spec = VERBS[theater.rid]!;
  if (vel >= FLICK_T) {
    const before = ctx.projection();
    if (!ctx.submit(spec.verb, spec.args)) { settleBack(); return true; }
    const after = ctx.projection();
    // the popped card, read from the STATE DIFF (derived-never-stored):
    let newId: string | null = null;
    if (spec.verb === 'hire') newId = after.crew.find((m) => m.outfit === ctx.viewSeat && !before.crew.some((b) => b.id === m.id))?.id ?? null;
    else if (spec.verb === 'buy-equipment') {
      const bs = before.seats.find((s) => s.id === ctx.viewSeat)!.assets.map((x) => x.ref);
      const as = after.seats.find((s) => s.id === ctx.viewSeat)!.assets.map((x) => x.ref);
      newId = as.find((ref, i) => bs[i] !== ref) ?? as[as.length - 1] ?? null;
    } else if (spec.args['pool'] === 'networking') newId = after.ownHand.find((id) => !before.ownHand.includes(id)) ?? null; // C-1d (I-171): networking lands in the HAND
    else newId = after.ownDiscard[0] ?? null;
    theater.newId = newId;
    // the IDENTITY LAW: the pool carries its remaining order, so the grabbed top must
    // BE the popped card — a false stack surfaces here, never silently (HK-11's spirit).
    theater.identityOk = newId !== null && theater.mesh.userData['cardId'] === newId;
    theater.from = new THREE.Vector3(theater.mesh.position.x, theater.from.y, theater.mesh.position.z);
    theater.flipDir = z.x - a.x >= 0 ? 1 : -1;
    theater.flipSpeed = Math.max(0.045, Math.min(0.09, 0.03 + vel * 0.015));
    theater.flipLift = Math.max(12, Math.min(26, 8 + vel * 5));
    theater.t = Math.abs(theater.angle) / Math.PI;
    theater.flipped = false;
    phase = 'flipping';
    lastGestureRec = { verdict: 'flicked', velocity: vel };
    ctx.status(`flicked (${vel.toFixed(2)} px/ms) — ${spec.done}`);
  } else {
    lastGestureRec = { verdict: 'weak', velocity: vel };
    const travel = Math.hypot(z.x - a.x, z.y - a.y);
    if (travel < 6) {
      const rid = theater.rid;
      finishTheater(ctx, true); // the tap: reattach FIRST, then nudge the real pile (I-115's lesson)
      nudgeStack(ctx.theater.focusObject(`table:${rid}`));
      ctx.status('the stack shifts — grab the top card and FLICK to take it');
    } else {
      settleBack();
      ctx.status(`too soft (${vel.toFixed(2)} px/ms < ${FLICK_T}) — the card settles back`);
    }
  }
  return true;
}

function settleBack(): void { phase = 'settling'; if (theater) { theater.t = 0; theater.settleFrom = theater.mesh.position.clone(); } }

export function abortGrab(): void { if (phase === 'grabbing') settleBack(); }

/** a rebuild mid-flip/route drops the theater cleanly — the verb already landed, so the
 *  fresh build seats the instance at its true anchor (never two cards, K7-Q M4's law). */
export function resetSupply(ctx: PlayAreaContext): void {
  if (!theater || phase === 'idle' || phase === 'grabbing' || phase === 'settling') return;
  delete theater.mesh.userData['drawGrabMesh'];
  ctx.scene.remove(theater.mesh); // detached, never disposed — the next claim re-poses it
  theater = null;
  phase = 'idle';
}

export function tickSupply(ctx: PlayAreaContext): void {
  if (!theater) return;
  if (phase === 'flipping') {
    theater.t = Math.min(1, theater.t + theater.flipSpeed);
    const pT = theater.t;
    const ease = pT * pT * (3 - 2 * pT);
    theater.mesh.position.set(theater.from.x, theater.from.y + Math.sin(pT * Math.PI) * theater.flipLift + 6, theater.from.z);
    // the instance flip: continuous X rotation face-down → face-up, exact both ways (I-154)
    theater.mesh.rotation.set(Math.PI / 2 + theater.flipDir * Math.PI * ease, 0, 0);
    if (pT >= 0.5 && !theater.flipped) {
      theater.flipped = true;
      if (theater.newId) cardInstance(String(theater.mesh.userData['cardId'] ?? ''))?.setFace([theater.newId]); // truth wins — the popped card shows even if identity broke
    }
    if (pT >= 1) {
      theater.mesh.rotation.set(-Math.PI / 2, 0, 0);
      // the ANCHOR CHANGE: travel to the viewer's seat area; the rebuild then seats it
      // in its exact row slot (the placement IS the state's — never invented here).
      const v = ctx.projection();
      const idx = v.seats.findIndex((s) => s.id === ctx.viewSeat);
      const sf = seatFrame(ctx, Math.max(0, idx));
      theater.routeFrom = theater.mesh.position.clone();
      theater.routeTo = sf
        ? sf.c.clone().addScaledVector(sf.n, 90).setY(theater.from.y)
        : theater.mesh.position.clone();
      theater.t = 0;
      phase = 'routing';
    }
    return;
  }
  if (phase === 'routing' && theater.routeFrom && theater.routeTo) {
    theater.t = Math.min(1, theater.t + 0.055);
    const pT = theater.t;
    const ease = pT * pT * (3 - 2 * pT);
    theater.mesh.position.lerpVectors(theater.routeFrom, theater.routeTo, ease);
    theater.mesh.position.y += Math.sin(pT * Math.PI) * 34; // the carry arc — no teleport
    if (pT >= 1) {
      lastMoveRec = {
        rid: theater.rid, id: theater.newId ?? '(none)', identityOk: theater.identityOk === true,
        endX: theater.mesh.position.x, endY: theater.mesh.position.y, endZ: theater.mesh.position.z,
        targetX: theater.routeTo.x, targetY: theater.routeTo.y, targetZ: theater.routeTo.z,
      };
      finishTheater(ctx);
      ctx.rebuild(); // truth renders — the same instance claimed into its row slot
    }
    return;
  }
  if (phase === 'settling') {
    theater.t = Math.min(1, theater.t + 0.12);
    const back = 1 - theater.t;
    const sf2 = theater.settleFrom ?? theater.from;
    theater.mesh.position.set(
      sf2.x + (theater.from.x - sf2.x) * theater.t,
      theater.from.y + back * (6 + Math.abs(theater.angle) * 22),
      sf2.z + (theater.from.z - sf2.z) * theater.t);
    theater.mesh.rotation.set(Math.PI / 2, 0, 0);
    theater.mesh.rotateY(theater.angle * back);
    if (theater.t >= 1) finishTheater(ctx, true);
  }
}

function finishTheater(ctx: PlayAreaContext, reattach = false): void {
  if (!theater) return;
  delete theater.mesh.userData['drawGrabMesh'];
  if (reattach && theater.homeGroup && theater.homeGroup.parent) {
    (theater.homeGroup as THREE.Group).attach(theater.mesh);
    theater.mesh.position.copy(theater.homeLocal.pos);
    theater.mesh.quaternion.copy(theater.homeLocal.quat);
  } else if (reattach) {
    ctx.scene.remove(theater.mesh); // a stale home (rebuilt underneath) — park; the next build re-claims
  }
  theater = null;
  phase = 'idle';
}

// ── the __GAME3D__ oracles (STATE, never pixels — I-57c) ──
export const supplyPhase = (): Phase => phase;
export const supplyGesture = () => (lastGestureRec ? { ...lastGestureRec, threshold: FLICK_T } : null);
export const supplyLastMove = () => lastMoveRec;
export const supplyGrabUuid = (): string | null => (theater ? theater.mesh.uuid : null);
