/**
 * ANCHOR GRID (G-A, I-158/I-159 — the owner's play-space formalization): a grid of
 * snap points centered 0,0,0 with ASSIGNABLE spacing; every object sits ON an anchor,
 * FACES a point (default the origin — face-target as data), and claims a span. Radii
 * snap to the grid; anchors are queryable within a circle or the spherical bound.
 * The existing ring math (playarea.ts) is the grid's FIRST CLIENT: its certified
 * values stand — new objects (the dice ring home, the seat surfaces, the table's own
 * grid) take their places from HERE. Pure data + pure queries; no THREE, no renderer.
 */

// ── the spacing (assignable — template data, the TableMode pattern) ──
let spacing = 20; // world units between grid points (default: ~⅓ card width)
export const gridSpacing = (): number => spacing;
export function setGridSpacing(s: number): void {
  if (!(s > 0)) throw new Error('grid spacing must be positive');
  spacing = s;
}

export interface GridPoint { readonly x: number; readonly y: number; readonly z: number }

/** the nearest grid anchor to a world position (y snaps too — the sphere is 3D). */
export function snap(p: GridPoint): GridPoint {
  const q = (v: number) => Math.round(v / spacing) * spacing;
  return { x: q(p.x), y: q(p.y), z: q(p.z) };
}

/** a radius snapped to the grid (the circumference law: rings live on grid multiples). */
export const ringSnap = (r: number): number => Math.max(spacing, Math.round(r / spacing) * spacing);

/** the FACE law: the yaw that points an object's normal from its anchor toward the
 *  target (default 0,0,0) — the seat-frame heading law, generalized to any pair. */
export function faceYaw(from: GridPoint, target: GridPoint = { x: 0, y: 0, z: 0 }): number {
  return Math.atan2(target.x - from.x, target.z - from.z);
}

/** all grid anchors on the y-plane within radius r of the center (the owner's query:
 *  'identify the grid anchor points within a circumference with radius x'). */
export function anchorsWithinRadius(r: number, center: GridPoint = { x: 0, y: 0, z: 0 }, y = 0): GridPoint[] {
  const out: GridPoint[] = [];
  const n = Math.ceil(r / spacing);
  const cy = Math.round(y / spacing) * spacing;
  for (let i = -n; i <= n; i++) for (let k = -n; k <= n; k++) {
    const x = Math.round(center.x / spacing) * spacing + i * spacing;
    const z = Math.round(center.z / spacing) * spacing + k * spacing;
    if (Math.hypot(x - center.x, z - center.z) <= r) out.push({ x, y: cy, z });
  }
  return out;
}

/** the SPHERICAL bound: anchors within the ball of radius R about the origin —
 *  'grid points spaced out within a spherical space instead of forcing it square'. */
export function anchorsWithinSphere(R: number): GridPoint[] {
  const out: GridPoint[] = [];
  const n = Math.ceil(R / spacing);
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++) {
    const p = { x: i * spacing, y: j * spacing, z: k * spacing };
    if (Math.hypot(p.x, p.y, p.z) <= R) out.push(p);
  }
  return out;
}

/** the ring-anchor query: the grid anchor nearest to angle φ on the snapped ring of
 *  radius r (how the dice home and any future ring occupant takes its place). */
export function ringAnchor(r: number, phi: number, y = 0): GridPoint {
  const R = ringSnap(r);
  return snap({ x: R * Math.sin(phi), y, z: R * Math.cos(phi) });
}

/** an object's PLACEMENT as data: anchor + face target + claimed span (grid cells). */
export interface GridPlacement {
  readonly anchor: GridPoint;
  readonly faceTarget: GridPoint; // default the origin — overridable
  readonly span: { readonly w: number; readonly d: number }; // cells claimed on the plane
}
export function placementYaw(pl: GridPlacement): number { return faceYaw(pl.anchor, pl.faceTarget); }
