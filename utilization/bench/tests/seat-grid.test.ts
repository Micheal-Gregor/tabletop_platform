/** G-B (I-158/I-159): the seat surface's laws — spans, fill order, grouped sort,
 *  sticky claims, hit-test round-trip. Pure; the renderer obeys, never decides. */
import { describe, it, expect } from 'vitest';
import { cellLocal, cellAt, postingCells, planPostings, firstOpenCell, LEDGER_SPAN, HAND_SPAN, POSTING_SPAN, SEAT_COLS, SEAT_ROWS, cellW, cellD, surfaceSize } from '../src/seat-grid.js';

describe('G-B: the seat play surface grid (I-158/I-159)', () => {
  it('the spans partition without overlap: ledger 2×3, hand 2×1, postings 5×4 = 20', () => {
    expect(postingCells().length).toBe(20);
    // no posting cell inside the ledger or hand spans
    for (const c of postingCells()) {
      expect(c.col >= POSTING_SPAN.c0).toBe(true);
      expect(c.col > LEDGER_SPAN.c1 && c.col > HAND_SPAN.c1).toBe(true);
    }
    expect(LEDGER_SPAN.r1).toBeLessThan(HAND_SPAN.r0); // the hand sits BELOW the ledger block
  });
  it('fill order is top-left, row by row (the owner law, verbatim)', () => {
    const cells = postingCells();
    expect(cells[0]).toEqual({ row: 1, col: 3 });
    expect(cells[4]).toEqual({ row: 1, col: 7 });
    expect(cells[5]).toEqual({ row: 2, col: 3 }); // the wrap — next row, left again
  });
  it('the grouped sort: BBB → tradesperson → equipment regardless of arrival order (supersedes L-4)', () => {
    const plan = planPostings([
      { id: 'e1', kind: 'equipment' }, { id: 't1', kind: 'trades' }, { id: 'b1', kind: 'bbb' }, { id: 't2', kind: 'trades' },
    ]);
    expect(plan.get('b1')).toEqual({ row: 1, col: 3 });
    expect(plan.get('t1')).toEqual({ row: 1, col: 4 });
    expect(plan.get('t2')).toEqual({ row: 1, col: 5 });
    expect(plan.get('e1')).toEqual({ row: 1, col: 6 });
  });
  it('a STICKY claim holds its anchor and the flow fills around it; a bogus claim lapses', () => {
    const sticky = new Map([['t1', { row: 3, col: 5 }], ['b1', { row: 1, col: 1 }]]); // b1's is a LEDGER cell — lapses
    const plan = planPostings([{ id: 'b1', kind: 'bbb' }, { id: 't1', kind: 'trades' }], sticky);
    expect(plan.get('t1')).toEqual({ row: 3, col: 5 }); // stuck where released
    expect(plan.get('b1')).toEqual({ row: 1, col: 3 }); // the lapsed claim rejoins the flow
  });
  it('firstOpenCell is the flick destination: skips occupied, null at capacity', () => {
    expect(firstOpenCell([])).toEqual({ row: 1, col: 3 });
    expect(firstOpenCell([{ row: 1, col: 3 }])).toEqual({ row: 1, col: 4 });
    expect(firstOpenCell(postingCells())).toBeNull();
  });
  it('cellAt inverts cellLocal exactly for every cell (the stick hit-test round-trip)', () => {
    for (let r = 1; r <= SEAT_ROWS; r++) for (let c = 1; c <= SEAT_COLS; c++) {
      const p = cellLocal(r, c);
      expect(cellAt(p.lat, p.out)).toEqual({ row: r, col: c });
    }
  });
  it('the child spacing derives from the scale table (two data tables compose)', () => {
    expect(surfaceSize()).toEqual({ w: SEAT_COLS * cellW(), d: SEAT_ROWS * cellD() });
    expect(cellW()).toBeGreaterThan(64); // card width + gutter
    expect(cellD()).toBeGreaterThan(96);
  });
});
