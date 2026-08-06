/**
 * THE COUNTERTOP (I-139, owner-ruled: "the table is the board and it sits on a flat
 * countertop. the cards, the books all sit on that flat surface") — ONE ALIGNMENT LAW.
 * The visible slab under everything + the two named strata every object derives its
 * resting height from: COUNTER (the countertop's top face — books, seat cards, hand,
 * loose objects around the board) and the TABLE top (objects on the felt — stacks,
 * die, medal), read live from the table group. No third stratum; no magic heights.
 */
import * as THREE from 'three';
import { ringRadius } from './playarea.js'; // I-218: the disc derives from the ring

export const COUNTER_THICK = 14; // the slab's thickness (world units)
export const COUNTER_Y = 0; // the countertop's TOP face — the world's resting plane

/** an object of `thickness` resting ON the countertop centers at this y. */
export const restOn = (thickness: number): number => COUNTER_Y + thickness / 2;

/** I-218 (owner-ruled, twice asked: 'the global play area stop being square and start
 *  being represented as a sphere… the edge of the screen better not be square — I
 *  expect a circle'): the countertop is a DISC — the world's visible edge is the
 *  spherical bound's equator, radius derived from the ring + the box slot's reach.
 *  The cameras breathe in a circle; there are no corners left to cramp them. */
export const COUNTER_RADIUS = (): number => ringRadius(7) + 540; // the ring + the box's slot & bulk + margin
export function buildCountertop(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(COUNTER_RADIUS(), COUNTER_RADIUS(), COUNTER_THICK, 96),
    new THREE.MeshBasicMaterial({ color: 0xe7e0d4 }),
  );
  m.position.y = COUNTER_Y - COUNTER_THICK / 2; // its TOP face lies exactly at COUNTER_Y
  m.userData['countertop'] = true;
  return m;
}
