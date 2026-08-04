/**
 * SEAT-ROWS (L-4, I-131) — the PURE row planner for the seat-front area, the owner's
 * layout law verbatim (I-130/I-131): tradespeople sit the FRONT TOP row; at 5+ a second
 * tradespeople row inserts so type stays grouped; PAIRS (tradesperson + attached
 * equipment) take a WIDER footprint and NEVER leave the trades rows; unattached
 * equipment COMPRESSES into ONE overlapping row (the I-131 amendment — the 4-row budget
 * holds); a drawn local card adds the BOTTOM row; local (and global) cards space out,
 * then OVERLAP when the row runs out. Max: trades ≤2 · equipment 1 · local 1 = 4 rows.
 * PURE data → plan (unit-tested in vitest); the renderer consumes the plan. Pairs are
 * an INPUT today proven by test and fed zeros until the attach verbs land (I-82f).
 */
export type SeatRowItem = { readonly id: string; readonly kind: 'trades' | 'pair' | 'equipment' | 'local'; readonly w: number };
export type SeatRow = { readonly kind: 'trades' | 'equipment' | 'local'; readonly items: readonly SeatRowItem[]; readonly overlap: boolean };

export const PAIR_W = 1.6; // the combined tradesperson+equipment footprint (under and to the side)
export const ROW_FIT = 4; // comfortable cards per row before spacing gives way

export function planSeatRows(
  trades: readonly { readonly id: string; readonly paired: boolean }[],
  equipment: readonly { readonly id: string }[], // UNATTACHED only — attached ride their pair
  locals: readonly { readonly id: string }[],
): readonly SeatRow[] {
  const rows: SeatRow[] = [];
  const t: SeatRowItem[] = trades.map((x) => ({ id: x.id, kind: x.paired ? 'pair' : 'trades', w: x.paired ? PAIR_W : 1 }));
  if (t.length) {
    if (t.length <= ROW_FIT) {
      rows.push({ kind: 'trades', items: t, overlap: false });
    } else {
      // 5+ tradespeople → the second trades row INSERTS (type stays grouped; both
      // rows precede equipment). Pairs stay in these rows — never a new one.
      const half = Math.ceil(t.length / 2);
      rows.push({ kind: 'trades', items: t.slice(0, half), overlap: false });
      rows.push({ kind: 'trades', items: t.slice(half), overlap: false });
    }
  }
  if (equipment.length) {
    // ONE compressing row (I-131): overlap rather than a second equipment row.
    rows.push({ kind: 'equipment', items: equipment.map((e) => ({ id: e.id, kind: 'equipment' as const, w: 1 })), overlap: equipment.length > ROW_FIT });
  }
  if (locals.length) {
    rows.push({ kind: 'local', items: locals.map((l) => ({ id: l.id, kind: 'local' as const, w: 1 })), overlap: locals.length > ROW_FIT });
  }
  return rows;
}
