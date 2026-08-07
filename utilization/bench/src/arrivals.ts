/**
 * ARRIVALS (PB-9b, I-201 — the teleport-killer the owner ordered: 'they all go to a
 * point and then teleport to the next open grid slot. Instead, calculate the PATH…
 * and animate it going to that spot'): when a rebuild CLAIMS a persistent instance
 * into a new anchor, the claim no longer snaps — if the object stood somewhere else,
 * it TRAVELS there along a path (length-true, the paths.ts laws), arriving exactly.
 * One animator serves every claim site (seat rows, gear sockets, hand fans, pile
 * stacks): permanence gave us objects that persist; paths give their moves dignity.
 */
import * as THREE from 'three';
import { startPath, stepPath, type PathRun } from './paths.js';

const SNAP_DIST = 25; // closer than this just snaps (micro-moves aren't journeys)

interface Arrival { obj: THREE.Object3D; run: PathRun; toPos: THREE.Vector3; fromQuat: THREE.Quaternion; toQuat: THREE.Quaternion }
let active = new Map<string, Arrival>(); // by uuid — a re-claim replaces the journey
let lastArrival: { dist: number; frames: number } | null = null;
let frameCounts = new Map<string, number>();

/** POSE OR TRAVEL: the claim-site's one call. The object must already carry its OLD
 *  world transform (permanent instances do); a far target starts a path from there. */
export function poseOrArrive(obj: THREE.Object3D, toPos: THREE.Vector3, toQuat: THREE.Quaternion, hadParent: boolean): void {
  const from = obj.position.clone();
  const dist = from.distanceTo(toPos);
  if (!hadParent || dist < SNAP_DIST) {
    active.delete(obj.uuid);
    obj.position.copy(toPos);
    obj.quaternion.copy(toQuat);
    return;
  }
  active.set(obj.uuid, {
    obj,
    run: startPath({ from: { x: from.x, y: from.y, z: from.z }, to: { x: toPos.x, y: toPos.y, z: toPos.z }, lift: Math.min(46, 12 + dist * 0.08) }, 16),
    toPos: toPos.clone(), fromQuat: obj.quaternion.clone(), toQuat: toQuat.clone(),
  });
  frameCounts.set(obj.uuid, 0);
}

/** the per-frame step — call ONCE per frame (the table component's tick hosts it). */
export function tickArrivals(): void {
  for (const [id, a] of [...active]) {
    const st = stepPath(a.run);
    a.obj.position.set(st.p.x, st.p.y, st.p.z);
    a.obj.quaternion.slerpQuaternions(a.fromQuat, a.toQuat, a.run.t);
    frameCounts.set(id, (frameCounts.get(id) ?? 0) + 1);
    if (st.done) {
      a.obj.position.copy(a.toPos); // EXACT — the endpoint law carried to the scene
      a.obj.quaternion.copy(a.toQuat);
      lastArrival = { dist: a.run.len, frames: frameCounts.get(id) ?? 0 };
      active.delete(id);
      frameCounts.delete(id);
    }
  }
}

export const arrivalsInfo = () => ({ active: active.size, last: lastArrival });

/** I-250: a THEATER takes sole ownership of an object — its claim journey stands down
 *  (two writers on one mesh was the phantom's engine; one hand on the card at a time). */
export function cancelArrival(uuid: string): void {
  active.delete(uuid);
  frameCounts.delete(uuid);
}

/** I-251: where is this object GOING? (the camera aims at destinations, not takeoffs). */
export function arrivalTarget(uuid: string): { x: number; y: number; z: number } | null {
  const a = active.get(uuid);
  return a ? { x: a.toPos.x, y: a.toPos.y, z: a.toPos.z } : null;
}
