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

import { computeV1 } from '../../../vectors/scenarios.js';
const V1_PATH = resolve(__dirname, '../../../vectors/V-1.json');

describe('V-1 · the MINIMAL micro-game (golden, computed 2026-07-26)', () => {
  it('Stage-2b S0..S10 (σ=7): B wins at +3, replay ×2 byte-identical — matches the discharged vector', () => {
    const v1 = computeV1();
    // The law, stated independently of the pin (SP-5):
    expect(v1.champion).toBe('B');
    expect(v1.ranking).toEqual([{ seat: 'B', cash: 3 }, { seat: 'A', cash: 0 }]);
    expect(v1.rebuiltHash1).toBe(v1.finalHash); // AX-4
    expect(v1.rebuiltHash2).toBe(v1.finalHash);

    if (process.env['DISCHARGE'] === '1') {
      writeFileSync(V1_PATH, JSON.stringify({ computed: '2026-07-26', gate: 'R-gate discharge 4, owner-approved', finalHash: v1.finalHash, champion: v1.champion, ranking: v1.ranking, moveCount: v1.moveCount, row: v1.row }, null, 2));
      return;
    }
    expect(existsSync(V1_PATH)).toBe(true);
    const pinned = JSON.parse(readFileSync(V1_PATH, 'utf8')) as { finalHash: string; champion: string; moveCount: number };
    expect(v1.finalHash).toBe(pinned.finalHash);
    expect(v1.champion).toBe(pinned.champion);
    expect(v1.moveCount).toBe(pinned.moveCount);
  });
});

import { computeV4 } from '../../../vectors/scenarios.js';
const V4_PATH = resolve(__dirname, '../../../vectors/V-4.json');

describe('V-4 · pattern-preset fidelity (golden, computed 2026-07-30)', () => {
  it('the full catalog sweep reproduces inventory-documented behavior — matches the discharged vector', () => {
    const v4 = computeV4() as Record<string, Record<string, unknown>>;
    // The laws, stated independently of the pin (SP-5/VK-8):
    expect(v4['catalog:families']).toEqual({ VNT: 6, RTM: 3, IWN: 9, TFX: 2, CLOSING: 1 });
    expect(v4['vnt:routed']!['routingWindowOpened']).toBe(true); // unassigned → gated routing
    expect(v4['vnt:job']!['routingWindowOpened']).toBe(false); // degenerate: self-assigned
    expect(v4['vnt:job:lifecycle']!['status']).toBe('complete'); // RC-A′ end to end
    expect(v4['vnt:job:lifecycle']!['receivable']).toMatchObject({ holder: 'A', amount: 4 });
    for (const k of ['threat', 'court', 'damages', 'settle', 'poach', 'mayor', 'referral', 'routing', 'estate']) {
      expect(v4[`iwn:${k}`]).toMatchObject({ kind: k, gated: true, status: 'open' }); // all nine, engine-gated
    }
    expect(v4['tfx:global']!['cash']).toEqual([['A', -1], ['B', -1]]); // table scope
    expect(v4['tfx:modifier']!['cash']).toEqual([['A', 0], ['B', -1]]); // one outfit only

    if (process.env['DISCHARGE'] === '1') {
      writeFileSync(V4_PATH, JSON.stringify({ computed: '2026-07-30', gate: 'R-gate discharge 5, owner-approved', table: v4 }, null, 2));
      return;
    }
    expect(existsSync(V4_PATH)).toBe(true);
    const pinned = JSON.parse(readFileSync(V4_PATH, 'utf8')) as { table: typeof v4 };
    expect(v4).toEqual(pinned.table);
  });
});
