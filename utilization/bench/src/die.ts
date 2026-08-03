/**
 * DIE — A4 (I-73): the ROUND-CARD SEQUENCE + a SEEDED ROLLING EXHIBIT die. This is the
 * A4 increment's own bench-local module; game3d.ts holds only a THIN registration
 * (buildScene anchor, a bar button, the interaction branches, the tick step).
 *
 * (1) THE ROUND SEQUENCE (I-55a): ROUND_PREAMBLE then ROUND_CARD rendered as card()
 *     modals through a camera-parented reading board — the onion.ts card-modal pattern
 *     re-applied (a distinct modal from the draw onion, which cannot be edited) under the
 *     I-70 OPAQUE discipline: the card faces move INTO the transparent pass at opacity 1
 *     with renderOrder ABOVE the veil, so the card covers the 55% veil instead of being
 *     darkened by it. The lead-off callout is DERIVED from the projected active seat the
 *     caller passes in (the K7-v1x D2 law — theater never outruns truth). A bar button
 *     opens it; a stage click advances preamble -> round-card -> dismiss.
 *
 * (2) THE DIE (owner-ruled 2026-08-03 — a SEEDED ROLLING EXHIBIT): a cube with 1-6 pip
 *     faces sitting near the TOWN_TABLE 'dice' region. rollDie() plays a seeded toss (arc
 *     up + tumble) settling with the SEEDED face upright. HK-11 (displayed up-face ≡
 *     seeded) fires through beginFlourish/completeFlourish with the 'die-throw' flourish;
 *     on a mismatch TRUTH WINS — the die re-settles to the seeded face and the verdict
 *     flags it. A COMMITTED forced-mismatch drill (forceDieMismatch, the VG7d/I-67c
 *     precedent) keeps the path falsifiable. The seed is the BENCH-deterministic LCG
 *     (stacks.ts lcg) — the die is an EXHIBIT: the slice carries NO engine die verb, so
 *     the die touches NO game state and asserts nothing false. FIDGET: when it is NOT the
 *     viewer's turn, a touch does a lazy dead roll to a deterministic side, NO state
 *     change (the die never reaches the engine, so purity is structural).
 *
 * Diffused light only (LAW); unskinned (D-1).
 *
 * (K-B, I-78) THE ROUND SEQUENCE (I-55a) lives in the subordinate module `die-round.ts`
 * (a behavior-identical extraction to keep this file under the ≤300-line size gate); its
 * symbols are re-exported below so die.ts's public surface is unchanged.
 */
import * as THREE from 'three';
import { beginFlourish, completeFlourish } from '@tabletop/presentation';
import { camera } from './stage.js';
import { lcg } from './stacks.js';

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
/** The quaternion that brings the face carrying value v to world-up (shortest rotation). */
function faceUpQuat(v: number): THREE.Quaternion {
  const f = FACE_NORMALS.find((x) => x.v === v)!;
  return new THREE.Quaternion().setFromUnitVectors(f.n, UP);
}

const DIE_SIZE = 90;
const DIE_SEED = 0x1a4d1e; // the bench LCG seed (stacks.ts lcg) — determinism, no engine
let dieRollCount = 0;

/** A pip face: value dots on a light canvas, diffuse (no lights, D-1 unskinned). */
function pipTexture(value: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4efe4'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#b7ab92'; g.lineWidth = 5; g.strokeRect(6, 6, 116, 116);
  g.fillStyle = '#2a2a2a';
  const L = 34, M = 64, H = 94, R = 11;
  const layouts: Record<number, ReadonlyArray<readonly [number, number]>> = {
    1: [[M, M]],
    2: [[L, L], [H, H]],
    3: [[L, L], [M, M], [H, H]],
    4: [[L, L], [H, L], [L, H], [H, H]],
    5: [[L, L], [H, L], [M, M], [L, H], [H, H]],
    6: [[L, L], [H, L], [L, M], [H, M], [L, H], [H, H]],
  };
  for (const [x, y] of layouts[value]!) { g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill(); }
  return new THREE.CanvasTexture(c);
}

let die: THREE.Mesh | null = null;
let dieBaseY = DIE_SIZE / 2;
type DieAnim = {
  t: number;
  from: THREE.Quaternion;
  to: THREE.Quaternion;
  axis: THREE.Vector3;
  spins: number;
  inst: ReturnType<typeof beginFlourish> | null; // null = a fidget dead roll (no HK-11)
  seeded: number;
  displayedTarget: number; // the face the toss settles on (the lie, under the drill)
};
let dieAnim: DieAnim | null = null;
let diePhase: 'idle' | 'rolling' | 'rest' = 'idle';
let dieVerdict: { mismatch: boolean; displayed: number; seeded: number } | null = null;
let forceDieMismatch = false; // the committed forced-mismatch drill — one-shot

/** Build the die ONCE as a top-level scene object resting on the dice-region anchor. It
 *  is NOT a table child (the table's 9×7 scale would distort the cube) and NOT rebuilt on
 *  state change — reinforcing that the die touches no game state. */
export function buildDie(scene: THREE.Scene, anchor: THREE.Vector3 | null): void {
  if (die) { scene.remove(die); die = null; }
  const geo = new THREE.BoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE);
  const mats = DIE_FACE_VALUES.map((v) => new THREE.MeshBasicMaterial({ map: pipTexture(v) }));
  const m = new THREE.Mesh(geo, mats);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x6f6857 })));
  const a = anchor ?? new THREE.Vector3(0, 0.4, 0);
  dieBaseY = a.y + DIE_SIZE / 2 + 0.5;
  m.position.set(a.x, dieBaseY, a.z);
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

function startRoll(inst: ReturnType<typeof beginFlourish> | null, seeded: number, displayedTarget: number): void {
  if (!die || diePhase === 'rolling') return;
  dieAnim = {
    t: 0,
    from: die.quaternion.clone(),
    to: faceUpQuat(displayedTarget),
    axis: new THREE.Vector3(0.6, 0.2, 0.8).normalize(),
    spins: inst ? 3 : 1, // a seeded toss tumbles more; a fidget dead roll is lazy
    inst,
    seeded,
    displayedTarget,
  };
  diePhase = 'rolling';
}

/** rollDie — the SEEDED toss (viewer's turn). The seeded face is the bench LCG's; HK-11
 *  fires at settle. Under the forced-mismatch drill the toss settles on a DIFFERENT face
 *  (the lie) — the verdict flags it and truth wins (the die re-settles to seeded). */
export function rollDie(): void {
  if (!die || diePhase === 'rolling') return;
  const rnd = lcg(DIE_SEED + Math.imul(dieRollCount, 2654435761));
  dieRollCount++;
  const seeded = 1 + Math.floor(rnd() * 6);
  const displayedTarget = forceDieMismatch ? (seeded % 6) + 1 : seeded; // a wrong face for the drill
  startRoll(beginFlourish('die-throw', String(seeded), '♪ die throw'), seeded, displayedTarget);
}

/** deadRoll — the FIDGET (NOT the viewer's turn): a lazy dead roll to a DETERMINISTIC
 *  side, no HK-11, no verdict, and structurally no state (die.ts never touches the engine). */
export function deadRoll(): void {
  if (!die || diePhase === 'rolling') return;
  const rnd = lcg(DIE_SEED + 0x5eed + Math.imul(dieRollCount, 40503));
  dieRollCount++;
  const side = 1 + Math.floor(rnd() * 6);
  startRoll(null, side, side);
}

/** The per-frame die step — arc up (sin) + tumble, settling EXACTLY on the target face. */
export function tickDie(): void {
  if (!die || !dieAnim) return;
  dieAnim.t = Math.min(1, dieAnim.t + (dieAnim.inst ? 0.045 : 0.06));
  const t = dieAnim.t;
  const ease = t * t * (3 - 2 * t);
  die.position.y = dieBaseY + Math.sin(t * Math.PI) * (dieAnim.inst ? 130 : 55); // arc up
  // tumble: the settle slerp plus extra whole spins that resolve to identity at t=1, so
  // the final orientation is EXACTLY the target face-up quaternion.
  const settle = new THREE.Quaternion().slerpQuaternions(dieAnim.from, dieAnim.to, ease);
  const spin = new THREE.Quaternion().setFromAxisAngle(dieAnim.axis, (1 - ease) * dieAnim.spins * 2 * Math.PI);
  die.quaternion.copy(spin).multiply(settle);
  if (t >= 1) {
    die.position.y = dieBaseY;
    die.quaternion.copy(dieAnim.to); // land exactly on the settle target
    if (dieAnim.inst) {
      const displayed = dieUpFace(); // the toss's up-face (the lie, under the drill)
      const verdict = completeFlourish(dieAnim.inst, String(displayed)); // HK-11 — truth wins (R-20)
      dieVerdict = { mismatch: verdict.mismatch !== null, displayed, seeded: dieAnim.seeded };
      if (verdict.mismatch) die.quaternion.copy(faceUpQuat(Number(verdict.result))); // TRUTH WINS: show seeded
      forceDieMismatch = false; // the drill is one-shot
    }
    dieAnim = null;
    diePhase = 'rest';
  }
}

export const diePhaseState = (): 'idle' | 'rolling' | 'rest' => diePhase;
export const dieVerdictState = () => dieVerdict;
export const setForceDieMismatch = (v: boolean): void => { forceDieMismatch = v; };
/** The die's center projected to canvas pixels — the gate's real-input helper. */
export function dieScreenXY(renderer: THREE.WebGLRenderer): { x: number; y: number } | null {
  if (!die) return null;
  const v = new THREE.Vector3();
  die.getWorldPosition(v);
  camera.updateMatrixWorld();
  v.project(camera);
  const r = renderer.domElement.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
}
