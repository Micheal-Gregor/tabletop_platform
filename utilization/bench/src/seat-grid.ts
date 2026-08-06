/**
 * SEAT GRID (G-B, I-158/I-159) — the seat play surface as DATA: a 7-across × 4-deep
 * child grid behind each board, its own spacing (derived from the scale control table,
 * independent of the parent grid — the owner's child-grid law). Spans, read (row, col):
 *   LEDGER   rows 1–3, cols 1–2  (the folder + books' claim, left block)
 *   HAND     row 4,    cols 1–2  (the networking hand's zone — C-1d lands here)
 *   POSTINGS rows 1–4, cols 3–7  (20 card anchors)
 * Cards SORT GROUPED — BBB → tradesperson → equipment — filling postings top-left,
 * row by row (I-159 supersedes L-4's row types). A paired tradesperson+equipment is
 * ONE grouped object on ONE anchor. The active player may STICK a card to a chosen
 * anchor; sticky claims hold across sorts, and the flow fills around them.
 * Pure data + pure functions; no THREE, no renderer.
 */
import { OBJECT_SCALE } from './playarea.js';

export const SEAT_COLS = 7;
export const SEAT_ROWS = 4;
export const GUTTER = 12;
/** the child grid's own spacing — from the scale table (two data tables compose). */
export const cellW = (): number => OBJECT_SCALE.card.w + GUTTER; // across (lat)
export const cellD = (): number => OBJECT_SCALE.card.h + GUTTER; // deep (toward player)

export interface Span { readonly r0: number; readonly c0: number; readonly r1: number; readonly c1: number }
export const LEDGER_SPAN: Span = { r0: 1, c0: 1, r1: 3, c1: 2 };
export const HAND_SPAN: Span = { r0: 4, c0: 1, r1: 4, c1: 2 };
export const POSTING_SPAN: Span = { r0: 1, c0: 3, r1: 4, c1: 7 };

/** a cell's LOCAL offset on the surface — lat: across (centered), out: deeper rows
 *  step TOWARD the player (the I-144 law). Row/col are 1-based (the owner's reading). */
export function cellLocal(row: number, col: number): { lat: number; out: number } {
  return {
    lat: (col - (SEAT_COLS + 1) / 2) * cellW(),
    out: (row - 1) * cellD(),
  };
}

/** the posting anchors in FILL ORDER — top-left, row by row (the owner's law). */
export function postingCells(): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  for (let r = POSTING_SPAN.r0; r <= POSTING_SPAN.r1; r++)
    for (let c = POSTING_SPAN.c0; c <= POSTING_SPAN.c1; c++) out.push({ row: r, col: c });
  return out;
}

export type CardKind = 'bbb' | 'trades' | 'equipment';
export interface SeatCard { readonly id: string; readonly kind: CardKind }
const GROUP_ORDER: readonly CardKind[] = ['bbb', 'trades', 'equipment']; // I-159: the grouped sort

/** THE PLACEMENT LAW: grouped sort → postings in fill order, flowing AROUND sticky
 *  claims (a stuck card owns its anchor; the flow skips claimed cells). A sticky claim
 *  for a card no longer present simply lapses. Returns cell per card id. */
export function planPostings(
  cards: readonly SeatCard[],
  sticky: ReadonlyMap<string, { row: number; col: number }> = new Map(),
): Map<string, { row: number; col: number }> {
  const cells = postingCells();
  const key = (c: { row: number; col: number }) => `${c.row},${c.col}`;
  const valid = new Set(cells.map(key));
  const out = new Map<string, { row: number; col: number }>();
  const claimed = new Set<string>();
  // sticky first — a claim must be a real posting cell and unique; conflicts lapse to flow
  for (const card of cards) {
    const st = sticky.get(card.id);
    if (st && valid.has(key(st)) && !claimed.has(key(st))) { out.set(card.id, st); claimed.add(key(st)); }
  }
  // the grouped flow fills the rest
  const sorted = [...cards].sort((a, b) => GROUP_ORDER.indexOf(a.kind) - GROUP_ORDER.indexOf(b.kind));
  let i = 0;
  for (const card of sorted) {
    if (out.has(card.id)) continue;
    while (i < cells.length && claimed.has(key(cells[i]!))) i++;
    if (i >= cells.length) break; // over capacity: the overflow law is the caller's (overlap)
    out.set(card.id, cells[i]!);
    claimed.add(key(cells[i]!));
    i++;
  }
  return out;
}

/** the first OPEN posting cell (the flick's destination — 'the first open card posting
 *  area going top to left row by row'). */
export function firstOpenCell(occupied: ReadonlyArray<{ row: number; col: number }>): { row: number; col: number } | null {
  const used = new Set(occupied.map((c) => `${c.row},${c.col}`));
  for (const c of postingCells()) if (!used.has(`${c.row},${c.col}`)) return c;
  return null;
}

/** hit-test a LOCAL point on the surface back to its cell (the drag-down-and-STICK). */
export function cellAt(lat: number, out: number): { row: number; col: number } | null {
  const col = Math.round(lat / cellW() + (SEAT_COLS + 1) / 2);
  const row = Math.round(out / cellD() + 1);
  if (row < 1 || row > SEAT_ROWS || col < 1 || col > SEAT_COLS) return null;
  return { row, col };
}

/** the surface's full extent (for the transparent plane + the camera's read fit). */
export function surfaceSize(): { w: number; d: number } {
  return { w: SEAT_COLS * cellW(), d: SEAT_ROWS * cellD() };
}
