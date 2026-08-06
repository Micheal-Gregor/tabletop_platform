/**
 * PATHS (PB-9, I-200 — the owner's motion-guide ruling: 'calculate the PATH from the
 * current position of the card when flicked to the next open slot and animate it going
 * to that spot… much like the old animation lines were used to move objects around in
 * Flash'): movement as DATA. A PathSpec declares from → to (with optional via points
 * and a lift); sampling is pure cubic-Bézier arithmetic; the consumer owns only its
 * clock. This is the parent-UI tool's asset: child games AUTHOR movement (a card's
 * travel, a token's patrol, BOTY's piece traffic) as paths, never as scattered lerps.
 */
export interface P3 { readonly x: number; readonly y: number; readonly z: number }
export interface PathSpec {
  readonly from: P3;
  readonly to: P3;
  readonly lift?: number; // the arc's rise over the straight line (default 34 — the old carry arc)
  readonly via?: readonly P3[]; // optional guide points (the Flash motion line, when authored)
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerp3 = (a: P3, b: P3, t: number): P3 => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

/** the spec's control polygon: from · (via… or the two derived lift controls) · to. */
function controls(spec: PathSpec): P3[] {
  if (spec.via && spec.via.length) return [spec.from, ...spec.via, spec.to];
  const L = spec.lift ?? 34;
  const c1 = { ...lerp3(spec.from, spec.to, 0.25), y: Math.max(spec.from.y, spec.to.y) + L };
  const c2 = { ...lerp3(spec.from, spec.to, 0.75), y: Math.max(spec.from.y, spec.to.y) + L * 0.7 };
  return [spec.from, c1, c2, spec.to];
}

/** de Casteljau on the control polygon — exact endpoints, smooth interior, any order. */
export function samplePath(spec: PathSpec, t: number): P3 {
  const tt = Math.max(0, Math.min(1, t));
  let pts = controls(spec);
  while (pts.length > 1) {
    const next: P3[] = [];
    for (let i = 0; i < pts.length - 1; i++) next.push(lerp3(pts[i]!, pts[i + 1]!, tt));
    pts = next;
  }
  return pts[0]!;
}

/** the path's length (sampled) — the consumer's clock derives speed from THIS, so long
 *  journeys take longer (no teleports, no uniform-duration lies). */
export function pathLength(spec: PathSpec, samples = 24): number {
  let len = 0;
  let prev = samplePath(spec, 0);
  for (let i = 1; i <= samples; i++) {
    const p = samplePath(spec, i / samples);
    len += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z);
    prev = p;
  }
  return len;
}

/** a running path: stepped by world-units-per-frame — the ONE mover every consumer shares. */
export interface PathRun { spec: PathSpec; t: number; speed: number; len: number }
export function startPath(spec: PathSpec, unitsPerFrame = 14): PathRun {
  return { spec, t: 0, speed: unitsPerFrame, len: Math.max(1, pathLength(spec)) };
}
/** advance and return the current point; done when t reaches 1. */
export function stepPath(run: PathRun): { p: P3; done: boolean } {
  run.t = Math.min(1, run.t + run.speed / run.len);
  return { p: samplePath(run.spec, run.t), done: run.t >= 1 };
}
