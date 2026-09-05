// FOUNDRY PHYSICS BENCH — the generic headless scenario runner (RECIPE stage C).
// Generalizes the I-109 pattern (the die was "tuned headless before build", by hand)
// into a reusable battery any piece's scenario can grind against — no browser, no
// bundle, seconds per round.
//
//   node utilization/foundry/harness/physics-bench.mjs <scenario> [--sims=N] [--seed=S] [--json]
//
// <scenario> resolves to utilization/foundry/scenarios/<scenario>.scenario.mjs (or an
// explicit path to a .mjs file). A scenario module exports:
//
//   export default {
//     name: 'die',
//     outcomes: [1,2,3,4,5,6],   // the outcome partition (histogram bins), or null
//     maxSettleSteps: 240,       // battery bound: every sim must settle within this
//     restingTolerance: 0,       // fraction of sims allowed a non-flat SUSTAINED rest
//                                // (e.g. a die cocked against the rail — real physics
//                                // awaiting an owner ruling); default 0 = none allowed
//     simulate(u) { ... }        // u: uint32 seed → one INVISIBLE sim, returns
//       // { steps, settled, contained, resting, outcome }
//       //   steps     — sim steps until asleep (or the scenario's own cap)
//       //   settled   — did it actually fall asleep (false = ran to cap)
//       //   contained — never escaped the arena
//       //   resting   — final pose valid (flat on felt / on spindle / in tray)
//       //   outcome   — one of `outcomes` (or null for pure-fidget scenarios)
//   }
//
// The battery (all must hold):
//   settle    — every sim settled, max steps ≤ maxSettleSteps
//   contained — zero escapes
//   resting   — zero invalid resting poses
//   histogram — when `outcomes` is set: χ² over the outcome histogram below the 0.001
//               critical value for k−1 df (a PLAUSIBILITY check on the theater sim —
//               actual fairness is RNGStreams', per I-82e; a wildly skewed sim would
//               make the reconcile offset visible to a watching player)
//
// Exit 0 = battery green; exit 1 = a check failed; exit 2 = usage/load error.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const name = argv.find((a) => !a.startsWith('--'));
const num = (flag, dflt) => {
  const a = argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? Number(a.split('=')[1]) : dflt;
};
const SIMS = num('sims', 1000);
const SEED0 = num('seed', 0x5eed) >>> 0;
const JSON_OUT = argv.includes('--json');

if (!name) {
  console.error('usage: node physics-bench.mjs <scenario> [--sims=N] [--seed=S] [--json]');
  process.exit(2);
}
const path = name.endsWith('.mjs')
  ? (isAbsolute(name) ? name : join(process.cwd(), name))
  : join(HERE, '..', 'scenarios', `${name}.scenario.mjs`);
if (!existsSync(path)) {
  console.error(`physics-bench: no scenario at ${path}`);
  process.exit(2);
}
const scenario = (await import(pathToFileURL(path).href)).default;
if (typeof scenario?.simulate !== 'function') {
  console.error(`physics-bench: ${path} default export has no simulate(u)`);
  process.exit(2);
}
if (typeof scenario.init === 'function') await scenario.init();

// splitmix32 avalanche over the run seed — decorrelated per-sim seeds (the K-E mix32
// discipline, same shape as die-physics.ts).
const mix32 = (z0) => {
  let z = (z0 + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  return (z ^ (z >>> 15)) >>> 0;
};

const hist = new Map();
let settledAll = true, containedAll = true, restingBad = 0;
let maxSteps = 0, sumSteps = 0;
const failures = [];
for (let i = 0; i < SIMS; i++) {
  const u = mix32((SEED0 + i) >>> 0);
  const r = scenario.simulate(u);
  maxSteps = Math.max(maxSteps, r.steps);
  sumSteps += r.steps;
  if (!r.settled) { settledAll = false; if (failures.length < 8) failures.push({ sim: i, u, why: 'never settled' }); }
  if (!r.contained) { containedAll = false; if (failures.length < 8) failures.push({ sim: i, u, why: 'escaped arena' }); }
  if (!r.resting) { restingBad++; if (failures.length < 8) failures.push({ sim: i, u, why: 'invalid resting pose' }); }
  if (r.outcome != null) hist.set(r.outcome, (hist.get(r.outcome) ?? 0) + 1);
}

// χ² against uniform over the declared outcome partition. Critical values at α=0.001.
const CHI2_001 = { 1: 10.83, 2: 13.82, 3: 16.27, 4: 18.47, 5: 20.52, 6: 22.46, 7: 24.32, 8: 26.12, 9: 27.88, 10: 29.59, 11: 31.26 };
let chi2 = null, chi2Crit = null, chi2Ok = true;
if (Array.isArray(scenario.outcomes) && scenario.outcomes.length > 1) {
  const k = scenario.outcomes.length;
  const exp = SIMS / k;
  chi2 = scenario.outcomes.reduce((s, o) => { const d = (hist.get(o) ?? 0) - exp; return s + (d * d) / exp; }, 0);
  chi2Crit = CHI2_001[k - 1] ?? null;
  chi2Ok = chi2Crit == null ? true : chi2 <= chi2Crit;
}

const cap = scenario.maxSettleSteps ?? Infinity;
const restTol = scenario.restingTolerance ?? 0;
const restRate = restingBad / SIMS;
const checks = [
  { name: 'settle', pass: settledAll && maxSteps <= cap, detail: `max ${maxSteps} / cap ${cap === Infinity ? '∞' : cap} · mean ${(sumSteps / SIMS).toFixed(1)}` },
  { name: 'contained', pass: containedAll, detail: containedAll ? 'zero escapes' : 'ESCAPES — see failures' },
  { name: 'resting', pass: restRate <= restTol, detail: restingBad === 0 ? 'all poses valid' : `${restingBad}/${SIMS} non-flat (${(restRate * 100).toFixed(2)}% / tol ${(restTol * 100).toFixed(2)}%)` },
  ...(chi2 != null ? [{ name: 'histogram', pass: chi2Ok, detail: `χ²=${chi2.toFixed(2)} crit(α=.001)=${chi2Crit} · ${[...hist.entries()].sort((a, b) => (a[0] > b[0] ? 1 : -1)).map(([o, n]) => `${o}:${n}`).join(' ')}` }] : []),
];
const green = checks.every((c) => c.pass);
if (JSON_OUT) console.log(JSON.stringify({ scenario: scenario.name, sims: SIMS, seed: SEED0, checks, failures }, null, 2));
else {
  for (const c of checks) console.log(`${c.pass ? '✓' : '✗'} ${c.name.padEnd(10)} ${c.detail}`);
  for (const f of failures) console.log(`  failure sim=${f.sim} u=${f.u}: ${f.why}`);
  console.log(`PHYSICS BENCH ${scenario.name}: ${checks.filter((c) => c.pass).length}/${checks.length} · ${SIMS} sims`);
}
process.exit(green ? 0 : 1);
