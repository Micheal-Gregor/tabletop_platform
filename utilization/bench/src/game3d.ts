/**
 * GAME3D — ROADMAP A1: THE STAGE (I-62). The playable 3D shell: the ENGINE-BOUND
 * table (projection-fed fills, stamped at draw), shop boards at the edges, and the
 * GLIDING camera on the same preset law — wheel dolly, click-to-focus. NO verbs at
 * A1; actions arrive at A2+. Unskinned (D-1). The spike stays a frozen exhibit.
 */
import * as THREE from 'three';
import type { EngineCore, RuleRegistry as RegistryT } from '@tabletop/engine';
import { LockstepController, RuleRegistry, rebuild } from '@tabletop/engine';
import type { LayoutDef, SeatView } from '@tabletop/presentation';
import { focusPresets, project } from '@tabletop/presentation';
import { BOTY_PACK, BOTY_REF, botyGenesis, wireBoty, SHOP_BOARD, TOWN_TABLE } from '../../../packs/boty/src/index.js';

const WORLD = { w: 1600, h: 1000 };
const SEATS = BOTY_PACK.seats.map((s) => s.id);
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
const presets = focusPresets(SEATS.length, WORLD);

// ── the engine, through the same doors as the SVG bench (I-62a) ──
const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry() as RegistryT)(c);
const controller = LockstepController.host(BOTY_REF, BOTY_PACK.seats, 'maple-hollow', botyGenesis, wire());
for (const s of SEATS) controller.join('bench-3d', s);
const viewSeat = SEATS[0]!;
const projectNow = (): SeatView => project(rebuild(controller.row(), botyGenesis, wire()).getState(), viewSeat);

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
function layoutFace(def: LayoutDef, tint: number, fills: Readonly<Record<string, readonly string[]>> = {}): THREE.Group {
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ color: 0xfbfaf7 })));
  grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(100, 100)), new THREE.LineBasicMaterial({ color: 0x444444 })));
  for (const r of def.regions) {
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

function buildScene(): void {
  const v = projectNow();
  const active = v.seats[v.turn.seatIdx]!.id;
  const ranked = [...v.seats].sort((a, b) => b.cash - a.cash);
  const standings = ranked.map((s) => `${s.id === active ? '★ ' : ''}${s.id}  $${s.cash}`);
  const moves = controller.row().moves; // I-52-registered class (display-only)
  const log = moves.slice(-4).map((m) => `${m.seat} · ${m.type}`);
  const deckCount = v.decks[active]?.drawCount ?? 0;
  // the table: flat on the ground, fills stamped from the projection
  const table = layoutFace(TOWN_TABLE, 0xeef3ee, {
    standings: ['THE TABLE', ...standings],
    log: ['TABLE LOG', ...(log.length ? log : ['(no moves yet)'])],
    deck: [`deck`, `${deckCount} left`],
    'art-banner': [`[art: ${SEASONS[(v.turn.round - 1) % 4]} — Maple Hollow]`],
  });
  table.rotation.x = -Math.PI / 2;
  table.scale.set(9, 7, 1);
  table.userData['focus'] = 'table';
  scene.add(table);
  // shop boards standing at the edges — click-to-focus targets
  SEATS.forEach((s, i) => {
    const seat = v.seats.find((x) => x.id === s)!;
    const b = layoutFace(SHOP_BOARD, 0xffffff, {
      identity: [`${s}${s === active ? ' ★' : ''} · [trade]`],
      counters: [`$${seat.cash} · ♥${seat.favor}`],
    });
    b.scale.set(2.6, 2.6, 1);
    b.position.set((i - 1) * 420, 130, 420);
    b.rotation.x = -0.25;
    b.userData['seatIdx'] = i;
    scene.add(b);
  });
  // chrome (I-51d)
  document.getElementById('hdr')!.textContent =
    `Maple Hollow · ${SEASONS[(v.turn.round - 1) % 4]} · round ${v.turn.round} / ${BOTY_PACK.maxRounds} · ▶ ${active}'s turn · viewing as ${viewSeat}`;
}
buildScene();

// ── THE GLIDING CAMERA (I-62c): the SAME preset mapping, animated; purity at rest ──
const mapPreset = (name: string): { pos: THREE.Vector3; look: THREE.Vector3 } => {
  const p = presets[name]!;
  const look = new THREE.Vector3(p.cx - WORLD.w / 2, 0, p.cy - WORLD.h / 2);
  const d = 1900 / p.zoom;
  return { pos: new THREE.Vector3(look.x, d * 0.72, look.z + d * 0.7), look };
};
let target = mapPreset('overview');
let currentLook = target.look.clone();
let currentName = 'overview';
camera.position.copy(target.pos);
camera.lookAt(currentLook);

function glideTo(name: string): void {
  if (!presets[name]) throw new Error(`glideTo refused: unknown preset "${name}" (have: ${Object.keys(presets).join(', ')})`);
  target = mapPreset(name);
  currentName = name;
  status(`camera → ${name}`);
}
const gliding = (): boolean => camera.position.distanceTo(target.pos) > 0.05 || currentLook.distanceTo(target.look) > 0.05;

function status(msg: string): void { document.getElementById('status')!.textContent = msg; }

// wheel dolly = 'custom' camera, outside the preset law by declaration (I-62c)
document.getElementById('stage')!.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  const dir = new THREE.Vector3().subVectors(camera.position, currentLook).multiplyScalar(ev.deltaY < 0 ? 0.9 : 1.12);
  camera.position.copy(currentLook.clone().add(dir));
  target = { pos: camera.position.clone(), look: currentLook.clone() };
  currentName = 'custom';
  status('camera → custom (dolly)');
}, { passive: false });

// click-to-focus: raycast boards → their seat preset; the felt → table
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('pointerdown', (ev) => {
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
  for (const hit of ray.intersectObjects(scene.children, true)) {
    let o: THREE.Object3D | null = hit.object;
    while (o) {
      if (typeof o.userData['seatIdx'] === 'number') { glideTo(`seat-${o.userData['seatIdx']}`); return; }
      if (o.userData['focus'] === 'table') { glideTo('table'); return; }
      o = o.parent;
    }
  }
});

document.getElementById('bar')!.innerHTML = Object.keys(presets).map((k) => `<button data-cam="${k}">${k}</button>`).join('');
document.getElementById('bar')!.onclick = (ev) => {
  const k = (ev.target as HTMLElement).dataset['cam'];
  if (k) glideTo(k);
};

function tick(): void {
  requestAnimationFrame(tick);
  if (gliding()) {
    camera.position.lerp(target.pos, 0.1);
    currentLook.lerp(target.look, 0.1);
    if (!gliding()) { camera.position.copy(target.pos); currentLook.copy(target.look); }
  }
  camera.lookAt(currentLook);
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
