/**
 * GAME3D — THE HARNESS (K-A of the drop-in Component architecture, I-77): a thin,
 * registry-driven spine. Everything object-specific now lives in src/components/*.ts
 * (thin adapters wrapping die/ledger/box/surfaces/stacks/onion UNCHANGED); this file
 * keeps ONLY engine/harness: the engine binding, projectNow/submitVerb, manifestBackdrop,
 * the ctx factory, builtRoots, buildScene() as a LOOP over non-persistent components, the
 * persistent-init loop (die built AFTER the first buildScene so `table:dice` exists),
 * tick() as a LOOP, the pointer dispatchers (Phase 0 consumeClick in registry order → the
 * drag/read GUARD → Phase 2 raycast nearest→far + onPick in registry order, first true
 * stops — EXACTLY today's control flow), the bar wiring, and the __GAME3D__ gate surface
 * (harness keys + the cam.* camera surfaces, then each component's gate() merged FLAT via
 * assignGate). BEHAVIOR-IDENTICAL: pins are byte-unchanged by construction (the pins hash
 * game.html/showcase.html, never touched); the flat gate spread reproduces every name.
 */
import * as THREE from 'three';
import type { EngineCore, RuleRegistry as RegistryT } from '@tabletop/engine';
import { LockstepController, RuleRegistry, rebuild } from '@tabletop/engine';
import type { SeatView } from '@tabletop/presentation';
import { emit, project } from '@tabletop/presentation';
import { BOTY_PACK6, BOTY6_REF, botyGenesis6, wireBoty } from '../../../packs/boty/src/index.js';
import { scene, camera, renderer, focusGroups, presets, SEATS, status } from './stage.js';
import * as cam from './camera.js';
import type { PlayAreaContext, PickInfo } from './component.js';
import { assignGate } from './component.js';
import { COMPONENTS } from './components/registry.js';
import { openRoundSequence } from './components/die.js';

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

// ── the engine, through the same doors as the SVG bench (I-62a); the 6-up exhibit variant (I-65e) ──
const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry() as RegistryT)(c);
const controller = LockstepController.host(BOTY6_REF, BOTY_PACK6.seats, 'maple-hollow', botyGenesis6, wire());
for (const s of SEATS) controller.join('bench-3d', s);
const viewSeat = SEATS[0]!;
const projectNow = (): SeatView => project(rebuild(controller.row(), botyGenesis6, wire()).getState(), viewSeat);
const CLIENT3D = 'bench-3d';

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

// ── the harness write path (submitVerb): the verb through the same doors (I-67f) ──
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

// ── the ctx factory: the portable seam every component touches. register centralizes the
// scene.add + builtRoots + focusGroups[anchorKey] ritual (non-persistent only). ──
function register(root: THREE.Object3D, opts: { readonly anchorKey?: string } = {}): void {
  scene.add(root);
  builtRoots.push(root);
  if (opts.anchorKey) focusGroups[opts.anchorKey] = root as THREE.Group;
}
const ctx: PlayAreaContext = {
  scene, camera, renderer,
  projection: projectNow,
  viewSeat,
  status,
  register,
  submit: submitVerb,
  rebuild: () => buildScene(),
  moves: () => controller.row().moves,
  theater: { glideTo: cam.glideTo, setLastFocus: cam.setLastFocus, focusObject: cam.focusObject, toggleRead: cam.toggleRead, getMode: cam.getMode },
};

// ── buildScene(): a LOOP over the non-persistent components (I-67g: rebuilt from a fresh
// projection on every state change) + the chrome header (I-51d) ──
function buildScene(): void {
  for (const o of builtRoots) scene.remove(o);
  builtRoots.length = 0;
  for (const c of COMPONENTS) {
    if (c.persistent) continue;
    const root = c.build(ctx);
    if (root) register(root, c.anchorKey ? { anchorKey: c.anchorKey } : {});
  }
  const v = projectNow();
  const active = v.seats[v.turn.seatIdx]!.id;
  document.getElementById('hdr')!.textContent =
    `Maple Hollow · ${SEASONS[(v.turn.round - 1) % 4]} · round ${v.turn.round} / ${BOTY_PACK6.maxRounds} · ▶ ${active}'s turn · viewing as ${viewSeat}`;
}
buildScene();

// the PERSISTENT init loop — the die is built AFTER the first buildScene so the
// `table:dice` region anchor resolves (it is NOT a table child, NOT rebuilt on state).
for (const c of COMPONENTS) if (c.persistent) c.build(ctx);

scene.add(camera); // camera children render

function endTurn(): void {
  if (!submitVerb('end-turn', {})) return;
  buildScene();
  const v = projectNow();
  status(`turn passes — ▶ ${v.seats[v.turn.seatIdx]!.id}`);
}

// ── the pointer dispatchers: in READ mode a drag PANS; a plain click Phase 0-closes any
// overlay, then (past the guard) raycasts nearest→far. EXACTLY today's control flow. ──
let dragFrom: { x: number; y: number } | null = null;
let dragMoved = false;
let grabber: (typeof COMPONENTS)[number] | null = null; // CONTRACT v2 (I-91): the grab claimant
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('pointerdown', (ev) => {
  dragFrom = { x: ev.clientX, y: ev.clientY }; dragMoved = false;
  // THE GRAB PROTOCOL (I-91): scene mode only — raycast; the first onGrabStart=true claims
  // the drag (camera pan/orbit suppressed until release). Read mode keeps its pan.
  if (cam.getMode() !== 'read') {
    const r0 = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((ev.clientX - r0.left) / r0.width) * 2 - 1, -((ev.clientY - r0.top) / r0.height) * 2 + 1), camera);
    outer: for (const hit of ray.intersectObjects(scene.children, true)) {
      const pick = computePick(hit, ev);
      for (const c of COMPONENTS) if (c.onGrabStart?.(ctx, pick)) { grabber = c; break outer; }
    }
  }
});
renderer.domElement.addEventListener('pointermove', (ev) => {
  if (!dragFrom) return;
  const dx = ev.clientX - dragFrom.x, dy = ev.clientY - dragFrom.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
  if (grabber) { grabber.onGrabMove?.(ctx, ev); return; } // the claimed drag — no camera pan
  if (cam.getMode() === 'read' && dragMoved) { cam.panBy(dx, dy); dragFrom = { x: ev.clientX, y: ev.clientY }; }
});
renderer.domElement.addEventListener('pointerup', (ev) => {
  const wasDrag = dragMoved; dragFrom = null; dragMoved = false;
  if (grabber) { // the claimed gesture releases first (I-91)
    const consumed = grabber.onGrabEnd?.(ctx, ev) ?? false;
    grabber = null;
    if (consumed) return;
  }
  // Phase 0: consumeClick in registry order (overlay closes — round modal, onion, ledger)
  for (const c of COMPONENTS) if (c.consumeClick?.(ctx, ev)) return;
  // the drag/read guard stays BETWEEN Phase 0 and the raycast
  if (wasDrag || cam.getMode() === 'read') return; // reads don't refocus on click; drags never do
  // Phase 2: raycast nearest→far; onPick in registry order, first true stops
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
  for (const hit of ray.intersectObjects(scene.children, true)) {
    const pick = computePick(hit, ev);
    for (const c of COMPONENTS) if (c.onPick?.(ctx, pick)) return;
  }
});

// PickInfo, precomputed ONCE per intersection: the merged userData up the ancestor chain
// (NEAREST WINS) + the nearest region/focus — reproducing today's while(o) walk exactly.
function computePick(hit: THREE.Intersection, ev: PointerEvent): PickInfo {
  const tags: Record<string, unknown> = {};
  let region: string | null = null;
  let o: THREE.Object3D | null = hit.object;
  while (o) {
    const ud = o.userData;
    for (const k of Object.keys(ud)) if (!(k in tags)) tags[k] = ud[k];
    if (typeof ud['region'] === 'string' && !region) region = ud['region'] as string;
    o = o.parent;
  }
  return { object: hit.object, point: hit.point, distance: hit.distance, region, focus: (tags['focus'] as string) ?? null, tags, event: ev };
}

// ── bar wiring (harness-level): presets + read-toggle + end-turn + the round sequence ──
document.getElementById('bar')!.innerHTML =
  Object.keys(presets).map((k) => `<button data-cam="${k}">${k}</button>`).join('') +
  `<button id="mode-btn" title="flat data view — overhead for the table, face-on for a board">⊞ read view</button>` +
  `<button id="end-btn" title="pass the turn (the engine's end-turn verb — I-67f)">⏭ end turn</button>` +
  `<button id="round-btn" title="the round sequence — preamble → round card (I-55a)">🎲 round</button>`;
document.getElementById('bar')!.onclick = (ev) => {
  const t = ev.target as HTMLElement;
  if (t.dataset['cam']) { cam.glideTo(t.dataset['cam']!); return; }
  if (t.id === 'mode-btn') { cam.getMode() === 'read' ? cam.sceneView() : cam.readView(); return; }
  if (t.id === 'end-btn') endTurn();
  // A4 (I-55a): open the round sequence; the lead-off callout DERIVES from the projected
  // active seat (the K7-v1x D2 law — theater never outruns truth).
  if (t.id === 'round-btn') { const v = projectNow(); openRoundSequence(v.turn.round, v.seats[v.turn.seatIdx]!.id, SEASONS[(v.turn.round - 1) % 4]!); status('round sequence — who goes first?'); }
};

// ── tick(): a LOOP — the camera glide first, each component's tick, then the render ──
function tick(): void {
  requestAnimationFrame(tick);
  cam.tickGlide();
  const now = performance.now();
  for (const c of COMPONENTS) c.tick?.(ctx, now);
  renderer.render(scene, camera);
}

// ── the gate's surfaces (VG8; I-62d): the harness keys + the cam.* camera surfaces, then
// each component's gate() merged FLAT (assignGate throws on any key collision). ──
const gate: Record<string, unknown> = {
  ready: () => renderer.getContext() !== null,
  rowHash: () => controller.stateHash(),
  moveCount: () => controller.row().moves.length,
  viewData: () => {
    const v = projectNow();
    return { seats: v.seats.map((s) => ({ id: s.id, cash: s.cash })), round: v.turn.round, active: v.seats[v.turn.seatIdx]!.id };
  },
  glideTo: cam.glideTo,
  gliding: cam.gliding,
  cameraPos: cam.cameraPos,
  presetData: cam.presetData,
  camName: cam.camName,
  readState: cam.readState,
  toggleRead: cam.toggleRead,
  cornersNdc: cam.cornersNdc,
  quat: cam.quat,
  lookAtPoint: cam.lookAtPoint,
  focusBoxCenter: cam.focusBoxCenter,
  ndcOf: cam.ndcOf,
  lookInsideFocusBox: cam.lookInsideFocusBox,
  panProbe: cam.panProbe,
  zoomState: cam.zoomState,
};
for (const c of COMPONENTS) assignGate(gate, c.gate());
(window as unknown as Record<string, unknown>)['__GAME3D__'] = gate;

tick();
status('the stage is set — glide with the presets, dolly with the wheel, click a board to focus it');
