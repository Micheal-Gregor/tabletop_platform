/**
 * THE SPINNER SPIKE (foundry pilot, Stage D — owner-ruled at Stage-A approval:
 * N=6, SPIKE PAGE first, POINTER spins over a fixed base). An EXHIBIT in the spike3d
 * charter's sense: unskinned placeholder colors, space and volume before paint.
 *
 * THE LAW (the die's, verbatim — via spinner-sim.mjs, the single spin law): one
 * invisible 1-DOF sim per spin; the ANGULAR reconcile offset composes on every
 * replayed frame; displayed ≡ seeded at settle (HK-11's twin) — under the
 * forced-mismatch drill the flag raises and TRUTH WINS (the pointer re-settles to
 * the seeded wedge). The seeded truth is drawn BEFORE a single frame renders.
 */
import * as THREE from 'three';
import { simulateSpin, reconcileOffset, wedgeOf, wedgeCenter, normTheta, N_DEFAULT } from './spinner-sim.mjs';

const N = N_DEFAULT; // 6 — owner-ruled
const R = 200; // base disc radius, world units

// ── placeholder skin tokens (R-21/R-22 discipline: the REAL skin binds these later) ──
const WEDGE_TOKENS = [0xb5c9a8, 0xd9c58f, 0xa8b5c9, 0xc9a8a8, 0x9fbfae, 0xcbb8d9];
const TOKEN_BASE = 0xefeae0, TOKEN_POINTER = 0x8a3324, TOKEN_CAP = 0x54473a;

const statusEl = document.getElementById('status')!;
const status = (t: string): void => { statusEl.textContent = t; };

// ── scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf6f4ef);
const camera = new THREE.PerspectiveCamera(45, 1400 / 950, 1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1400, 950);
document.getElementById('stage')!.appendChild(renderer.domElement);

// felt ground (the bench's table tone)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1100), new THREE.MeshBasicMaterial({ color: 0xe7e2d6 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -8;
scene.add(ground);

// base disc
const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 1.04, 14, 64), new THREE.MeshBasicMaterial({ color: TOKEN_BASE }));
base.position.y = 7;
scene.add(base);
scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry), new THREE.LineBasicMaterial({ color: 0x8c8577 })).translateY(7));

/** wedge i spans [i·2π/N, (i+1)·2π/N) CLOCKWISE from 12-o'clock at the overhead look
 *  (the BRIEF's outcome law). Authored in shape space (XY), then rotateX(-π/2) maps
 *  shape +y → world −z (12-o'clock) and clockwise-from-above comes out true. */
for (let i = 0; i < N; i++) {
  const a1 = Math.PI / 2 - (i * 2 * Math.PI) / N;        // math angle of the wedge's START edge
  const a2 = Math.PI / 2 - ((i + 1) * 2 * Math.PI) / N;  // …END edge (clockwise ⇒ decreasing)
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.absarc(0, 0, R * 0.94, a1, a2, true);
  s.lineTo(0, 0);
  const wedge = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), new THREE.MeshBasicMaterial({ color: WEDGE_TOKENS[i] }));
  wedge.rotation.x = -Math.PI / 2;
  wedge.position.y = 14.2 + 0.02 * i; // hair-stacked: no z-fighting between sectors
  wedge.userData = { wedge: i };
  scene.add(wedge);
}

// pointer: a slim arrow authored pointing to shape +y (world −z = wedge-0 edge at rest)
const arrow = new THREE.Shape();
arrow.moveTo(0, R * 0.86); arrow.lineTo(14, R * 0.55); arrow.lineTo(5, R * 0.55);
arrow.lineTo(5, -R * 0.28); arrow.lineTo(-5, -R * 0.28); arrow.lineTo(-5, R * 0.55);
arrow.lineTo(-14, R * 0.55); arrow.closePath();
const pointer = new THREE.Mesh(new THREE.ExtrudeGeometry(arrow, { depth: 6, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color: TOKEN_POINTER }));
pointer.rotation.x = -Math.PI / 2;
pointer.position.y = 22;
const pointerRig = new THREE.Group(); // yaw lives on the rig: displayed θ = −rig.rotation.y
pointerRig.add(pointer);
scene.add(pointerRig);

const cap = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 10, 32), new THREE.MeshBasicMaterial({ color: TOKEN_CAP }));
cap.position.y = 30;
scene.add(cap);

const setPointer = (theta: number): void => { pointerRig.rotation.y = -theta; }; // clockwise-from-above = −y yaw

// ── camera poses (the BRIEF's judging set) ──
const POSES: Record<string, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  overview: { pos: new THREE.Vector3(0, 430, 540), look: new THREE.Vector3(0, 0, 0) },
  top: { pos: new THREE.Vector3(0, 680, 0.1), look: new THREE.Vector3(0, 0, 0) },
};
let glide: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
const curLook = new THREE.Vector3(0, 0, 0);
function glideTo(name: string): void {
  const p = POSES[name];
  if (!p) throw new Error(`unknown pose ${name}`);
  glide = p;
}
const gliding = (): boolean => glide !== null;
camera.position.copy(POSES['overview']!.pos);
camera.lookAt(curLook);

// ── the seeded draw (the bench-LCG shape, local to the spike) ──
let lcg = 0xc0ffee >>> 0;
const draw = (): number => { lcg = (Math.imul(lcg, 1664525) + 1013904223) >>> 0; return lcg; };

// ── the spin (the die's startRoll twin) ──
type SpinTrace = { u: number; target: number; simRestWedge: number; steps: number; offsetApplied: boolean; displayed: number | null; verdict: 'pending' | 'ok' | 'MISMATCH→truth' };
let replay: { frames: readonly number[]; i: number; offset: number; target: number } | null = null;
let theta = 0; // the pointer's resting truth between spins
let lastTrace: SpinTrace | null = null;
let forceLie = false;

function spin(): boolean {
  if (replay) return false; // one spin at a time (idle-at-home, the die's K7-P D3 shape)
  const u = draw();
  const target = u % N; // THE SEEDED TRUTH — chosen before a single frame renders
  const lie = forceLie ? (target + 1) % N : target;
  forceLie = false;
  const sim = simulateSpin(u, theta, N); // ONE real simulation, invisibly, to a true stop
  const offset = reconcileOffset(lie, sim.thetaRest, N);
  lastTrace = { u, target, simRestWedge: sim.restWedge, steps: sim.steps, offsetApplied: Math.abs(normTheta(offset)) > 1e-9, displayed: null, verdict: 'pending' };
  replay = { frames: sim.frames, i: 0, offset, target };
  status(`spinning… (seeded target: wedge ${target})`);
  return true;
}

// ── tick: glide + replay + render ──
function tick(): void {
  requestAnimationFrame(tick);
  if (glide) {
    camera.position.lerp(glide.pos, 0.14);
    curLook.lerp(glide.look, 0.14);
    camera.lookAt(curLook);
    if (camera.position.distanceTo(glide.pos) < 0.5) { camera.position.copy(glide.pos); curLook.copy(glide.look); camera.lookAt(curLook); glide = null; }
  }
  if (replay) {
    const th = replay.frames[replay.i]! + replay.offset;
    setPointer(th);
    if (replay.i++ >= replay.frames.length - 1) {
      // settle: HK-11's twin — displayed ≡ seeded, truth wins on the drill's lie
      const displayed = wedgeOf(th, N);
      const t = lastTrace!;
      t.displayed = displayed;
      if (displayed === replay.target) { t.verdict = 'ok'; theta = normTheta(th); status(`settled: wedge ${displayed} (seeded ${replay.target}) — displayed ≡ seeded`); }
      else { t.verdict = 'MISMATCH→truth'; theta = wedgeCenter(replay.target, N); setPointer(theta); status(`THEATER MISMATCH flagged: displayed ${displayed} ≠ seeded ${replay.target} — truth wins, pointer re-settled to ${replay.target}`); }
      replay = null;
    }
  }
  renderer.render(scene, camera);
}

// ── chrome ──
const bar = document.getElementById('bar')!;
const btn = (label: string, fn: () => void): void => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; bar.appendChild(b); };
btn('spin', () => { spin(); });
btn('⚠ forced-mismatch drill', () => { forceLie = true; status('drill armed: the next spin reconciles to a LIE — HK-11 must flag it and truth must win'); });
for (const name of Object.keys(POSES)) btn(name, () => glideTo(name));
renderer.domElement.addEventListener('pointerdown', () => { spin(); });
setPointer(theta);
status(`ready — ${N} wedges · click the spinner (or [spin]) for a seeded spin`);
tick();

// ── the gate surface (shot.mjs + the future VG-spinner group read THIS, never the scene) ──
const gate: Record<string, unknown> = {
  ready: () => renderer.getContext() !== null,
  glideTo, gliding,
  spin,
  spinning: () => replay !== null,
  forceMismatch: () => { forceLie = true; },
  lastSpinTrace: () => lastTrace,
  displayedTheta: () => normTheta(-pointerRig.rotation.y),
  displayedWedge: () => wedgeOf(normTheta(-pointerRig.rotation.y), N),
  wedgeCount: () => N,
};
(window as unknown as Record<string, unknown>)['__SPINNER3D__'] = gate;
