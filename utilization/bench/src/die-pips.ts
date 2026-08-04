/**
 * DIE PIP FACES (P-1, I-83) — a verbatim size-gate extraction from die.ts (the ≤300-line
 * law, K-B/I-78): the pip-face canvas texture builder, behavior-identical. Diffuse, no
 * lights (D-1 unskinned).
 */
import * as THREE from 'three';

/** A pip face: value dots on a light canvas, diffuse (no lights, D-1 unskinned). */
export function pipTexture(value: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4efe4'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#b7ab92'; g.lineWidth = 5; g.strokeRect(6, 6, 116, 116);
  g.fillStyle = '#2a2a2a';
  const L = 34, M = 64, H = 94, R = 11;
  const layouts: Record<number, ReadonlyArray<readonly [number, number]>> = {
    1: [[M, M]],
    2: [[L, L], [H, H]],
    3: [[L, L], [M, M], [H, H]],
    4: [[L, L], [H, L], [L, H], [H, H]],
    5: [[L, L], [H, L], [M, M], [L, H], [H, H]],
    6: [[L, L], [H, L], [L, M], [H, M], [L, H], [H, H]],
  };
  for (const [x, y] of layouts[value]!) { g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill(); }
  return new THREE.CanvasTexture(c);
}
