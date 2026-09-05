// DIE SCENARIO — the worked reference for the foundry physics bench (RECIPE stage C).
// A self-contained node-side mirror of the CERTIFIED die sim (bench/src/die-physics.ts,
// R-1a / I-109): same scale, gravity boost, materials, launch windows, sleep criterion,
// and top-face read. Mirrored rather than imported because die-physics.ts is a browser
// bundle entry (TS, imports die.js/playarea.js) — die-physics.ts remains the law for
// the BENCH; this file is the law for nothing. If the two drift, the bench wins.
//
// A NEW piece's scenario starts as a copy of this shape: build arena → seeded launch →
// step to sleep → read outcome/pose → report {steps, settled, contained, resting, outcome}.
//
// ── FOUNDRY FINDINGS (first 500-sim battery, seed 0x5eed — for the owner's docket) ──
// F-1 APEX-FREEZE: die-physics.ts samples its asleep() criterion ONCE per step; a slow
//     tip-over passes through near-zero velocity at its apex, so ~2% of seeds "settle"
//     visibly tilted (u=421461979 rests at up=0.907; the reconcile offset is a cube
//     symmetry — it maps face to face but PRESERVES tilt, so the bench die would rest
//     cocked). This scenario DIVERGES on purpose: the criterion must hold SLEEP_STREAK
//     consecutive steps, which cures every apex-freeze observed (settle cost ≈ +150
//     steps worst-case, still ≪ the 900 cap). Porting the streak to die-physics.ts is
//     a NEW work item for the owner — closed gates stay closed, per the contract.
// F-2 COCKED DIE: u=290332200 rests SUSTAINED at up≈0.776, raised off the felt against
//     a rail — a die cocked against the wall, which is real dice behavior. The battery
//     reports it via `restingTolerance` (measured rate below); what the bench should DO
//     about a cocked settle (nudge, invisible re-toss, accept) is an OWNER ruling the
//     foundry surfaces, not a decision this scenario makes.
import RAPIER from '@dimforge/rapier3d-compat';

const HALF = 0.025;          // die half-extent, meters (45u / 900 / 2)
const G = 9.81 * 3;          // the shaker's boosted gravity
const RAIL_H = 0.18;
const FELT_HX = 0.5, FELT_HZ = 0.4; // a representative table felt (≈900×720u)
const MAX_STEPS = 900;       // the sim's own hard cap (die-physics loop bound)
const SLEEP_STREAK = 10;     // F-1: asleep() must hold this many CONSECUTIVE steps

const mix32 = (z0) => {
  let z = (z0 + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return ((z ^ (z >>> 15)) >>> 0) / 4294967296;
};

const FACES = [
  { v: 1, n: [0, 1, 0] }, { v: 6, n: [0, -1, 0] }, { v: 2, n: [1, 0, 0] },
  { v: 5, n: [-1, 0, 0] }, { v: 3, n: [0, 0, 1] }, { v: 4, n: [0, 0, -1] },
];
const qRot = (q, v) => {
  const { x, y, z, w } = q;
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};
const topFaceOf = (q) => {
  let best = -Infinity, val = 1, up = 0;
  for (const f of FACES) { const wy = qRot(q, f.n)[1]; if (wy > best) { best = wy; val = f.v; up = wy; } }
  return { val, up };
};

function buildWorld() {
  const world = new RAPIER.World({ x: 0, y: -G, z: 0 });
  const fixed = (hx, hy, hz, x, y, z, rest, fric) => {
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setRestitution(rest).setFriction(fric), b);
  };
  fixed(FELT_HX, 0.01, FELT_HZ, 0, -0.01, 0, 0.12, 0.7); // felt
  fixed(0.01, RAIL_H, FELT_HZ, -FELT_HX, RAIL_H, 0, 0.1, 0.7); // rails
  fixed(0.01, RAIL_H, FELT_HZ, FELT_HX, RAIL_H, 0, 0.1, 0.7);
  fixed(FELT_HX, RAIL_H, 0.01, 0, RAIL_H, -FELT_HZ, 0.1, 0.7);
  fixed(FELT_HX, RAIL_H, 0.01, 0, RAIL_H, FELT_HZ, 0.1, 0.7);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, HALF, 0).setCcdEnabled(true).setCanSleep(true));
  world.createCollider(RAPIER.ColliderDesc.cuboid(HALF, HALF, HALF).setRestitution(0.25).setFriction(0.6).setDensity(1), body);
  return { world, body };
}

export default {
  name: 'die',
  outcomes: [1, 2, 3, 4, 5, 6],
  maxSettleSteps: 320, // the battery bar; streak-10 settles ≤~260 from center launches
  restingTolerance: 0.01, // F-2: cocked-against-the-rail dice are real; rate reported, bar 1%
  async init() { await RAPIER.init(); },
  simulate(u0) {
    const u = u0 >>> 0;
    const { world, body } = buildWorld();
    // die-physics launch windows (I-109 tuning): heading uniform, 2.0–3.4 m/s, vy 1.1–1.8, spin ±16/±9/±16
    const th = mix32(u ^ 0x9e3779b9) * 2 * Math.PI;
    const sp = 2.0 + mix32(u + 0x6d2b79f5) * 1.4;
    const vy = 1.1 + mix32(u + 0x51ed2701) * 0.7;
    body.setLinvel({ x: Math.cos(th) * sp, y: vy, z: Math.sin(th) * sp }, true);
    body.setAngvel({ x: (mix32(u + 11) * 2 - 1) * 16, y: (mix32(u + 23) * 2 - 1) * 9, z: (mix32(u + 37) * 2 - 1) * 16 }, true);
    let steps = 0, settled = false, streak = 0;
    for (; steps < MAX_STEPS; steps++) {
      world.step();
      const v = body.linvel(), w = body.angvel();
      if (Math.hypot(v.x, v.y, v.z) < 0.02 && Math.hypot(w.x, w.y, w.z) < 0.02) {
        if (++streak >= SLEEP_STREAK) { settled = true; break; } // F-1: sustained, not sampled
      } else streak = 0;
    }
    const t = body.translation();
    const { val, up } = topFaceOf(body.rotation());
    world.free();
    return {
      steps,
      settled,
      contained: Math.abs(t.x) <= FELT_HX && Math.abs(t.z) <= FELT_HZ && t.y < RAIL_H * 2,
      // flat on a face, on the felt. The bar is 0.98 (≈11°), NOT 0.999: the 0.02-vel
      // sleep threshold leaves ~3° of jitter on honest settles (up 0.998–0.9992), while
      // cocked-against-the-rail rests measure ≤0.93 — the clusters are cleanly separable.
      resting: up > 0.98 && t.y <= HALF * 1.2,
      outcome: val,
    };
  },
};
