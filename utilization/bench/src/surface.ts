/**
 * THE COUNTERTOP (I-139, owner-ruled: "the table is the board and it sits on a flat
 * countertop. the cards, the books all sit on that flat surface") — ONE ALIGNMENT LAW.
 * The visible slab under everything + the two named strata every object derives its
 * resting height from: COUNTER (the countertop's top face — books, seat cards, hand,
 * loose objects around the board) and the TABLE top (objects on the felt — stacks,
 * die, medal), read live from the table group. No third stratum; no magic heights.
 */
import * as THREE from 'three';

export const COUNTER_THICK = 14; // the slab's thickness (world units)
export const COUNTER_Y = 0; // the countertop's TOP face — the world's resting plane

/** an object of `thickness` resting ON the countertop centers at this y. */
export const restOn = (thickness: number): number => COUNTER_Y + thickness / 2;

/** the visible slab — diffuse warm stone, wide enough to carry the whole scene. */
export function buildCountertop(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(2600, COUNTER_THICK, 2200),
    new THREE.MeshBasicMaterial({ color: 0xe7e0d4 }),
  );
  m.position.y = COUNTER_Y - COUNTER_THICK / 2; // its TOP face lies exactly at COUNTER_Y
  m.userData['countertop'] = true;
  return m;
}
