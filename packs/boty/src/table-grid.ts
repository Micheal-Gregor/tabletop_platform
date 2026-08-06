/**
 * THE TABLE'S CHILD GRID (I-185, the owner's snap ruling: 'if this table is an object
 * with a grid, can we not reduce the size of the child grid so we can snap these
 * shapes… This feels like we're winging it') — the v2 table's regions stop being
 * hand-typed coordinates and become SPANS on a declared macro-grid: three columns ×
 * three rows with a uniform margin/gutter, plus inner sub-grids for the boxes that
 * hold piles. Every rect DERIVES; the snap law (a vitest assertion) forbids drift.
 */
export const M = 2; // the outer margin AND the gutter — one number, everywhere
// columns: left (panels) · middle (the supply box) · right (global/exchange/medal)
const CW = [26, 34, 32] as const; // I-186: the right column absorbs the slack — content closes at 98 both axes, margins symmetric (the owner's edge-thickness catch)
// rows: the top band · the exchange band · the bottom band
const RH = [22, 30, 40] as const;

const colX = (c: number): number => { let x = M; for (let i = 0; i < c; i++) x += CW[i]! + M; return x; };
const rowY = (r: number): number => { let y = M; for (let i = 0; i < r; i++) y += RH[i]! + M; return y; };

export interface Rect { x: number; y: number; w: number; h: number }

/** a span of whole grid cells → its def rect (gutters between spanned cells absorbed). */
export function cell(c: number, r: number, colspan = 1, rowspan = 1): Rect {
  const x = colX(c), y = rowY(r);
  let w = -M, h = -M;
  for (let i = 0; i < colspan; i++) w += CW[c + i]! + M;
  for (let i = 0; i < rowspan; i++) h += RH[r + i]! + M;
  return { x, y, w, h };
}

/** an inner sub-grid: divide a box into cols×rows with the SAME margin — the piles'
 *  slots inside their shared boxes derive, never drift. */
export function inner(box: Rect, cols: number, rows: number, c: number, r: number): Rect {
  const w = (box.w - M * (cols + 1)) / cols;
  const h = (box.h - M * (rows + 1)) / rows;
  return { x: box.x + M + c * (w + M), y: box.y + M + r * (h + M), w, h };
}

// ── the named boxes (the single source the overlay consumes) ──
export const T_ART = cell(0, 0);
export const T_GLOBAL = cell(1, 0, 2); // spans middle+right — right edge ≡ the medal's
export const T_SUMMARY = cell(0, 1);
export const T_LOG = cell(0, 2);
export const T_SUPPLY = cell(1, 2); // I-186: the four supply decks drop to the THIRD band (the owner's arrows), beside the medal
export const T_EXCHANGE = cell(1, 1, 2); // I-186: the exchange spans middle+right — SAME dimensions as the global box (the owner's ruling), full second band
export const T_MEDAL = cell(2, 2);
// the piles: 2×2 inside the supply (bottom row aligned with the third band by
// construction — the inner grid divides the double-row box evenly)
export const T_TRADES = inner(T_SUPPLY, 2, 2, 0, 0);
export const T_EQUIP = inner(T_SUPPLY, 2, 2, 1, 0);
export const T_BBB = inner(T_SUPPLY, 2, 2, 0, 1);
export const T_NWK = inner(T_SUPPLY, 2, 2, 1, 1);
// I-187 (owner-ruled): deck + discard LEFT-ALIGNED in the exchange — the first two of
// four sub-columns, so the discard's spread-five fan stays ON the table (the right
// half of the box is its runway, deliberately empty at rest).
export const T_DECK = inner(T_EXCHANGE, 4, 1, 0, 0);
export const T_DISCARD = inner(T_EXCHANGE, 4, 1, 1, 0);
