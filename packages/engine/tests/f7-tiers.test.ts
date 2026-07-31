/**
 * GBC-45 = R-4 — TierCriterion is FALSIFIABLE: an injected upward import makes
 * check-tiers FAIL naming the file (GX-34/HK-6). Presence-of-script is not proof;
 * this test injects real inversions and demands the named refusal, then proves the
 * clean tree passes. Probe files are created under a throwaway name and ALWAYS removed.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');

// The probe SOURCES are assembled so this test file's own text contains no matchable
// import specifier — otherwise the checker (correctly) flags the test itself. The
// written probe files carry the real, fully-formed inversion syntax.
const IMP = 'imp' + 'ort';
const EXP_FROM = 'exp' + 'ort * fr' + 'om';

function runChecker(): { status: number; out: string } {
  const r = spawnSync('node', ['tools/check-tiers.mjs'], { cwd: ROOT, encoding: 'utf8' });
  return { status: r.status ?? -1, out: `${r.stdout}\n${r.stderr}` };
}

function withProbe(file: string, source: string, fn: () => void): void {
  const p = resolve(ROOT, file);
  try {
    writeFileSync(p, source);
    fn();
  } finally {
    rmSync(p, { force: true });
  }
}

describe('GBC-45 · R-4: upward dependency → build refusal, file NAMED (GX-34)', () => {
  it('the clean tree passes', () => {
    const r = runChecker();
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/HK-6 tier boundary: OK/);
  });

  it('patterns importing presentation → FAIL naming the probe', () => {
    withProbe('packages/patterns/src/__r4_probe.ts', `${IMP} '@tabletop/presentation';\n`, () => {
      const r = runChecker();
      expect(r.status).not.toBe(0);
      expect(r.out).toMatch(/__r4_probe/);
      expect(r.out).toMatch(/@tabletop\/presentation/);
    });
  });

  it('engine importing patterns → FAIL (the platform never reaches up)', () => {
    withProbe('packages/engine/src/__r4_probe.ts', `${EXP_FROM} '@tabletop/patterns';\n`, () => {
      const r = runChecker();
      expect(r.status).not.toBe(0);
      expect(r.out).toMatch(/@tabletop\/patterns/);
    });
  });

  it('ANY tier importing content (packs/) → FAIL — content is imported by nothing', () => {
    mkdirSync(resolve(ROOT, 'packs'), { recursive: true });
    withProbe('packages/patterns/src/__r4_probe.ts', `${IMP} '../../../packs/boty/index.js';\n`, () => {
      const r = runChecker();
      expect(r.status).not.toBe(0);
      expect(r.out).toMatch(/tier inversion|content tier/);
    });
  });

  it('a RELATIVE-path escape into a forbidden tier → FAIL (no side door)', () => {
    withProbe('packages/engine/src/__r4_probe.ts', `${IMP} '../../patterns/src/index.js';\n`, () => {
      const r = runChecker();
      expect(r.status).not.toBe(0);
      expect(r.out).toMatch(/escapes into|tier inversion/);
    });
  });

  it('after every probe: the tree is clean again', () => {
    const r = runChecker();
    expect(r.status).toBe(0);
  });
});
