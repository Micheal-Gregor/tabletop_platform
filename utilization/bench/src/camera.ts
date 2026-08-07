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
import { camera, scene, focusGroups, presets, WORLD, status, SEAT_YAWS, RING_N } from './stage.js'; // I-216: the SCENE itself — the dynamic lookups had walked up from an UNPARENTED camera (null) since I-149
import { stationLook } from './playarea.js'; // PA-1 (I-141)
import { surfaceSize } from './seat-grid.js'; // I-223: the surface's LAW-true size (the AABB lied at every yawed seat)
import { trace } from './ui-trace.js'; // I-238
import { zoneOf } from './zones.js'; // I-239: the ZONE parent class — scrolling solved once, inherited everywhere

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
  if (name === 'hand-fan') {
    // I-205: the LIFTED HAND's scenic zoom — the camera closes on the fan's live
    // center, over the viewer's shoulder (the seat-0 yaw), near enough to read backs.
    let fan: THREE.Object3D | null = null;
    scene.traverse((o: THREE.Object3D) => { if (!fan && o.userData?.['handFan']) fan = o; });
    if (fan) {
      const c = (fan as THREE.Object3D).getWorldPosition(new THREE.Vector3());
      const yaw = SEAT_YAWS[0] ?? 0;
      return { pos: new THREE.Vector3(c.x + Math.sin(yaw) * 260, c.y + 150, c.z + Math.cos(yaw) * 260), look: c };
    }
  }
  if (name.startsWith('seat-')) {
    const i = Number(name.slice(5));
    const yaw = SEAT_YAWS[i] ?? 0;
    const lk = stationLook(i, RING_N); // PA-2: the occupant count
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
  if (name !== 'hand-fan' && !presets[name]) throw new Error(`glideTo refused: unknown preset "${name}" (have: ${Object.keys(presets).join(', ')})`); // I-205: hand-fan is dynamic
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
  return d * 1.02; // F-7 (I-148): boards read closer ('too far back') — the corner-true floor + 2%
}

/** Focus resolution (I-66e): a focus names a GROUP ('table', 'seat-i') or a TABLE
 *  REGION ('table:<region>' — the region quad inside the table group). */
export function focusObject(focus: string): THREE.Object3D | null {
  if (focusGroups[focus]) return focusGroups[focus]!;
  if (focus.startsWith('obj:')) {
    // I-206: ANY object with the read affordance anchors by uuid — the generic
    // zoom-to-read every in-play object was missing (mapRead frames its live bbox).
    const id = focus.slice(4);
    return scene.getObjectByProperty('uuid', id) ?? null;
  }
  if (focus === 'hand-fan') {
    let fan: THREE.Object3D | null = null;
    scene.traverse((o: THREE.Object3D) => { if (!fan && o.userData?.['handFan']) fan = o; });
    return fan; // I-205: wheel-in on the lifted hand reaches READ (the onion browser is H-4's layer)
  }
  if (focus.startsWith('seat-area-') || focus === 'box') {
    // PB-1/PB-2 (I-176): the seat PLAY AREA is a first-class anchor — the transparent
    // surface found by its index tag (world-space, rebuilt every state change).
    const idx = Number(focus.slice('seat-area-'.length));
    let hit2: THREE.Object3D | null = null;
    scene.traverse((o: THREE.Object3D) => { if (!hit2 && o.userData?.['seatSurface'] === idx) hit2 = o; });
    return hit2;
  }
  if (focus.startsWith('table:')) {
    const rid = focus.slice('table:'.length);
    let hit: THREE.Object3D | null = null;
    focusGroups['table']?.traverse((o: THREE.Object3D) => { if (o.userData?.['region'] === rid) hit = o; });
    if (hit) return hit;
    // C-1b (I-149): under the permanence world a region's OBJECT may stand in world
    // space (instance stacks are world-sized, never children of the scaled table) —
    // the anchor law generalizes: search the scene for the region tag.
    scene.traverse((o: THREE.Object3D) => { if (!hit && o.userData?.['region'] === rid) hit = o; });
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
  // F-7 (I-148, the owner's framing ruling): OBJECT-SIZE-AWARE reads — a SMALL object
  // (die, cards, region anchors; max dimension < 200) reads PULLED BACK at 1.7× fit
  // ('too close for the dice, the cards'); the fit floor (no crop) is never violated —
  // 1.7× keeps the object ≈ 60% of frame (the framed wall ≥ 0.5 holds).
  const sz = box.getSize(new THREE.Vector3());
  const small = Math.max(sz.x, sz.y, sz.z) < 200;
  const factor = small ? 1.7 : 1.0;
  if ((obj as THREE.Object3D).userData?.['die']) {
    // I-242 (the owner: 'we shouldn't zoom in tight on the dice'): the die reads
    // OVERHEAD at a generous pull-back — never face-on along its post-roll +z (an
    // arbitrary axis after physics), never tight.
    const n = new THREE.Vector3(0, 1, 0);
    const up = Math.hypot(c.x, c.z) > 20 ? new THREE.Vector3(-c.x, 0, -c.z).normalize() : new THREE.Vector3(0, 0, -1);
    return { pos: c.clone().add(n.clone().multiplyScalar(fitAlong(box, c, n, up) * 3.4)), look: c, up };
  }
  if (focus === 'table' || focus.startsWith('table:')) {
    const n = new THREE.Vector3(0, 1, 0);
    const up = new THREE.Vector3(0, 0, -1);
    return { pos: c.clone().add(n.clone().multiplyScalar(fitAlong(box, c, n, up) * factor)), look: c, up };
  }
  if (focus.startsWith('seat-area-') || focus === 'box') {
    // PB-2 (I-176, the owner: 'pan to a direct overhead looking down on the play area
    // the way the table does'): straight down, up = toward the board/table so the
    // player's cards read upright; grabs stay live in read (the claim order already
    // routes card drags before the pan).
    const n = new THREE.Vector3(0, 1, 0);
    const up = new THREE.Vector3(-c.x, 0, -c.z).normalize();
    // I-225 (the owner's third catch of the AABB class — 'seat 1 play area read is
    // perfect… same issue, for sure'): the overhead fit measures the GRID'S OWN size,
    // exact at every yaw (the axis-aligned box inflates for every angled seat).
    const ssz2 = surfaceSize();
    const fovV2 = (camera.fov * Math.PI) / 180;
    const dFit = Math.max((ssz2.w / 2) / (Math.tan(fovV2 / 2) * camera.aspect), (ssz2.d / 2) / Math.tan(fovV2 / 2)) * 1.08;
    return { pos: c.clone().add(n.clone().multiplyScalar(dFit)), look: c, up };
  }
  const n = new THREE.Vector3(0, 0, 1).applyQuaternion((obj as THREE.Group).quaternion).normalize(); // the board's outward normal (90° to its face)
  // I-233 (the owner's twist, root-caused: a FLAT card's face-on read looks STRAIGHT
  // DOWN, and up=(0,1,0) is then parallel to the view — mathematically undefined, so
  // the roll was arbitrary; the board zone escaped because its overhead reads carry an
  // explicit horizontal up): a flat object's up points from the seat TOWARD the
  // center, so cards read upright the way the player sits.
  const up = Math.abs(n.y) > 0.85
    ? (Math.hypot(c.x, c.z) > 20 ? new THREE.Vector3(-c.x, 0, -c.z).normalize() : new THREE.Vector3(0, 0, -1))
    : new THREE.Vector3(0, 1, 0);
  // I-225: the face-on fit measures the bounding SPHERE — rotation-safe (the AABB's
  // third lie: seat-0's yawed board read pulled too far while seat-1's was perfect).
  const sp2 = box.getBoundingSphere(new THREE.Sphere());
  const fovV3 = (camera.fov * Math.PI) / 180;
  let dSphere = (Math.max(30, sp2.radius) / Math.sin((fovV3 / 2) * 0.9)) * factor;
  if (focus.startsWith('seat-') && !focus.startsWith('seat-area-')) dSphere *= 0.5; // I-228 (owner-tuned): the SEAT board reads at HALF the distance — seats only; areas are right
  return { pos: c.clone().add(n.clone().multiplyScalar(dSphere)), look: c, up };
}

/** I-215 (the owner's corrections, superseding the I-214 law the same day): THE
 *  SCENIC LAW v2 — (a) the fit is the object's BOUNDING SPHERE, never the box (the
 *  play space is a sphere; box corners gave the camera 'fake square corners' to
 *  choke in); (b) EVERY scenic looks 35° DOWN AT 0,0,0 — the camera sits on the ray
 *  from the center THROUGH the object, beyond it, so the object stands maximized in
 *  the foreground and the sight line runs past it to the world's anchor. One law,
 *  every object, both promises at once.
 *  I-240: the POSE is pure (scenicPose) — the max-out clamp measures it without
 *  moving the camera; scenicView applies it. */
function scenicPose(focus: string): { pos: THREE.Vector3; look: THREE.Vector3 } | null {
  const obj = focusObject(focus) ?? focusGroups[focus] ?? null;
  if (!obj) return null;
  const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const c = sphere.center, R = Math.max(20, sphere.radius);
  const rHoriz = Math.hypot(c.x, c.z);
  const dirOut = rHoriz > 40
    ? new THREE.Vector3(c.x, 0, c.z).normalize()
    : new THREE.Vector3(Math.sin(SEAT_YAWS[0] ?? 0), 0, Math.cos(SEAT_YAWS[0] ?? 0)); // the centered table: over the viewer's shoulder
  // the sphere fill: horizontal pull-back so the object subtends 80% of the frame (I-220)
  const fovV = (camera.fov * Math.PI) / 180;
  let back = R / Math.sin((fovV / 2) * 0.72);
  let horiz = rHoriz + back;
  let h = Math.tan(0.611) * horiz; // 35° down at the CENTER — the default law
  if (focus.startsWith('seat-area-') || focus === 'box') {
    // I-221 (owner-tuned, superseding the I-219 match): HALF the seat cam's elevation,
    // and the AREA'S NEAREST EDGE FILLS THE ENTIRE BOTTOM EDGE OF THE VIEW — the
    // composition rule outranks look-at-center here: the pitch is set so the near
    // edge sits exactly on the frame's bottom, and the width sets the pull-back.
    const sp = mapPreset('seat-0');
    h = sp.pos.y / 2;
    // I-223 (the owner's OWN diagnostic: 'area 1 DOES fit' — the axis-aligned seat —
    // while area 0 did not: the world AABB of a YAWED rectangle is INFLATED, so every
    // angled seat measured too wide and pulled too far back): the surface's size comes
    // from ITS LAW (seat-grid), exact at every yaw; the near edge is center + half-depth
    // along the outward radial, by the surface's own construction.
    // I-224: the BOX takes the same composition as the play areas (owner-asked) — its
    // width/near-edge come from its bounding SPHERE (rotation-safe, the owner's own
    // sphere law: the AABB lied once already, I-223); the areas keep their grid truth.
    const ssz = surfaceSize();
    const W = focus === 'box' ? 2 * R : ssz.w;
    const rNear = focus === 'box' ? rHoriz + R : rHoriz + ssz.d / 2;
    const tanH = Math.tan(fovV / 2) * camera.aspect;
    const slant = (W / 2) / tanH; // the near edge spans the full horizontal FOV at this slant range
    const b2 = Math.sqrt(Math.max(slant * slant - h * h, 60 * 60)); // horizontal back-off behind the edge
    const camHoriz = rNear + b2;
    const pitch = Math.max(0.12, Math.atan2(h, b2) - fovV / 2); // the near edge rides the frame's exact bottom (floor: never near-level)
    const pos2 = new THREE.Vector3(dirOut.x * camHoriz, h, dirOut.z * camHoriz);
    const fwd = new THREE.Vector3(-dirOut.x * Math.cos(pitch), -Math.sin(pitch), -dirOut.z * Math.cos(pitch)); // I-222: the axis as a DIRECTION — no tan singularity to shoot the gaze level
    return { pos: pos2, look: pos2.clone().add(fwd.multiplyScalar(1200)) };
  }
  return { pos: new THREE.Vector3(dirOut.x * horiz, h, dirOut.z * horiz), look: new THREE.Vector3(0, 0, 0) };
}
/** I-242 (owner-specified, with the button recorded as asked): THE DICE VIEW — the
 *  camera stands above and just beyond the LIVE die, sighting 30° down through it to
 *  the world's center. Selecting the die travels here; the 🎲 dice button records it. */
export function diceView(): void {
  let die: THREE.Object3D | null = null;
  scene.traverse((o: THREE.Object3D) => { if (!die && o.userData?.['die']) die = o; });
  if (!die) { status('no die on the table'); return; }
  const dp = (die as THREE.Object3D).getWorldPosition(new THREE.Vector3());
  const rH = Math.max(60, Math.hypot(dp.x, dp.z));
  const dir = new THREE.Vector3(dp.x / rH, 0, dp.z / rH);
  const rCam = rH + 600; // I-242 owner-tuned: 130 put the die UNDER the camera, below the
  // frame (at 30° the sight line dropped ~70° to reach it); 600 back keeps the die in
  // the lower third of the view on the way to the center
  const h = Math.tan(Math.PI / 6) * rCam; // 30° down at 0,0,0
  camera.up.set(0, 1, 0);
  target = { pos: new THREE.Vector3(dir.x * rCam, h, dir.z * rCam), look: new THREE.Vector3(0, 0, 0) };
  mode = 'scene';
  currentName = 'dice';
  trace('view', 'DICE view');
  status('the dice view — above the die, 30° down to the center');
}
export function scenicView(focus: string): void {
  const p = scenicPose(focus);
  if (!p) { status(`scenic refused: unknown focus "${focus}"`); return; }
  camera.up.set(0, 1, 0);
  target = p;
  mode = 'scene';
  currentName = `${focus}:scenic`;
  lastFocus = focus;
  trace('view', `SCENIC ${focus}`);
  status(`scenic: ${focus} — maximized in the foreground, the sight line runs 35° down toward the center`);
}
/** I-240 (the owner's travel law): the zone's EDGE — the scenic camera range from the
 *  zone's center, plus THREE wheel ticks out. Scene dolly-out clamps here; the read
 *  view never sits on the way out. */
function zoneCenterOf(zoneFocus: string): THREE.Vector3 | null {
  const obj = focusObject(zoneFocus) ?? focusGroups[zoneFocus] ?? null;
  if (!obj) return null;
  return new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere()).center;
}
function maxOutDist(zoneFocus: string): number | null {
  const p = scenicPose(zoneFocus);
  const zc = zoneCenterOf(zoneFocus);
  if (!p || !zc) return null;
  return p.pos.distanceTo(zc) * Math.pow(1.14, 3); // three ticks past the scenic — then the zone ends
}

export function readView(focus?: string, reanchor = true): void {
  readFocus = focus ?? lastFocus; // the ANCHOR is the default read target (I-66a; supersedes the I-63g1 camera-based default)
  if (reanchor) lastFocus = readFocus;
  const m = mapRead(readFocus);
  camera.up.copy(m.up);
  target = { pos: m.pos, look: m.look };
  mode = 'read';
  trace('view', `READ ${readFocus}`);
  panned = false; // fit is the pure rest state — re-toggle RESETS pan (I-63c)
  currentName = `${readFocus}:read`;
  document.getElementById('mode-btn')!.textContent = '🎲 scene view';
  status(`read view: ${readFocus === 'table' || readFocus.startsWith('table:') ? 'flat overhead' : `face-on to ${readFocus}`} — drag to scroll, wheel out to leave`);
}
export function sceneView(): void {
  exitReadStep(); // I-240: ONE exit law — read leaves to the zone's scenic (the mode
  // button and the wheel-out share it; the old anchorPreset ladder is superseded)
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

// ── THE ZOOM PATH (I-240, superseding the I-66b four-rung ladder): per zone —
// READ (in through the anchor's wall) ↔ SCENE (dolly) ↔ the zone's EDGE (scenic + 3
// ticks). Read enters ONLY by zooming in and exits ONLY by zooming out; travel
// between zones is by click. The anchor survives ladder moves; only clicks re-anchor.
const readFitDist = (focus: string): number => { const m = mapRead(focus); return m.pos.distanceTo(m.look); };
/** I-220 (the owner's zoom law): the distance at which `focus` fills `fill` of the
 *  frame — SPHERE-fit, the one measure every rung uses. */
function fitDist(focus: string, fill = 0.8): number | null {
  const obj = focusObject(focus) ?? focusGroups[focus] ?? null;
  if (!obj) return null;
  const sp = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const fovV = (camera.fov * Math.PI) / 180;
  return Math.max(30, sp.radius) / Math.sin((fovV / 2) * fill);
}
/** I-239: the zone question is THE CLASS'S — one lookup, inherited containment (the
 *  I-237 ownership + no-go laws live in the Zone children now, not in a string map). */
function zoneAnchorOf(f: string): string | null {
  return zoneOf(f)?.focusOf() ?? null;
}
/** I-220: read exits ONE STEP — back to the anchor at its 80% (click or wheel-out). */
/** I-227: is the current read the ZONE's own (the resting state)? Zone reads accept
 *  SELECTION clicks; only a CHILD's read exits on click. */
export function readIsZone(): boolean {
  if (mode !== 'read') return false;
  return readFocus === 'table' || readFocus.startsWith('seat-area-');
}
/** I-236 (the owner's input scheme): HOLD-DRAG ON EMPTY pans the camera in the view
 *  plane — pos and look together, speed scaled by distance (near = fine, far = fast). */
export function panScene(dxPx: number, dyPx: number): void {
  const fwd = new THREE.Vector3().subVectors(currentLook, camera.position);
  const dist = fwd.length();
  const fwdH = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
  const right = new THREE.Vector3(fwdH.z, 0, -fwdH.x);
  const k = dist * 0.0014;
  const delta = right.multiplyScalar(-dxPx * k).add(fwdH.multiplyScalar(dyPx * k));
  target = { pos: (target?.pos ?? camera.position).clone().add(delta), look: currentLook.clone().add(delta) };
  currentName = 'custom';
}
export function exitReadStep(): void {
  if (mode !== 'read') return;
  // I-240 (the owner's amendment — 'only enter by zooming in and then exit by zooming
  // out'): the ONE exit. Read leaves to the ZONE's scenic — never to another read (the
  // out-to-zone-read rung is REMOVED entirely; it was the bounce's other half). The
  // read subject stays selected (I-66a upheld): out then in returns to the page.
  mode = 'scene';
  const keep = lastFocus; // the ANCHOR survives the exit — a card selected at the zone
  // read stays selected, so out-then-in descends to it (only clicks re-anchor, I-66a)
  const zone = zoneAnchorOf(readFocus);
  scenicView(zone ?? (focusObject(readFocus) ? readFocus : 'table'));
  lastFocus = keep;
}
/** F-8 (I-167, the owner: 'camera for seat zero … should be in same position as seats
 *  1-5'): the READ-EQUALITY oracle — every seat's read distance and framed bbox, so
 *  inequality NAMES its seat and its cause (a fat bbox vs a camera fault). */
export function seatReadEquality(n: number): { i: number; dist: number; maxDim: number }[] {
  const out: { i: number; dist: number; maxDim: number }[] = [];
  for (let i = 0; i < n; i++) {
    const o = focusObject(`seat-${i}`);
    if (!o) continue;
    const sz = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    out.push({ i, dist: readFitDist(`seat-${i}`), maxDim: Math.max(sz.x, sz.y, sz.z) });
  }
  return out;
}
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
/** I-241 (H-4): the HAND-ZOOM hook — zooming close on the hand opens the onion browser
 *  instead of a read (game3d registers it; camera stays ignorant of the overlay).
 *  I-242: the hook DECIDES — false (e.g. the hand is face down) falls through to the
 *  ordinary read, like any other card. */
let handZoomHook: (() => boolean) | null = null;
export function setHandZoomHook(f: () => boolean): void { handZoomHook = f; }
document.getElementById('stage')!.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  if (wheelGate?.()) return; // a live grab suppresses the zoom ladder (S-1, I-103)
  const zoomIn = ev.deltaY < 0;
  trace('wheel', `${zoomIn ? 'in' : 'out'} mode=${mode} anchor=${lastFocus} read=${mode === 'read' ? readFocus : '-'}`);
  // ── I-240 — THE SCROLL RULES, the owner's amendment (superseding I-226/I-239's
  // zone-read rungs): READ IS ENTERED ONLY BY ZOOMING IN AND EXITED ONLY BY ZOOMING
  // OUT. The bounce is dead by construction: wheel-in can never leave read (the
  // descent branch is gone) and wheel-out can never land in one (the out-to-zone-read
  // rung is gone). ONE wall rule for every anchor — zone or child, the wheel dollies
  // toward THE SELECTED THING and crossing its 80% wall enters its read. Out dollies
  // back and stops at the zone's edge (scenic + three ticks); travel between zones is
  // by CLICK, never by scroll.
  const anchor = lastFocus;
  const zone = zoneAnchorOf(anchor);
  if (mode === 'read') {
    if (!zoomIn) { exitReadStep(); return; } // the one exit — out to the zone's scenic
    status('reading — wheel out to leave');
    return; // in: read is the innermost rung, for zones and children alike
  }
  const dist = camera.position.distanceTo(currentLook);
  // ── I-241 — THE AXIS LAW (the owner: 'the area buttons define the camera view as at
  // a set angle — it should zoom in and out from that angle'): when the anchor IS a
  // zone, the wheel scales the BUTTON POSE about the zone's center — the camera rides
  // the defined angle's ray, never scrolling up off it. Three ticks in from the button
  // view crosses into the read; three ticks out reaches the edge. Children keep the
  // free dolly + wall (the boards already work that way, owner-confirmed).
  if (zone !== null && anchor === zone) {
    const zp = scenicPose(anchor);
    const zc = zoneCenterOf(anchor);
    if (zp && zc) {
      const baseD = Math.max(1, zp.pos.distanceTo(zc));
      const s = camera.position.distanceTo(zc) / baseD;
      const s2 = s * (zoomIn ? 0.88 : 1.14);
      if (zoomIn && s2 < 0.70) { readView(anchor); return; } // past the third tick → the zone's read (the one entry)
      if (!zoomIn && s2 > Math.pow(1.14, 3) + 1e-6) { status(`the ${anchor} zone's edge — click another zone to travel`); return; }
      camera.up.set(0, 1, 0);
      target = {
        pos: zc.clone().addScaledVector(zp.pos.clone().sub(zc), s2),
        look: zc.clone().addScaledVector(zp.look.clone().sub(zc), s2),
      };
      currentName = 'custom';
      return;
    }
  }
  if (zoomIn) {
    const wall = fitDist(anchor, 0.8); // the ONE rule: the anchor's own wall, whoever it is
    if (wall === null) {
      // I-242 (the owner tightened I-241's bounds: 'the unbound camera range needs to
      // be about 1/2 max zoom out and zoom in'): the free dolly runs at HALF range.
      if (dist * 0.88 < 280) { status('close enough — click something to read it'); return; }
      dollyTo(dist * 0.88);
      return;
    }
    if (dist * 0.88 <= wall) {
      // I-241 (H-4 arrives): closing on the HAND opens the ONION — the browse view,
      // never a frozen read (exited by clicking outside the cards or wheeling out).
      const oA = focusObject(anchor);
      const spc = oA?.userData?.['seatPlayCard'];
      if (handZoomHook && (anchor === 'hand-fan' || (typeof spc === 'string' && spc.startsWith('hand:')))) {
        if (handZoomHook()) return; // face UP → the onion; face down falls through — an ordinary card read (I-242)
      }
      readView(anchor);
      return; // crossing the wall ENTERS the read — the one entry
    }
    dollyTo(dist * 0.88);
    return;
  }
  // out: a plain dolly back, clamped at the zone's edge — read never sits on this path.
  // I-242: UNANCHORED (no zone), the range is HALVED — the free camera roams half as far.
  const max = maxOutDist(zone ?? 'table');
  const zc = zoneCenterOf(zone ?? 'table');
  const eff = max !== null && zone === null ? max * 0.5 : max;
  if (eff !== null && zc !== null && camera.position.distanceTo(zc) * 1.14 > eff) {
    status(`the ${zone ?? 'world'} zone's edge — click another zone to travel`);
    return;
  }
  dollyTo(dist * 1.14);
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
export const setLastFocus = (f: string): void => { if (f !== lastFocus) trace('anchor', `${lastFocus} → ${f}`); lastFocus = f; };
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
