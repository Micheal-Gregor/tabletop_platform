/**
 * L-4 (I-131) — the seat-front row planner's laws, each an owner's sentence made
 * falsifiable. MUT: invert the 5+ split → 'five-trades-two-rows' fails; drop the
 * equipment compression → 'equipment-one-compressing-row' fails; let pairs spill →
 * 'pairs-stay-in-trades-rows' fails.
 */
import { describe, it, expect } from 'vitest';
import { planSeatRows, PAIR_W, ROW_FIT } from '../src/seat-rows.js';

const T = (n: number, paired = 0) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, paired: i < paired }));
const E = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `e${i}` }));
const L = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `l${i}` }));

describe('L-4: planSeatRows (I-131)', () => {
  it('a lone tradesperson sits the front top row', () => {
    const rows = planSeatRows(T(1), [], []);
    expect(rows.length).toBe(1);
    expect(rows[0]!.kind).toBe('trades');
  });

  it('four trades keep ONE row; FIVE split into two — inserted BEFORE equipment', () => {
    expect(planSeatRows(T(4), E(2), []).filter((r) => r.kind === 'trades').length).toBe(1);
    const rows = planSeatRows(T(5), E(2), []);
    const kinds = rows.map((r) => r.kind);
    expect(kinds).toEqual(['trades', 'trades', 'equipment']); // grouped — the insert lands between
    expect(rows[0]!.items.length + rows[1]!.items.length).toBe(5);
  });

  it('pairs WIDEN and stay in the trades rows — never a new row', () => {
    const rows = planSeatRows(T(7, 7), [], L(1)); // the owner's max: 7 paired tradescards
    expect(rows.filter((r) => r.kind === 'trades').length).toBe(2);
    expect(rows.every((r) => r.kind !== 'equipment')).toBe(true); // attached equipment rides the pair
    for (const r of rows.filter((x) => x.kind === 'trades')) for (const i of r.items) expect(i.w).toBe(PAIR_W);
    expect(rows[rows.length - 1]!.kind).toBe('local'); // locals hold the bottom
  });

  it('unattached equipment COMPRESSES into ONE row (the I-131 amendment)', () => {
    const rows = planSeatRows(T(2), E(7), []);
    const eq = rows.filter((r) => r.kind === 'equipment');
    expect(eq.length).toBe(1); // one row, never two
    expect(eq[0]!.items.length).toBe(7);
    expect(eq[0]!.overlap).toBe(true); // over ROW_FIT → overlap to keep the space
    expect(planSeatRows(T(1), E(ROW_FIT), [])[1]!.overlap).toBe(false); // at fit — spaced
  });

  it('locals bottom row overlaps past the fit; the 4-row budget holds at the max', () => {
    const rows = planSeatRows(T(7), E(7), L(6));
    expect(rows.length).toBe(4); // 2 trades + 1 equipment + 1 local — the budget
    expect(rows[3]!.kind).toBe('local');
    expect(rows[3]!.overlap).toBe(true);
  });

  it('empty inputs plan empty — nothing renders from nothing', () => {
    expect(planSeatRows([], [], []).length).toBe(0);
  });
});
