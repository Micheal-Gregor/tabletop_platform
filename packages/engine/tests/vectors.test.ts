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

import { computeV5, computeV6 } from '../../../vectors/scenarios.js';
const V5_PATH = resolve(__dirname, '../../../vectors/V-5.json');
const V6_PATH = resolve(__dirname, '../../../vectors/V-6.json');

describe('V-5 · admissibility decision table (golden, computed 2026-07-25)', () => {
  it('the EX-2 predicate decides per kind — matches the discharged table', () => {
    const v5 = computeV5();
    if (process.env['DISCHARGE'] === '1') {
      writeFileSync(V5_PATH, JSON.stringify({ computed: '2026-07-25', gate: 'R-gate owner-approved', table: v5 }, null, 2));
      return;
    }
    const pinned = JSON.parse(readFileSync(V5_PATH, 'utf8')) as { table: typeof v5 };
    expect(v5).toEqual(pinned.table);
  });
});

describe('V-6 · composed-Surface integrity (golden, computed 2026-07-25)', () => {
  it('compose → place-onto-map → retire hashes match the discharged vector', () => {
    const v6 = computeV6();
    if (process.env['DISCHARGE'] === '1') {
      writeFileSync(V6_PATH, JSON.stringify({ computed: '2026-07-25', gate: 'R-gate owner-approved', ...v6 }, null, 2));
      return;
    }
    const pinned = JSON.parse(readFileSync(V6_PATH, 'utf8')) as typeof v6;
    expect(v6.composedHash).toBe(pinned.composedHash);
    expect(v6.placedOntoMapHash).toBe(pinned.placedOntoMapHash);
    expect(v6.retiredHash).toBe(pinned.retiredHash);
  });
});

import { computeV7, computeV8 } from '../../../vectors/scenarios.js';
const V7_PATH = resolve(__dirname, '../../../vectors/V-7.json');
const V8_PATH = resolve(__dirname, '../../../vectors/V-8.json');

describe('V-7 · rule-dispatch order (golden, computed 2026-07-25)', () => {
  it('per-firing snapshot + bearer-entry-seq total order — matches the discharged vector', () => {
    const v7 = computeV7();
    expect(v7.deckOrder.slice(0, 3)).toEqual(['Z', 'Y', 'X']); // the law, independent of the pin
    if (process.env['DISCHARGE'] === '1') {
      writeFileSync(V7_PATH, JSON.stringify({ computed: '2026-07-25', gate: 'R-gate owner-approved', ...v7 }, null, 2));
      return;
    }
    const pinned = JSON.parse(readFileSync(V7_PATH, 'utf8')) as typeof v7;
    expect(v7.finalHash).toBe(pinned.finalHash);
    expect(v7.deckOrder).toEqual(pinned.deckOrder);
  });
});

describe('V-8 · the monster room (golden, computed 2026-07-25)', () => {
  it('registers on FORM (fires through EFX), inert after dissolve — matches the discharged vector', () => {
    const v8 = computeV8();
    expect(v8.monsterFired).toBe(1); // the law: fired exactly once, on formation
    expect(v8.afterFormHash).not.toBe(v8.afterDissolveHash);
    if (process.env['DISCHARGE'] === '1') {
      writeFileSync(V8_PATH, JSON.stringify({ computed: '2026-07-25', gate: 'R-gate owner-approved', ...v8 }, null, 2));
      return;
    }
    const pinned = JSON.parse(readFileSync(V8_PATH, 'utf8')) as typeof v8;
    expect(v8.afterFormHash).toBe(pinned.afterFormHash);
    expect(v8.afterDissolveHash).toBe(pinned.afterDissolveHash);
  });
});
