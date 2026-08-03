/**
 * LEDGER-SPREAD — the OPEN two-page book spread (K-C, I-79; SUPERSEDES the batch-1
 * single-panel overlay of I-74). When the closed book flips open it becomes a two-page
 * spread standing in the scene: the P&L on the LEFT page, the Balance Sheet on the RIGHT
 * page — both SCENE-PLACED and FOCUSABLE (each page registered in focusGroups so the
 * camera read-ladder can target it), NOT a camera-parented overlay. Zooming in enters
 * READ mode of the SELECTED report (P&L is the default); a LEFT/RIGHT pan gesture in read
 * mode switches the read focus to the OTHER report's page — the SAME camera read/pan
 * discipline every other object reuses, via camera.ts (readView/readState/…). Every
 * transition — the closed→spread OPEN, the zoom-to-read, and the left/right SWITCH — is a
 * SMOOTH animation (per-frame lerp / the camera glide; waits on STATE, never clocks —
 * I-60f). Each page is OPAQUE (opacity 1, depth-writing) so it is not see-through (the
 * I-70 discipline; with no veil in the scene-placed design the plain-opaque page IS the
 * honest not-see-through page). This module owns the pages' geometry, the open animation,
 * and the read/switch; ledger.ts orchestrates (computes the fills) and re-exports.
 */
import * as THREE from 'three';
import { scene, focusGroups } from './stage.js';
import { readView, readState, gliding, getMode, setLastFocus, sceneView, lookAtPoint } from './camera.js';
import { layoutFace } from './surfaces.js';
import { BOOKS_PANEL } from '../../../packs/boty/src/index.js';

export type PageKind = 'pnl' | 'balance';
type Fills = Readonly<Record<string, readonly string[]>>;

// ── the spread's geometry constants ──
const SCALE = 2.4; // the 0..100 layoutFace units → world (a readable page)
const GAP = 160; // each page's x-offset from the spread anchor at full-open (centres 2·GAP apart)
const SWITCH_T = 70; // the pan-toward-the-other-page threshold (< the page half-width clamp, so reachable)

// ── module state (null when the book is CLOSED) ──
let anchor = new THREE.Vector3();
let pnlPage: THREE.Group | null = null;
let balPage: THREE.Group | null = null;
let faces: Record<PageKind, THREE.Group | null> = { pnl: null, balance: null };
let open = false;
let openAmt = 0; // 0 = closed (pages overlap at the anchor) → 1 = fully spread (the OPEN animation)
let selected: PageKind = 'pnl'; // the report zoom-to-read enters (P&L default; a switch moves it)

const focusId = (k: PageKind): string => `ledger-${k}`;

// ── one PAGE = the measured BOOKS_PANEL as a face (I-56) + an OPAQUE backing sheet, so the
// page renders a solid, not-see-through sheet (the I-70 discipline; no veil to sort over in
// the scene-placed design). Registered in focusGroups so the read-ladder can target it. ──
function buildPage(k: PageKind, fills: Fills): THREE.Group {
  const page = new THREE.Group();
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(112, 112),
    new THREE.MeshBasicMaterial({ color: 0xf3ecda, transparent: false }), // opaque page stock (depth-writing → occludes the table)
  );
  back.position.z = -0.5;
  page.add(back);
  const face = layoutFace(BOOKS_PANEL, 0xffffff, fills); // regions from the def only (I-60a)
  page.add(face);
  faces[k] = face;
  page.userData['ledgerPage'] = k;
  page.userData['focus'] = focusId(k);
  focusGroups[focusId(k)] = page; // FOCUSABLE — the camera read-ladder targets each page
  scene.add(page);
  return page;
}

/** the smooth OPEN pose (lerped by openAmt): the pages swing apart from the anchor (closed,
 *  overlapping) to ±GAP (spread) and ease up to full scale — the closed→spread animation. */
function applyOpenPose(amt: number): void {
  if (!pnlPage || !balPage) return;
  const s = SCALE * (0.7 + 0.3 * amt);
  pnlPage.scale.setScalar(s);
  balPage.scale.setScalar(s);
  pnlPage.position.set(anchor.x - GAP * amt, anchor.y, anchor.z); // LEFT page (world-x < right)
  balPage.position.set(anchor.x + GAP * amt, anchor.y, anchor.z); // RIGHT page
}

/** OPEN the spread at the anchor (front of the viewing seat's board): build both pages, start
 *  the open animation, and select the P&L (left) as the default read report. */
export function openSpread(pnlFills: Fills, balanceFills: Fills, at: THREE.Vector3): void {
  closeSpread();
  anchor = at.clone();
  pnlPage = buildPage('pnl', pnlFills);
  balPage = buildPage('balance', balanceFills);
  open = true;
  openAmt = 0;
  selected = 'pnl';
  applyOpenPose(openAmt);
  setLastFocus(focusId('pnl')); // zoom-in enters the SELECTED (P&L) page's read view
}

/** CLOSE: remove the pages, drop their focus registrations, and leave read mode (the pages
 *  can no longer be a read target). Any anchor is reset so a later zoom does not chase a dead page. */
export function closeSpread(): void {
  if (getMode() === 'read' && readState().focus.startsWith('ledger-')) sceneView(); // leave the (now-gone) page
  for (const k of ['pnl', 'balance'] as const) {
    const p = k === 'pnl' ? pnlPage : balPage;
    if (p) scene.remove(p);
    delete focusGroups[focusId(k)];
    faces[k] = null;
  }
  pnlPage = balPage = null;
  open = false;
  openAmt = 0;
  setLastFocus('table');
}

/** enter READ mode of the SELECTED report's page — the zoom-to-read fit-to-frame (the
 *  "stuck zoomed" fix: readView fits ALL bbox corners inside the frustum). */
export function readSelected(): void {
  if (!open) return;
  setLastFocus(focusId(selected));
  readView(focusId(selected));
}

// ── the per-frame step: advance the OPEN animation, then detect a LEFT/RIGHT pan gesture in
// read mode and glide the read focus to the OTHER page (a smooth switch). ──
export function tickSpread(): void {
  if (!open) return;
  if (openAmt < 1) {
    openAmt = Math.min(1, openAmt + (1 - openAmt) * 0.16 + 0.02); // ease-out to settle (~15 frames)
    applyOpenPose(openAmt);
  }
  // the SWITCH: only when settled AND at rest (gliding() guards against mid-glide oscillation —
  // after a switch the look glides to the new page centre, so the offset falls back under T).
  if (openAmt < 1 || getMode() !== 'read' || gliding()) return;
  const rs = readState();
  const lookX = lookAtPoint().x;
  if (rs.focus === focusId('pnl') && pnlPage && lookX > pnlPage.position.x + SWITCH_T) {
    selected = 'balance'; setLastFocus(focusId('balance')); readView(focusId('balance')); // pan RIGHT → Balance
  } else if (rs.focus === focusId('balance') && balPage && lookX < balPage.position.x - SWITCH_T) {
    selected = 'pnl'; setLastFocus(focusId('pnl')); readView(focusId('pnl')); // pan LEFT → P&L
  }
}

// ── the __GAME3D__ gate surfaces (VG8n; STATE/geometry, never pixels — I-57c) ──
export const spreadOpen = (): boolean => open;
export const spreadSettled = (): boolean => open && openAmt >= 0.999;
export const selectedReport = (): PageKind => selected;

/** the two pages: id · kind · world-x (the gate asserts LEFT P&L world-x < RIGHT Balance) ·
 *  focusable (registered so the camera read-ladder can target it). */
export const spreadPages = (): { id: string; kind: PageKind; worldX: number; focusable: boolean }[] => {
  const out: { id: string; kind: PageKind; worldX: number; focusable: boolean }[] = [];
  for (const k of ['pnl', 'balance'] as const) {
    const p = k === 'pnl' ? pnlPage : balPage;
    if (!p) continue;
    const x = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3()).x;
    out.push({ id: focusId(k), kind: k, worldX: x, focusable: focusGroups[focusId(k)] !== undefined });
  }
  return out;
};

/** a page's rendered stamped rows, keyed by region id (the "renders real content, not blank"
 *  oracle — every region's renderedLines from the layoutFace stamp). Null when closed. */
export const pageContent = (k: PageKind): Record<string, readonly string[]> | null => {
  const face = faces[k];
  if (!face) return null;
  const rows: Record<string, readonly string[]> = {};
  face.traverse((o: THREE.Object3D) => {
    const rid = o.userData?.['region'];
    const lines = o.userData?.['renderedLines'];
    if (typeof rid === 'string' && Array.isArray(lines)) rows[rid] = lines as readonly string[];
  });
  return rows;
};

/** the OPAQUE state across BOTH pages (I-70 equivalent): min opacity 1 AND every face in the
 *  opaque pass (transparent === false) — the page is not see-through. Null when closed. */
export const spreadOpaque = (): { opaque: boolean; minOpacity: number; opaquePass: boolean } | null => {
  if (!open) return null;
  let minOpacity = 1;
  let opaquePass = true;
  for (const p of [pnlPage, balPage]) {
    p?.traverse((o: THREE.Object3D) => {
      const mat = (o as THREE.Mesh).material as (THREE.Material & { opacity: number; transparent: boolean }) | undefined;
      if (mat && 'opacity' in mat) {
        minOpacity = Math.min(minOpacity, mat.opacity);
        if (mat.transparent) opaquePass = false;
      }
    });
  }
  return { opaque: minOpacity === 1 && opaquePass, minOpacity, opaquePass };
};
