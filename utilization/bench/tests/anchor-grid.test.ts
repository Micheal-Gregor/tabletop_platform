/** G-A (I-158/I-159): the anchor grid's laws — pure, falsifiable, renderer-free. */
import { describe, it, expect } from 'vitest';
import { snap, ringSnap, faceYaw, anchorsWithinRadius, anchorsWithinSphere, ringAnchor, gridSpacing, setGridSpacing, placementYaw } from '../src/anchor-grid.js';
import { ringRadius, seatAngle } from '../src/playarea.js';

describe('G-A: the anchor grid (I-158/I-159)', () => {
  it('snap lands on grid multiples; the origin is an anchor', () => {
    const s = gridSpacing();
    expect(snap({ x: 0.4 * s, y: 0, z: -0.6 * s })).toEqual({ x: 0, y: 0, z: -s });
    expect(snap({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });
  it('ringSnap puts every circumference on a grid multiple (and never collapses)', () => {
    const s = gridSpacing();
    expect(ringSnap(ringRadius(6)) % s).toBe(0);
    expect(ringSnap(0.01)).toBe(s);
  });
  it('faceYaw ≡ the seat heading law: a ring anchor at seatAngle faces the origin at that heading', () => {
    for (let i = 0; i < 6; i++) {
      const phi = seatAngle(i, 6);
      const p = { x: 500 * Math.sin(phi), y: 0, z: 500 * Math.cos(phi) };
      // the heading from the point toward 0,0,0 is φ+π (mod 2π) — the L-5b tilt-cancel law generalized
      const want = Math.atan2(-p.x, -p.z);
      expect(Math.abs(faceYaw(p)) - Math.abs(want)).toBeCloseTo(0, 10);
    }
  });
  it('anchorsWithinRadius: symmetric, all inside, count grows with r', () => {
    const a1 = anchorsWithinRadius(100), a2 = anchorsWithinRadius(200);
    expect(a1.length).toBeGreaterThan(0);
    expect(a2.length).toBeGreaterThan(a1.length);
    for (const p of a2) expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(200);
    // 4-fold symmetry about the center
    expect(a2.filter((p) => p.x > 0).length).toBe(a2.filter((p) => p.x < 0).length);
  });
  it('the spherical bound holds every anchor inside the ball', () => {
    const pts = anchorsWithinSphere(60);
    expect(pts.length).toBeGreaterThan(6);
    for (const p of pts) expect(Math.hypot(p.x, p.y, p.z)).toBeLessThanOrEqual(60);
  });
  it('ringAnchor: on the snapped ring, near the asked angle; spacing is ASSIGNABLE and restores', () => {
    const r = ringRadius(6);
    const a = ringAnchor(r, 0);
    expect(Math.abs(a.z - ringSnap(r))).toBeLessThanOrEqual(gridSpacing() / 2 + 1e-9);
    const s0 = gridSpacing();
    setGridSpacing(35);
    expect(ringSnap(700)).toBe(700);
    expect(() => setGridSpacing(0)).toThrow();
    setGridSpacing(s0); // restore — the suite leaves no global behind
  });
  it('a placement faces its OWN target when overridden (face-target as data)', () => {
    const pl = { anchor: { x: 100, y: 0, z: 0 }, faceTarget: { x: 100, y: 0, z: 300 }, span: { w: 1, d: 1 } };
    expect(placementYaw(pl)).toBeCloseTo(0, 10); // toward +z, not toward the origin
  });
});
