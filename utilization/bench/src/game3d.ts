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
import { BOTY_PACK6, BOTY6_REF, botyGenesis6, wireBoty, genesisDrawFor, botyJob, CARD_SET_6 } from '../../../packs/boty/src/index.js';
import { createCardWorld, cardWorldInfo } from './card-world.js'; // C-1a (I-149): the permanence world
import { gridSpacing, ringSnap, anchorsWithinRadius } from './anchor-grid.js'; // G-A (I-158/I-159)
import { scene, camera, renderer, focusGroups, presets, SEATS, status, SEAT_YAWS, RING_N } from './stage.js';
import { ringRadius, stationLook, stationPos } from './playarea.js'; // PA-1/PA-2 (I-141/I-142)
import { seatReadEquality } from './camera.js'; // F-8 (I-167)
import { UI_OBJECTS, chainIntegrity, kingdomIntegrity } from './ui-object.js'; // G-C (I-168)
import * as cam from './camera.js';
import type { PlayAreaContext, PickInfo } from './component.js';
import { assignGate } from './component.js';
import { COMPONENTS } from './components/registry.js';
import { openRoundSequence } from './components/die.js';
import { manifestBackdrop } from './backdrop.js'; // S-1c (I-107): the verbatim size-gate extraction

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

// ── the engine, through the same doors as the SVG bench (I-62a); the 6-up exhibit variant (I-65e) ──
const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry() as RegistryT, BOTY_PACK6 as never)(c); // W-1 (I-121): the WIRED catalog ≡ the HOSTED pack — all 36 cards drawable (B1 closed)
const controller = LockstepController.host(BOTY6_REF, BOTY_PACK6.seats, 'maple-hollow', botyGenesis6, wire());
for (const s of SEATS) controller.join('bench-3d', s);
const viewSeat = SEATS[0]!;
const projectNow = (): SeatView => project(rebuild(controller.row(), botyGenesis6, wire()).getState(), viewSeat);
const CLIENT3D = 'bench-3d';

const builtRoots: THREE.Object3D[] = [];

// CONTRACT v3 (S-1, I-103) claim state — declared ABOVE buildScene (which aborts claims
// and runs at module init). The single `grabber` became a PER-POINTER claim map: the
// exact single-gesture-lock defect class I-95 fixed one layer down, now fixed in the
// spine, once, before R-1 rides it (touch is an owner requirement, I-82/A17).
const claims = new Map<number, (typeof COMPONENTS)[number]>();
let releasing: number | null = null; // the pointer whose onGrabEnd is executing (buildScene skips it)
let forceGrabThrow = false; // the VG8q release-on-throw drill (the forceFlipMismatch precedent)
let forceMoveThrow = false; // S-1c (I-107): the VG8q move-throw drill — K7-S MAJOR-1's kill
const grabActive = (): boolean => claims.size > 0; // the camera wheel gates on this

manifestBackdrop(); // the owner-ruled backdrop (I-67h) — the function lives in backdrop.ts (S-1c)

// C-1a (I-149): THE CARD WORLD — every physical card created ONCE, here, at genesis
// ('nothing is created or destroyed'); every later state change MOVES instances.
createCardWorld([
  ...CARD_SET_6.seats.flatMap((seat) => CARD_SET_6.eventPerSeat.map((id) => ({ id: `${seat}::${id}`, cls: 'event' as const }))),
  ...CARD_SET_6.tradespeople.map((id) => ({ id, cls: 'tradesperson' as const })),
  ...CARD_SET_6.genesisCrew.map((id) => ({ id, cls: 'tradesperson' as const })),
  ...CARD_SET_6.equipment.map((id) => ({ id, cls: 'equipment' as const })),
  ...CARD_SET_6.bbb.map((id) => ({ id, cls: 'bbb' as const })),
  ...CARD_SET_6.networking.map((id) => ({ id, cls: 'networking' as const })),
]);

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
  // CONTRACT v3 (S-1, I-103): a rebuild ABORTS every live claim EXCEPT the one whose
  // onGrabEnd is executing right now (a completing flick rebuilds mid-release by design —
  // aborting it would kill its own flip theater; VG8j proves the skip).
  for (const [pid, c] of claims) {
    if (pid === releasing) continue;
    try { c.onGrabAbort?.(ctx); } catch { /* the fresh build renders truth regardless */ }
    claims.delete(pid);
  }
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
cam.setWheelGate(grabActive); // S-1 (I-103): a live claim suppresses the zoom ladder

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
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('pointerdown', (ev) => {
  dragFrom = { x: ev.clientX, y: ev.clientY }; dragMoved = false;
  // THE GRAB PROTOCOL (I-91, v3 at I-103): scene mode only — raycast; the first
  // onGrabStart=true claims THIS POINTER (camera suppressed until its release); the
  // pointer is CAPTURED so the release always comes home. Read mode keeps its pan.
  if (cam.getMode() !== 'read' && !claims.has(ev.pointerId)) {
    const r0 = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((ev.clientX - r0.left) / r0.width) * 2 - 1, -((ev.clientY - r0.top) / r0.height) * 2 + 1), camera);
    outer: for (const hit of ray.intersectObjects(scene.children, true)) {
      const pick = computePick(hit, ev);
      for (const c of COMPONENTS) if (c.onGrabStart?.(ctx, pick)) {
        claims.set(ev.pointerId, c);
        try { renderer.domElement.setPointerCapture(ev.pointerId); } catch { /* synthetic pointers have no capture */ }
        break outer;
      }
    }
  }
});
renderer.domElement.addEventListener('pointermove', (ev) => {
  const claimant = claims.get(ev.pointerId);
  if (claimant) { // the claimed drag — no camera pan; a THROW aborts AND releases (S-1c
    // closes K7-S MAJOR-1: the move path now mirrors the release path — before this,
    // a throwing onGrabMove released the claim but stranded the component permanently,
    // and resetDraw's deliberate 'grabbing' skip meant not even a rebuild recovered it).
    try {
      if (forceMoveThrow) { forceMoveThrow = false; throw new Error('VG8q drill: forced onGrabMove throw'); }
      claimant.onGrabMove?.(ctx, ev);
    } catch (e) {
      try { claimant.onGrabAbort?.(ctx); } catch { /* truth renders on the next build */ }
      claims.delete(ev.pointerId);
      throw e;
    }
    return;
  }
  if (!dragFrom) return;
  const dx = ev.clientX - dragFrom.x, dy = ev.clientY - dragFrom.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
  if (cam.getMode() === 'read' && dragMoved) { cam.panBy(dx, dy); dragFrom = { x: ev.clientX, y: ev.clientY }; }
});
// CONTRACT v3 (S-1, I-103): touch cancels CONSTANTLY — a cancelled claim ABORTS
// gracefully (the component settles its gesture home) and always releases.
renderer.domElement.addEventListener('pointercancel', (ev) => {
  const claimant = claims.get(ev.pointerId);
  if (claimant) {
    try { claimant.onGrabAbort?.(ctx); } finally { claims.delete(ev.pointerId); }
  }
  dragFrom = null; dragMoved = false;
});
renderer.domElement.addEventListener('pointerup', (ev) => {
  const wasDrag = dragMoved; dragFrom = null; dragMoved = false;
  const claimant = claims.get(ev.pointerId);
  if (claimant) { // the claimed gesture releases first (I-91)
    let consumed = false;
    const prev = releasing; // S-1c (K7-S MINOR-5): save/restore — a nested synthetic
    // release can no longer null out an outer release's rebuild-skip mid-flight.
    try {
      releasing = ev.pointerId;
      if (forceGrabThrow) { forceGrabThrow = false; throw new Error('VG8q drill: forced onGrabEnd throw'); }
      consumed = claimant.onGrabEnd?.(ctx, ev) ?? false;
    } catch (e) {
      // v3 (M3): a throwing release ABORTS the component and rethrows — the claim NEVER
      // sticks, input and camera stay alive (the K7-Q permanent-freeze finding).
      try { claimant.onGrabAbort?.(ctx); } catch { /* truth renders on the next build */ }
      throw e;
    } finally {
      releasing = prev;
      claims.delete(ev.pointerId); // the claim ALWAYS releases (the finally IS the law)
    }
    if (consumed) return;
  }
  // Phase 0: consumeClick in registry order (overlay closes — round modal, onion, ledger)
  for (const c of COMPONENTS) if (c.consumeClick?.(ctx, ev)) return;
  // I-220 (the owner's read law: 'click to zoom out once and you leave read mode') —
  // a plain click in read mode is THE EXIT STEP, consumed here before any re-anchor.
  if (!wasDrag && cam.getMode() === 'read') { cam.exitReadStep(); return; } // a drag-end is not the exit click
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
  // I-217 (owner-ordered, explicit): SIX dedicated PLAY-AREA buttons — one per seat,
  // each its own chrome ('buttons for each PLAY AREA for each seat'); the seat-N
  // buttons return to the boards; the 'board' button removed as ordered.
  [0, 1, 2, 3, 4, 5].map((i) => `<button data-scenic="seat-area-${i}" title="seat ${i}'s play area — maximized, 35° to center">area ${i}</button>`).join('') +
  `<button data-scenic="box" title="the game box, by the scenic law">📦 box</button>` +
  `<button id="mode-btn" title="flat data view — overhead for the table, face-on for a board">⊞ read view</button>` +
  `<button id="end-btn" title="pass the turn (the engine's end-turn verb — I-67f)">⏭ end turn</button>` +
  `<button id="round-btn" title="the round sequence — preamble → round card (I-55a)">🎲 round</button>` +
  ``; // I-215: the spawn button DELETED (owner: 'nonsense') — the gate drives spawnJob via __GAME3D__ (the drill door survives, the chrome does not)
document.getElementById('bar')!.onclick = (ev) => {
  const t = ev.target as HTMLElement;
  if (t.dataset['cam']) { cam.glideTo(t.dataset['cam']!); return; }
  if (t.dataset['scenic']) { cam.scenicView(t.dataset['scenic']); return; } // I-214/I-215
  if (t.dataset['cam'] === 'table') { cam.scenicView('table'); return; } // I-215: the fixed center by the same law
  if (t.id === 'mode-btn') { cam.getMode() === 'read' ? cam.sceneView() : cam.readView(); return; }
  if (t.id === 'end-btn') endTurn();
  // A6 (I-136): the SPAWN DOOR — the SVG bench's exhibit chrome (#spawn-job) in 3D; a
  // REAL verb through the same doors, then the rebuild renders the venture + its slots.

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
  // P-3 (I-131): the per-seat SEEDED deck order — gates derive their card pins FROM the
  // implementation (the vector discipline), never hand-write them.
  deckOrder: (seat: string) => genesisDrawFor('maple-hollow', seat), // O-4 (I-138): the GENESIS draw (in-play pair excluded)
  // I-133: the single yaw truth as DATA — VG8c re-derives the preset law from it.
  seatYawData: (i: number) => SEAT_YAWS[i] ?? null,
  // A6 (I-136): the public crew surface — VG8s waits on assignedTo STATE, never clocks.
  viewCrew: () => projectNow().crew,
  // A16 (I-137): the pools' counts — the arrangement + hire/buy legs derive from these.
  poolCounts: () => projectNow().pools,
  // C-1a (I-149): the CONSERVATION oracle — instances constant, recreates 0, forever.
  cardWorldInfo,
  gridInfo: () => ({ spacing: gridSpacing(), seatRing: ringSnap(ringRadius(RING_N)), anchorsInTableDisc: anchorsWithinRadius(570).length }), // G-A: the grid's public face
  seatReadEquality: () => seatReadEquality(6), // F-8 (I-167): dist + framed bbox per seat
  spawnJob: () => { const ok2 = submitVerb('spawn-venture', { spec: botyJob() }); if (ok2) buildScene(); return ok2; }, // I-215: the drill door (the chrome button is gone)
  uiObjectsInfo: () => ({ count: UI_OBJECTS.length, ids: UI_OBJECTS.map((o) => o.id), chain: chainIntegrity(), kingdoms: kingdomIntegrity() }), // G-C (I-168): the ontology's public face
  // PA-1 (I-141): the ring template's surfaces — the seat-pose and glide laws derive.
  ringInfo: () => ({ r: ringRadius(RING_N), n: RING_N }),
  ringLook: (i: number) => stationLook(i, RING_N),
  ringSlot: (i: number) => stationPos(i, RING_N), // PA-2 (I-142): any occupant's slot

  viewData: () => {
    const v = projectNow();
    return { seats: v.seats.map((s) => ({ id: s.id, cash: s.cash, crew: v.crew.filter((m) => m.outfit === s.id).length, hand: s.handCount })), round: v.turn.round, active: v.seats[v.turn.seatIdx]!.id }; // I-183: the summary's derivation, shared with the gates
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
  // S-1 (I-103) contract-v3 surfaces: the live claim count + the throw drills
  grabClaims: () => claims.size,
  forceGrabEndThrow: () => { forceGrabThrow = true; },
  forceGrabMoveThrow: () => { forceMoveThrow = true; }, // S-1c (I-107): MAJOR-1's kill
};
for (const c of COMPONENTS) assignGate(gate, c.gate());
(window as unknown as Record<string, unknown>)['__GAME3D__'] = gate;

tick();
status('the stage is set — glide with the presets, dolly with the wheel, click a board to focus it');
