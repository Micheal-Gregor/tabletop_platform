/** PB-9 (I-200): the path system's laws — exact endpoints, a real arc, length-true
 *  clocking, via-point obedience. Pure; every consumer inherits these guarantees. */
import { describe, it, expect } from 'vitest';
import { samplePath, pathLength, startPath, stepPath } from '../src/paths.js';

const A = { x: 0, y: 2, z: 0 }, B = { x: 300, y: 2, z: 400 };

describe('PB-9: paths as data (I-200)', () => {
  it('endpoints are EXACT at t=0 and t=1 (no teleport at either end)', () => {
    expect(samplePath({ from: A, to: B }, 0)).toEqual(A);
    expect(samplePath({ from: A, to: B }, 1)).toEqual(B);
  });
  it('the interior RISES (a carry arc, not a slide) and stays between the endpoints', () => {
    const mid = samplePath({ from: A, to: B, lift: 40 }, 0.5);
    expect(mid.y).toBeGreaterThan(A.y + 10);
    expect(mid.x).toBeGreaterThan(0); expect(mid.x).toBeLessThan(300);
  });
  it('length ≥ the straight line, and the clock is LENGTH-TRUE: a longer path takes more steps', () => {
    const short = startPath({ from: A, to: { x: 60, y: 2, z: 0 } });
    const long = startPath({ from: A, to: B });
    expect(long.len).toBeGreaterThanOrEqual(Math.hypot(300, 400));
    let n1 = 0, n2 = 0;
    while (!stepPath(short).done && n1 < 999) n1++;
    while (!stepPath(long).done && n2 < 999) n2++;
    expect(n2).toBeGreaterThan(n1); // no uniform-duration lies
  });
  it('VIA points bend the path (the authored motion line — the Flash guide)', () => {
    const detour = { from: A, to: B, via: [{ x: -200, y: 60, z: 200 }] };
    const mid = samplePath(detour, 0.5);
    expect(mid.x).toBeLessThan(50); // pulled hard toward the guide
    expect(samplePath(detour, 1)).toEqual(B); // the endpoint law survives authoring
  });
});
