/** I-150 (owner-ruled): THE OBJECT SCALE CONTROL TABLE — the parent's single truth for
 *  every board object's dimensions ('a control table to ensure each object has a scale
 *  and stays true to it'). Child games may OVERRIDE per class AS DATA (the TableMode
 *  pattern); every consumer DERIVES — no object carries a private size again. */
export const OBJECT_SCALE = {
  card: { w: 64, h: 96, t: 1.6 }, // near real-card proportion against the 900-wide board
  die: 45,
  board: { w: 260, h: 260 },
  folder: { w: 130, h: 180 },
} as const;

/**
 * THE PLAY AREA — the RADIAL PARENT TEMPLATE (PA-1, I-141; the owner's law verbatim):
 * "0,0,0 is the center of play … player spots are situated in a radius around 0,0,0 at
 * equidistance along the circumference … grow or shrink that radius to fit player
 * minimum circumference (and buffer) with consideration of required table board area …
 * a template that will resize itself as the objects are built."
 *
 * ONE derivation, two constraints, no special seats:
 *   R = max( STATION_CHORD / (2·sin(π/N)),  tableHalfDiagonal + TABLE_CLEAR )
 * — the stations' chord claim (equidistance with buffer) vs the table's clearance.
 * Seat i sits at φ_i = (i−1)·2π/N: SEAT-1 anchors the near-mid angle (+z), which keeps
 * the certified read-pose pins (seat-1 near · seat-4 opposite) valid by construction at
 * N=6 while any other N derives freely. Yaw = φ (each board faces its own player).
 */

/** the station's chord claim: the wider of the board (260) and the row plan (380),
 *  plus the presentation buffer — "tight, consistent, professional". */
// G-B2 (I-164): the chord DERIVES from the seat surface's width (7 cells of card+gutter
// + margin) — the radial template self-resizes, as designed at PA-1. The 7/12 literals
// are BOUND to seat-grid's SEAT_COLS/GUTTER by a vitest law (no import — layering).
export const STATION_CHORD = 7 * (OBJECT_SCALE.card.w + 12) + 48;
export const TABLE_CLEAR = 60; // F-6 (I-148, owner: 'brought in a little') — was 130

/** the table's half-diagonal (world): the current 900×700 board. Self-resizes when
 *  the table object changes — pass the live value where known. */
// PB-7 (I-183, owner-ruled 'the table board could be reduced slightly … reduce the
// perimeter of the seats to bring them closer'): THE TABLE SCALE is single-source —
// the def is 100×100; world = 100·scale. Shrinking here pulls TABLE_HALF_DIAG, the
// dice circle, and the seat ring in TOGETHER (the radial template self-resizes).
export const TABLE_SCALE = { x: 8.4, y: 6.6 } as const; // was 9×7 (900×700 → 840×660)
export const TABLE_HALF_DIAG = Math.hypot(50 * TABLE_SCALE.x, 50 * TABLE_SCALE.y);
// D-1b (I-188, the I-175(1) ruling): THE DICE THROW AREA is its OWN reusable object,
// independent of the tabletop — for THIS game its radius matches the table's corner
// circle AS CONFIG (a child game may set any radius); the HOME sits ~10° PAST the
// active seat's center so the seat board never blocks it; the TOSS rails cover 3/4 of
// the table's area (the centered similar-rect, scale = √0.75).
export const DICE_RING = {
  radius: (): number => TABLE_HALF_DIAG, // config — equals the corner circle for BOTY
  homeOffsetDeg: 25, // I-193 (owner-tuned): 25° past the seat center — 20° still clipped the player board
  tossAreaFraction: 0.75, // of the table's area
  /** I-189 (owner-ruled ROUND): the toss boundary is a CIRCLE whose area = the
   *  fraction of the table's — πR² = f·A ⇒ R = √(f·A/π). One number, derived. */
  tossRadius: (): number => Math.sqrt((0.75 * (100 * TABLE_SCALE.x) * (100 * TABLE_SCALE.y)) / Math.PI) * 1.1, // I-194 (owner-tuned): +10% radius — clear felt opens between the wall and the table's edge
  /** I-192/I-193 (owner-ruled): ONE circumference serves throw AND rest — the rest
   *  ANCHOR lies ON the toss circle at (seat angle + offset) and the disc is DISPLACED
   *  INWARD by just its own clearance (r≈40 + margin 5), as far back from 0,0,0 as the
   *  wall allows. Every term derives from the active seat, so the home ROTATES seat to
   *  seat with equal geometry — the congruence the owner asked to be promised. */
  homeRadius: (): number => DICE_RING.tossRadius() - 45, // I-194: derives from tossRadius directly — one formula, no drift (the I-193 duplicate retired)
} as const;

export function ringRadius(seatCount: number, tableHalfDiag: number = TABLE_HALF_DIAG): number {
  const rSeats = STATION_CHORD / (2 * Math.sin(Math.PI / Math.max(2, seatCount)));
  return Math.max(rSeats, tableHalfDiag + TABLE_CLEAR);
}

/** seat i's angle — seat-1 anchored at the near-mid (+z). */
export function seatAngle(i: number, seatCount: number): number {
  return ((i - 1) * 2 * Math.PI) / seatCount;
}

/** the derived yaw list — the SINGLE YAW TRUTH's new source (I-133 → I-141). */
export function ringYaws(seatCount: number): number[] {
  return Array.from({ length: seatCount }, (_, i) => seatAngle(i, seatCount));
}

/** seat i's station position on the ring. */
export function stationPos(i: number, seatCount: number, r: number = ringRadius(seatCount)): { x: number; z: number; yaw: number } {
  const a = seatAngle(i, seatCount);
  return { x: Math.sin(a) * r, z: Math.cos(a) * r, yaw: a };
}

/** the seat preset's LOOK point — the station's table-side apron (the camera frames the
 *  seat's own slice of the play area). One expression; the VG8c law derives from it. */
export function stationLook(i: number, seatCount: number, r: number = ringRadius(seatCount)): { x: number; z: number } {
  const a = seatAngle(i, seatCount);
  return { x: Math.sin(a) * r * 0.62, z: Math.cos(a) * r * 0.62 };
}

/** I-145 (owner-ruled): the TABLE ORIENTATION MODE — a TEMPLATE option. 'fixed' keeps
 *  the board still (BOTY's configured choice — the camera does the traveling);
 *  'rotate-to-active' spins the board so its bottom edge faces the active player.
 *  Mode is DATA; the table component consumes it at every rebuild. */
export type TableMode = 'fixed' | 'rotate-to-active';
let tableMode: TableMode = 'fixed'; // BOTY's configuration (I-145)
export const getTableMode = (): TableMode => tableMode;
export const setTableMode = (m: TableMode): void => { tableMode = m; }; // the drill door (theater-only config)

/** O-2 (I-146): THE STATION BOX — the seat's defined content rect BEHIND the board
 *  (the I-144 side), in the seat's own frame: lat ±(chord/2 − buffer), depth 300 out
 *  from the board line. Contents PACK into it (folder column left · rows right · hand
 *  below the folder); the gate asserts containment on the viewer's station. */
export const STATION_BOX = {
  halfW: (7 * (OBJECT_SCALE.card.w + 12)) / 2 + 10, // the surface half-width + margin (G-B2, bound by law)
  depth: 60 + 4 * (OBJECT_SCALE.card.h + 12) + 20, // base offset + 4 rows + margin
} as const;

/** F-5 (I-148): a WIDE prop occupant ('the box is a little trickier being a wide cube')
 *  sits at its slot's DIRECTION but pushed OUT by its own footprint claim, so it never
 *  intrudes into a neighbouring station. The template learns occupant size. */
export function propSlot(i: number, occupants: number, push: number, r: number = ringRadius(occupants)): { x: number; z: number; yaw: number } {
  const a = seatAngle(i, occupants);
  return { x: Math.sin(a) * (r + push), z: Math.cos(a) * (r + push), yaw: a };
}

