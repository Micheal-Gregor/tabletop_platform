/**
 * STAGE — the shared three.js primitives + derived constants that ≥2 bench modules
 * touch (split VERBATIM out of game3d.ts, pure refactor). WORLD/SEATS/presets, the
 * scene/camera/renderer, focusGroups, and the status DOM helper. This module's
 * import-time side effects (renderer creation + #stage appendChild) run FIRST — every
 * module that reads these primitives at import time depends on stage.
 */
import * as THREE from 'three';
import { focusPresets } from '@tabletop/presentation';
import { BOTY_PACK6 } from '../../../packs/boty/src/index.js';

export const WORLD = { w: 1600, h: 1000 };
export const SEATS = BOTY_PACK6.seats.map((s) => s.id);
export const presets = focusPresets(SEATS.length, WORLD);
// I-133 (from the I-132 corner ruling): THE SINGLE YAW TRUTH — corners (0,2,3,5) face
// their players at ±45/±135°, mids (1,4) hold 0/π. Consumed by seats.ts (board poses),
// camera.ts (preset approach), and the VG8c law gate — one source, no drift.
export const SEAT_YAWS: readonly number[] = [-Math.PI / 4, 0, Math.PI / 4, Math.PI + Math.PI / 4, Math.PI, Math.PI - Math.PI / 4];

// ── scene from the PROJECTION ──
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f4f1);
export const camera = new THREE.PerspectiveCamera(40, 1240 / 720, 1, 5000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1240, 720);
document.getElementById('stage')!.appendChild(renderer.domElement);

export const focusGroups: Record<string, THREE.Group> = {};

export function status(msg: string): void { document.getElementById('status')!.textContent = msg; }
