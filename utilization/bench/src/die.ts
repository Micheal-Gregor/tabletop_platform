/**
 * DIE — A4 (I-73) + R-1a (I-109…I-115): the ROUND-CARD SEQUENCE (lives in die-round.ts,
 * I-78 extraction — see its header for the modal/opaque law) + the RAPIER die. THE TOSS
 * is ONE real simulation (die-physics.ts, the owner's shaker), recorded invisibly and
 * REPLAYED with the reconcile offset composed on every frame — the die settles SHOWING
 * THE SEEDED FACE (HK-11 by construction; the forced-mismatch drill carries; physics
 * NEVER decides). GRAB-FLICK (contract v3) runs a LIVE sim — pure fidget theater, no
 * reconcile; the samples live in the POINTER frame with the grab offset preserved
 * (I-115/M4). Readiness gates every draw BEFORE the LCG (I-115/M6). The HOME/return
 * glide (P-1) and toss-only-from-idle (K7-P D3) carry. Diffused light only; unskinned.
 */
import * as THREE from 'three';
import { beginFlourish, completeFlourish } from '@tabletop/presentation';
import { lcg } from './stacks.js';
import { pipTexture } from './die-pips.js'; // P-1/I-83 size-gate extraction (verbatim move)
import * as phys from './die-physics.js'; // R-1a (I-109): the RAPIER wrapper — record & replay
import { DICE_RING } from './playarea.js'; // I-191: the launch law
void phys.initDicePhysics(); // fire the wasm init at module load (a pre-ready click refuses)

// ── THE ROUND SEQUENCE (I-55a) — extracted to die-round.ts (I-78), re-exported here so
//    this module's public exports (and components/die.ts) are byte-for-byte unaffected. ──
export { openRoundSequence, advanceRoundModal, dismissRoundModal, roundModalState } from './die-round.js';

// ── THE DIE — a cube, six faces, standard pips (opposite faces sum to 7) ──
// BoxGeometry material slots are [+X, -X, +Y, -Y, +Z, -Z]; each slot carries one pip
// value, and FACE_NORMALS maps a value back to its local face normal so the settle
// quaternion can bring the seeded value to world-up.
const DIE_FACE_VALUES = [2, 5, 1, 6, 3, 4] as const; // +X,-X,+Y,-Y,+Z,-Z
const FACE_NORMALS: ReadonlyArray<{ v: number; n: THREE.Vector3 }> = [
  { v: 1, n: new THREE.Vector3(0, 1, 0) },
  { v: 6, n: new THREE.Vector3(0, -1, 0) },
  { v: 2, n: new THREE.Vector3(1, 0, 0) },
  { v: 5, n: new THREE.Vector3(-1, 0, 0) },
  { v: 3, n: new THREE.Vector3(0, 0, 1) },
  { v: 4, n: new THREE.Vector3(0, 0, -1) },
];
const UP = new THREE.Vector3(0, 1, 0);
/** the quat bringing face v to world-up. */
function faceUpQuat(v: number): THREE.Quaternion {
  const f = FACE_NORMALS.find((x) => x.v === v)!;
  return new THREE.Quaternion().setFromUnitVectors(f.n, UP);
}

const DIE_SIZE = 45; // P-1 (I-83): halved from 90 — "way too big for the board" (owner playtest-2)
const DIE_SEED = 0x1a4d1e; // the bench LCG seed (stacks.ts lcg) — determinism, no engine
let dieRollCount = 0;

/** The table area the die tumbles across (K-E, I-81) — derived live, never magic. */
export type TableRect = { minX: number; maxX: number; minZ: number; maxZ: number; topY: number; circleR?: number }; // circleR — I-189: a ROUND throw boundary (world units); when set, the arena walls are a circle, not the rect
let tableRect: TableRect | null = null;

let die: THREE.Mesh | null = null;
let dieBaseY = DIE_SIZE / 2;
/** P-1 (I-83): the die's HOME — the `table:dice` region centre, DERIVED by the adapter.
 *  Every toss STARTS here; after a settle the result holds readable then the die GLIDES
 *  home (no teleport). Null home = fall back to the table centre. */
let dieHomePos: THREE.Vector3 | null = null;
let restHold = 0; // frames the settled result stays readable before the return glide
let returnFrom: THREE.Vector3 | null = null;
let returnT = 0;
type DieReplay = { // the recording + cursor (1 step/2 ticks) · offset = the RECONCILE · inst null = fidget
  frames: phys.SimFrame[]; i: number; half: boolean; offset: THREE.Quaternion;
  inst: ReturnType<typeof beginFlourish> | null; seeded: number; displayedTarget: number;
};
let dieReplay: DieReplay | null = null;
let lastSimTrace: { steps: number; frames: number; settleFace: number; offsetApplied: boolean } | null = null; // the VG8r oracle
let diePhase: 'idle' | 'rolling' | 'rolling-live' | 'dragging' | 'rest' | 'returning' = 'idle'; // R-1a: +dragging/rolling-live (additive)
let dieVerdict: { mismatch: boolean; displayed: number; seeded: number } | null = null;
let forceDieMismatch = false; // the committed forced-mismatch drill — one-shot

/** Build the die ONCE, resting ON TOP of the table, FREE over the whole area (K-E);
 *  NOT a table child, NOT rebuilt on state (it touches no game state). */
export function buildDie(scene: THREE.Scene, table: TableRect | null, home: { x: number; z: number } | null = null): void {
  if (die) { scene.remove(die); die = null; }
  const geo = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
  const mats = DIE_FACE_VALUES.map((v) => new THREE.MeshBasicMaterial({ map: pipTexture(v) }));
  const m = new THREE.Mesh(geo, mats);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x6f6857 })));
  tableRect = table;
  const topY = table ? table.topY : 0.4;
  dieBaseY = topY + DIE_SIZE / 2 + 0.5; // underside on the table plane (on top), a hair clear
  const cx = home ? home.x : table ? (table.minX + table.maxX) / 2 : 0;
  const cz = home ? home.z : table ? (table.minZ + table.maxZ) / 2 : 0;
  dieHomePos = new THREE.Vector3(cx, dieBaseY, cz); // P-1 (I-83): the fixed HOME (dice region)
  m.position.copy(dieHomePos); // built AT HOME — the fixed starting position
  m.quaternion.copy(faceUpQuat(1)); // start showing 1
  m.userData['die'] = true; // NEVER a 'region' — the die is not counted by VG8a's law
  die = m;
  scene.add(m);
}

/** The value currently pointing up — a GEOMETRY-STATE read (the winning face normal's
 *  world-y), never a pixel read (I-57c). */
export function dieUpFace(): number {
  if (!die) return 0;
  let best = -Infinity, val = 0;
  for (const f of FACE_NORMALS) {
    const wy = f.n.clone().applyQuaternion(die.quaternion).y;
    if (wy > best) { best = wy; val = f.v; }
  }
  return val;
}

/** The six pip-face values (for the die-face-count law). */
export const dieFaces = (): number[] => [...DIE_FACE_VALUES].sort((a, b) => a - b);

function startRoll(inst: ReturnType<typeof beginFlourish> | null, seeded: number, displayedTarget: number, u: number): void {
  if (!die || diePhase !== 'idle' || !tableRect) return; // toss ONLY from idle-at-home (K7-P D3)
  if (!phys.dicePhysicsReady()) return; // pre-ready: refuse (status set by the caller path)
  // R-1a (I-109): ONE real simulation, invisibly, to settle — then the reconcile offset
  // maps the SIM's top face to the DISPLAYED target. Physics never decides; the seeded
  // truth (or the drill's lie) is chosen before a single frame renders.
  // I-191 (owner-caught: a click-roll from the ring HOME started OUTSIDE the circular
  // wall — and beyond the felt's edge, where the sim falls off the world and never
  // settles, so the die 'rolled left out of bounds and didn't return'): THE LAUNCH
  // LAW — every roll begins INSIDE the throw circle. The start clamps radially to
  // tossRadius − 40 along the home's own angle (the die visibly ENTERS the arena),
  // and the settled result still glides home by the existing P-1 return.
  let sx = die.position.x, sz = die.position.z;
  {
    const Rt = DICE_RING.tossRadius() - 40;
    const rr = Math.hypot(sx, sz);
    if (rr > Rt) { const k = Rt / rr; sx *= k; sz *= k; die.position.x = sx; die.position.z = sz; }
  }
  const sim = phys.simulateToss(tableRect, { x: sx, z: sz }, u);
  const nT = FACE_NORMALS.find((f) => f.v === displayedTarget)!.n;
  const nF = FACE_NORMALS.find((f) => f.v === sim.settleFace)!.n;
  const offset = new THREE.Quaternion().setFromUnitVectors(nT, nF); // offset·n_T = n_F — a cube symmetry
  lastSimTrace = { steps: sim.steps, frames: sim.frames.length, settleFace: sim.settleFace, offsetApplied: displayedTarget !== sim.settleFace };
  dieReplay = { frames: sim.frames, i: 0, half: false, offset, inst, seeded, displayedTarget };
  diePhase = 'rolling';
}

/** rollDie — the SEEDED toss (viewer's turn). The seeded face is the bench LCG's; HK-11
 *  fires at settle. Under the forced-mismatch drill the toss settles on a DIFFERENT face
 *  (the lie) — the verdict flags it and truth wins (the die re-settles to seeded). */
export function rollDie(): boolean {
  // I-115/M6: readiness BEFORE any LCG draw — a pre-ready click burns NOTHING (the
  // byte-identical stream is safe) and the caller can status HONESTLY on the boolean.
  if (!die || diePhase !== 'idle' || !tableRect || !phys.dicePhysicsReady()) return false;
  const rnd = lcg(DIE_SEED + Math.imul(dieRollCount, 2654435761));
  dieRollCount++;
  const seeded = 1 + Math.floor(rnd() * 6);
  const displayedTarget = forceDieMismatch ? (seeded % 6) + 1 : seeded; // a wrong face for the drill
  const u = Math.floor(rnd() * 4294967296) >>> 0; // the SAME stream draw that fed seededLanding — now the impulse seed (I-109(4))
  startRoll(beginFlourish('die-throw', String(seeded), '♪ die throw'), seeded, displayedTarget, u);
  return true;
}

/** deadRoll — the FIDGET (NOT the viewer's turn): a lazy dead roll to a DETERMINISTIC
 *  side, no HK-11, no verdict, and structurally no state (die.ts never touches the engine). */
export function deadRoll(): boolean {
  if (!die || diePhase !== 'idle' || !tableRect || !phys.dicePhysicsReady()) return false; // I-115/M6
  const rnd = lcg(DIE_SEED + 0x5eed + Math.imul(dieRollCount, 40503));
  dieRollCount++;
  const side = 1 + Math.floor(rnd() * 6);
  const u = Math.floor(rnd() * 4294967296) >>> 0;
  startRoll(null, side, side, u); // the fidget reconciles to its own deterministic side — no HK-11, no verdict
  return true;
}

/** The per-frame die step — arc up (sin) + tumble, settling EXACTLY on the target face;
 *  then (P-1, I-83) the settled result HOLDS readable and the die GLIDES back to its HOME
 *  (the dice region) with the up-face preserved — a fixed starting position, no teleport. */
export function tickDie(): void {
  if (!die) return;
  if (diePhase === 'rest' && restHold > 0) {
    restHold--;
    if (restHold === 0 && dieHomePos) { // begin the return glide home
      diePhase = 'returning';
      returnFrom = die.position.clone();
      returnT = 0;
    }
    return;
  }
  if (diePhase === 'returning' && returnFrom && dieHomePos) {
    returnT = Math.min(1, returnT + 0.05);
    const e = returnT * returnT * (3 - 2 * returnT);
    die.position.x = returnFrom.x + (dieHomePos.x - returnFrom.x) * e;
    die.position.z = returnFrom.z + (dieHomePos.z - returnFrom.z) * e;
    die.position.y = dieBaseY + Math.sin(returnT * Math.PI) * 26; // a small carry arc
    if (returnT >= 1) {
      die.position.set(dieHomePos.x, dieBaseY, dieHomePos.z); // home — the fixed start
      returnFrom = null;
      diePhase = 'idle';
    }
    return;
  }
  if (diePhase === 'rolling-live') { // R-1a grab-flick: the LIVE sim, one step per tick
    const st = phys.dragStep();
    if (!st || !tableRect) { diePhase = 'idle'; return; }
    const w = phys.feltToWorld(tableRect, st.frame.px, st.frame.py, st.frame.pz);
    die.position.set(w.x, w.y, w.z);
    die.quaternion.set(st.frame.qx, st.frame.qy, st.frame.qz, st.frame.qw); // no reconcile — pure fidget theater
    if (st.settled) { diePhase = 'rest'; restHold = st.escaped ? 3 : 45; } // an escapee heads straight home (I-110)
    return;
  }
  if (!dieReplay || !tableRect) return;
  // R-1a (I-109): consume the RECORDING at half pace (1 sim step / 2 ticks) — the theater
  // is a replay of one real simulation, the reconcile offset composed on every frame.
  if (diePhase === 'rolling') {
    const r = dieReplay;
    r.half = !r.half;
    if (r.half && r.i < r.frames.length - 1) r.i++;
    const f = r.frames[r.i]!;
    const w = phys.feltToWorld(tableRect, f.px, f.py, f.pz);
    die.position.set(w.x, w.y, w.z);
    die.quaternion.set(f.qx, f.qy, f.qz, f.qw).multiply(r.offset); // mesh = bodyQ · offset
    if (r.i >= r.frames.length - 1) {
      if (r.inst) {
        const displayed = dieUpFace(); // reads the COMPOSED quat — the reconcile's product
        const verdict = completeFlourish(r.inst, String(displayed)); // HK-11 — truth wins (R-20)
        dieVerdict = { mismatch: verdict.mismatch !== null, displayed, seeded: r.seeded };
        if (verdict.mismatch) die.quaternion.copy(faceUpQuat(Number(verdict.result))); // TRUTH WINS: show seeded
        forceDieMismatch = false; // the drill is one-shot
      }
      dieReplay = null;
      diePhase = 'rest';
      restHold = 45; // the settled result stays readable, then the return glide (I-83)
    }
  }
}

// ── R-1a GRAB-FLICK (contract v3; the shaker's kinematic drag) — pure fidget theater ──
let dragSamples: { x: number; z: number; t: number }[] = [];
let grabOff = { x: 0, z: 0 }; // I-115/M4: die − pointer at grab — preserved through the drag (no teleport)
export function dieGrabStart(px: number, pz: number): boolean {
  if (!die || diePhase !== 'idle' || !tableRect || !phys.dicePhysicsReady()) return false;
  if (!phys.dragBegin(tableRect, { x: die.position.x, z: die.position.z })) return false;
  // I-115/M4 (K7-R): the samples live in the POINTER's frame — travel means TRAVEL, so a
  // human click with jitter measures ~0 and falls through to the roll (touch included).
  grabOff = { x: die.position.x - px, z: die.position.z - pz };
  dragSamples = [{ x: px, z: pz, t: performance.now() }];
  diePhase = 'dragging';
  return true;
}
export function dieGrabMove(worldX: number, worldZ: number): void {
  if (diePhase !== 'dragging' || !die || !tableRect) return;
  phys.dragMove(worldX + grabOff.x, worldZ + grabOff.z);
  const st = phys.dragStep();
  if (st) {
    const w = phys.feltToWorld(tableRect, st.frame.px, st.frame.py, st.frame.pz);
    die.position.set(w.x, w.y, w.z);
    die.quaternion.set(st.frame.qx, st.frame.qy, st.frame.qz, st.frame.qw);
  }
  dragSamples.push({ x: worldX, z: worldZ, t: performance.now() });
  if (dragSamples.length > 6) dragSamples.shift();
}
/** release: <6 world-units of travel = a plain CLICK — put the die back and FALL THROUGH
 *  (false) so onPick still rolls (every VG8m drive preserved); a real drag FLICKS. */
export function dieGrabEnd(): boolean {
  if (diePhase !== 'dragging' || !die) return false;
  const a = dragSamples[0]!, z = dragSamples[dragSamples.length - 1]!;
  const dist = Math.hypot(z.x - a.x, z.z - a.z);
  if (dist < 6) {
    phys.dragCancel();
    if (dieHomePos) die.position.set(dieHomePos.x, dieBaseY, dieHomePos.z);
    diePhase = 'idle';
    return false; // the click falls through — Phase 2 onPick rolls (I-109(5))
  }
  const dt = Math.max(1, z.t - a.t);
  phys.dragEnd(((z.x - a.x) / dt) * 1000, ((z.z - a.z) / dt) * 1000); // units/ms → units/s (dragEnd ÷M2W → m/s)
  diePhase = 'rolling-live';
  return true;
}
/** contract v3 abort (cancel / rebuild / throw): drop the session, glide home. */
export function dieGrabAbort(): void {
  if (diePhase !== 'dragging' && diePhase !== 'rolling-live') return;
  phys.dragCancel();
  diePhase = 'rest';
  restHold = 1; // straight into the return glide
}
export const dieSimTrace = () => lastSimTrace;

export const diePhaseState = (): 'idle' | 'rolling' | 'rolling-live' | 'dragging' | 'rest' | 'returning' => diePhase;
export const dieVerdictState = () => dieVerdict;
export const setForceDieMismatch = (v: boolean): void => { forceDieMismatch = v; };
/** The die's rest STATE — centre x/z, base y, and its bbox UNDERSIDE y (a GEOMETRY-STATE
 *  read, never pixels — I-57c): at rest the underside ≈ the table top (the die sits ON TOP). */
export function dieRestInfo(): { x: number; z: number; baseY: number; underY: number; edge: number } | null {
  if (!die) return null;
  const b = new THREE.Box3().setFromObject(die);
  // edge = the bbox x-extent at rest (face-up aligned → axis-aligned cube) — the SIZE gate's
  // geometry read (P-1, I-83), never the constant asserted against itself.
  return { x: die.position.x, z: die.position.z, baseY: dieBaseY, underY: b.min.y, edge: b.max.x - b.min.x };
}
/** The die's HOME (the dice-region spot it starts from and returns to — P-1, I-83). */
export function dieHome(): { x: number; z: number } | null {
  return dieHomePos ? { x: dieHomePos.x, z: dieHomePos.z } : null;
}
/** The live table area the die is free to tumble across (K-E) — for the gate's free-tumble math. */
export function dieTableRect(): TableRect | null { return tableRect; }
/** the die's live world position — the adapter's projection source (I-115). */
export function diePos(): { x: number; y: number; z: number } | null {
  if (!die) return null;
  const v = new THREE.Vector3();
  die.getWorldPosition(v);
  return { x: v.x, y: v.y, z: v.z };
}
