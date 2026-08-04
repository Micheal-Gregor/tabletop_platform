/**
 * BACKDROP (S-1c, I-107 — a verbatim size-gate extraction from game3d.ts, zero logic
 * change): the owner-ruled MANIFESTED backdrop (I-67h). Moved to free spine headroom
 * for the contract-v3 hardening; the spine keeps the explicit call.
 */
import * as THREE from 'three';
import { scene } from './stage.js';

// ── THE MANIFESTED BACKDROP (I-67h — the owner rules on the look): white underfoot
// → pastel haze → a faint ink ring → off-white; a gradient disc, ZERO lights ──
export function manifestBackdrop(): void {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(512, 512, 60, 512, 512, 512);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, '#f7f2f8'); // warm pastel haze
  grad.addColorStop(0.62, '#eef4f5'); // cool pastel haze
  grad.addColorStop(0.8, '#e4e3de'); // the light ink ring
  grad.addColorStop(1, '#f4f3ee'); // off-white — the play area manifested
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 1024);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2600, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -2;
  disc.userData['backdrop'] = true;
  scene.add(disc);
  scene.background = new THREE.Color(0xf4f3ee);
}
