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
export const STATION_CHORD = 480;
export const TABLE_CLEAR = 130; // the table's breathing room before the first station

/** the table's half-diagonal (world): the current 900×700 board. Self-resizes when
 *  the table object changes — pass the live value where known. */
export const TABLE_HALF_DIAG = Math.hypot(450, 350);

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
export const STATION_BOX = { halfW: 240, depth: 300 } as const;
