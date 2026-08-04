/**
 * DISCARD-PLAY (Q-6, I-94) — THE LIVE DISCARD PILE. Face-up real cards, moved by real
 * 3D animation, never teleported (the owner's law):
 *  - CLICK the pile → the 3-step fidget cycle, ANIMATED: the next state's stack builds
 *    invisible, its per-card poses become tween targets, the old meshes glide there,
 *    then the groups swap at identical poses (the "cheap image thing" closed).
 *  - GRAB a card → scene.attach (world pose preserved), drag/toss on the ground plane;
 *    a slow release leaves it LOOSE for ~2s (a frame-counted hold surfaced as state),
 *    then it GLIDES BACK to its exact slot in pile order (group.attach at arrival).
 *  - FLICK a card (fast release) → it returns home AND the onion OPENS READING it —
 *    the deck's mechanics mirrored. The full drawn-this-turn browse stays deferred.
 * Pure theater throughout: no verb, no state, rowHash/moveCount invariant.
 */
import * as THREE from 'three';
import type { PlayAreaContext } from './component.js';
import * as onion from './onion.js';
import { simulateSlide, feltFrameToWorld } from './die-physics.js'; // R-1b (I-122)
import type { SimFrame } from './die-physics.js';
import type { TableRect } from './die.js';

const FLICK_T = 0.35; // px/ms — the same gesture threshold as the deck (I-91)
const HOLD_FRAMES = 120; // "a couple seconds" (I-82d) before the return glide

type Gest = {
  mesh: THREE.Object3D;
  group: THREE.Object3D; // the discard stack group (the card's home parent)
  homeLocal: { pos: THREE.Vector3; quat: THREE.Quaternion };
  cardId: string; idx: number; total: number;
  phase: 'held' | 'sliding' | 'loose' | 'returning';
  hold: number; t: number; fromPos: THREE.Vector3 | null;
  wasLoose: boolean; // a re-grabbed loose card — the click fall-through never applies
  samples: { x: number; y: number; t: number }[];
  planePts: { x: number; z: number; t: number }[]; // R-1b (I-122): the SAME plane as the follow (I-117's one-frame law)
  slide: { frames: SimFrame[]; i: number; rect: TableRect; baseQuat: THREE.Quaternion } | null;
  plane: THREE.Plane; ray: THREE.Raycaster;
};
// Q-6b (I-95): THE GESTURE POOL — one card HELD (one pointer), any number LOOSE or
// RETURNING; every reachable card stays live while others are out of the way.
let held: Gest | null = null;
let pool: Gest[] = [];
let flickRead: { cardId: string; idx: number } | null = null;

// ── the fidget TWEEN (click = the 3-step animation) ──
let tween: { pairs: { mesh: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; fromR: number; toR: number }[]; next: THREE.Group; old: THREE.Group; t: number } | null = null;
// G-1 (I-101) MOTION TRACES — oracle-only counters (M6/M8 teeth): frames where poses
// actually CHANGED during the tween / the return glide. An identity-tween or snap-home
// mutant records 0..1 frames and fails the gate BY NAME. Zero behavior change.
let tweenTrace: { frames: number; maxMove: number } | null = null;
let returnTrace: { frames: number; dist: number } | null = null;
let slideTrace: { steps: number; dist: number } | null = null; // R-1b (I-122): the toss-physics oracle

export const discardGrabbing = (): 'held' | 'sliding' | 'loose' | 'returning' | null =>
  held ? 'held' : pool.some((g) => g.phase === 'sliding') ? 'sliding' : pool.some((g) => g.phase === 'loose') ? 'loose' : pool.length ? 'returning' : null;
export const discardPoolSize = () => pool.length + (held ? 1 : 0);
export const discardFidgetTransitioning = () => tween !== null;
export const lastFlickRead = () => flickRead;
export const discardTweenTrace = () => tweenTrace;
export const discardReturnTrace = () => returnTrace;
export const discardSlideTrace = () => slideTrace;

/** a rebuild resets the whole gesture pool — the fresh stack renders truth (K7-P D2). */
export function resetDiscardPlay(): void {
  if (held) { held.mesh.parent?.remove(held.mesh); held = null; }
  for (const g of pool) g.mesh.parent?.remove(g.mesh);
  pool = [];
  if (tween) { tween.next.visible = true; tween = null; }
}

export function discardGrabStart(ctx: PlayAreaContext, mesh: THREE.Object3D, group: THREE.Object3D, ev: PointerEvent): boolean {
  if (held || tween) return false; // one pointer, one held card; the POOL may be full of loose ones
  // RE-GRAB a loose/returning card: its gesture (with the ORIGINAL slot) leaves the pool.
  const existing = pool.find((g) => g.mesh === mesh);
  if (existing) {
    pool = pool.filter((g) => g !== existing);
    existing.phase = 'held';
    existing.wasLoose = true;
    existing.samples = [{ x: ev.clientX, y: ev.clientY, t: performance.now() }];
    existing.planePts = []; existing.slide = null; // R-1b: a fresh gesture, fresh plane window
    held = existing;
    ctx.status(`picked ${existing.cardId} up again`);
    return true;
  }
  const cards: THREE.Object3D[] = [];
  group.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) cards.push(o); });
  const cardId = ((mesh.userData['renderedLines'] as string[] | undefined)?.[0]) ?? '(card)';
  held = {
    mesh, group,
    homeLocal: { pos: mesh.position.clone(), quat: mesh.quaternion.clone() },
    cardId, idx: (mesh.userData['idx'] as number) ?? 0, total: cards.length,
    phase: 'held', hold: 0, t: 0, fromPos: null, wasLoose: false,
    samples: [{ x: ev.clientX, y: ev.clientY, t: performance.now() }],
    planePts: [], slide: null, // R-1b (I-122)
    plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -8), ray: new THREE.Raycaster(),
  };
  ctx.scene.attach(mesh); // the SAME object, world pose preserved — never a copy
  mesh.userData['discardLoose'] = true; // re-grabbable while off the pile (I-95)
  ctx.status(`picked ${cardId} off the pile — toss it, or flick to read`);
  return true;
}

export function discardGrabMove(ctx: PlayAreaContext, ev: PointerEvent): void {
  if (!held) return;
  held.samples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
  if (held.samples.length > 6) held.samples.shift();
  const r = ctx.renderer.domElement.getBoundingClientRect();
  held.ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
  const p = new THREE.Vector3();
  if (held.ray.ray.intersectPlane(held.plane, p)) {
    held.mesh.position.set(p.x, Math.max(10, p.y + 12), p.z);
    // R-1b (I-122): the slide's velocity window — sampled in THE SAME PLANE as the
    // follow (the I-117 one-frame law; world velocity is never inferred from pixels).
    held.planePts.push({ x: p.x, z: p.z, t: performance.now() });
    if (held.planePts.length > 6) held.planePts.shift();
  }
}

export function discardGrabEnd(ctx: PlayAreaContext, ev: PointerEvent): boolean {
  if (!held) return false;
  const g = held;
  g.samples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
  const a = g.samples[0]!, z = g.samples[g.samples.length - 1]!;
  const dist = Math.hypot(z.x - a.x, z.y - a.y);
  if (dist < 6 && !g.wasLoose) {
    // a plain CLICK on the pile, not a grab — put the untouched card straight back and
    // FALL THROUGH to the fidget (never applies to a re-grabbed loose card, I-95).
    delete g.mesh.userData['discardLoose'];
    (g.group as THREE.Group).attach(g.mesh);
    g.mesh.position.copy(g.homeLocal.pos);
    g.mesh.quaternion.copy(g.homeLocal.quat);
    held = null;
    return false; // Phase 0/2 proceed — onPick runs the animated fidget cycle
  }
  held = null;
  const vel = dist / Math.max(1, z.t - a.t);
  if (vel >= FLICK_T) {
    // FLICK → return home AND read it ("the same mechanics open the drawn-this-turn onion")
    flickRead = { cardId: g.cardId, idx: g.idx };
    onion.setOnionVerdict(null);
    onion.openOnion(g.cardId, false); // the reading board displays the flicked card
    g.phase = 'returning'; g.t = 0; g.fromPos = g.mesh.position.clone();
    ctx.status(`reading ${g.cardId} — drawn · discard #${g.total - g.idx} of ${g.total}`);
  } else {
    // R-1b (I-122): the TOSS now SLIDES with real momentum — a burst sim replayed
    // (record-and-replay; no live session, so a die drag never contends). Fallbacks
    // (physics cold · no table · a degenerate ≤1-step sim, i.e. drag-stop-release)
    // keep the existing loose-where-dropped behavior — both are the registered
    // interpretation, and both END in the same loose→return-glide pipeline.
    const slid = beginSlide(ctx, g);
    g.phase = slid ? 'sliding' : 'loose'; g.hold = 0;
    ctx.status(slid ? 'tossed — it slides, then finds its way back' : 'tossed — it will find its way back to the pile');
  }
  pool.push(g);
  return true;
}

/** R-1b (I-122): launch the slide sim from the release pose + the plane-window velocity.
 *  Returns whether a real slide begins (≥2 recorded frames and real motion). */
function beginSlide(ctx: PlayAreaContext, g: Gest): boolean {
  if (g.planePts.length < 2) return false;
  const t0 = ctx.theater.focusObject('table');
  if (!t0) return false;
  t0.updateWorldMatrix(true, true);
  const tb = new THREE.Box3().setFromObject(t0);
  const rect: TableRect = { minX: tb.min.x, maxX: tb.max.x, minZ: tb.min.z, maxZ: tb.max.z, topY: tb.max.y };
  const a = g.planePts[0]!, z = g.planePts[g.planePts.length - 1]!;
  const dt = Math.max(1, z.t - a.t); // ms
  const vel = { x: ((z.x - a.x) / dt) * 1000, z: ((z.z - a.z) / dt) * 1000 }; // world units/s (the R-1a ×1000 lesson)
  if (Math.hypot(vel.x, vel.z) < 40) return false; // a near-still release lies where dropped
  const mb = new THREE.Box3().setFromObject(g.mesh);
  const halfM = { // half-extents DERIVED from the live world bbox — never magic dims
    hx: Math.max(0.001, (mb.max.x - mb.min.x) / 2 / 900),
    hy: Math.max(0.0005, (mb.max.y - mb.min.y) / 2 / 900),
    hz: Math.max(0.001, (mb.max.z - mb.min.z) / 2 / 900),
  };
  const res = simulateSlide(rect, { x: g.mesh.position.x, z: g.mesh.position.z }, vel, halfM);
  if (!res || res.frames.length < 2) return false;
  slideTrace = { steps: res.steps, dist: res.dist };
  g.slide = { frames: res.frames, i: 0, rect, baseQuat: g.mesh.quaternion.clone() };
  return true;
}

/** CONTRACT v3 (S-1, I-103) — the ABORT for a HELD discard card: it goes home by the
 *  existing return glide (never a vanish, never a snap) — graceful for pointercancel
 *  and for a rebuild (whose purge then simply covers a returning pool card). */
export function discardGrabCancel(): void {
  if (!held) return;
  const g = held;
  held = null;
  g.phase = 'returning'; g.t = 0; g.fromPos = g.mesh.position.clone();
  pool.push(g);
}

/** CLICK = the 3-step fidget, ANIMATED: tween the live cards to the NEXT state's poses.
 *  S-1 (I-103, closing K7-Q M5): returns WHETHER the tween was accepted — the caller
 *  commits the fidget counter only on true (a refused click no longer advances state
 *  it did not animate, so the pile can never SNAP on the next rebuild). */
export function startFidgetTween(ctx: PlayAreaContext, oldGroup: THREE.Group, nextGroup: THREE.Group): boolean {
  if (tween || held || pool.length) { nextGroup.parent?.remove(nextGroup); return false; } // never swap under out-of-pile cards (I-95)
  nextGroup.visible = false;
  ctx.scene.updateMatrixWorld(true);
  const oldCards: THREE.Object3D[] = [], nextCards: THREE.Object3D[] = [];
  oldGroup.traverse((o) => { if (o.userData?.['card']) oldCards.push(o); });
  nextGroup.traverse((o) => { if (o.userData?.['card']) nextCards.push(o); });
  oldCards.sort((x, y) => (x.userData['idx'] as number) - (y.userData['idx'] as number));
  nextCards.sort((x, y) => (x.userData['idx'] as number) - (y.userData['idx'] as number));
  const pairs = oldCards.map((m, i) => {
    const tgt = nextCards[i];
    return {
      mesh: m,
      from: m.position.clone(),
      to: tgt ? tgt.position.clone() : m.position.clone(),
      fromR: m.rotation.z,
      toR: tgt ? tgt.rotation.z : m.rotation.z,
    };
  });
  tween = { pairs, next: nextGroup, old: oldGroup, t: 0 };
  tweenTrace = { frames: 0, maxMove: 0 }; // G-1 (I-101): the motion trace opens with the tween
  return true;
}

/** per-frame: the fidget tween · every pooled card's hold/return (I-95: independent). */
export function tickDiscardPlay(_ctx: PlayAreaContext): void {
  if (tween) {
    tween.t = Math.min(1, tween.t + 0.08);
    const e = tween.t * tween.t * (3 - 2 * tween.t);
    let stepMove = 0; // G-1 (I-101): how far anything ACTUALLY moved this frame
    for (const p of tween.pairs) {
      const before = p.mesh.position.clone();
      p.mesh.position.lerpVectors(p.from, p.to, e);
      p.mesh.rotation.z = p.fromR + (p.toR - p.fromR) * e;
      stepMove = Math.max(stepMove, p.mesh.position.distanceTo(before));
    }
    if (tweenTrace && stepMove > 1e-6) { tweenTrace.frames++; tweenTrace.maxMove = Math.max(tweenTrace.maxMove, stepMove); }
    if (tween.t >= 1) { // swap at IDENTICAL poses — invisible
      tween.old.parent?.remove(tween.old);
      tween.next.visible = true;
      tween = null;
    }
    return;
  }
  for (const g of [...pool]) {
    if (g.phase === 'sliding' && g.slide) {
      // R-1b (I-122): replay the recorded slide — position from the frame, the physics
      // YAW composed on the release quat (rotations were locked to yaw in the sim, so
      // the card spins flat exactly as simulated; the card never tumbles).
      const s = g.slide;
      s.i = Math.min(s.frames.length - 1, s.i + 1);
      const fr = s.frames[s.i]!;
      const w = feltFrameToWorld(s.rect, fr);
      g.mesh.position.set(w.x, Math.max(w.y, s.rect.topY + 0.5), w.z);
      g.mesh.quaternion.copy(new THREE.Quaternion(fr.qx, fr.qy, fr.qz, fr.qw).multiply(s.baseQuat));
      if (s.i >= s.frames.length - 1) { g.slide = null; g.phase = 'loose'; g.hold = 0; } // → the same loose→return pipeline
      continue;
    }
    if (g.phase === 'loose') {
      g.hold++;
      if (g.hold >= HOLD_FRAMES) { g.phase = 'returning'; g.t = 0; g.fromPos = g.mesh.position.clone(); }
      continue;
    }
    if (g.phase === 'returning' && g.fromPos) {
      if (g.t === 0) returnTrace = { frames: 0, dist: 0 }; // G-1 (I-101): the glide trace opens
      g.t = Math.min(1, g.t + 0.06);
      const e = g.t * g.t * (3 - 2 * g.t);
      g.group.updateWorldMatrix(true, false);
      const home = g.group.localToWorld(g.homeLocal.pos.clone()); // the slot, recomputed LIVE
      const before = g.mesh.position.clone();
      g.mesh.position.lerpVectors(g.fromPos, home, e);
      g.mesh.position.y += Math.sin(g.t * Math.PI) * 26; // the carry arc
      if (returnTrace && g.mesh.position.distanceTo(before) > 1e-6) { returnTrace.frames++; returnTrace.dist = Math.max(returnTrace.dist, g.fromPos.distanceTo(home)); }
      if (g.t >= 1) {
        delete g.mesh.userData['discardLoose'];
        (g.group as THREE.Group).attach(g.mesh); // back in the pile — the same object
        g.mesh.position.copy(g.homeLocal.pos); // its exact slot in pile order
        g.mesh.quaternion.copy(g.homeLocal.quat);
        pool = pool.filter((x) => x !== g);
      }
    }
  }
}
