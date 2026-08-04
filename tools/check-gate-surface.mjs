// CHECK:GATE-SURFACE (S-1b, I-104) — the parity guard born from a real crash: the S-1
// oracle extraction silently DROPPED five __GAME3D__ gate keys, and the full battery
// found out at VG8j:81 ("onionState is not a function") eight minutes in, owner-side.
// This guard fails the build in SECONDS instead: every `window.__GAME3D__.<key>` any
// gate module references must exist as a key (`<key>:`) somewhere in the bench source
// that builds the surface (game3d.ts + components/*.ts). Static, conservative, cheap.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GATE = join(ROOT, 'utilization/bench/gate');
const SRC = join(ROOT, 'utilization/bench/src');

const gateFiles = readdirSync(GATE).filter((f) => f.endsWith('.mjs'));
const wanted = new Set();
for (const f of gateFiles) {
  const s = readFileSync(join(GATE, f), 'utf8');
  for (const m of s.matchAll(/window\.__GAME3D__\.(\w+)/g)) wanted.add(m[1]);
}

const srcFiles = [
  ...readdirSync(SRC).filter((f) => f.endsWith('.ts')).map((f) => join(SRC, f)),
  ...readdirSync(join(SRC, 'components')).filter((f) => f.endsWith('.ts')).map((f) => join(SRC, 'components', f)),
];
const surface = srcFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

// a key is PROVIDED as `key: …` (explicit) or as a SHORTHAND property `key,` / `key\n`
// on its own line inside a gate object (the die.ts style). Conservative on both.
const missing = [...wanted].filter((k) =>
  !new RegExp(`(^|[^\\w])${k}\\s*:`, 'm').test(surface)
  && !new RegExp(`^\\s*${k}\\s*,?\\s*$`, 'm').test(surface));
if (missing.length) {
  console.error(`gate-surface guard: ${missing.length} referenced __GAME3D__ key(s) have NO provider in the bench source: ${missing.join(', ')}`);
  console.error('(a gate module calls these; the battery would crash mid-run — the I-104 defect class)');
  process.exit(1);
}
console.log(`gate-surface guard: OK — ${wanted.size} referenced __GAME3D__ keys all provided`);
