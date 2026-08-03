/**
 * GAME3D — ROADMAP A1/A2: THE STAGE + DECK & DRAW (I-62..I-67). The playable 3D
 * shell: the ENGINE-BOUND table (projection-fed fills, stamped at draw), COUNT-TRUE
 * card stacks (the geometry IS the count, I-67a), the READING BOARD onion (I-67b),
 * the draw verb under HK-11 theater (I-67c), pure-theater fidgets (I-67e), and the
 * GLIDING camera on the ladder law. Unskinned (D-1). The spike stays frozen.
 *
 * SPLIT (pure refactor, behavior-identical): the stage primitives → stage.ts; the pure
 * mesh/texture builders → surfaces.ts; the count-true stacks + fidget LCG → stacks.ts;
 * the camera ladder + read view + pose → camera.ts; the reading board → onion.ts. This
 * file keeps the engine binding, the scene build, the draw theater, the interaction
 * handlers, tick(), and the __GAME3D__ gate surface.
 */
import * as THREE from 'three';
import type { EngineCore, RuleRegistry as RegistryT } from '@tabletop/engine';
import { LockstepController, RuleRegistry, rebuild } from '@tabletop/engine';
import type { SeatView } from '@tabletop/presentation';
import { beginFlourish, completeFlourish, emit, project } from '@tabletop/presentation';
import { BOTY_PACK6, BOTY6_REF, botyGenesis6, wireBoty, SHOP_BOARD, TOWN_TABLE } from '../../../packs/boty/src/index.js';
import { scene, camera, renderer, focusGroups, presets, SEATS, status } from './stage.js';
import { layoutFace, panel, fortuneFaceTexture } from './surfaces.js';
import { cardBack, cardStack } from './stacks.js';
import * as cam from './camera.js';
import * as onion from './onion.js';

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

// ── the engine, through the same doors as the SVG bench (I-62a); the 6-up exhibit variant (I-65e) ──
const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry() as RegistryT)(c);
const controller = LockstepController.host(BOTY6_REF, BOTY_PACK6.seats, 'maple-hollow', botyGenesis6, wire());
for (const s of SEATS) controller.join('bench-3d', s);
const viewSeat = SEATS[0]!;
const projectNow = (): SeatView => project(rebuild(controller.row(), botyGenesis6, wire()).getState(), viewSeat);

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

// ── FIDGET (I-67e): PURE THEATER — seeded offsets, meshes only, never state ──
const fidget: Record<string, number> = { deck: 0, discard: 0 };

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
  table.add(cardStack(deckR, 'deck', v.decks[active]?.drawCount ?? 0, null, fidget['deck']));
  table.add(cardStack(discR, 'discard', v.ownDiscard.length, v.ownDiscard, fidget['discard'])); // the VIEWER'S discard — redaction-honest (I-67a)
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

scene.add(camera); // camera children render

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
  if (drawPhase !== 'idle') { status('the draw is already in the air — one theater at a time (I-67c)'); return; } // K7-A2 D1
  const before = projectNow();
  const active = before.seats[before.turn.seatIdx]!.id;
  if (!submitVerb('draw', { deck: active })) return;
  const after = projectNow();
  const seeded = after.decks[active]?.discardTop ?? '(none)';
  const inst = beginFlourish('card-flip', seeded, '♪ card flip');
  const deckObj = cam.focusObject('table:deck');
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
let dragFrom: { x: number; y: number } | null = null;
let dragMoved = false;
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('pointerdown', (ev) => { dragFrom = { x: ev.clientX, y: ev.clientY }; dragMoved = false; });
renderer.domElement.addEventListener('pointermove', (ev) => {
  if (!dragFrom) return;
  const dx = ev.clientX - dragFrom.x, dy = ev.clientY - dragFrom.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
  if (cam.getMode() === 'read' && dragMoved) { cam.panBy(dx, dy); dragFrom = { x: ev.clientX, y: ev.clientY }; }
});
renderer.domElement.addEventListener('pointerup', (ev) => {
  const wasDrag = dragMoved; dragFrom = null; dragMoved = false;
  if (onion.onionState().open) { onion.closeOnion(); drawPhase = 'idle'; status('reading board closed'); return; } // I-67b: ANY click closes; consumed
  if (wasDrag || cam.getMode() === 'read') return; // reads don't refocus on click; drags never do
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), camera);
  for (const hit of ray.intersectObjects(scene.children, true)) {
    let o: THREE.Object3D | null = hit.object;
    let region: string | null = null;
    while (o) {
      if (typeof o.userData['region'] === 'string' && !region) region = o.userData['region'] as string;
      if (typeof o.userData['seatIdx'] === 'number') { cam.glideTo(`seat-${o.userData['seatIdx']}`); return; }
      if (o.userData['focus'] === 'table') {
        cam.glideTo('table');
        // a TABLE REGION click anchors that region (I-66d): zoom-in reads THAT section
        if (region) { cam.setLastFocus(`table:${region}`); status(`anchored: ${region} — zoom in for its read view`); }
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
  if (t.dataset['cam']) { cam.glideTo(t.dataset['cam']!); return; }
  if (t.id === 'mode-btn') { cam.getMode() === 'read' ? cam.sceneView() : cam.readView(); return; }
  if (t.id === 'end-btn') endTurn();
};

function tick(): void {
  requestAnimationFrame(tick);
  cam.tickGlide();
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
      (flight.mesh.material as THREE.Material).dispose();
      // A3 (I-69): the flip reveals a FORTUNE face, not bare text; `displayed` may be the
      // drill's lie — the flying card shows it, the reading board then shows the truth.
      flight.mesh.material = new THREE.MeshBasicMaterial({ map: fortuneFaceTexture(displayed) });
    }
    if (pT >= 1) {
      const displayed = forceMismatch ? 'WRONG-CARD' : flight.seeded;
      const verdict = completeFlourish(flight.inst, displayed); // HK-11 — truth wins (R-20)
      onion.setOnionVerdict({ mismatch: verdict.mismatch !== null, displayed, seeded: flight.seeded });
      // A3 (I-69): the reading board opens on the fortune anatomy of the TRUTH-WINS card
      // (verdict.result is the seeded id even when displayed lied — R-20).
      onion.openOnion(verdict.result, verdict.mismatch !== null);
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
  glideTo: cam.glideTo,
  gliding: cam.gliding,
  cameraPos: cam.cameraPos,
  presetData: cam.presetData,
  camName: cam.camName,
  readState: cam.readState,
  toggleRead: cam.toggleRead,
  /** the current read object's bbox corners in NDC — VG8f's no-crop property surface */
  cornersNdc: cam.cornersNdc,
  quat: cam.quat,
  lookAtPoint: cam.lookAtPoint,
  /** the current read object's bbox center — K7-A1b D2's centering surface */
  focusBoxCenter: cam.focusBoxCenter,
  /** an arbitrary world point in NDC — K7-A1b D2's orientation/centering probe */
  ndcOf: cam.ndcOf,
  lookInsideFocusBox: cam.lookInsideFocusBox,
  panProbe: cam.panProbe,
  /** I-66's ladder surfaces: where the wheel stands on the ladder */
  zoomState: cam.zoomState,
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
  onionState: onion.onionState,
  /** A3/I-69: the reading-board fortune card's RENDERED anatomy — per-region rendered
   *  height (art-dominance is a rendered property, I-57a, not a def claim), the front/back
   *  presence (the spike-proven `card()`), and the title/subtitle/text fills (mirroring the
   *  certified SVG bench). Null when the board is closed. */
  onionRegions: onion.onionRegions,
  forceFlipMismatch: (v: boolean) => { forceMismatch = v; },
  stackInfo: (rid: string) => {
    const grp = cam.focusObject(`table:${rid}`);
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
    const o = cam.focusObject(`table:${rid}`);
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
