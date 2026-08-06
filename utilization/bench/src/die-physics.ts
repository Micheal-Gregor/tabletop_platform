/**
 * DIE-PHYSICS (R-1a, I-109) — the RAPIER wrapper, ported from the owner's verified
 * shaker (`Projects/dice shaker/dice_shaker_2.html`, @dimforge/rapier3d-compat@0.19.3).
 *
 * THE LAW (I-82e / HK-11): physics ANIMATES, it never decides. `simulateToss` runs ONE
 * real simulation INVISIBLY to settle (a fresh world per toss — determinism by
 * construction) and returns the RECORDING + the settled top face; die.ts composes the
 * reconcile offset and REPLAYS the recording. The live-drag session (the shaker's
 * kinematic drag) serves the grab-flick fidget — pure theater, no reconcile.
 *
 * Scale: 900 world units = 1 m (die 45u = 0.05 m → HALF 0.025 — the shaker's verified
 * scale). Tuned headless before build (I-109): felt fric 0.7 · launch 2.0–3.4 m/s ·
 * vy 1.1–1.8 · spin ±16/±9/±16 → spreadX 600 / spreadZ 472 over the first six seeded
 * rolls, all contained by the rails, all resting flat, settle ≤34 steps.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import type { TableRect } from './die.js';

export const M2W = 900; // world units per meter
const HALF = 0.025; // the die's half-extent (45u / 900 / 2)
const G = 9.81 * 3; // the shaker's boosted gravity — "snappy, non-lunar feel (verified)"
const RAIL_H = 0.18;

let ready = false;
let initStarted = false;
export function initDicePhysics(): Promise<void> {
  if (initStarted) return Promise.resolve();
  initStarted = true;
  return RAPIER.init().then(() => { ready = true; });
}
export const dicePhysicsReady = (): boolean => ready;

/** splitmix32 avalanche — the K-E mix32 discipline (decorrelates draws from one seed). */
export function mix32(z0: number): number {
  let z = (z0 + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  z = (z ^ (z >>> 15)) >>> 0;
  return z / 4294967296;
}

export type SimFrame = { px: number; py: number; pz: number; qx: number; qy: number; qz: number; qw: number };
type Felt = { cx: number; cz: number; topY: number; hx: number; hz: number };
const feltOf = (r: TableRect): Felt => ({
  cx: (r.minX + r.maxX) / 2, cz: (r.minZ + r.maxZ) / 2, topY: r.topY,
  hx: (r.maxX - r.minX) / 2 / M2W, hz: (r.maxZ - r.minZ) / 2 / M2W,
});
/** felt-local meters → bench world units (y: body-y 0 = the felt top). */
export function feltToWorld(r: TableRect, px: number, py: number, pz: number): { x: number; y: number; z: number } {
  const f = feltOf(r);
  return { x: f.cx + px * M2W, y: f.topY + (py - HALF) * M2W + 45 / 2, z: f.cz + pz * M2W };
}
const worldToFelt = (r: TableRect, x: number, z: number): { px: number; pz: number } => {
  const f = feltOf(r);
  return { px: (x - f.cx) / M2W, pz: (z - f.cz) / M2W };
};

/** the shaker's ARENA: felt floor + four rails at the LIVE table edges (containment is
 *  structural). Extracted at R-1b (I-122) so the die AND the card-slide share one arena
 *  builder — a FRESH world per toss/drag/slide, no cross-toss state. */
function buildArena(r: TableRect): RAPIER.World {
  const f = feltOf(r);
  const world = new RAPIER.World({ x: 0, y: -G, z: 0 });
  const fixed = (hx: number, hy: number, hz: number, x: number, y: number, z: number, rest: number, fric: number): void => {
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setRestitution(rest).setFriction(fric), b);
  };
  fixed(f.hx, 0.01, f.hz, 0, -0.01, 0, 0.12, 0.7); // the felt (I-109 tuning: fric 0.9→0.7 for real travel)
  if (r.circleR) {
    // I-189 (owner-ruled): the ROUND throw boundary — sixteen thin wall segments on
    // the circle ('the throw circumference'); the felt floor stays the full rect so
    // a segment gap can never drop the die off the world.
    const Rf = r.circleR / M2W;
    const N = 16;
    const seg = (Math.PI * Rf) / N + 0.02; // half-length with a lap so corners seal
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2;
      const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed()
        .setTranslation(Rf * Math.sin(th), RAIL_H, Rf * Math.cos(th))
        .setRotation({ x: 0, y: Math.sin((th + Math.PI / 2) / 2), z: 0, w: Math.cos((th + Math.PI / 2) / 2) }));
      world.createCollider(RAPIER.ColliderDesc.cuboid(seg, RAIL_H, 0.01).setRestitution(0.1).setFriction(0.7), b);
    }
    return world;
  }
  fixed(0.01, RAIL_H, f.hz, -f.hx, RAIL_H, 0, 0.1, 0.7);
  fixed(0.01, RAIL_H, f.hz, f.hx, RAIL_H, 0, 0.1, 0.7);
  fixed(f.hx, RAIL_H, 0.01, 0, RAIL_H, -f.hz, 0.1, 0.7);
  fixed(f.hx, RAIL_H, 0.01, 0, RAIL_H, f.hz, 0.1, 0.7);
  return world;
}
function buildWorld(r: TableRect): { world: RAPIER.World; body: RAPIER.RigidBody } {
  const world = buildArena(r);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, HALF, 0).setCcdEnabled(true).setCanSleep(true));
  world.createCollider(RAPIER.ColliderDesc.cuboid(HALF, HALF, HALF).setRestitution(0.25).setFriction(0.6).setDensity(1), body);
  return { world, body };
}

const FACES: ReadonlyArray<{ v: number; n: [number, number, number] }> = [
  { v: 1, n: [0, 1, 0] }, { v: 6, n: [0, -1, 0] }, { v: 2, n: [1, 0, 0] },
  { v: 5, n: [-1, 0, 0] }, { v: 3, n: [0, 0, 1] }, { v: 4, n: [0, 0, -1] },
];
const qRot = (q: { x: number; y: number; z: number; w: number }, v: [number, number, number]): [number, number, number] => {
  const { x, y, z, w } = q;
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};
/** the shaker's topFace: the face whose world normal points most upward. */
export function topFaceOf(q: { x: number; y: number; z: number; w: number }): number {
  let best = -Infinity, val = 1;
  for (const f of FACES) { const wy = qRot(q, f.n)[1]; if (wy > best) { best = wy; val = f.v; } }
  return val;
}

const asleep = (b: RAPIER.RigidBody): boolean => {
  const v = b.linvel(), w = b.angvel();
  return Math.hypot(v.x, v.y, v.z) < 0.02 && Math.hypot(w.x, w.y, w.z) < 0.02;
};
const record = (b: RAPIER.RigidBody): SimFrame => {
  const t = b.translation(), q = b.rotation();
  return { px: t.x, py: t.y, pz: t.z, qx: q.x, qy: q.y, qz: q.z, qw: q.w };
};

/** THE BURST SIM (R-1a's core): a seeded toss from `startWorld`, simulated to settle in
 *  one invisible pass; returns every frame + the settled top face for the reconcile. */
export function simulateToss(r: TableRect, startWorld: { x: number; z: number }, u: number): { frames: SimFrame[]; settleFace: number; steps: number } {
  const { world, body } = buildWorld(r);
  const s = worldToFelt(r, startWorld.x, startWorld.z);
  body.setTranslation({ x: s.px, y: HALF, z: s.pz }, true);
  const th = mix32(u ^ 0x9e3779b9) * 2 * Math.PI;
  const sp = 2.0 + mix32(u + 0x6d2b79f5) * 1.4; // 2.0..3.4 m/s (I-109 tuning)
  const vy = 1.1 + mix32(u + 0x51ed2701) * 0.7;
  body.setLinvel({ x: Math.cos(th) * sp, y: vy, z: Math.sin(th) * sp }, true);
  body.setAngvel({ x: (mix32(u + 11) * 2 - 1) * 16, y: (mix32(u + 23) * 2 - 1) * 9, z: (mix32(u + 37) * 2 - 1) * 16 }, true);
  const frames: SimFrame[] = [record(body)];
  let steps = 0;
  for (; steps < 900; steps++) {
    world.step();
    frames.push(record(body));
    if (asleep(body)) break;
  }
  const settleFace = topFaceOf(body.rotation());
  world.free();
  return { frames, settleFace, steps };
}

/** R-1b (I-122) — THE CARD SLIDE, a BURST sim like `simulateToss` (record-and-replay:
 *  no live session, so a concurrent die drag never contends). A card-shaped cuboid
 *  (half-extents DERIVED from the grabbed mesh's world bbox — never magic dims) with
 *  rotations LOCKED TO YAW (the planar law: a tossed card slides and spins flat, never
 *  tumbles), launched at the plane-sample velocity (I-117: one frame — world velocity
 *  never inferred from screen pixels), CAPPED at the owner's 3.2 m/s ceiling; the
 *  escape guard closes as settled (rails make escape structural defense-in-depth).
 *  Pure fidget theater: no verb, no seeded truth, hence NO reconcile (HK-11 vacuous). */
export function simulateSlide(
  r: TableRect, startWorld: { x: number; z: number }, velWorld: { x: number; z: number },
  halfM: { hx: number; hy: number; hz: number },
): { frames: SimFrame[]; steps: number; dist: number } | null {
  if (!ready) return null; // fallback: the caller keeps the loose-where-dropped behavior
  const world = buildArena(r);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCcdEnabled(true).setCanSleep(true));
  // TUNING (I-122): under the shaker's 3× gravity the felt's 0.7 friction would stop a
  // card in millimetres (decel ≈ μ·3g). A glossy card slides: fric 0.1 with the MIN
  // combine rule (the pair uses the card's coefficient, not the felt's) → decel ≈ 2.9
  // m/s² → a capped 3.2 m/s flick carries ≈ 0.35 m of real travel. Verified headless.
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(halfM.hx, halfM.hy, halfM.hz).setRestitution(0.05).setFriction(0.1)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setDensity(1), body);
  const s = worldToFelt(r, startWorld.x, startWorld.z);
  const f = feltOf(r);
  body.setTranslation({
    x: Math.max(-f.hx + halfM.hx, Math.min(f.hx - halfM.hx, s.px)), y: halfM.hy + 0.002,
    z: Math.max(-f.hz + halfM.hz, Math.min(f.hz - halfM.hz, s.pz)),
  }, true);
  body.setEnabledRotations(false, true, false, true); // yaw only — the planar law
  let vx = velWorld.x / M2W, vz = velWorld.z / M2W;
  const raw = Math.hypot(vx, vz);
  if (raw > FLICK_CAP) { const k = FLICK_CAP / raw; vx *= k; vz *= k; }
  body.setLinvel({ x: vx, y: 0, z: vz }, true);
  body.setAngvel({ x: 0, y: (vx - vz) * 3, z: 0 }, true); // a flat spin, velocity-derived (deterministic)
  const frames: SimFrame[] = [record(body)];
  let steps = 0;
  for (; steps < 600; steps++) {
    world.step();
    frames.push(record(body));
    const t = body.translation();
    if (asleep(body) || t.y < -0.05 || Math.abs(t.x) > f.hx + 0.05 || Math.abs(t.z) > f.hz + 0.05) break;
  }
  const a = frames[0]!, z0 = frames[frames.length - 1]!;
  const dist = Math.hypot(z0.px - a.px, z0.pz - a.pz) * M2W; // world units, the oracle's teeth
  world.free();
  return { frames, steps, dist };
}
/** a recorded frame's felt-local position → bench world units (generic-body form of
 *  `feltToWorld`: centre y = felt top + body-centre metres — exact for any cuboid). */
export function feltFrameToWorld(r: TableRect, fr: SimFrame): { x: number; y: number; z: number } {
  const f = feltOf(r);
  return { x: f.cx + fr.px * M2W, y: f.topY + fr.py * M2W, z: f.cz + fr.pz * M2W };
}

// ── THE LIVE DRAG SESSION (the shaker's kinematic drag → flick) — grab-flick fidget ──
let live: { world: RAPIER.World; body: RAPIER.RigidBody; rect: TableRect; flying: boolean } | null = null;
let flightTrace: { maxAbsX: number; maxAbsZ: number; escaped: boolean; rawSpeed: number; effSpeed: number } | null = null; // R-1a2 + I-115/M5: speeds recorded — the cap kill is deterministic
export const liveFlightTrace = () => flightTrace;
export function dragBegin(r: TableRect, atWorld: { x: number; z: number }): boolean {
  if (!ready || live) return false;
  const { world, body } = buildWorld(r);
  const s = worldToFelt(r, atWorld.x, atWorld.z);
  body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  body.setTranslation({ x: s.px, y: 0.04, z: s.pz }, true);
  live = { world, body, rect: r, flying: false };
  flightTrace = { maxAbsX: 0, maxAbsZ: 0, escaped: false, rawSpeed: 0, effSpeed: 0 };
  return true;
}
export function dragMove(worldX: number, worldZ: number): void {
  if (!live || live.flying) return;
  const f = feltOf(live.rect);
  const s = worldToFelt(live.rect, worldX, worldZ);
  live.body.setNextKinematicTranslation({
    x: Math.max(-f.hx + HALF, Math.min(f.hx - HALF, s.px)), y: 0.04,
    z: Math.max(-f.hz + HALF, Math.min(f.hz - HALF, s.pz)),
  });
  live.world.step();
}
/** release → dynamic + the flick velocity (the shaker's throw energization).
 *  velWorld* arrive in WORLD UNITS PER SECOND; ÷M2W converts to m/s.
 *  R-1a2 (I-110, the owner's escape ruling): the speed is CAPPED at the tuned roll
 *  ceiling and the lift bounded — max arc ≈ 9u, structurally under the 162u rails. */
const FLICK_CAP = 3.2; // m/s — "I would put a cap on acceleration" (owner, 2026-08-04)
const FLICK_FLOOR = 1.6; // m/s — R-1c (I-126): "some players will not accept a dice roll
// where the dice hasn't been shaken enough" — a weak-but-real flick is scaled UP to the
// floor (direction preserved; the spin derives from the components, so tumble energy
// floors with it). Between floor and cap the gesture stays fully responsive.
export function dragEnd(velWorldX: number, velWorldZ: number): void {
  if (!live) return;
  let vx = velWorldX / M2W, vz = velWorldZ / M2W;
  const raw = Math.hypot(vx, vz);
  if (raw > FLICK_CAP) { const k = FLICK_CAP / raw; vx *= k; vz *= k; }
  else if (raw > 1e-9 && raw < FLICK_FLOOR) { const k = FLICK_FLOOR / raw; vx *= k; vz *= k; } // the floor (I-126)
  const sp = Math.hypot(vx, vz);
  if (flightTrace) { flightTrace.rawSpeed = raw; flightTrace.effSpeed = sp; } // I-115/M5
  live.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  live.body.setLinvel({ x: vx, y: 0.25 + Math.min(sp * 0.2, 0.45), z: vz }, true);
  live.body.setAngvel({ x: -vz * 200, y: (sp * 40) * 0.5, z: vx * 200 }, true);
  live.body.wakeUp();
  live.flying = true;
}
/** one live step; null = still going, a frame = the settle frame (the session closes).
 *  R-1a2 (I-110): the ESCAPE GUARD — a body outside the felt (+grace) or below the
 *  floor closes the session AS SETTLED, so the caller's rest→return glide brings the
 *  die home from wherever. Off the board now ALWAYS returns (defense in depth under
 *  the cap; the guard's falsifier is the cap mutant killing the hard-flick check). */
export function dragStep(): { frame: SimFrame; settled: boolean; escaped?: boolean } | null {
  if (!live) return null;
  if (!live.flying) return { frame: record(live.body), settled: false };
  live.world.step();
  const fr = record(live.body);
  const f = feltOf(live.rect);
  const t = live.body.translation();
  const escaped = t.y < -0.05 || Math.abs(t.x) > f.hx + 0.05 || Math.abs(t.z) > f.hz + 0.05;
  if (flightTrace) { flightTrace.maxAbsX = Math.max(flightTrace.maxAbsX, Math.abs(t.x)); flightTrace.maxAbsZ = Math.max(flightTrace.maxAbsZ, Math.abs(t.z)); if (escaped) flightTrace.escaped = true; }
  if (asleep(live.body) || escaped) { live.world.free(); live = null; return { frame: fr, settled: true, escaped }; }
  return { frame: fr, settled: false };
}
export const dragActive = (): boolean => live !== null;
export function dragCancel(): void { // contract v3 abort: drop the session; the die glides home
  if (live) { live.world.free(); live = null; }
}
