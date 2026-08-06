/** G-B (I-158/I-159): the seat surface's laws — spans, fill order, grouped sort,
 *  sticky claims, hit-test round-trip. Pure; the renderer obeys, never decides. */
import { describe, it, expect } from 'vitest';
import { cellLocal, cellAt, postingCells, planPostings, firstOpenCell, LEDGER_SPAN, HAND_SPAN, POSTING_SPAN, SEAT_COLS, SEAT_ROWS, cellW, cellD, surfaceSize } from '../src/seat-grid.js';
import { OBJECT_SCALE } from '../src/playarea.js';

describe('G-B: the seat play surface grid (I-158/I-159)', () => {
  it('PB-8 (I-188): DETACHED equipment drops to the first available anchor its group allows — the flow absorbs it, sticky claims undisturbed', () => {
    // before detach: a pair (one trades card) + a bbb; after: the equipment appears
    const before = planPostings([{ id: 'b1', kind: 'bbb' }, { id: 't1', kind: 'trades' }]);
    const after = planPostings([{ id: 'b1', kind: 'bbb' }, { id: 't1', kind: 'trades' }, { id: 'e1:0', kind: 'equipment' }]);
    expect(after.get('b1')).toEqual(before.get('b1')); // nothing already placed moves
    expect(after.get('t1')).toEqual(before.get('t1'));
    expect(after.get('e1:0')).toEqual({ row: 1, col: 3 }); // the first anchor the grouped flow allows
    // with a sticky card sitting on that cell, the detach flows PAST it
    const sticky = new Map([['t1', { row: 1, col: 3 }]]);
    const around = planPostings([{ id: 'b1', kind: 'bbb' }, { id: 't1', kind: 'trades' }, { id: 'e1:0', kind: 'equipment' }], sticky);
    expect(around.get('e1:0')).toEqual({ row: 1, col: 2 }); // flows around the claim
  });

  it('I-178 (supersedes the I-163 partition): the POSTING field is the FULL 7×4 — 28 anchors; the fixture spans are defaults, not reservations', () => {
    expect(postingCells().length).toBe(28);
    expect(POSTING_SPAN).toEqual({ r0: 1, c0: 1, r1: 4, c1: 7 });
    expect(LEDGER_SPAN.r1).toBeLessThan(HAND_SPAN.r0); // the defaults keep their shape
  });
  it('fill order is top-left, row by row (the owner law, verbatim — from (1,1) now)', () => {
    const cells = postingCells();
    expect(cells[0]).toEqual({ row: 1, col: 1 });
    expect(cells[6]).toEqual({ row: 1, col: 7 });
    expect(cells[7]).toEqual({ row: 2, col: 1 }); // the wrap — next row, left again
  });
  it('the grouped sort: BBB → tradesperson → equipment regardless of arrival order (supersedes L-4)', () => {
    const plan = planPostings([
      { id: 'e1', kind: 'equipment' }, { id: 't1', kind: 'trades' }, { id: 'b1', kind: 'bbb' }, { id: 't2', kind: 'trades' },
    ]);
    expect(plan.get('b1')).toEqual({ row: 1, col: 1 });
    expect(plan.get('t1')).toEqual({ row: 1, col: 2 });
    expect(plan.get('t2')).toEqual({ row: 1, col: 3 });
    expect(plan.get('e1')).toEqual({ row: 1, col: 4 });
  });
  it('a STICKY claim holds its anchor and the flow fills around it; an OFF-GRID claim lapses (I-178: every on-grid cell is now postable)', () => {
    const sticky = new Map([['t1', { row: 3, col: 5 }], ['b1', { row: 5, col: 1 }]]); // b1's is off the 4-row grid — lapses
    const plan = planPostings([{ id: 'b1', kind: 'bbb' }, { id: 't1', kind: 'trades' }], sticky);
    expect(plan.get('t1')).toEqual({ row: 3, col: 5 }); // stuck where released
    expect(plan.get('b1')).toEqual({ row: 1, col: 1 }); // the lapsed claim rejoins the flow at (1,1)
  });
  it('firstOpenCell is the flick destination: skips occupied, null at capacity', () => {
    expect(firstOpenCell([])).toEqual({ row: 1, col: 1 });
    expect(firstOpenCell([{ row: 1, col: 1 }])).toEqual({ row: 1, col: 2 });
    expect(firstOpenCell(postingCells())).toBeNull();
  });
  it('cellAt inverts cellLocal exactly for every cell (the stick hit-test round-trip)', () => {
    for (let r = 1; r <= SEAT_ROWS; r++) for (let c = 1; c <= SEAT_COLS; c++) {
      const p = cellLocal(r, c);
      expect(cellAt(p.lat, p.out)).toEqual({ row: r, col: c });
    }
  });
  it('the child spacing derives from the scale table (K7-V minor: pinned to the CONTROL TABLE\'S numbers, not to itself)', () => {
    expect(cellW()).toBe(OBJECT_SCALE.card.w + 12); // the composition law, literal
    expect(cellD()).toBe(OBJECT_SCALE.card.h + 12);
    expect(surfaceSize()).toEqual({ w: 7 * (OBJECT_SCALE.card.w + 12), d: 4 * (OBJECT_SCALE.card.h + 12) });
  });
});
