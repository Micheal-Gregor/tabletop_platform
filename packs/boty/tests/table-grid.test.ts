/** I-185 — THE SNAP LAW: every v2 table region ≡ its grid span (no hand-typed drift,
 *  ever again — 'this feels like we're winging it' is now structurally impossible). */
import { describe, it, expect } from 'vitest';
import { TOWN_TABLE_V2 } from '../src/index.js';
import { cell, inner, M, T_GLOBAL, T_EXCHANGE, T_MEDAL, T_SUPPLY, T_DECK, T_DISCARD, T_BBB, T_NWK } from '../src/table-grid.js';

const rg = (id: string) => TOWN_TABLE_V2.regions.find((r) => r.id === id)!;
const rect = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x, y: r.y, w: r.w, h: r.h });

describe('I-185: the table child grid — the snap law', () => {
  it('every box region ≡ its declared span (drift is a test failure, not a squint)', () => {
    expect(rect(rg('art-banner'))).toEqual(cell(0, 0));
    expect(rect(rg('global-play'))).toEqual(cell(1, 0, 2));
    expect(rect(rg('standings'))).toEqual(cell(0, 1));
    expect(rect(rg('log'))).toEqual(cell(0, 2));
    expect(rect(rg('supply'))).toEqual(cell(1, 2)); // I-186: the third band
    expect(rect(rg('exchange'))).toEqual(cell(1, 1, 2)); // I-186: ≡ the global box's dimensions
    expect(rect(rg('medal'))).toEqual(cell(2, 2));
  });
  it('the piles derive from their boxes (inner sub-grids, the same margin M)', () => {
    expect(rect(rg('tradespeople-pile'))).toEqual(inner(T_SUPPLY, 2, 2, 0, 0));
    expect(rect(rg('networking-pile'))).toEqual(inner(T_SUPPLY, 2, 2, 1, 1));
    expect(rect(rg('deck'))).toEqual(inner(T_EXCHANGE, 4, 1, 0, 0)); // I-187: left-aligned pair
    expect(rect(rg('discard'))).toEqual(inner(T_EXCHANGE, 4, 1, 1, 0));
    // I-187: the spread runway — the discard's right edge leaves ≥ the box's right half free
    const disc = inner(T_EXCHANGE, 4, 1, 1, 0);
    expect(disc.x + disc.w).toBeLessThanOrEqual(T_EXCHANGE.x + T_EXCHANGE.w / 2 + 1);
  });
  it("the owner's edge law, by arithmetic: global/exchange/medal share the right edge; the supply's bottom row aligns with the third band", () => {
    expect(T_GLOBAL.x + T_GLOBAL.w).toBe(T_MEDAL.x + T_MEDAL.w);
    expect(T_EXCHANGE.x + T_EXCHANGE.w).toBe(T_MEDAL.x + T_MEDAL.w);
    expect(T_EXCHANGE.x).toBe(T_GLOBAL.x); // I-186: the exchange mirrors the GLOBAL box
    expect(T_EXCHANGE.w).toBe(T_GLOBAL.w); // same dimensions — the owner's ruling, literal
    expect(T_DECK.w).toBe(T_DISCARD.w); // room for BOTH — equal slots
    expect(T_SUPPLY.y).toBe(T_MEDAL.y); // I-186: the supply box and the medal share the third band
    expect(T_NWK.y).toBe(T_BBB.y);
  });
});
