#!/usr/bin/env node
// HK-6 — CI import boundary: platform < library < patterns < content (fail build on inversion).
// K7 round-1 hardening (defect 4): catches bare side-effect imports, export-from re-exports,
// and relative-path escapes — not just `from '...'` package-name forms.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, sep } from 'node:path';

const ROOT = resolve('.');

// dir → [forbidden package specifiers, forbidden directory roots]
const RULES = [
  ['packages/engine', ['@tabletop/patterns', '@tabletop/presentation'], ['packages/patterns', 'packages/presentation', 'packs']],
  ['packages/patterns', ['@tabletop/presentation'], ['packages/presentation', 'packs']],
  ['packages/presentation', ['@tabletop/patterns'], ['packages/patterns', 'packs']],
];

const walk = (d) =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (f === 'node_modules' || f === 'dist') return [];
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|mts|cts|js|mjs|cjs)$/.test(f) ? [p] : [];
  });

// Every import specifier, whatever the syntactic form:
//   import x from '...' · import '...' · export ... from '...' · import('...') · require('...')
const SPECIFIER_RE =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g;

function specifiers(src) {
  const out = [];
  for (const m of src.matchAll(SPECIFIER_RE)) out.push(m[1]);
  return out;
}

let bad = [];
for (const [dir, forbiddenPkgs, forbiddenDirs] of RULES) {
  let files = [];
  try {
    files = walk(dir);
  } catch {
    continue;
  }
  const forbiddenRoots = forbiddenDirs.map((d) => resolve(ROOT, d) + sep);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const spec of specifiers(src)) {
      for (const pkg of forbiddenPkgs) {
        if (spec === pkg || spec.startsWith(pkg + '/')) {
          bad.push(`${f}: forbidden import "${spec}" (tier inversion toward ${pkg})`);
        }
      }
      if (spec.startsWith('.')) {
        const target = resolve(dirname(f), spec);
        for (const root of forbiddenRoots) {
          if ((target + sep).startsWith(root)) {
            bad.push(`${f}: relative import "${spec}" escapes into ${root} (tier inversion)`);
          }
        }
      }
      if (spec.includes('packs/')) {
        bad.push(`${f}: forbidden import "${spec}" (content tier is imported by NOTHING)`);
      }
    }
  }
}

if (bad.length) {
  console.error('HK-6 TIER VIOLATION\n' + bad.join('\n'));
  process.exit(1);
}
console.log('HK-6 tier boundary: OK');
