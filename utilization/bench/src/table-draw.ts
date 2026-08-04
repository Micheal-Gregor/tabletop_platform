/**
 * TABLE-DRAW — the draw-theater cluster (Q-2b I-91 · I-110/112/113; a size-gate
 * extraction from components/table.ts). THE LAW: the REAL top box grabs (I-112,
 * three-objects), follows the pointer (I-110), tilts SIGNED below the reveal; release
 * ≥ FLICK_T → the draw SUBMITS and the flip completes IN THE FLICK'S DIRECTION at a
 * velocity-scaled pace within tight clamps — completion GUARANTEED (I-113); weak →
 * the SAME card re-attaches face down, state invariant; a tap nudges the stack
 * (I-110). On onion close the card ROUTES to its derived destination (I-92).
 */
import * as THREE from 'three';
import { beginFlourish, completeFlourish } from '@tabletop/presentation';
import type { PlayAreaContext, PickInfo } from './component.js';
import { fortuneFaceTexture } from './surfaces.js';
import { nudgeStack } from './stacks.js';
import * as onion from './onion.js';
import { routeDestFor, findCardMesh, stackTop } from './draw-route.js'; // R-1a6 (I-115): the owed extraction

export type DrawPhase = 'idle' | 'grabbing' | 'flipping' | 'reading' | 'routing' | 'settling';
let phase: DrawPhase = 'idle';
const FLICK_T = 0.35; // px/ms — the flick threshold (owner seals feel at playtest, I-91)
const TILT_MAX = Math.PI * 0.45; // below the face-reveal angle: face-down stays unknown

let theater: {
  mesh: THREE.Mesh; from: THREE.Vector3; t: number;
  homeGroup: THREE.Object3D | null; homeLocal: { pos: THREE.Vector3; quat: THREE.Quaternion } | null; // I-112: the REAL card's home
  swappedFace: THREE.Material | null; // I-112: the fortune face we added to the box (ours to dispose)
  bound: { minX: number; maxX: number; minZ: number; maxZ: number } | null; // R-1a2 (I-110): the drag-follow clamp
  settleFrom: THREE.Vector3 | null; // R-1a2: the weak settle glides HOME from here
  inst: ReturnType<typeof beginFlourish> | null; seeded: string; flipped: boolean;
  hiddenTop: THREE.Object3D | null;
  routeFrom: THREE.Vector3 | null; routeTo: THREE.Vector3 | null; dest: string | null;
  destPos: THREE.Vector3 | null; // the card's OWN rendered spot in the derived view (I-92)
  angle: number; samples: { x: number; y: number; t: number }[];
  flipDir: number; flipSpeed: number; flipLift: number; // R-1a5 (I-113): direction + tight physics-responsiveness
} | null = null;
let lastRouteRec: { dest: string; endX: number; endY: number; endZ: number; targetX: number; targetY: number; targetZ: number } | null = null;
let lastGesture: { verdict: 'flicked' | 'weak'; velocity: number } | null = null;
let forceMismatch = false; // the committed forced-mismatch drill — one-shot

/** GRAB: claims only on the deck, the VIEWER'S turn, theater idle (contract v2). */
export function grabStart(ctx: PlayAreaContext, hit: PickInfo): boolean {
  if (phase !== 'idle' || hit.region !== 'deck') return false;
  const v = ctx.projection();
  const active = v.seats[v.turn.seatIdx]!.id;
  if (active !== ctx.viewSeat) return false; // not your turn — the fidget keeps the click
  if ((v.decks[active]?.drawCount ?? 0) < 1) return false;
  const dt = stackTop(ctx, 'deck');
  if (!dt.mesh) return false;
  const from = dt.pos.clone();
  // I-112 (owner-caught): the grabbed card IS the real top box — scene.attach (the P-2c
  // three-objects pattern); nothing hidden; the box survives rebuilds scene-parented.
  const m = dt.mesh as THREE.Mesh;
  const homeGroup = m.parent;
  const homeLocal = { pos: m.position.clone(), quat: m.quaternion.clone() };
  ctx.scene.attach(m);
  m.userData['drawGrabMesh'] = true; // S-1 (I-103): the orphan oracle counts this tag at idle
  let bound: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
  const tbl = ctx.theater.focusObject('table');
  if (tbl) { const bb = new THREE.Box3().setFromObject(tbl); bound = { minX: bb.min.x + 30, maxX: bb.max.x - 30, minZ: bb.min.z + 40, maxZ: bb.max.z - 40 }; }
  theater = {
    mesh: m, from, t: 0, bound, settleFrom: null, homeGroup, homeLocal, swappedFace: null, inst: null, seeded: '', flipped: false,
    hiddenTop: null, routeFrom: null, routeTo: null, dest: null, destPos: null,
    angle: 0, samples: [{ x: hit.event.clientX, y: hit.event.clientY, t: performance.now() }],
    flipDir: 0, flipSpeed: 0.06, flipLift: 16, // flipDir 0 until the flick SIGNS it (I-115/M2 — the tautology killed)
  };
  phase = 'grabbing';
  ctx.status('grabbed the top card — flick to flip it');
  return true;
}

export function grabMove(ctx: PlayAreaContext, ev: PointerEvent): void {
  if (phase !== 'grabbing' || !theater) return;
  theater.samples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
  if (theater.samples.length > 6) theater.samples.shift();
  const d = Math.hypot(ev.clientX - theater.samples[0]!.x, ev.clientY - theater.samples[0]!.y);
  // R-1a5 (I-113): the tilt is SIGNED by the drag's screen-x — the card LEANS the way you
  // pull; the magnitude stays CLAMPED below the reveal (the reveal-order law unchanged).
  const lean = ev.clientX - theater.samples[0]!.x >= 0 ? 1 : -1;
  theater.angle = lean * Math.min(TILT_MAX, d / 90);
  // I-110: the card FOLLOWS the pointer on the deck-top plane, clamped to the table.
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
  theater.mesh.rotation.set(-Math.PI / 2, 0, 0);
  theater.mesh.rotateY(theater.angle);
}

/** RELEASE: velocity ≥ FLICK_T → SUBMIT + momentum flip; else settle back, NO draw. */
export function grabEnd(ctx: PlayAreaContext, ev: PointerEvent): boolean {
  if (phase !== 'grabbing' || !theater) return false;
  theater.samples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
  const a = theater.samples[0]!, z = theater.samples[theater.samples.length - 1]!;
  const dt = Math.max(1, z.t - a.t);
  const vel = Math.hypot(z.x - a.x, z.y - a.y) / dt;
  if (vel >= FLICK_T) {
    const before = ctx.projection();
    const active = before.seats[before.turn.seatIdx]!.id;
    if (!ctx.submit('draw', { deck: active })) { settleBack(); return true; }
    const after = ctx.projection();
    theater.seeded = after.decks[active]?.discardTop ?? '(none)';
    theater.inst = beginFlourish('card-flip', theater.seeded, '♪ card flip');
    ctx.rebuild(); // geometry is the count — the deck is one shorter
    // Q-2c (I-92): the rebuilt DERIVED VIEW already renders the card at its destination
    // (global slot · session row · pile top) — hide that mesh; the traveler IS the card
    // until it lands there.
    const dest = routeDestFor(theater.seeded);
    const target = findCardMesh(ctx, theater.seeded, dest);
    if (target.mesh) target.mesh.visible = false;
    theater.hiddenTop = target.mesh;
    theater.destPos = target.pos.clone();
    theater.dest = dest;
    theater.from = new THREE.Vector3(theater.mesh.position.x, theater.from.y, theater.mesh.position.z); // R-1a2: the flip happens WHERE RELEASED
    // R-1a5 (I-113): flicked right → clockwise, left → counter-clockwise; speed + lift
    // scale with the flick velocity WITHIN TIGHT CLAMPS — and the flip ALWAYS completes.
    theater.flipDir = z.x - a.x >= 0 ? 1 : -1;
    theater.flipSpeed = Math.max(0.045, Math.min(0.09, 0.03 + vel * 0.015));
    theater.flipLift = Math.max(12, Math.min(26, 8 + vel * 5));
    theater.t = Math.abs(theater.angle) / Math.PI; // momentum: the flip continues from the lean
    phase = 'flipping';
    lastGesture = { verdict: 'flicked', velocity: vel };
    ctx.status(`flicked (${vel.toFixed(2)} px/ms) — the card flips · ♪ card flip`);
  } else {
    lastGesture = { verdict: 'weak', velocity: vel };
    const travel = Math.hypot(z.x - a.x, z.y - a.y);
    if (travel < 6) { // I-110 TAP + R-1a6 (I-115, K7-R M1): REATTACH the real top FIRST —
      // a tap barely lifted it; instant re-attach puts ALL 36 in the group, so the nudge
      // moves the card the owner is actually tapping (I-112 had silently excluded it).
      finishTheater(ctx, true);
      nudgeStack(ctx.theater.focusObject('table:deck'));
      ctx.status('the stack shifts — grab the top card and FLICK to flip it');
    } else {
      settleBack();
      ctx.status(`too soft (${vel.toFixed(2)} px/ms < ${FLICK_T}) — the card settles back face down`);
    }
  }
  return true; // the gesture consumed the click either way
}

function settleBack(): void { phase = 'settling'; if (theater) { theater.t = 0; theater.settleFrom = theater.mesh.position.clone(); } } // R-1a2: glide home from HERE

/** CONTRACT v3 (S-1, I-103) — the ABORT: a live GRAB settles back face down (the weak-
 *  flick path — graceful for pointercancel AND for a rebuild arriving mid-grab). */
export function abortGrab(): void {
  if (phase === 'grabbing') settleBack();
}

/** S-1 (I-103), closing K7-Q M4's theater half: a REBUILD while the flip/reading/routing
 *  theater is live drops it cleanly — the traveler is removed, a draw-reading onion
 *  closes, the fresh build renders the card at its true destination (never two cards).
 *  'grabbing' and 'settling' are NOT touched: a completing flick rebuilds mid-release by
 *  design (its theater continues), and a settling card finishes its glide harmlessly. */
export function resetDraw(ctx: PlayAreaContext): void {
  if (!theater || phase === 'idle' || phase === 'grabbing' || phase === 'settling') return;
  if (phase === 'reading' && onion.onionState().open) onion.closeOnion();
  delete theater.mesh.userData['drawGrabMesh'];
  ctx.scene.remove(theater.mesh);
  if (theater.swappedFace) theater.swappedFace.dispose();
  theater = null;
  phase = 'idle';
}

/** onion close → ROUTE the same card (real movement, no teleport) to where the derived
 *  view placed it — first open global slot · session row · or the discard top (I-92). */
export function startRoute(ctx: PlayAreaContext): void {
  if (!theater) { phase = 'idle'; return; }
  theater.routeFrom = theater.mesh.position.clone();
  theater.routeTo = (theater.destPos ?? stackTop(ctx, 'discard').pos).clone();
  theater.dest = theater.dest ?? 'discard';
  theater.t = 0;
  phase = 'routing';
}

function finishTheater(ctx: PlayAreaContext, reattach = false): void {
  if (!theater) return;
  if (theater.hiddenTop) theater.hiddenTop.visible = true; // the DESTINATION reveal (I-112: the source is never hidden)
  delete theater.mesh.userData['drawGrabMesh'];
  if (reattach && theater.homeGroup && theater.homeGroup.parent) {
    // I-112: the weak settle puts THE SAME CARD back at its exact slot (the discard pattern)
    (theater.homeGroup as THREE.Group).attach(theater.mesh);
    if (theater.homeLocal) { theater.mesh.position.copy(theater.homeLocal.pos); theater.mesh.quaternion.copy(theater.homeLocal.quat); }
  } else {
    ctx.scene.remove(theater.mesh); // the route's traveler retires — the fresh build's card is the truth
  }
  if (theater.swappedFace) theater.swappedFace.dispose();
  theater = null;
  phase = 'idle';
}

/** the per-frame step: the momentum flip → onion display · the settle-back · the route. */
export function tickDraw(ctx: PlayAreaContext): void {
  if (!theater) return;
  if (phase === 'flipping') {
    theater.t = Math.min(1, theater.t + theater.flipSpeed); // R-1a5: responsive, ALWAYS completes
    const pT = theater.t;
    const ease = pT * pT * (3 - 2 * pT);
    theater.mesh.position.set(theater.from.x, theater.from.y + Math.sin(pT * Math.PI) * theater.flipLift + 6, theater.from.z);
    theater.mesh.rotation.set(-Math.PI / 2, 0, 0);
    theater.mesh.rotateY(theater.flipDir * Math.PI * ease); // R-1a5: the flick's direction
    if (pT >= 0.5 && !theater.flipped) {
      theater.flipped = true; // the midpoint face-swap — always post-release + post-submit
      const displayed = forceMismatch ? 'WRONG-CARD' : theater.seeded;
      // I-112: the box's UNDERSIDE slot (−z, index 5) receives the face — after the π flip
      // it ends UP-FACING and the original back faces down. Never the shared side material.
      const face = new THREE.MeshBasicMaterial({ map: fortuneFaceTexture(displayed) });
      const mats = theater.mesh.material as THREE.Material[];
      mats[5] = face;
      theater.swappedFace = face;
    }
    if (pT >= 1) {
      theater.mesh.position.copy(theater.from);
      // I-113 (fixing the I-112 latent end-pose bug): the end pose is the FLIPPED, face-up
      // rotation — the underside slot (the fortune face) stays UP through reading + routing.
      theater.mesh.rotation.set(-Math.PI / 2, 0, 0);
      theater.mesh.rotateY(theater.flipDir * Math.PI);
      const displayed = forceMismatch ? 'WRONG-CARD' : theater.seeded;
      const verdict = completeFlourish(theater.inst!, displayed); // HK-11 — truth wins (R-20)
      theater.inst = null;
      onion.setOnionVerdict({ mismatch: verdict.mismatch !== null, displayed, seeded: theater.seeded });
      onion.openOnion(verdict.result, verdict.mismatch !== null); // DISPLAYS — no rising animation
      if (verdict.mismatch) ctx.status('⚑ theater mismatch — truth wins (R-20)');
      forceMismatch = false;
      phase = 'reading';
    }
    return;
  }
  if (phase === 'settling') {
    theater.t = Math.min(1, theater.t + 0.12);
    const back = 1 - theater.t;
    const sf = theater.settleFrom ?? theater.from; // R-1a2: the dragged card GLIDES back to the deck
    theater.mesh.position.set(
      sf.x + (theater.from.x - sf.x) * theater.t,
      theater.from.y + back * (6 + Math.abs(theater.angle) * 22),
      sf.z + (theater.from.z - sf.z) * theater.t);
    theater.mesh.rotation.set(-Math.PI / 2, 0, 0);
    theater.mesh.rotateY(theater.angle * back + Math.sin(theater.t * Math.PI * 3) * 0.05 * back); // the nudge wiggle (signed lean unwinds)
    if (theater.t >= 1) finishTheater(ctx, true); // the SAME card, back on the pile — nothing happened (I-112)
    return;
  }
  if (phase === 'routing' && theater.routeFrom && theater.routeTo) {
    theater.t = Math.min(1, theater.t + 0.055);
    const pT = theater.t;
    const ease = pT * pT * (3 - 2 * pT);
    theater.mesh.position.lerpVectors(theater.routeFrom, theater.routeTo, ease);
    theater.mesh.position.y += Math.sin(pT * Math.PI) * 34; // the carry arc — no teleport
    if (pT >= 1) {
      theater.mesh.position.copy(theater.routeTo);
      lastRouteRec = {
        dest: theater.dest ?? 'discard',
        endX: theater.mesh.position.x, endY: theater.mesh.position.y, endZ: theater.mesh.position.z,
        targetX: theater.routeTo.x, targetY: theater.routeTo.y, targetZ: theater.routeTo.z,
      };
      finishTheater(ctx);
    }
  }
}

// ── the __GAME3D__ oracles (STATE, never pixels — I-57c) ──
export const drawPhaseState = (): DrawPhase => phase;
export const setForceFlipMismatch = (v: boolean): void => { forceMismatch = v; };
export const lastRoute = () => lastRouteRec;
export const drawGesture = () => (lastGesture ? { ...lastGesture, threshold: FLICK_T } : null);
export const drawGrabUuid = (): string | null => (theater ? theater.mesh.uuid : null); // I-112: the identity oracle
export const drawFlipDir = (): number | null => (theater && (phase === 'flipping' || phase === 'reading' || phase === 'routing') ? theater.flipDir : null); // I-113
/** I-115 (K7-R M3): the traveler's FACE-UP truth — the local −z (the fortune face,
 *  slot 5) through the live quaternion; ≈+1 face-up, ≈−1 the I-112 back-showing bug. */
export const drawFaceUp = (): number | null => (theater ? new THREE.Vector3(0, 0, -1).applyQuaternion(theater.mesh.quaternion).y : null);
export function drawTheaterInfo(ctx: PlayAreaContext) {
  if (!theater) return null;
  const dp = stackTop(ctx, 'deck').pos;
  const p = theater.mesh.position;
  return { phase, card: { x: p.x, y: p.y, z: p.z }, deck: { x: dp.x, y: dp.y, z: dp.z } };
}
