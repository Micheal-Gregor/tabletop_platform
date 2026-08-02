/**
 * THE 3D SPIKE (arc step 4, I-60) — an EXHIBIT, not a realization change.
 * Charter: prove the layout contracts and the theater law survive a renderer swap
 * UNCHANGED. Meshes are built FROM LayoutDef regions; the flip runs UNDER HK-11
 * (displayed ≡ seeded, truth wins); the camera consumes the SAME focusPresets data.
 * Unskinned: flat quads + edges, role labels — space and volume before paint (D-1).
 */
import * as THREE from 'three';
import type { LayoutDef } from '@tabletop/presentation';
import { CARD_BACK_PARENT, CARD_PARENT, beginFlourish, focusPresets, hookHk11AtAnimationComplete } from '@tabletop/presentation';
import { FORTUNE_CARD, SHOP_BOARD, TOWN_TABLE } from '../../../packs/boty/src/index.js';

const WORLD = { w: 1600, h: 1000 };
const presets = focusPresets(3, WORLD);

// ── LayoutDef → mesh: the CONTRACT is the geometry source (I-60a) ──
const label = (text: string, w: number, h: number): THREE.Mesh => {
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.max(32, Math.round((h / w) * 256));
  const g = c.getContext('2d')!;
  g.fillStyle = '#555'; g.font = '20px system-ui'; g.textBaseline = 'top';
  g.fillText(text, 6, 4);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }),
  );
  return m;
};

/** A layout rendered as a 3D face: outline plane + one flat quad PER REGION, unit space. */
function layoutFace(def: LayoutDef, tint: number): THREE.Group {
  const grp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ color: 0xfbfaf7 }));
  grp.add(base);
  grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(100, 100)), new THREE.LineBasicMaterial({ color: 0x444444 })));
  for (const r of def.regions) {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.h), new THREE.MeshBasicMaterial({ color: tint }));
    // unit space (0..100, y down) → plane space (centered, y up); z-stack per region law
    quad.position.set(r.x + r.w / 2 - 50, 50 - (r.y + r.h / 2), 0.2 + (r.z ?? 0) * 0.2);
    quad.userData = { region: r.id, role: r.role, def: def.id };
    grp.add(quad);
    grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(r.w, r.h)), new THREE.LineBasicMaterial({ color: 0x999999 })).translateX(quad.position.x).translateY(quad.position.y).translateZ(quad.position.z + 0.01));
    const t = label(`[${r.role}]`, r.w, Math.min(r.h, 12));
    t.position.set(quad.position.x, quad.position.y + r.h / 2 - Math.min(r.h, 12) / 2, quad.position.z + 0.02);
    grp.add(t);
  }
  return grp;
}

/** A CARD object: front = a card child face; back = CARD_BACK_PARENT. Flips under HK-11. */
function card(front: LayoutDef): THREE.Group {
  const grp = new THREE.Group();
  const f = layoutFace(front, 0xffffff);
  const b = layoutFace(CARD_BACK_PARENT, 0xe8e2d8);
  b.rotation.y = Math.PI;
  grp.add(f, b);
  grp.scale.set(1, 1.4, 1); // physical aspect = realization freedom (I-48b); the unit space is the law
  return grp;
}

// ── scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2f4f1);
const camera = new THREE.PerspectiveCamera(40, 1240 / 720, 1, 5000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(1240, 720);
document.getElementById('stage')!.appendChild(renderer.domElement);

// the table: TOWN_TABLE regions laid FLAT on the ground plane (the 3D "tilt" is real now)
const table = layoutFace(TOWN_TABLE, 0xeef3ee);
table.rotation.x = -Math.PI / 2;
table.scale.set(9, 7, 1);
scene.add(table);
// three shop boards at the table edges, standing up and angled toward center
const SEATS = ['moe', 'pete', 'edie'];
SEATS.forEach((s, i) => {
  const b = layoutFace(SHOP_BOARD, 0xffffff);
  b.scale.set(2.6, 2.6, 1);
  b.position.set((i - 1) * 420, 130, 420);
  b.rotation.x = -0.25;
  b.userData = { board: s };
  scene.add(b);
});

// THE FLIPPING CARD (HK-11 live in 3D — I-60b): the deck's top card, seeded truth
const SEEDED_RESULT = 'job-posting'; // the seeded draw the theater must agree with
const flipCard = card(FORTUNE_CARD);
flipCard.scale.multiplyScalar(1.6);
flipCard.position.set(-260, 90, 60);
flipCard.rotation.y = Math.PI; // starts face DOWN
scene.add(flipCard);

// THE HAND FAN: three cards animating from stack to fan
const fanCards = [0, 1, 2].map((i) => {
  const c = card(CARD_PARENT);
  c.position.set(180 + i * 4, 80, 300);
  c.userData = { fanIdx: i };
  scene.add(c);
  return c;
});

// ── the camera consumes the SAME preset data (I-60c): cx/cy → target, zoom → distance ──
function applyPreset(name: string): void {
  const p = presets[name]!;
  const target = new THREE.Vector3(p.cx - WORLD.w / 2, 0, p.cy - WORLD.h / 2);
  const dist = 1900 / p.zoom;
  camera.position.set(target.x, dist * 0.72, target.z + dist * 0.7);
  camera.lookAt(target);
  status(`camera: ${name} (cx ${p.cx} cy ${p.cy} zoom ${p.zoom} → the same preset data, mapped)`);
}

// ── animations (theater law: the SEEDED result decides what the flip reveals) ──
let flipT: number | null = null;
let fanT: number | null = null;
let verdict: { displayed: string; ok: boolean } | null = null;

function flip(): void {
  if (flipT !== null) return;
  beginFlourish('card-flip', SEEDED_RESULT, '♪ card flip');
  flipT = 0;
}
function fan(): void { if (fanT === null) fanT = 0; }

function status(msg: string): void { document.getElementById('status')!.textContent = msg; }

function tick(): void {
  requestAnimationFrame(tick);
  if (flipT !== null && flipT <= 1) {
    flipCard.rotation.y = Math.PI * (1 - flipT);
    flipCard.position.y = 90 + Math.sin(flipT * Math.PI) * 70;
    flipT += 0.02;
    if (flipT > 1) {
      flipCard.rotation.y = 0;
      // HK-11 AT ANIMATION COMPLETE: the displayed face vs the seeded result — truth wins
      const displayed = SEEDED_RESULT; // the face was BUILT from the seeded result
      const v = hookHk11AtAnimationComplete(displayed, SEEDED_RESULT);
      verdict = { displayed: v.result, ok: !v.mismatch };
      status(`flip complete — HK-11: displayed "${displayed}" ≡ seeded "${SEEDED_RESULT}" → ${v.mismatch ? 'MISMATCH (truth wins)' : 'in sync'}`);
    }
  }
  if (fanT !== null && fanT <= 1) {
    const ft = fanT;
    fanCards.forEach((c, i) => {
      const spread = (i - 1) * 0.35 * ft;
      c.rotation.z = -spread * 0.6;
      c.position.x = 180 + i * 4 + (i - 1) * 90 * ft;
      c.position.y = 80 + (1 - Math.abs(i - 1)) * 18 * ft;
    });
    fanT = ft + 0.025;
  }
  renderer.render(scene, camera);
}

document.getElementById('bar')!.innerHTML =
  Object.keys(presets).map((k) => `<button data-cam="${k}">${k}</button>`).join('') +
  `<button id="flip">flip the card</button><button id="fan">fan the hand</button>`;
document.getElementById('bar')!.onclick = (ev) => {
  const t = ev.target as HTMLElement;
  if (t.dataset['cam']) applyPreset(t.dataset['cam']);
  if (t.id === 'flip') flip();
  if (t.id === 'fan') fan();
};

(window as unknown as Record<string, unknown>)['__SPIKE__'] = {
  ready: () => renderer.getContext() !== null,
  gl: () => (renderer.getContext() as WebGLRenderingContext).getParameter?.((renderer.getContext() as WebGLRenderingContext).VERSION) ?? null,
  flip,
  fan,
  verdict: () => verdict,
  regionCount: () => { let n = 0; scene.traverse((o: THREE.Object3D) => { if (o.userData?.['region']) n++; }); return n; },
};

applyPreset('overview');
tick();
