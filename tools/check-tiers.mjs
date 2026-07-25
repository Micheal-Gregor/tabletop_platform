#!/usr/bin/env node
// HK-6 — CI import boundary: platform < library < patterns < content (fail build on inversion).
// Tier map: packages/engine = platform+library (internal tiering checked by folder below),
// packages/patterns = patterns, packs/ = content, packages/presentation = presentation
// (may import engine's public seam only: SeatProjector/IntentEmitter surface via @tabletop/engine).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RULES = [
  // [dir, forbidden import substrings]
  ['packages/engine', ['@tabletop/patterns', '@tabletop/presentation', 'packs/']],
  ['packages/patterns', ['packs/', '@tabletop/presentation']],
  ['packages/presentation', ['packs/', '@tabletop/patterns']],
];
const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  if (f === 'node_modules' || f === 'dist') return [];
  return statSync(p).isDirectory() ? walk(p) : (/\.(ts|mts|js|mjs)$/.test(f) ? [p] : []);
});
let bad = [];
for (const [dir, forbidden] of RULES) {
  let files = [];
  try { files = walk(dir); } catch { continue; }
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const imp of forbidden) {
      const re = new RegExp(String.raw`(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"][^'"]*${imp.replace('/', '\\/')}`);
      if (re.test(src)) bad.push(`${f}: forbidden import toward "${imp}" (tier inversion)`);
    }
  }
}
if (bad.length) { console.error('HK-6 TIER VIOLATION\n' + bad.join('\n')); process.exit(1); }
console.log('HK-6 tier boundary: OK');
