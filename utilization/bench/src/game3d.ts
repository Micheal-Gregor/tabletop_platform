/**
 * GAME3D — ROADMAP A1/A2: THE STAGE + DECK & DRAW (I-62..I-67). The playable 3D
 * shell: the ENGINE-BOUND table (projection-fed fills, stamped at draw), COUNT-TRUE
 * card stacks (the geometry IS the count, I-67a), the READING BOARD onion (I-67b),
 * the draw verb under HK-11 theater (I-67c), pure-theater fidgets (I-67e), and the
 * GLIDING camera on the ladder law. Unskinned (D-1). The spike stays frozen.
 */
import * as THREE from 'three';
import type { EngineCore, RuleRegistry as RegistryT } from '@tabletop/engine';
import { LockstepController, RuleRegistry, rebuild } from '@tabletop/engine';
import type { LayoutDef, SeatView } from '@tabletop/presentation';
import { beginFlourish, completeFlourish, emit, focusPresets, project } from '@tabletop/presentation';
import { BOTY_PACK6, BOTY6_REF, botyGenesis6, wireBoty, SHOP_BOARD, TOWN_TABLE } from '../../../packs/boty/src/index.js';

const WORLD = { w: 1600, h: 1000 };
const SEATS = BOTY_PACK6.seats.map((s) => s.id);
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
const presets = focusPresets(SEATS.length, WORLD);

// ── the engine, through the same doors as the SVG bench (I-62a); the 6-up exhibit variant (I-65e) ──
const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry() as RegistryT)(c);
const controller = LockstepController.host(BOTY6_REF, BOTY_PACK6.seats, 'maple-hollow', botyGenesis6, wire());
for (const s of SEATS) controller.join('bench-3d', s);
const viewSeat = SEATS[0]!;
const projectNow = (): SeatView => project(rebuild(controller.row(), botyGenesis6, wire()).getState(), viewSeat);

// ── mesh builders (defs are the SOLE geometry source — the I-60a charter carries) ──
/** A multi-line panel texture; the mesh STAMPS the lines it was ASKED to draw (I-62b). */
function panel(lines: readonly string[], w: number, h: number, head?: string): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.max(64, Math.round((h / w) * 512));
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#999'; g.strokeRect(1, 1, c.width - 2, c.height - 2);
  g.fillStyle = '#333'; g.font = 'bold 22px system-ui';
  let y = 28;
  if (head) { g.fillText(head, 10, y); y += 30; }
  g.font = '20px system-ui'; g.fillStyle = '#444';
  for (const ln of lines) { g.fillText(ln, 10, y); y += 26; }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: false }));
  m.userData['renderedLines'] = [...(head ? [head] : []), ...lines]; // the asked-text stamp
  return m;
}

/** A layout as a face: region quads from the def, optional per-region line fills. */
function layoutFace(def: LayoutDef, tint: number, fills: Readonly<Record<string, readonly string[]>> = {}, skip: readonly string[] = []): THREE.Group {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ color: 0xfbfaf7 })));
  grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(100, 100)), new THREE.LineBasicMaterial({ color: 0x444444 })));
  for (const r of def.regions) {
    if (skip.includes(r.id)) continue; // a richer object (a card STACK) stands in for the quad
    const fill = fills[r.id];
    const quad = fill
      ? panel(fill, r.w, r.h)
      : new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshBasicMaterial({ color: tint }));
    quad.position.set(r.x + r.w / 2 - 50, 50 - (r.y + r.h / 2), 0.2 + (r.z ?? 0) * 0.2);
    quad.userData = { ...quad.userData, region: r.id, role: r.role, def: def.id };
    grp.add(quad);
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(r.w, r.h)), new THREE.LineBasicMaterial({ color: 0x999999 })).translateX(quad.position.x).translateY(quad.position.y).translateZ(quad.position.z + 0.01));
  }
  return grp;
}

// ── scene from the PROJECTION ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f4f1);
const camera = new THREE.PerspectiveCamera(40, 1240 / 720, 1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1240, 720);
document.getElementById('stage')!.appendChild(renderer.domElement);

const focusGroups: Record<string, THREE.Group> = {};
const builtRoots: THREE.Object3D[] = [];

// ── THE MANIFESTED BACKDROP (I-67h — the owner rules on the look): white underfoot
// → pastel haze → a faint ink ring → off-white; a gradient disc, ZERO lights ──
function manifestBackdrop(): void {
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
manifestBackdrop();

// ── COUNT-TRUE CARD STACKS (I-67a): one real mesh per card; shared back texture ──
let cardBackTex: THREE.CanvasTexture | null = null;
function cardBack(): THREE.CanvasTexture {
  if (cardBackTex) return cardBackTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#efe9dd'; g.fillRect(0, 0, 256, 384);
  g.strokeStyle = '#8a7f6a'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 368);
  g.strokeStyle = '#ccc3b0'; g.lineWidth = 2;
  for (let i = -384; i < 640; i += 26) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 384, 384); g.stroke();
    g.beginPath(); g.moveTo(i + 384, 0); g.lineTo(i, 384); g.stroke();
  }
  cardBackTex = new THREE.CanvasTexture(c);
  return cardBackTex;
}

// ── FIDGET (I-67e): PURE THEATER — seeded offsets, meshes only, never state ──
const fidget: Record<string, number> = { deck: 0, discard: 0 };
function lcg(seed: number): () => number {
  let t = seed >>> 0;
  return () => { t = (Math.imul(t, 1664525) + 1013904223) >>> 0; return t / 4294967296; };
}

/** A count-true stack at a table region. faces[0] = top of the pile (face-up); null faces = card backs. */
function cardStack(r: { x: number; y: number; w: number; h: number }, rid: string, count: number, faces: readonly string[] | null): THREE.Group {
  const grp = new THREE.Group();
  grp.position.set(r.x + r.w / 2 - 50, 50 - (r.y + r.h / 2), 0.2);
  grp.userData = { region: rid, role: rid, def: TOWN_TABLE.id };
  // the footprint ghost: keeps the region clickable and boxed even at zero cards
  const ghost = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshBasicMaterial({ color: 0xdfe7df, transparent: true, opacity: 0.5 }));
  grp.add(ghost);
  const state = fidget[rid] ?? 0;
  const rnd = lcg(1069 * (state + 1) + (rid === 'deck' ? 7 : 131));
  for (let i = 0; i < count; i++) {
    const fromTop = count - 1 - i;
    const face = faces ? faces[fromTop] ?? null : null;
    const m = face
      ? panel([face], 10, 16)
      : new THREE.Mesh(new THREE.PlaneGeometry(10, 16), new THREE.MeshBasicMaterial({ map: cardBack() }));
    // resting irregularity for every card; the FIDGET states move the TOP FIVE more
    let amp = 0.18, rot = 0.02, dx = 0;
    if (fromTop < 5 && state > 0) {
      if (rid === 'deck') { amp = state === 1 ? 2.2 : 3.4; rot = state === 1 ? 0.14 : 0.22; } // loose pile → re-scatter
      else { dx = (state === 1 ? 2.6 : 5.2) * (fromTop + 1); amp = 0.4; rot = state === 1 ? 0.06 : 0.1; } // peek → spread the last 5
    }
    m.position.set(dx + (rnd() - 0.5) * 2 * amp, (rnd() - 0.5) * 2 * amp, 0.06 + i * 0.12);
    m.rotation.z = (rnd() - 0.5) * 2 * rot;
    m.userData = { ...m.userData, card: true, idx: i };
    grp.add(m);
  }
  return grp;
}

function buildScene(): void {
  for (const o of builtRoots) scene.remove(o); // I-67g: rebuild from a fresh projection on every state change
  builtRoots.length = 0;
  const v = projectNow();
  const active = v.seats[v.turn.seatIdx]!.id;
  const ranked = [...v.seats].sort((a, b) => b.cash - a.cash);
  const standings = ranked.map((s) => `${s.id === active ? '★ ' : ''}${s.id}  $${s.cash}`);
  const moves = controller.row().moves; // I-52-registered class (display-only)
  const log = moves.slice(-4).map((m) => `${m.seat} · ${m.type}`);
  const openWindows = v.windows.filter((w) => w.status === 'open').length;
  // the table: flat on the ground, fills stamped from the projection; deck+discard
  // regions are STACK OBJECTS, not quads (I-67a) — the geometry is the count
  const table = layoutFace(TOWN_TABLE, 0xeef3ee, {
    standings: ['THE TABLE', ...standings],
    log: ['TABLE LOG', ...(log.length ? log : ['(no moves yet)'])],
    windows: ['windows', openWindows ? `${openWindows} open — prompts at A8` : 'none open'],
    'art-banner': [`[art: ${SEASONS[(v.turn.round - 1) % 4]} — Maple Hollow]`],
  }, ['deck', 'discard']);
  const deckR = TOWN_TABLE.regions.find((rg) => rg.id === 'deck')!;
  const discR = TOWN_TABLE.regions.find((rg) => rg.id === 'discard')!;
  table.add(cardStack(deckR, 'deck', v.decks[active]?.drawCount ?? 0, null));
  table.add(cardStack(discR, 'discard', v.ownDiscard.length, v.ownDiscard)); // the VIEWER'S discard — redaction-honest (I-67a)
  table.rotation.x = -Math.PI / 2;
  table.scale.set(9, 7, 1);
  table.userData['focus'] = 'table';
  focusGroups['table'] = table;
  scene.add(table);
  builtRoots.push(table);
  // shop boards standing at the edges — click-to-focus targets. TWO-SIDED (I-65):
  // seats 0-2 near row (+z, the certified A1 placement), seats 3+ far row (−z),
  // each board rotated to face ITS OWN player beyond its table edge.
  SEATS.forEach((s, i) => {
    const seat = v.seats.find((x) => x.id === s)!;
    const b = layoutFace(SHOP_BOARD, 0xffffff, {
      identity: [`${s}${s === active ? ' ★' : ''} · [trade]`],
      counters: [`$${seat.cash} · ♥${seat.favor}`],
    });
    b.scale.set(2.6, 2.6, 1);
    const far = i >= 3;
    b.position.set(((i % 3) - 1) * 420, 130, far ? -420 : 420);
    if (far) {
      // the near-board pose flipped π about world Y: face −z, tilt back toward the far player
      b.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.25)));
    } else {
      b.rotation.x = -0.25;
    }
    // the BACK of a seat screen shows ONLY the shop graphic (I-65c) — which shop, no data
    const back = panel(['[shop art]'], 100, 100, s);
    back.rotation.y = Math.PI;
    back.position.z = -0.2;
    back.userData['back'] = s; // never a region — the redaction-consistent shop face
    b.add(back);
    b.userData['seatIdx'] = i;
    focusGroups[`seat-${i}`] = b;
    scene.add(b);
    builtRoots.push(b);
  });
  // chrome (I-51d)
  document.getElementById('hdr')!.textContent =
    `Maple Hollow · ${SEASONS[(v.turn.round - 1) % 4]} · round ${v.turn.round} / ${BOTY_PACK6.maxRounds} · ▶ ${active}'s turn · viewing as ${viewSeat}`;
}
buildScene();

// ── THE GLIDING CAMERA (I-62c): the SAME preset mapping, animated; purity at rest ──
// SIDE-AWARE (I-65b): a SEAT preset is approached from that seat's own side of the
// table (far row: −z); non-seat presets keep the canonical near-side approach — the
// certified A1 law is the near-side special case, not superseded.
const mapPreset = (name: string): { pos: THREE.Vector3; look: THREE.Vector3 } => {
  const p = presets[name]!;
  const look = new THREE.Vector3(p.cx - WORLD.w / 2, 0, p.cy - WORLD.h / 2);
  const d = 1900 / p.zoom;
  const side = name.startsWith('seat-') && p.cy < WORLD.h / 2 ? -1 : 1;
  return { pos: new THREE.Vector3(look.x, d * 0.72, look.z + side * d * 0.7), look };
};
let target = mapPreset('overview');
let currentLook = target.look.clone();
let currentName = 'overview';
let lastFocus = 'table'; // the wheel's in-bound target (I-64e) — what the player last looked at
camera.position.copy(target.pos);
camera.lookAt(currentLook);

function glideTo(name: string, reanchor = true): void {
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
const gliding = (): boolean => camera.position.distanceTo(target.pos) > 0.05 || currentLook.distanceTo(target.look) > 0.05;

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
function focusObject(focus: string): THREE.Object3D | null {
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

function readView(focus?: string, reanchor = true): void {
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
function sceneView(): void {
  mode = 'scene';
  camera.up.set(0, 1, 0);
  glideTo(anchorPreset(readFocus), false); // a ladder move — the anchor survives (I-66a)
}

// pan-scroll (I-63c): drag in read mode translates in the view plane; the LOOK stays
// CLAMPED to the object's bounds — you cannot scroll the object away
let dragFrom: { x: number; y: number } | null = null;
let dragMoved = false;
function panBy(dx: number, dy: number): void {
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

function status(msg: string): void { document.getElementById('status')!.textContent = msg; }

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
document.getElementById('stage')!.addEventListener('wheel', (ev) => {
  ev.preventDefault();
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

// ── THE READING BOARD (I-67b): a camera-parented onion — dark translucent surround,
// the card centered; ANY click closes it; the ladder runs unchanged beneath it ──
scene.add(camera); // camera children render
let onion: THREE.Group | null = null;
let onionCard: THREE.Mesh | null = null;
let onionVerdict: { mismatch: boolean; displayed: string; seeded: string } | null = null;
function openOnion(title: string, lines: readonly string[]): void {
  closeOnion();
  onion = new THREE.Group();
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(420, 260), new THREE.MeshBasicMaterial({ color: 0x14181c, transparent: true, opacity: 0.55, depthTest: false }));
  veil.renderOrder = 90;
  onion.add(veil);
  onionCard = panel(lines, 52, 78, title);
  (onionCard.material as THREE.MeshBasicMaterial).depthTest = false;
  onionCard.renderOrder = 91;
  onionCard.position.z = 2;
  onion.add(onionCard);
  onion.position.z = -130;
  camera.add(onion);
}
function closeOnion(): void {
  if (onion) { camera.remove(onion); onion = null; onionCard = null; }
}

// ── DRAW THEATER (I-67c): the verb through the same doors; HK-11 at flight end ──
const CLIENT3D = 'bench-3d';
let drawPhase: 'idle' | 'flying' | 'reading' = 'idle';
let flight: { mesh: THREE.Mesh; from: THREE.Vector3; t: number; inst: ReturnType<typeof beginFlourish>; seeded: string; flipped: boolean } | null = null;
let forceMismatch = false; // the committed forced-mismatch drill (VG7d precedent) — one-shot

function submitVerb(verb: string, args: Record<string, unknown>): boolean {
  const v = projectNow();
  const active = v.seats[v.turn.seatIdx]!.id;
  try {
    const res = controller.submit(CLIENT3D, emit(verb, active, args) as never);
    if (typeof res === 'object' && res !== null && 'refused' in res) {
      status(`refused [${(res as { rule: string }).rule}]: ${(res as { detail: string }).detail}`);
      return false;
    }
    return true;
  } catch (e) {
    if (e instanceof Error && /Refusal|Breach|Violation/.test(e.name)) { status(`refused: ${e.message}`); return false; }
    throw e; // the unknown halts (the K7-v1x D8 classification law)
  }
}

function doDraw(): void {
  const before = projectNow();
  const active = before.seats[before.turn.seatIdx]!.id;
  if (!submitVerb('draw', { deck: active })) return;
  const after = projectNow();
  const seeded = after.decks[active]?.discardTop ?? '(none)';
  const inst = beginFlourish('card-flip', seeded, '♪ card flip');
  const deckObj = focusObject('table:deck');
  const from = deckObj ? new THREE.Box3().setFromObject(deckObj).getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 10, 0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(52, 78), new THREE.MeshBasicMaterial({ map: cardBack() }));
  m.position.copy(from);
  m.rotation.x = -Math.PI / 2;
  scene.add(m);
  flight = { mesh: m, from, t: 0, inst, seeded, flipped: false };
  drawPhase = 'flying';
  buildScene(); // I-67a/g: the deck is already one card shorter — the geometry is the count
  status(`${active} draws — ♪ card flip`);
}

function endTurn(): void {
  if (!submitVerb('end-turn', {})) return;
  buildScene();
  const v = projectNow();
  status(`turn passes — ▶ ${v.seats[v.turn.seatIdx]!.id}`);
}

// pointer: in READ mode a drag PANS (scroll); a plain click in scene mode raycasts
// boards → their seat preset, the felt → table
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('pointerdown', (ev) => { dragFrom = { x: ev.clientX, y: ev.clientY }; dragMoved = false; });
renderer.domElement.addEventListener('pointermove', (ev) => {
  if (!dragFrom) return;
  const dx = ev.clientX - dragFrom.x, dy = ev.clientY - dragFrom.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
  if (mode === 'read' && dragMoved) { panBy(dx, dy); dragFrom = { x: ev.clientX, y: ev.clientY }; }
});
renderer.domElement.addEventListener('pointerup', (ev) => {
  const wasDrag = dragMoved; dragFrom = null; dragMoved = false;
  if (onion) { closeOnion(); drawPhase = 'idle'; status('reading board closed'); return; } // I-67b: ANY click closes; consumed
  if (wasDrag || mode === 'read') return; // reads don't refocus on click; drags never do
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
  for (const hit of ray.intersectObjects(scene.children, true)) {
    let o: THREE.Object3D | null = hit.object;
    let region: string | null = null;
    while (o) {
      if (typeof o.userData['region'] === 'string' && !region) region = o.userData['region'] as string;
      if (typeof o.userData['seatIdx'] === 'number') { glideTo(`seat-${o.userData['seatIdx']}`); return; }
      if (o.userData['focus'] === 'table') {
        glideTo('table');
        // a TABLE REGION click anchors that region (I-66d): zoom-in reads THAT section
        if (region) { lastFocus = `table:${region}`; status(`anchored: ${region} — zoom in for its read view`); }
        // I-67d: the deck click fires the draw on the VIEWER'S turn, else steps the
        // deck fidget; discard clicks step its fidget always. Fidget = PURE THEATER.
        if (region === 'deck') {
          const v = projectNow();
          if (v.seats[v.turn.seatIdx]!.id === viewSeat) { doDraw(); }
          else { fidget['deck'] = ((fidget['deck'] ?? 0) + 1) % 3; buildScene(); status(`deck fidget → ${['neat', 'loose pile', 're-scatter'][fidget['deck']]}`); }
        } else if (region === 'discard') {
          fidget['discard'] = ((fidget['discard'] ?? 0) + 1) % 3; buildScene(); status(`discard fidget → ${['neat', 'peek', 'spread five'][fidget['discard']]}`);
        }
        return;
      }
      o = o.parent;
    }
  }
});

document.getElementById('bar')!.innerHTML =
  Object.keys(presets).map((k) => `<button data-cam="${k}">${k}</button>`).join('') +
  `<button id="mode-btn" title="flat data view — overhead for the table, face-on for a board">⊞ read view</button>` +
  `<button id="end-btn" title="pass the turn (the engine's end-turn verb — I-67f)">⏭ end turn</button>`;
document.getElementById('bar')!.onclick = (ev) => {
  const t = ev.target as HTMLElement;
  if (t.dataset['cam']) { glideTo(t.dataset['cam']!); return; }
  if (t.id === 'mode-btn') { mode === 'read' ? sceneView() : readView(); return; }
  if (t.id === 'end-btn') endTurn();
};

function tick(): void {
  requestAnimationFrame(tick);
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
  // the DRAW FLIGHT (I-67c): deck → camera, flipping at the midpoint; HK-11 at the end
  if (flight) {
    flight.t = Math.min(1, flight.t + 0.03);
    const pT = flight.t;
    const ease = pT * pT * (3 - 2 * pT);
    const dest = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(140));
    flight.mesh.position.lerpVectors(flight.from, dest, ease);
    const faceCam = camera.quaternion.clone();
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    flight.mesh.quaternion.slerpQuaternions(flat, faceCam, ease);
    flight.mesh.rotateY(Math.PI * (1 - ease)); // the flip on top of the turn-to-camera
    if (pT >= 0.5 && !flight.flipped) {
      flight.flipped = true; // the midpoint face-swap: the classic flip trick
      const displayed = forceMismatch ? 'WRONG-CARD' : flight.seeded;
      const face = panel([displayed], 52, 78);
      (flight.mesh.material as THREE.Material).dispose();
      flight.mesh.material = face.material;
    }
    if (pT >= 1) {
      const displayed = forceMismatch ? 'WRONG-CARD' : flight.seeded;
      const verdict = completeFlourish(flight.inst, displayed); // HK-11 — truth wins (R-20)
      onionVerdict = { mismatch: verdict.mismatch !== null, displayed, seeded: flight.seeded };
      const flavor = BOTY_PACK6.cards[flight.seeded]?.flavor ?? '';
      openOnion(verdict.result, [
        'Fortune',
        ...(flavor ? [flavor] : []),
        'the card takes effect',
        'through the engine',
        ...(verdict.mismatch ? ['⚑ mismatch — truth shown'] : []),
      ]);
      if (verdict.mismatch) status('⚑ theater mismatch — truth wins (R-20)');
      scene.remove(flight.mesh);
      flight = null;
      forceMismatch = false; // the drill is one-shot
      drawPhase = 'reading';
    }
  }
  renderer.render(scene, camera);
}

// ── the gate's surfaces (VG8; I-62d) ──
(window as unknown as Record<string, unknown>)['__GAME3D__'] = {
  ready: () => renderer.getContext() !== null,
  rowHash: () => controller.stateHash(),
  moveCount: () => controller.row().moves.length,
  expectedFromDefs: () => TOWN_TABLE.regions.length + SEATS.length * SHOP_BOARD.regions.length,
  regionCount: () => { let n = 0; scene.traverse((o: THREE.Object3D) => { if (o.userData?.['region']) n++; }); return n; },
  stamped: (regionId: string) => {
    let out: readonly string[] | null = null;
    scene.traverse((o: THREE.Object3D) => { if (o.userData?.['region'] === regionId && o.userData?.['renderedLines']) out = o.userData['renderedLines'] as string[]; });
    return out;
  },
  viewData: () => {
    const v = projectNow();
    return { seats: v.seats.map((s) => ({ id: s.id, cash: s.cash })), round: v.turn.round, active: v.seats[v.turn.seatIdx]!.id };
  },
  glideTo,
  gliding,
  cameraPos: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
  presetData: (k: string) => (presets[k] ? { cx: presets[k].cx, cy: presets[k].cy, zoom: presets[k].zoom } : null),
  camName: () => currentName,
  readState: () => ({ mode, focus: readFocus, panned }),
  toggleRead: (focus?: string) => (mode === 'read' ? sceneView() : readView(focus)),
  /** the current read object's bbox corners in NDC — VG8f's no-crop property surface */
  cornersNdc: () => {
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
  },
  quat: () => ({ x: camera.quaternion.x, y: camera.quaternion.y, z: camera.quaternion.z, w: camera.quaternion.w }),
  lookAtPoint: () => ({ x: currentLook.x, y: currentLook.y, z: currentLook.z }),
  /** the current read object's bbox center — K7-A1b D2's centering surface */
  focusBoxCenter: () => {
    const grp = focusObject(readFocus);
    if (!grp) return null;
    const c = new THREE.Box3().setFromObject(grp).getCenter(new THREE.Vector3());
    return { x: c.x, y: c.y, z: c.z };
  },
  /** an arbitrary world point in NDC — K7-A1b D2's orientation/centering probe */
  ndcOf: (x: number, y: number, z: number) => {
    camera.updateMatrixWorld();
    const v = new THREE.Vector3(x, y, z).project(camera);
    return { x: v.x, y: v.y };
  },
  lookInsideFocusBox: () => {
    const grp = focusObject(readFocus);
    if (!grp) return false;
    const box = new THREE.Box3().setFromObject(grp).expandByScalar(1);
    return box.containsPoint(currentLook);
  },
  panProbe: (dx: number, dy: number) => panBy(dx, dy),
  /** I-66's ladder surfaces: where the wheel stands on the ladder */
  zoomState: () => ({
    mode, focus: readFocus, lastFocus,
    dist: camera.position.distanceTo(currentLook), overviewDist: OVERVIEW_DIST,
  }),
  /** I-65c's contrast surface: seat board i's front data stamp vs its back stamp */
  boardStamps: (i: number) => {
    const grp = focusGroups[`seat-${i}`];
    if (!grp) return null;
    let front: readonly string[] | null = null;
    let back: readonly string[] | null = null;
    grp.traverse((o: THREE.Object3D) => {
      if (o.userData?.['region'] === 'counters' && o.userData?.['renderedLines']) front = o.userData['renderedLines'] as string[];
      if (o.userData?.['back'] && o.userData?.['renderedLines']) back = o.userData['renderedLines'] as string[];
    });
    return { front, back };
  },
  seatGroupKeys: () => Object.keys(focusGroups).filter((k) => k.startsWith('seat-')).sort(),
  /** I-67 surfaces: draw phase (gates WAIT ON STATE), the onion, the drill, the stacks */
  drawPhase: () => drawPhase,
  onionState: () => ({
    open: onion !== null,
    title: onionCard ? (onionCard.userData['renderedLines'] as string[])[0] ?? null : null,
    verdict: onionVerdict,
  }),
  forceFlipMismatch: (v: boolean) => { forceMismatch = v; },
  stackInfo: (rid: string) => {
    const grp = focusObject(`table:${rid}`);
    if (!grp) return null;
    const cards: THREE.Object3D[] = [];
    grp.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) cards.push(o); });
    cards.sort((a, b) => (a.userData['idx'] as number) - (b.userData['idx'] as number));
    return {
      count: cards.length,
      fidget: fidget[rid] ?? 0,
      topFace: cards.length ? ((cards[cards.length - 1]!.userData['renderedLines'] as string[] | undefined)?.[0] ?? null) : null,
      top: cards.slice(-5).map((o) => { const w = new THREE.Vector3(); o.getWorldPosition(w); return { x: w.x, y: w.y, z: w.z }; }),
    };
  },
  /** K7-A1c D2: the back face must FACE BACKWARD — world-normal dot vs the board front */
  backFacingDot: (i: number) => {
    const grp = focusGroups[`seat-${i}`];
    if (!grp) return null;
    let backMesh: THREE.Object3D | null = null;
    grp.traverse((o: THREE.Object3D) => { if (o.userData?.['back']) backMesh = o; });
    if (!backMesh) return null;
    grp.updateMatrixWorld(true);
    const fq = new THREE.Quaternion();
    grp.getWorldQuaternion(fq);
    const bq = new THREE.Quaternion();
    (backMesh as THREE.Object3D).getWorldQuaternion(bq);
    const fn = new THREE.Vector3(0, 0, 1).applyQuaternion(fq);
    const bn = new THREE.Vector3(0, 0, 1).applyQuaternion(bq);
    return fn.dot(bn);
  },
  /** VG8i's input-drive helper: a table region's center projected to canvas pixels. */
  regionScreenXY: (rid: string) => {
    const o = focusObject(`table:${rid}`);
    if (!o) return null;
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
    camera.updateMatrixWorld();
    const v = c.project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  },
  /** VG8e's input-drive helper: a board's center projected to canvas pixel coords. */
  boardScreenXY: (i: number) => {
    let hit: THREE.Object3D | null = null;
    scene.traverse((o: THREE.Object3D) => { if (o.userData?.['seatIdx'] === i) hit = o; });
    if (!hit) return null;
    const v = new THREE.Vector3();
    (hit as THREE.Object3D).getWorldPosition(v);
    v.project(camera);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  },
};
tick();
status('the stage is set — glide with the presets, dolly with the wheel, click a board to focus it');
