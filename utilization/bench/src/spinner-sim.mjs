/**
 * SPINNER-SIM — the spinner's single spin law (foundry pilot, BRIEF: targets/spinner/).
 * Pure math, ZERO imports: consumed by BOTH the browser spike (spinner3d.ts, via
 * esbuild) and the node scenario (foundry/scenarios/spinner.scenario.mjs, directly) —
 * one law, two consumers, no mirror to drift (the die's F-1 lesson institutionalized).
 *
 * THE LAW (the die's, verbatim): physics ANIMATES, it never decides. One invisible
 * 1-DOF sim per spin — viscous bearing + Coulomb dry friction, the dry term is what
 * makes a real spinner STOP — returns the recording + the sim's natural rest angle;
 * the caller composes the ANGULAR reconcile offset (the spinner's cube-symmetry
 * analog: a rotation of the whole recording preserves the motion, moves the landing)
 * and replays. Rest is SUSTAINED (SLEEP_STREAK consecutive quiet steps) from birth —
 * F-1 is a retrofit nowhere else again.
 */

export const DT = 1 / 60;          // the bench tick
export const N_DEFAULT = 6;        // owner-ruled at Stage-A approval (2026-09-05)
const VISC = 0.9;                  // 1/s — viscous bearing decay
const DRY = 0.9;                   // rad/s² — Coulomb friction (the true-stop term)
const W_MIN = 18, W_MAX = 42;      // rad/s launch window ≈ 3–7 full turns of theater
const EPS = 0.02;                  // rad/s — the quiet threshold (the die's scale)
const SLEEP_STREAK = 10;           // F-1: sustained, never single-sampled
const MAX_STEPS = 600;             // 10 s hard cap (a healthy spin settles ≪ this)

const TAU = Math.PI * 2;

/** splitmix32 avalanche (the K-E mix32 discipline — die-physics' twin, local copy
 *  because this file must stay import-free). */
export function mix32(z0) {
  let z = (z0 + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  z = (z ^ (z >>> 15)) >>> 0;
  return z / 4294967296;
}

export const normTheta = (th) => ((th % TAU) + TAU) % TAU;

/** the outcome read (BRIEF law): wedge i spans [i·2π/N, (i+1)·2π/N) — half-open, so a
 *  boundary landing resolves to the wedge the pointer entered last. */
export const wedgeOf = (theta, n = N_DEFAULT) => Math.floor((normTheta(theta) / TAU) * n) % n;

/** the wedge's center angle — the reconcile's landing point. */
export const wedgeCenter = (i, n = N_DEFAULT) => ((i + 0.5) * TAU) / n;

/** THE BURST SIM: one seeded spin from `theta0`, integrated invisibly to a TRUE stop.
 *  Returns every frame's theta + the natural rest angle. Deterministic by construction
 *  (fixed dt, fixed step order, no Math.random). */
export function simulateSpin(u, theta0 = 0, n = N_DEFAULT) {
  const w0 = W_MIN + mix32(u ^ 0x9e3779b9) * (W_MAX - W_MIN); // always clockwise; variety is the seed's
  let th = theta0, w = w0, still = 0, settled = false, steps = 0;
  const frames = [th];
  for (; steps < MAX_STEPS; steps++) {
    const dw = (VISC * w + DRY * Math.sign(w)) * DT;
    w = Math.abs(dw) >= Math.abs(w) ? 0 : w - dw; // Coulomb: friction never reverses, it stops
    th += w * DT;
    frames.push(th);
    if (Math.abs(w) < EPS) { if (++still >= SLEEP_STREAK) { settled = true; break; } } // F-1: sustained
    else still = 0;
  }
  return { frames, thetaRest: th, restWedge: wedgeOf(th, n), steps, settled, w0 };
}

/** the ANGULAR reconcile (I-82e's shape): offset every replayed frame so the recording
 *  lands on the TARGET wedge's center — motion character untouched, landing engine-true. */
export const reconcileOffset = (targetWedge, thetaRest, n = N_DEFAULT) =>
  wedgeCenter(targetWedge, n) - normTheta(thetaRest);
