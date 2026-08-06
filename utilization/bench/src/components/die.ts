/**
 * DIE component (K-A adapter, I-77) — the ROUND-CARD SEQUENCE + a SEEDED ROLLING EXHIBIT
 * die. Wraps die.ts, delegating. PERSISTENT: built ONCE after the first buildScene, never
 * rebuilt on state change (the die touches no game state). Placement: free{surface:'table'}
 * — rolls TRAVEL and settle anywhere on the table's whole area (K-E, I-81), while the
 * `table:dice` region is the die's HOME (P-1, I-83): the fixed spot it is built at, tossed
 * from, and glides back to after each settled result is read — the home marker, NOT a cage
 * (I-73's cage stays retired).
 *
 * `openRoundSequence` is re-exported for the spine's #round-btn bar wiring (bar wiring
 * stays harness-level per the plan; the round sequence is this component's feature).
 */
import * as THREE from 'three';
import { seatAngle, DICE_RING } from '../playarea.js'; // D-1/D-1b (I-174/I-188): the dice ring — its own object
import { RING_N } from '../stage.js';
let homeDisc: THREE.Mesh | null = null;
export const diceHomeDisc = () => homeDisc;
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import {
  buildDie, rollDie, deadRoll, tickDie, diePos, diePhaseState, dieVerdictState,
  dieUpFace, dieFaces, setForceDieMismatch, advanceRoundModal, roundModalState,
  dieRestInfo, dieTableRect, dieHome,
  dieGrabStart, dieGrabMove, dieGrabEnd, dieGrabAbort, dieSimTrace, // R-1a (I-109)
} from '../die.js';
import type { TableRect } from '../die.js';
import { liveFlightTrace, dicePhysicsReady } from '../die-physics.js'; // R-1a2 + I-115/M6: the oracles

export { openRoundSequence } from '../die.js';

let cx: PlayAreaContext | null = null;

/** The table's world footprint + surface-top y, DERIVED from the LIVE table group (the
 *  SAME object buildScene places — components/box.ts reads it the same way). This is the
 *  WHOLE table area the die is free to tumble across (K-E, I-81), NOT the tiny 'dice'
 *  sub-region and NOT a magic square — the caged-die fix. */
/** the pointer's point on the TABLE plane — THE one frame every grab sample uses (I-117). */
function diePlanePoint(ctx: PlayAreaContext, clientX: number, clientY: number, topY: number): THREE.Vector3 | null {
  const r = ctx.renderer.domElement.getBoundingClientRect();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), ctx.camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -topY);
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(plane, p) ? p : null;
}

function tableRect(ctx: PlayAreaContext): TableRect | null {
  const t = ctx.theater.focusObject('table');
  if (!t) return null;
  t.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(t);
  // I-189 (superseding I-188's rect-pragmatic v1 the same day it shipped — the owner
  // asked 'can it be round?'; it can, and his original wording always said circle):
  // the felt keeps the FULL table rect; the boundary is the ROUND wall at tossRadius
  // (area ≡ 3/4 of the table's — one derived number).
  return { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, topY: b.max.y, circleR: DICE_RING.tossRadius() };
}

export const die: Component = {
  id: 'die',
  persistent: true,
  placement: { kind: 'free', surface: 'table' },

  // A4 (I-73) + K-E (I-81): built ONCE resting ON TOP of the table surface, FREE to tumble
  // across the table's WHOLE area — NOT a table child (the table's 9×7 scale would distort
  // the cube), NOT rebuilt on state change. The table area is DERIVED from the LIVE table
  // bbox (COMPONENTS order builds the table before this persistent die, so focusObject
  // resolves) — NOT the tiny 'dice' sub-region, NOT a magic square (the caged-die fix).
  // buildDie self-adds to the scene; this returns null (persistent, not in builtRoots).
  build(ctx) {
    cx = ctx;
    ctx.scene.updateMatrixWorld(true);
    // P-1 (I-83): the HOME = the live `table:dice` REGION object's world-bbox centre —
    // derived, not a magic point; the home marker only, never the roll cage (I-81 stands).
    // D-1 (I-174, the owner's dice-ring ruling): the die's HOME is a small circle ON
    // the circumference the table's corners touch (R = the half-diagonal), ROTATED to
    // the ACTIVE player — 'centered on that circumference … moved to be available to
    // the active player'. The old table:dice region retires as the home (it stays a
    // layout label only). A HOME DISC marks the spot (grid-ring anchored — G-A's law).
    if (homeDisc) { homeDisc.parent?.remove(homeDisc); homeDisc = null; }
    const vD = ctx.projection();
    const home = DICE_RING.homePoint(seatAngle(vD.turn.seatIdx, RING_N)); // I-196: the right-triangle law — tangential at the perimeter touch
    const disc = new THREE.Mesh(
      new THREE.RingGeometry(34, 40, 40),
      new THREE.MeshBasicMaterial({ color: 0x9a8a6a, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(home.x, 0.6, home.z);
    disc.userData = { diceHome: true };
    ctx.scene.add(disc);
    homeDisc = disc;
    buildDie(ctx.scene, tableRect(ctx), home);
    return null;
  },

  // Phase 0: a click through an OPEN round sequence advances it preamble → round-card →
  // dismiss (I-55a); consumed.
  consumeClick(ctx) {
    if (roundModalState().open) {
      advanceRoundModal();
      const rs = roundModalState();
      ctx.status(rs.open ? `round → ${rs.stage}` : 'round sequence dismissed');
      return true;
    }
    return false;
  },

  // Phase 2: a touch on the die — viewer's turn → the SEEDED roll (HK-11); else a lazy
  // dead-roll FIDGET (no state change; the die never reaches the engine). (A4/I-73)
  onPick(ctx, hit: PickInfo) {
    if (hit.tags['die']) {
      const vd = ctx.projection();
      // I-115/M6: the status follows the TRUTH of the boolean — never 'rolling' while
      // nothing rolls (the I-107 lesson, upheld here after K7-R found it reopened).
      if (vd.seats[vd.turn.seatIdx]!.id === ctx.viewSeat) { ctx.status(rollDie() ? 'rolling the die — ♪ die throw' : 'the die waits — physics warming up'); }
      else { ctx.status(deadRoll() ? 'die fidget — a dead roll (not your turn)' : 'the die waits — physics warming up'); }
      return true;
    }
    return false;
  },

  // R-1a (I-109) — GRAB-FLICK (contract v3): the die claims from idle; kinematic follow
  // on the table plane; a real flick → a LIVE sim (pure fidget theater, no reconcile);
  // a motionless release FALLS THROUGH so a plain click still rolls (the VG8m drives).
  onGrabStart(ctx, hit: PickInfo) {
    if (!hit.tags['die']) return false;
    // I-117 (fixing I-115/M4's INCOMPLETE fix — the gate caught it twice): the seed must
    // come from THE SAME PLANE the moves sample. hit.point sits on the die's TOP SURFACE
    // (45u up); the moves sample the TABLE plane — the same pixel maps 26–54u apart
    // between those planes, so one jitter move read as a huge "travel" and every jittery
    // click became a micro-flick. One plane, one frame, for the seed AND every move.
    const rect = dieTableRect();
    const p = rect ? diePlanePoint(ctx, hit.event.clientX, hit.event.clientY, rect.topY) : null;
    return dieGrabStart(p ? p.x : hit.point.x, p ? p.z : hit.point.z);
  },
  onGrabMove(ctx, ev: PointerEvent) {
    const rect = dieTableRect();
    if (!rect) return;
    const p = diePlanePoint(ctx, ev.clientX, ev.clientY, rect.topY);
    if (p) dieGrabMove(p.x, p.z);
  },
  onGrabEnd(ctx, _ev: PointerEvent) {
    const flicked = dieGrabEnd();
    if (flicked) ctx.status('die flicked — real physics, a fidget (no game effect)');
    return flicked; // false = the click falls through to onPick (the roll)
  },
  onGrabAbort(_ctx) {
    dieGrabAbort();
  },

  tick() {
    tickDie(); // A4 (I-73) + R-1a: the replay / live-sim step (HK-11 at settle)
  },

  gate() {
    const ctx = cx!;
    return {
      /** A4 (I-73) surfaces: the seeded rolling die exhibit (gates WAIT ON diePhase STATE,
       *  assert geometry/verdict STATE never pixels) and the round-card sequence. */
      diePhase: diePhaseState,
      /** D-1 (I-174): the ring home — where it stands, whose turn it serves, and the
       *  law it must satisfy (ON the corner circumference, AT the active seat's angle). */
      diceHomeInfo: () => {
        const v = cx!.projection();
        const d = diceHomeDisc();
        if (!d) return null;
        return {
          x: d.position.x, z: d.position.z,
          r: Math.hypot(d.position.x, d.position.z),
          wantR: DICE_RING.homeDist(), // I-196: the hypotenuse's length
          angleDeg: (Math.atan2(d.position.x, d.position.z) * 180) / Math.PI,
          wantAngleDeg: (seatAngle(v.turn.seatIdx, RING_N) * 180) / Math.PI + DICE_RING.hypotenuseDeg, // I-196: the hypotenuse angle IS the offset
          activeSeat: v.seats[v.turn.seatIdx]!.id,
        };
      },
      dieVerdict: dieVerdictState,
      dieUpFace,
      dieFaces,
      forceDieMismatch: setForceDieMismatch,
      /** the die's centre projected to canvas pixels — an ADAPTER concern (I-115). */
      dieScreenXY: () => {
        const p = diePos();
        if (!p) return null;
        const v = new THREE.Vector3(p.x, p.y, p.z);
        ctx.camera.updateMatrixWorld();
        v.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
      dicePhysicsReady: dicePhysicsReady, // I-115/M6: VG8r's opening wait becomes REAL (explicit form — the guard's grammar)
      roundModalState,
      /** K-E (I-81) free-tumble surfaces: the die's rest STATE (centre x/z + bbox underside
       *  y, so on-table is asserted as geometry — the underside ≈ the table top) and the
       *  LIVE table area it is free to tumble across (so the gate proves the settle spread
       *  spans a large fraction of the WHOLE table, not the old dice sub-square). */
      dieRestInfo,
      dieTableRect,
      /** R-1a (I-109) physics oracles: the last burst-sim's trace (steps · frames ·
       *  settleFace · whether the reconcile offset was non-identity). VG8r's surface. */
      dieSimTrace,
      dieFlightTrace: liveFlightTrace, // R-1a2: did the live flight ever LEAVE the felt?
      /** P-1 (I-83) home surfaces: the derived dice-region home the die starts from and
       *  returns to (die-returns-home asserts rest position ≈ home after a full cycle). */
      dieHome,
      /** the `table:dice` REGION's live world centre, recomputed here INDEPENDENTLY of the
       *  die module (K7-P D5: dieHome must match the REGION, not merely itself). */
      dieRegionCenter: () => {
        // PB-6 (I-182, superseding the K7-P D5 region law): the table's dice REGION is
        // RETIRED — the home's independent want is now THE RING POINT (D-1a/I-174),
        // re-derived here from playarea math so dieHome ≡ this stays a two-source law.
        const v = cx!.projection();
        return DICE_RING.homePoint(seatAngle(v.turn.seatIdx, RING_N)); // I-196: the two-source law re-derives the triangle
      },
    };
  },
};
