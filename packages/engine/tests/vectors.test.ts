/**
 * V-2 / V-3 golden-vector anchors — discharged at the owner's R gate (2026-07-25).
 * DISCHARGE=1 writes the computed values; every normal run RE-DERIVES from the
 * implementation and compares. A mismatch is a divergence to EXPLAIN — refusal-not-repair
 * applies to vectors too: never update the pinned file to make a test pass.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeV2, computeV3 } from '../../../vectors/scenarios.js';

const V2_PATH = resolve(__dirname, '../../../vectors/V-2.json');
const V3_PATH = resolve(__dirname, '../../../vectors/V-3.json');

describe('V-2 · replay byte-equality (golden, computed 2026-07-25)', () => {
  it('rebuild ×2 ≡ live, and the hash matches the discharged vector', () => {
    const v2 = computeV2();
    expect(v2.rebuiltHash1).toBe(v2.finalHash); // AX-4, independent of the pin
    expect(v2.rebuiltHash2).toBe(v2.finalHash);

    if (process.env['DISCHARGE'] === '1') {
      writeFileSync(V2_PATH, JSON.stringify({ computed: '2026-07-25', gate: 'R-gate owner-approved', finalHash: v2.finalHash, moveCount: v2.moveCount, row: v2.row }, null, 2));
      return;
    }
    expect(existsSync(V2_PATH)).toBe(true);
    const pinned = JSON.parse(readFileSync(V2_PATH, 'utf8')) as { finalHash: string; moveCount: number };
    expect(v2.finalHash).toBe(pinned.finalHash);
    expect(v2.moveCount).toBe(pinned.moveCount);
  });
});

describe('V-3 · EFX dispatch table (golden, computed 2026-07-25)', () => {
  it('each descriptor → exactly its pinned typed mutation', () => {
    const v3 = computeV3();
    if (process.env['DISCHARGE'] === '1') {
      writeFileSync(V3_PATH, JSON.stringify({ computed: '2026-07-25', gate: 'R-gate owner-approved', table: v3 }, null, 2));
      return;
    }
    expect(existsSync(V3_PATH)).toBe(true);
    const pinned = JSON.parse(readFileSync(V3_PATH, 'utf8')) as { table: typeof v3 };
    expect(v3).toEqual(pinned.table);
  });
});
