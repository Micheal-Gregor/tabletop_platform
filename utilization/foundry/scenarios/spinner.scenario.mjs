// SPINNER SCENARIO (foundry pilot, Stage C) — imports the SINGLE spin law from
// bench/src/spinner-sim.mjs (no mirror; the die's F-1 lesson institutionalized).
// Oracles per the approved BRIEF: settle ≤ cap · resting = TRUE stop (ω ≡ 0, θ finite,
// normalized) · contained = the 1-DOF discipline (θ real, no NaN escape) · histogram =
// wedge outcomes uniform within χ² (the SIM's plausibility; fairness is the stream's).
import { simulateSpin, wedgeOf, N_DEFAULT } from '../../bench/src/spinner-sim.mjs';

export default {
  name: 'spinner',
  outcomes: [0, 1, 2, 3, 4, 5],
  maxSettleSteps: 300, // ≈5 s of theater at the 60 Hz tick — the BRIEF's ceiling
  restingTolerance: 0, // a spinner has no cocked rest — every spin ends flat, period
  simulate(u0) {
    const u = u0 >>> 0;
    // theta0 varies per spin (the pointer starts where the last spin left it, in play);
    // derived from the seed so the battery also sweeps starting poses.
    const theta0 = ((u >>> 8) % 360) * (Math.PI / 180);
    const r = simulateSpin(u, theta0, N_DEFAULT);
    return {
      steps: r.steps,
      settled: r.settled,
      contained: Number.isFinite(r.thetaRest), // 1-DOF: the only escape is numeric
      resting: r.settled && Number.isFinite(r.thetaRest),
      outcome: wedgeOf(r.thetaRest, N_DEFAULT),
    };
  },
};
