#!/usr/bin/env node
// THE SIZE GATE (K-B, I-78; ARCHITECTURE.md §PIPELINE v2 adopted-law #2): one concern per
// file, never aggregate into a file because there's room. Hard cap ≤300 lines per
// `utilization/bench/src/**.ts`, enforced as a CI check that FAILS the build (not advice).
// The frozen `src/game.ts` (the certified SVG bench, sealed) is EXEMPT. Exceed the cap →
// extract a subordinate module in that same increment.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';

const ROOT = resolve('.');
const SRC = resolve(ROOT, 'utilization/bench/src');
const MAX = 300;
const EXEMPT = new Set(['game.ts']); // FROZEN certified SVG bench — sealed, not re-opened

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (f === 'node_modules' || f === 'dist') return [];
    return statSync(p).isDirectory() ? walk(p) : /\.ts$/.test(f) ? [p] : [];
  });

let bad = [];
let checked = 0;
for (const f of walk(SRC)) {
  const base = f.split(sep).pop();
  if (EXEMPT.has(base)) continue;
  checked++;
  // Count physical lines the way `wc -l` does (newline terminators).
  const lines = readFileSync(f, 'utf8').split('\n').length - 1;
  if (lines > MAX) bad.push(`${relative(ROOT, f)}: ${lines} lines > ${MAX} (extract a subordinate module)`);
}

if (bad.length) {
  console.error(`SIZE GATE VIOLATION (≤${MAX} lines per bench src file)\n` + bad.join('\n'));
  process.exit(1);
}
console.log(`size gate: OK — ${checked} bench src files ≤${MAX} lines (game.ts exempt)`);
