/**
 * ZONES (I-239 — the owner's class challenge: 'take all repeating functions buried in
 * variations of the ZONE object and roll them up into a parent'): THE PARENT ZONE
 * CLASS. Three children — the global board, the six seat areas, the box — inherit the
 * shared laws (containment · the 80% wall · the read anchor · the rest-and-serve
 * scroll behavior) and extend only what differs (their scenic composition, their
 * membership test). Scrolling is solved HERE, once; every zone scrolls identically
 * by inheritance, not by parallel maintenance.
 */
import * as THREE from 'three';
import { camera, scene } from './stage.js';

export abstract class Zone {
  constructor(readonly id: string) {}
  /** the camera anchor this zone answers to (its read/rest focus). */
  abstract focusOf(): string;
  /** does this zone CONTAIN the given anchor? (ownership — the I-237 law, classed) */
  abstract contains(focus: string): boolean;
  /** the zone's live body, for fits. */
  object(): THREE.Object3D | null {
    let hit: THREE.Object3D | null = null;
    scene.traverse((o: THREE.Object3D) => { if (!hit && this.isBody(o)) hit = o; });
    return hit;
  }
  protected abstract isBody(o: THREE.Object3D): boolean;
  /** THE SHARED WALL LAW (inherited by every child): the distance at which this
   *  zone's body fills `fill` of the frame — sphere-fit, rotation-safe. */
  wall(fill = 0.8): number | null {
    const obj = this.object();
    if (!obj) return null;
    const sp = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
    const fovV = (camera.fov * Math.PI) / 180;
    return Math.max(30, sp.radius) / Math.sin((fovV / 2) * fill);
  }
}

class BoardZone extends Zone {
  focusOf(): string { return 'table'; }
  contains(f: string): boolean { return f === 'table' || f.startsWith('table:') || f === 'die'; }
  protected isBody(o: THREE.Object3D): boolean { return o.userData?.['focus'] === 'table' && !o.userData?.['region']; }
}

class SeatZone extends Zone {
  constructor(readonly idx: number) { super(`seat-zone-${idx}`); }
  focusOf(): string { return `seat-area-${this.idx}`; }
  contains(f: string): boolean {
    if (f === `seat-area-${this.idx}` || f === `seat-${this.idx}`) return true;
    if (this.idx === 0 && (f.startsWith('ledger') || f === 'hand-fan')) return true;
    return false;
  }
  protected isBody(o: THREE.Object3D): boolean { return o.userData?.['seatSurface'] === this.idx; }
}

class BoxZone extends Zone {
  focusOf(): string { return 'box'; }
  contains(f: string): boolean { return f === 'box'; }
  protected isBody(o: THREE.Object3D): boolean { return o.userData?.['box'] === true; }
}

const ZONES: readonly Zone[] = [new BoardZone('board'), ...[0, 1, 2, 3, 4, 5].map((i) => new SeatZone(i)), new BoxZone('box-zone')];

/** THE ONE LOOKUP: which zone owns this anchor? An obj: anchor asks its live focus
 *  tag; unknown containment belongs to NO zone (the I-237 no-go law, inherited). */
export function zoneOf(focus: string): Zone | null {
  for (const z of ZONES) if (z.contains(focus)) return z;
  if (focus.startsWith('obj:')) {
    const o = scene.getObjectByProperty('uuid', focus.slice(4));
    const tag = o?.userData?.['focus'];
    if (typeof tag === 'string') for (const z of ZONES) if (z.contains(tag)) return z;
    if (o) { // a board-zone object without a seat tag (piles, die, minis)
      let m: THREE.Object3D | null = o;
      while (m && m.userData?.['focus'] !== 'table' && !m.userData?.['worldStack']) m = m.parent;
      if (m) return ZONES[0]!;
    }
  }
  return null;
}
