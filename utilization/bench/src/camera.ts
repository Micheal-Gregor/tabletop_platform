/**
 * CAMERA — the zoom ladder + read view + pose state, split VERBATIM out of game3d.ts
 * (pure refactor). Owns everything camera-pose: the preset mapping, the glide, read
 * view / fit-to-frame / pan-scroll, the wheel ladder, and the per-frame glide step
 * (tickGlide, extracted from tick()). Exports the functions the interaction/gate need
 * plus read-accessors for every camera value the __GAME3D__ gate surface reads.
 *
 * IMPORT-TIME SIDE EFFECTS (same order/effect as the original game3d.ts): the initial
 * overview pose is set on the shared camera, and the #stage wheel listener is attached.
 */
import * as THREE from 'three';
import { camera, focusGroups, presets, WORLD, status, SEAT_YAWS } from './stage.js';
import { stationLook } from './playarea.js'; // PA-1 (I-141)

// ── THE GLIDING CAMERA (I-62c): the SAME preset mapping, animated; purity at rest ──
// SIDE-AWARE (I-65b): a SEAT preset is approached from that seat's own side of the
// table (far row: −z); non-seat presets keep the canonical near-side approach — the
// certified A1 law is the near-side special case, not superseded.
const mapPreset = (name: string): { pos: THREE.Vector3; look: THREE.Vector3 } => {
  const p = presets[name]!;
  const d = 1900 / p.zoom;
  // PA-1 (I-141, superseding the I-133 mapping ON THE RECORD): a seat preset LOOKS at
  // its ring station's table-side apron and approaches along the seat's yaw normal
  // (over the player's shoulder) — both from the SAME template expressions the boards
  // use (stationLook/SEAT_YAWS). Non-seat presets keep the row look + +z approach.
  if (name.startsWith('seat-')) {
    const i = Number(name.slice(5));
    const yaw = SEAT_YAWS[i] ?? 0;
    const lk = stationLook(i, SEAT_YAWS.length);
    const look = new THREE.Vector3(lk.x, 0, lk.z);
    return { pos: new THREE.Vector3(look.x + Math.sin(yaw) * d * 0.7, d * 0.72, look.z + Math.cos(yaw) * d * 0.7), look };
  }
  const look = new THREE.Vector3(p.cx - WORLD.w / 2, 0, p.cy - WORLD.h / 2);
  return { pos: new THREE.Vector3(look.x, d * 0.72, look.z + d * 0.7), look };
};
let target = mapPreset('overview');
let currentLook = target.look.clone();
let currentName = 'overview';
let lastFocus = 'table'; // the wheel's in-bound target (I-64e) — what the player last looked at
camera.position.copy(target.pos);
camera.lookAt(currentLook);

export function glideTo(name: string, reanchor = true): void {
  if (!presets[name]) throw new Error(`glideTo refused: unknown preset "${name}" (have: ${Object.keys(presets).join(', ')})`);
  target = mapPreset(name);
  currentName = name;
  // a USER choice re-anchors (I-66a); a LADDER move (reanchor=false) preserves the anchor
  if (reanchor && (name.startsWith('seat-') || name === 'table')) lastFocus = name;
  mode = 'scene';
  camera.up.set(0, 1, 0);
  const mb = document.getElementById('mode-btn');
  if (mb) mb.textContent = '⊞ read view';
  status(`camera → ${name}`);
}
export const gliding = (): boolean => camera.position.distanceTo(target.pos) > 0.05 || currentLook.distanceTo(target.look) > 0.05;

// ── READ VIEW (I-63): flat overhead / face-on, fit-to-frame, pan-scroll ──
let mode: 'scene' | 'read' = 'scene';
let readFocus = 'table';
let panned = false;

/** Corner-true fit (I-63b — the gate asserts the no-crop PROPERTY, not this formula):
 *  the distance along the view normal at which ALL EIGHT box corners — each at its own
 *  depth along the view axis — sit inside the frustum. An extent-only fit crops tilted
 *  objects (near corners project larger); this one cannot. */
function fitAlong(box: THREE.Box3, look: THREE.Vector3, n: THREE.Vector3, upv: THREE.Vector3): number {
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const th = Math.tan(hFov / 2);
  const tv = Math.tan(vFov / 2);
  const right = new THREE.Vector3().crossVectors(upv, n).normalize(); // lookAt basis: x = up × z
  const upCam = new THREE.Vector3().crossVectors(n, right);
  let d = 0;
  for (const cx of [box.min.x, box.max.x]) for (const cy of [box.min.y, box.max.y]) for (const cz of [box.min.z, box.max.z]) {
    const o = new THREE.Vector3(cx, cy, cz).sub(look);
    const on = o.dot(n); // depth toward the camera
    d = Math.max(d, on + Math.abs(o.dot(right)) / th, on + Math.abs(o.dot(upCam)) / tv);
  }
  return d * 1.06;
}

/** Focus resolution (I-66e): a focus names a GROUP ('table', 'seat-i') or a TABLE
 *  REGION ('table:<region>' — the region quad inside the table group). */
export function focusObject(focus: string): THREE.Object3D | null {
  if (focusGroups[focus]) return focusGroups[focus]!;
  if (focus.startsWith('table:')) {
    const rid = focus.slice('table:'.length);
    let hit: THREE.Object3D | null = null;
    focusGroups['table']?.traverse((o: THREE.Object3D) => { if (o.userData?.['region'] === rid) hit = o; });
    return hit;
  }
  return null;
}

/** The read mapping: table + its regions = straight overhead; a board = face-on along its normal. */
function mapRead(focus: string): { pos: THREE.Vector3; look: THREE.Vector3; up: THREE.Vector3 } {
  const obj = focusObject(focus);
  if (!obj) throw new Error(`read refused: unknown focus "${focus}" (have: ${Object.keys(focusGroups).join(', ')} + table:<region>)`);
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3());
  if (focus === 'table' || focus.startsWith('table:')) {
    const n = new THREE.Vector3(0, 1, 0);
    const up = new THREE.Vector3(0, 0, -1);
    return { pos: c.clone().add(n.clone().multiplyScalar(fitAlong(box, c, n, up))), look: c, up };
  }
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion((obj as THREE.Group).quaternion).normalize(); // the board's outward normal (90° to its face)
  const up = new THREE.Vector3(0, 1, 0);
  return { pos: c.clone().add(n.clone().multiplyScalar(fitAlong(box, c, n, up))), look: c, up };
}

/** The anchor's scene preset: a region anchor's scene is the TABLE (I-66b). */
const anchorPreset = (f: string): string => (presets[f] ? f : f.startsWith('table:') ? 'table' : 'overview');

export function readView(focus?: string, reanchor = true): void {
  readFocus = focus ?? lastFocus; // the ANCHOR is the default read target (I-66a; supersedes the I-63g1 camera-based default)
  if (reanchor) lastFocus = readFocus;
  const m = mapRead(readFocus);
  camera.up.copy(m.up);
  target = { pos: m.pos, look: m.look };
  mode = 'read';
  panned = false; // fit is the pure rest state — re-toggle RESETS pan (I-63c)
  currentName = `${readFocus}:read`;
  document.getElementById('mode-btn')!.textContent = '🎲 scene view';
  status(`read view: ${readFocus === 'table' || readFocus.startsWith('table:') ? 'flat overhead' : `face-on to ${readFocus}`} — drag to scroll, ${readFocus === 'table' ? 'wheel in for overview' : 'wheel out for scene view'}`);
}
export function sceneView(): void {
  mode = 'scene';
  camera.up.set(0, 1, 0);
  glideTo(anchorPreset(readFocus), false); // a ladder move — the anchor survives (I-66a)
}

// pan-scroll (I-63c): drag in read mode translates in the view plane; the LOOK stays
// CLAMPED to the object's bounds — you cannot scroll the object away
export function panBy(dx: number, dy: number): void {
  if (mode !== 'read') return;
  const dist = camera.position.distanceTo(currentLook);
  const scale = dist / 800;
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-dx * scale);
  const upv = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(dy * scale);
  const delta = right.add(upv);
  const box = new THREE.Box3().setFromObject(focusObject(readFocus)!);
  const tryLook = currentLook.clone().add(delta);
  box.clampPoint(tryLook, tryLook); // the clamp law
  const applied = tryLook.clone().sub(currentLook);
  camera.position.add(applied);
  currentLook.copy(tryLook);
  target = { pos: camera.position.clone(), look: currentLook.clone() };
  panned = true;
}

// ── THE ZOOM LADDER (I-66b; the owner's exact walk is the law): one wheel axis,
// four rungs — anchor-READ ↔ anchor-SCENE ↔ OVERVIEW ↔ TABLE-READ. In read view
// zoom-in is DISABLED (I-66c: read = fit pose + pan only) and zoom-out steps to the
// anchor's scene. The anchor survives every ladder move; only clicks re-anchor.
const readFitDist = (focus: string): number => { const m = mapRead(focus); return m.pos.distanceTo(m.look); };
const ovPose = mapPreset('overview');
const OVERVIEW_DIST = ovPose.pos.distanceTo(ovPose.look);
function dollyTo(dist: number): void {
  const dir = new THREE.Vector3().subVectors(camera.position, currentLook).normalize().multiplyScalar(dist);
  camera.position.copy(currentLook.clone().add(dir));
  target = { pos: camera.position.clone(), look: currentLook.clone() };
  currentName = 'custom';
  status('camera → custom (dolly)');
}
// S-1 (I-103): the wheel gates on the harness's live-claim predicate — I-91 promised
// "the camera is suppressed until release" while this listener never consulted the
// claim (the K7-Q D9/M-finding: a wheel mid-drag could enter READ mode and the release
// still submitted). Now the promise is true.
let wheelGate: (() => boolean) | null = null;
export function setWheelGate(f: () => boolean): void { wheelGate = f; }
document.getElementById('stage')!.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  if (wheelGate?.()) return; // a live grab suppresses the zoom ladder (S-1, I-103)
  const zoomIn = ev.deltaY < 0;
  if (mode === 'read') {
    if (zoomIn) {
      if (readFocus === 'table') glideTo('overview', false); // table read is the far rung: in → overview
      return; // anchor read: zoom-in DISABLED (I-66c)
    }
    if (readFocus === 'table') return; // the far terminal: out is a no-op
    sceneView(); // anchor read → the anchor's SCENE view (I-66b)
    return;
  }
  const dist = camera.position.distanceTo(currentLook);
  const next = dist * (zoomIn ? 0.9 : 1.12);
  if (zoomIn) {
    if (currentName === 'overview') { glideTo(anchorPreset(lastFocus), false); return; } // overview → anchor scene
    if (next <= readFitDist(lastFocus)) { readView(lastFocus); return; } // organic read entry (I-64b carries)
    dollyTo(next);
    return;
  }
  if (currentName === 'overview') { readView('table', false); return; } // overview → TABLE READ (the far rung)
  if (next >= OVERVIEW_DIST) { glideTo('overview', false); return; } // scene out → overview
  dollyTo(next);
}, { passive: false });

/** The per-frame glide step — extracted VERBATIM from tick() (game3d calls this first). */
export function tickGlide(): void {
  if (gliding()) {
    // ORBITAL GLIDE (I-65d): the camera moves AROUND the table — azimuth about the
    // world center by the SHORTEST ARC, radius and height lerped; the look lerps
    // linearly. Crossing sides is the owner's "smooth rotation 180 degrees around
    // the table" — never over or through it. Near the axis (r small: overhead read
    // poses) azimuth is noise — those transitions fall back to the straight lerp.
    const rc = Math.hypot(camera.position.x, camera.position.z);
    const rt = Math.hypot(target.pos.x, target.pos.z);
    if (rc > 80 && rt > 80) {
      const tc = Math.atan2(camera.position.z, camera.position.x);
      const tt = Math.atan2(target.pos.z, target.pos.x);
      let dth = tt - tc;
      if (dth > Math.PI) dth -= 2 * Math.PI;
      if (dth < -Math.PI) dth += 2 * Math.PI;
      const th = tc + dth * 0.1;
      const r = rc + (rt - rc) * 0.1;
      const y = camera.position.y + (target.pos.y - camera.position.y) * 0.1;
      camera.position.set(r * Math.cos(th), y, r * Math.sin(th));
    } else {
      camera.position.lerp(target.pos, 0.1);
    }
    currentLook.lerp(target.look, 0.1);
    if (!gliding()) { camera.position.copy(target.pos); currentLook.copy(target.look); }
  }
  camera.lookAt(currentLook);
}

// ── read-accessors + setters the interaction and the __GAME3D__ gate surface consume ──
export const getMode = (): 'scene' | 'read' => mode;
export const setLastFocus = (f: string): void => { lastFocus = f; };
export const cameraPos = () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z });
export const presetData = (k: string) => (presets[k] ? { cx: presets[k].cx, cy: presets[k].cy, zoom: presets[k].zoom } : null);
export const camName = () => currentName;
export const readState = () => ({ mode, focus: readFocus, panned });
export const toggleRead = (focus?: string) => (mode === 'read' ? sceneView() : readView(focus));
/** the current read object's bbox corners in NDC — VG8f's no-crop property surface */
export const cornersNdc = () => {
  const grp = focusObject(readFocus);
  if (!grp) return null;
  const box = new THREE.Box3().setFromObject(grp);
  camera.updateMatrixWorld();
  const pts = [
    [box.min.x, box.min.y, box.min.z], [box.max.x, box.min.y, box.min.z],
    [box.min.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.min.z],
    [box.min.x, box.min.y, box.max.z], [box.max.x, box.min.y, box.max.z],
    [box.min.x, box.max.y, box.max.z], [box.max.x, box.max.y, box.max.z],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).project(camera));
  return pts.map((v) => ({ x: v.x, y: v.y }));
};
export const quat = () => ({ x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w });
export const lookAtPoint = () => ({ x: currentLook.x, y: currentLook.y, z: currentLook.z });
/** the current read object's bbox center — K7-A1b D2's centering surface */
export const focusBoxCenter = () => {
  const grp = focusObject(readFocus);
  if (!grp) return null;
  const c = new THREE.Box3().setFromObject(grp).getCenter(new THREE.Vector3());
  return { x: c.x, y: c.y, z: c.z };
};
/** an arbitrary world point in NDC — K7-A1b D2's orientation/centering probe */
export const ndcOf = (x: number, y: number, z: number) => {
  camera.updateMatrixWorld();
  const v = new THREE.Vector3(x, y, z).project(camera);
  return { x: v.x, y: v.y };
};
export const lookInsideFocusBox = () => {
  const grp = focusObject(readFocus);
  if (!grp) return false;
  const box = new THREE.Box3().setFromObject(grp).expandByScalar(1);
  return box.containsPoint(currentLook);
};
export const panProbe = (dx: number, dy: number) => panBy(dx, dy);
/** I-66's ladder surfaces: where the wheel stands on the ladder */
export const zoomState = () => ({
  mode, focus: readFocus, lastFocus,
  dist: camera.position.distanceTo(currentLook), overviewDist: OVERVIEW_DIST,
});
