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
// I-133's SINGLE YAW TRUTH, now DERIVED from the radial play-area template (PA-1,
// I-141 — the owner's ring law supersedes the corner special-case): equidistant seats,
// seat-1 anchored near-mid, yaw = the seat's angle. Same consumers, one source.
import { ringYaws } from './playarea.js';
// PA-2 (I-142): the ring's OCCUPANTS = the seats + the GAME BOX (slot 6) — the
// template's first prop. Every angle derives at 2π/RING_N; seat-1 stays anchored.
export const RING_N = SEATS.length + 1;
export const SEAT_YAWS: readonly number[] = ringYaws(RING_N).slice(0, SEATS.length);

// ── scene from the PROJECTION ──
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f4f1);
export const camera = new THREE.PerspectiveCamera(40, 1240 / 720, 1, 5000);
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1240, 720);
document.getElementById('stage')!.appendChild(renderer.domElement);

export const focusGroups: Record<string, THREE.Group> = {};

export function status(msg: string): void { document.getElementById('status')!.textContent = msg; }
