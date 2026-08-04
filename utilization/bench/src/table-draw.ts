/**
 * TABLE-DRAW — the draw-theater cluster (Q-2b, I-91; a size-gate extraction from
 * components/table.ts). THE FLICK-TO-FLIP LAW (owner-ruled): pointerdown on the deck's
 * top card GRABS it (viewer's turn only) — it lifts and TILTS with the drag, face still
 * down (nothing revealed before the engine speaks); release with velocity ≥ FLICK_T →
 * the draw SUBMITS through the same doors and the flip completes with momentum (midpoint
 * face-swap — always post-release), HK-11 at flip end, then the onion just DISPLAYS the
 * card ("let go and THEN the pop-up shows"). A weak flick or a tap → NO submit: the card
 * settles back FACE DOWN (a nudge wiggle) — rowHash/moveCount invariant, pure theater.
 * On onion close the SAME card ROUTES (glide + arc, no teleport) to its destination —
 * engine truth (today the discard; the global/local branches fire when the projection
 * carries in-play cards, I-82f/I-90).
 */
import * as THREE from 'three';
import { beginFlourish, completeFlourish } from '@tabletop/presentation';
import type { PlayAreaContext, PickInfo } from './component.js';
import { fortuneFaceTexture } from './surfaces.js';
import { cardBack } from './stacks.js';
import * as onion from './onion.js';
import { CARD_FAMILY } from '../../../packs/boty/src/index.js'; // Q-2c (I-92): the family data

export type DrawPhase = 'idle' | 'grabbing' | 'flipping' | 'reading' | 'routing' | 'settling';
let phase: DrawPhase = 'idle';
const FLICK_T = 0.35; // px/ms — the flick threshold (owner seals feel at playtest, I-91)
const TILT_MAX = Math.PI * 0.45; // below the face-reveal angle: face-down stays unknown

let theater: {
  mesh: THREE.Mesh; from: THREE.Vector3; t: number;
  inst: ReturnType<typeof beginFlourish> | null; seeded: string; flipped: boolean;
  hiddenTop: THREE.Object3D | null;
  routeFrom: THREE.Vector3 | null; routeTo: THREE.Vector3 | null; dest: string | null;
  destPos: THREE.Vector3 | null; // the card's OWN rendered spot in the derived view (I-92)
  angle: number; samples: { x: number; y: number; t: number }[];
} | null = null;
let lastRouteRec: { dest: string; endX: number; endY: number; endZ: number; targetX: number; targetY: number; targetZ: number } | null = null;
let lastGesture: { verdict: 'flicked' | 'weak'; velocity: number } | null = null;
let forceMismatch = false; // the committed forced-mismatch drill — one-shot

/** THE ROUTING BRANCHES (I-90/I-92): the destination is the DERIVED VIEW's placement of
 *  the card — the CARD_FAMILY content data partitions the projection's discard: global →
 *  the table's GLOBAL CARDS IN PLAY slots · session → the active seat's session row ·
 *  else the discard pile. Derived-never-stored; no invented state. */
function routeDestFor(cardId: string): 'global' | 'session' | 'discard' {
  return CARD_FAMILY[cardId] ?? 'discard';
}

/** the card's OWN rendered mesh in the derived view (slots) or the pile top — the route
 *  TARGET + the hide/reveal handle: the traveler lands exactly where the view puts it. */
function findCardMesh(ctx: PlayAreaContext, cardId: string, dest: 'global' | 'session' | 'discard'): { mesh: THREE.Object3D | null; pos: THREE.Vector3 } {
  if (dest === 'discard') return stackTop(ctx, 'discard');
  let found: THREE.Object3D | null = null;
  ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['slotCard'] === cardId && o.userData?.['family'] === dest) found = o; });
  if (!found) return stackTop(ctx, 'discard'); // defensive: the view didn't render it — the pile is truth
  return { mesh: found, pos: (found as THREE.Object3D).getWorldPosition(new THREE.Vector3()) };
}

/** a stack's TOP card mesh (world) — route targets + the hide/reveal handles. */
function stackTop(ctx: PlayAreaContext, rid: string): { mesh: THREE.Object3D | null; pos: THREE.Vector3 } {
  const grp = ctx.theater.focusObject(`table:${rid}`);
  if (!grp) return { mesh: null, pos: new THREE.Vector3() };
  const cards: THREE.Object3D[] = [];
  grp.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) cards.push(o); });
  cards.sort((a, b) => (a.userData['idx'] as number) - (b.userData['idx'] as number));
  const top = cards[cards.length - 1] ?? null;
  const pos = top ? top.getWorldPosition(new THREE.Vector3())
    : new THREE.Box3().setFromObject(grp).getCenter(new THREE.Vector3());
  return { mesh: top, pos };
}

/** GRAB (contract v2): claims only on the deck, the VIEWER'S turn, theater idle. */
export function grabStart(ctx: PlayAreaContext, hit: PickInfo): boolean {
  if (phase !== 'idle' || hit.region !== 'deck') return false;
  const v = ctx.projection();
  const active = v.seats[v.turn.seatIdx]!.id;
  if (active !== ctx.viewSeat) return false; // not your turn — the fidget keeps the click
  if ((v.decks[active]?.drawCount ?? 0) < 1) return false;
  const dt = stackTop(ctx, 'deck');
  const from = dt.pos.clone();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(52, 78), new THREE.MeshBasicMaterial({ map: cardBack() }));
  m.position.copy(from);
  m.rotation.set(-Math.PI / 2, 0, 0);
  m.userData['drawGrabMesh'] = true; // S-1 (I-103): the orphan oracle counts this tag at idle
  ctx.scene.add(m);
  if (dt.mesh) dt.mesh.visible = false; // the grab card IS the top card — never two
  theater = {
    mesh: m, from, t: 0, inst: null, seeded: '', flipped: false,
    hiddenTop: dt.mesh, routeFrom: null, routeTo: null, dest: null, destPos: null,
    angle: 0, samples: [{ x: hit.event.clientX, y: hit.event.clientY, t: performance.now() }],
  };
  phase = 'grabbing';
  ctx.status('grabbed the top card — flick to flip it');
  return true;
}

export function grabMove(_ctx: PlayAreaContext, ev: PointerEvent): void {
  if (phase !== 'grabbing' || !theater) return;
  theater.samples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
  if (theater.samples.length > 6) theater.samples.shift();
  const d = Math.hypot(ev.clientX - theater.samples[0]!.x, ev.clientY - theater.samples[0]!.y);
  theater.angle = Math.min(TILT_MAX, d / 90); // lift + tilt with the drag, face still down
  theater.mesh.position.set(theater.from.x, theater.from.y + 6 + theater.angle * 22, theater.from.z);
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
    theater.t = theater.angle / Math.PI; // momentum: the flip continues from the grabbed tilt
    phase = 'flipping';
    lastGesture = { verdict: 'flicked', velocity: vel };
    ctx.status(`flicked (${vel.toFixed(2)} px/ms) — the card flips · ♪ card flip`);
  } else {
    settleBack();
    lastGesture = { verdict: 'weak', velocity: vel };
    ctx.status(`too soft (${vel.toFixed(2)} px/ms < ${FLICK_T}) — the card settles back face down`);
  }
  return true; // the gesture consumed the click either way
}

function settleBack(): void { phase = 'settling'; if (theater) theater.t = 0; }

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
  ctx.scene.remove(theater.mesh);
  (theater.mesh.material as THREE.Material).dispose();
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

function finishTheater(ctx: PlayAreaContext): void {
  if (!theater) return;
  if (theater.hiddenTop) theater.hiddenTop.visible = true;
  ctx.scene.remove(theater.mesh);
  (theater.mesh.material as THREE.Material).dispose();
  theater = null;
  phase = 'idle';
}

/** the per-frame step: the momentum flip → onion display · the settle-back · the route. */
export function tickDraw(ctx: PlayAreaContext): void {
  if (!theater) return;
  if (phase === 'flipping') {
    theater.t = Math.min(1, theater.t + 0.06);
    const pT = theater.t;
    const ease = pT * pT * (3 - 2 * pT);
    theater.mesh.position.set(theater.from.x, theater.from.y + Math.sin(pT * Math.PI) * 16 + 6, theater.from.z);
    theater.mesh.rotation.set(-Math.PI / 2, 0, 0);
    theater.mesh.rotateY(Math.PI * ease);
    if (pT >= 0.5 && !theater.flipped) {
      theater.flipped = true; // the midpoint face-swap — always post-release + post-submit
      const displayed = forceMismatch ? 'WRONG-CARD' : theater.seeded;
      (theater.mesh.material as THREE.Material).dispose();
      theater.mesh.material = new THREE.MeshBasicMaterial({ map: fortuneFaceTexture(displayed) });
    }
    if (pT >= 1) {
      theater.mesh.position.copy(theater.from);
      theater.mesh.rotation.set(-Math.PI / 2, 0, 0);
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
    theater.mesh.position.set(theater.from.x, theater.from.y + back * (6 + theater.angle * 22), theater.from.z);
    theater.mesh.rotation.set(-Math.PI / 2, 0, 0);
    theater.mesh.rotateY(theater.angle * back + Math.sin(theater.t * Math.PI * 3) * 0.05 * back); // the nudge wiggle
    if (theater.t >= 1) finishTheater(ctx); // face down on the pile — nothing happened (no draw)
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
export function drawTheaterInfo(ctx: PlayAreaContext) {
  if (!theater) return null;
  const dp = stackTop(ctx, 'deck').pos;
  const p = theater.mesh.position;
  return { phase, card: { x: p.x, y: p.y, z: p.z }, deck: { x: dp.x, y: dp.y, z: dp.z } };
}
