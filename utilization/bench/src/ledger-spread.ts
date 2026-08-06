/**
 * LEDGER SHEETS — P-2c (I-86): THE THREE-OBJECTS LAW (owner-ruled 2026-08-03; SUPERSEDES
 * I-85's cosmetic peek-sheet mechanism). The folder and the TWO REPORT SHEETS are three
 * PERSISTENT interacting objects: the sheets are built ONCE, WITH the folder, as its
 * CHILDREN — real page groups (portrait paper + layoutFace fills) tucked inside with
 * their RIGHT edges peeking past the shorter front flap. DEPLOY reparents them to the
 * scene (`scene.attach` — world transform preserved, no jump) and lerps pos/quat/scale
 * from the recorded in-folder HOME pose to the standing display pose; RETRACT lerps back
 * to that home pose and `folder.attach`es them again. The SAME objects, the whole cycle
 * — never rebuilt, never swapped; VG8n asserts their UUIDs + parentage walk.
 *
 * The fills are stamped at build (genesis projection) and RE-STAMPED IN PLACE at each
 * open (the face content updates; the sheet object persists). ANCHOR-PER-REPORT (sealed):
 * clicking a deployed sheet selects it and zooms to its reading view. Pages are OPAQUE
 * (I-70); waits are STATE, never clocks (I-60f).
 */
import * as THREE from 'three';
import { scene, focusGroups } from './stage.js';
import { readView, readState, getMode, setLastFocus, sceneView } from './camera.js';
import { layoutFace } from './surfaces.js';
import { BOOKS_PANEL } from '../../../packs/boty/src/index.js';

export type PageKind = 'pnl' | 'balance';
type Fills = Readonly<Record<string, readonly string[]>>;
type Pose = { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3 };

// ── geometry constants ──
const DISPLAY_SCALE = 2.4; // the standing display size (the sealed read law)
const HOME_SCALE = 1.22; // tucked inside the 150×200 folder (138×177 — right edge peeks)
const GAP = 160; // display x-offset from the spread anchor
const PAPER_W = 112, PAPER_H = 145; // report-sized (portrait) paper — P-2b, carried

// ── the three-objects state ──
let folderGrp: THREE.Group | null = null;
let sheets: Record<PageKind, THREE.Group | null> = { pnl: null, balance: null };
let faces: Record<PageKind, THREE.Group | null> = { pnl: null, balance: null };
let homePose: Record<PageKind, Pose | null> = { pnl: null, balance: null };
let anchor = new THREE.Vector3();
let phase: 'in-folder' | 'deploying' | 'displayed' | 'returning' = 'in-folder';
let amt = 0; // 0 = home (in the folder) → 1 = display pose
let selected: PageKind = 'pnl';
const UP_QUAT = new THREE.Quaternion(); // standing upright, facing +z (the display orientation)
// O-1 (I-138, the owner's overlap catch: 'the books opens up 45 degrees towards the
// seat board'): the risen pages' pose derives from THE SEAT FRAME — spread along the
// seat's LATERAL axis, faced along its NORMAL (toward the player), pushed a step AWAY
// from the board. The component sets the yaw at build (the L-5b law finishing its job).
let spreadYaw = 0;
export function setSpreadYaw(y: number): void { spreadYaw = y; }

/** G-D (I-166): THE UPRIGHT LAW's oracle — each displayed sheet's lean off vertical
 *  (degrees; want ≈0) and heading error vs the seat frame's yaw (want ≈0). A tilted
 *  or mis-yawed pop-up fails BY NAME with its numbers. */
export function spreadUpright(): Record<string, { lean: number; headingErr: number; heading: number; posErr: number; quatErr: number }> | null {
  if (phase !== 'displayed') return null;
  const out: Record<string, { lean: number; headingErr: number; heading: number; posErr: number; quatErr: number }> = {};
  for (const k of ['pnl', 'balance'] as const) {
    const sh = sheets[k];
    if (!sh) continue;
    const q = sh.getWorldQuaternion(new THREE.Quaternion());
    // I-229: THE FLAT LAW replaces the upright one — 'lean' is now the angle off FLAT
    // (the sheet's normal vs world up; 0 = lying perfectly like a card), and the
    // heading is the sheet's TOP direction (local +y) vs the seat frame's yaw.
    const nrm0 = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const up = new THREE.Vector3(0, 0, 1).applyQuaternion(q); // kept name; measures flatness below
    const topDir = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const heading = Math.atan2(topDir.x, topDir.z);
    const dh = Math.atan2(Math.sin(heading - (spreadYaw + Math.PI)), Math.cos(heading - (spreadYaw + Math.PI)));
    void nrm0;
    // K7-V M-1: THE EXACT-POSE LAW — at 'displayed' the pose must be the snap's COPY,
    // bitwise (posErr ≡ 0, quatErr ≡ 0). A deleted settle-snap leaves the ~3e-6 slerp
    // residual and fails; the 2° lean pin alone could never see it (the reviewer's math).
    const disp = displayPose(k);
    out[k] = {
      lean: (Math.acos(Math.min(1, Math.abs(up.y))) * 180) / Math.PI, // 0 = FLAT (the normal vertical)
      headingErr: (dh * 180) / Math.PI,
      heading: (heading * 180) / Math.PI, // ABSOLUTE — the gate checks it against an INDEPENDENT yaw source (M-1's self-reference closed)
      posErr: sh.position.distanceTo(disp.pos),
      quatErr: sh.quaternion.angleTo(disp.quat),
    };
  }
  return out;
}

const focusId = (k: PageKind): string => `ledger-${k}`;
const ease = (t: number): number => t * t * (3 - 2 * t);

/** stamp (or RE-stamp) a sheet's face from fills — the face content changes, the sheet
 *  OBJECT persists (the three-objects law's honest refresh). */
export function stampSheet(k: PageKind, fills: Fills): void {
  const sh = sheets[k];
  if (!sh) return;
  const old = faces[k];
  if (old) sh.remove(old);
  const face = layoutFace(BOOKS_PANEL, 0xffffff, fills); // regions from the def only (I-60a)
  faces[k] = face;
  sh.add(face);
}

/** build the two PERSISTENT sheet objects INSIDE the folder (called once, at folder build).
 *  In-folder pose: flat, stacked, staggered slightly RIGHT so their right edges peek past
 *  the shorter front flap (the owner's picture). */
export function buildSheets(folder: THREE.Group, pnlFills: Fills, balanceFills: Fills): void {
  // K7-P D2: a rebuild while sheets are DEPLOYED must not orphan them — purge any previous
  // sheet objects from whatever parent they have, drop their read anchors, leave read mode
  // if it was on a (now-gone) sheet, and reset the phase machine before building fresh.
  if (getMode() === 'read' && readState().focus.startsWith('ledger-')) sceneView();
  for (const k of ['pnl', 'balance'] as const) {
    const old = sheets[k];
    if (old) old.parent?.remove(old);
    sheets[k] = null;
    faces[k] = null;
    homePose[k] = null;
    delete focusGroups[focusId(k)];
  }
  folderGrp = folder;
  const specs: ReadonlyArray<{ k: PageKind; fills: Fills; x: number; y: number; z: number }> = [
    { k: 'balance', fills: balanceFills, x: 6, y: -2, z: 2.2 }, // under, peeking furthest right
    { k: 'pnl', fills: pnlFills, x: 2, y: 2, z: 3.4 }, // on top
  ];
  for (const s of specs) {
    const sheet = new THREE.Group();
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(PAPER_W, PAPER_H),
      new THREE.MeshBasicMaterial({ color: 0xf3ecda, transparent: false }), // opaque page stock (I-70)
    );
    back.position.z = -0.5;
    sheet.add(back);
    sheet.userData['ledgerPage'] = s.k;
    sheet.userData['focus'] = focusId(s.k);
    sheet.position.set(s.x, s.y, s.z);
    sheet.scale.setScalar(HOME_SCALE);
    sheets[s.k] = sheet;
    folder.add(sheet);
    stampSheet(s.k, s.fills);
  }
  phase = 'in-folder';
  amt = 0;
}

/** DEPLOY (stage 2 — fired by ledger.ts only after the fold settles): record each sheet's
 *  in-folder HOME pose, reparent to the SCENE (world transform preserved — the same object,
 *  no jump), register the read anchors, and start the lerp to the display pose. */
export function deploySheets(at: THREE.Vector3): void {
  if (phase !== 'in-folder') return;
  anchor = at.clone();
  for (const k of ['pnl', 'balance'] as const) {
    const sh = sheets[k];
    if (!sh) continue;
    sh.updateWorldMatrix(true, true);
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
    sh.matrixWorld.decompose(pos, quat, scl);
    homePose[k] = { pos, quat, scale: scl };
    scene.attach(sh); // REPARENT — the object keeps its world transform
    focusGroups[focusId(k)] = sh; // FOCUSABLE while deployed — the read-ladder targets it
  }
  phase = 'deploying';
  amt = 0;
  selected = 'pnl';
  setLastFocus(focusId('pnl'));
}

/** RETRACT: leave read if reading a sheet, then lerp each sheet BACK to its recorded home
 *  pose; at arrival they are folder.attach-ed again (the same objects, back inside). */
export function retractSheets(): void {
  if (phase === 'in-folder') return;
  sheetClaims = {}; // I-230: the claims LAPSE — the return-before-close lands the default stack, always
  if (getMode() === 'read' && readState().focus.startsWith('ledger-')) sceneView();
  phase = 'returning';
  setLastFocus('table');
}

/** a sheet's DISPLAY pose target — I-229 (owner-redesigned, superseding the upright
 *  pop-up G-D era): the reports LIE FLAT like cards atop the OPENED folder — the
 *  cover swings LEFT and the P&L rides onto it; the Balance stays revealed on the
 *  base. Two flat pages, side by side, each its own zoom object. */
function displayPose(k: PageKind): Pose {
  const lat = new THREE.Vector3(Math.cos(spreadYaw), 0, -Math.sin(spreadYaw));
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spreadYaw)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
  const n2 = new THREE.Vector3(Math.sin(spreadYaw), 0, Math.cos(spreadYaw));
  const claim = sheetClaims[k];
  return {
    pos: anchor.clone()
      .addScaledVector(lat, claim ? claim.lat : (k === 'pnl' ? -FOLD_W : 0))
      .addScaledVector(n2, claim ? claim.out : 0)
      .add(new THREE.Vector3(0, claim ? 6 : (k === 'pnl' ? 3 : 2), 0)), // I-230: a claimed report rides HIGHEST (the hierarchy's top)
    quat: flat,
    scale: new THREE.Vector3(DISPLAY_SCALE, DISPLAY_SCALE, DISPLAY_SCALE),
  };
}
const FOLD_W = 140; // the opened cover's throw — the P&L's slide distance to the LEFT
// I-230 (owner-ruled): the reports INHERIT the cards' drag-and-drop — a claim per
// sheet (board-frame offsets from the folder), cleared when the folder closes so the
// return-before-close always lands the default stack.
let sheetClaims: Partial<Record<PageKind, { lat: number; out: number }>> = {};
export function setSheetClaim(k: PageKind, c: { lat: number; out: number }): void { sheetClaims[k] = c; }
export const sheetClaimOf = (k: PageKind) => sheetClaims[k] ?? null;

/** the per-frame step — the deploy/return lerp between the HOME and DISPLAY poses. */
export function tickSpread(): void {
  if (phase === 'deploying' || phase === 'returning') {
    amt = phase === 'deploying' ? Math.min(1, amt + (1 - amt) * 0.16 + 0.02) : Math.max(0, amt - (amt * 0.16 + 0.02));
    const e = ease(amt);
    for (const k of ['pnl', 'balance'] as const) {
      const sh = sheets[k], home = homePose[k];
      if (!sh || !home) continue;
      const disp = displayPose(k);
      sh.position.lerpVectors(home.pos, disp.pos, e);
      sh.quaternion.slerpQuaternions(home.quat, disp.quat, e);
      sh.scale.lerpVectors(home.scale, disp.scale, e);
    }
    if (phase === 'deploying' && amt >= 0.999) {
      amt = 1; phase = 'displayed';
      // G-D (I-166, the owner's 'actually upright instead of off at an angle'): the
      // settle SNAPS EXACT to the display pose — no residual slerp lean survives.
      for (const k of ['pnl', 'balance'] as const) {
        const sh = sheets[k];
        if (!sh) continue;
        const disp = displayPose(k);
        sh.position.copy(disp.pos); sh.quaternion.copy(disp.quat); sh.scale.copy(disp.scale);
      }
    }
    if (phase === 'returning' && amt <= 0.001) {
      amt = 0;
      for (const k of ['pnl', 'balance'] as const) {
        const sh = sheets[k], home = homePose[k];
        if (!sh || !home) continue;
        sh.position.copy(home.pos); sh.quaternion.copy(home.quat); sh.scale.copy(home.scale);
        if (folderGrp) folderGrp.attach(sh); // BACK INSIDE — the same object, reparented home
        delete focusGroups[focusId(k)];
      }
      phase = 'in-folder';
    }
  }
}

/** ANCHOR-PER-REPORT (SEALED by the owner): clicking a deployed sheet selects it and zooms
 *  smoothly into its reading view. */
export function anchorPage(k: PageKind): void {
  if (phase !== 'displayed') return; // only settled sheets are read targets (K7-P D9)
  selected = k;
  setLastFocus(focusId(k));
  readView(focusId(k));
}

/** enter READ of the selected sheet (the gate's zoom-to-read primitive, kept). */
export function readSelected(): void {
  if (phase !== 'displayed') return;
  setLastFocus(focusId(selected));
  readView(focusId(selected));
}

// ── the __GAME3D__ gate surfaces (VG8n; STATE/geometry, never pixels — I-57c) ──
export const spreadSettled = (): boolean => phase === 'displayed';
export const sheetsHome = (): boolean => phase === 'in-folder';
export const selectedReport = (): PageKind => selected;

/** THE THREE-OBJECTS ORACLE: each sheet's uuid + parentage ('folder' | 'scene'). The gate
 *  asserts the SAME uuids walk folder → scene → folder across the whole open/close cycle —
 *  a faked animation (rebuilt or swapped pages) cannot pass. */
export const sheetIds = (): { kind: PageKind; uuid: string; parent: 'folder' | 'scene' | 'other' }[] => {
  const out: { kind: PageKind; uuid: string; parent: 'folder' | 'scene' | 'other' }[] = [];
  for (const k of ['pnl', 'balance'] as const) {
    const sh = sheets[k];
    if (!sh) continue;
    out.push({ kind: k, uuid: sh.uuid, parent: sh.parent === folderGrp ? 'folder' : sh.parent === scene ? 'scene' : 'other' });
  }
  return out;
};

/** each sheet's world bbox (the form/peek oracle's raw geometry). */
export const sheetBBoxes = (): { kind: PageKind; minX: number; maxX: number }[] => {
  const out: { kind: PageKind; minX: number; maxX: number }[] = [];
  for (const k of ['pnl', 'balance'] as const) {
    const sh = sheets[k];
    if (!sh) continue;
    const b = new THREE.Box3().setFromObject(sh);
    out.push({ kind: k, minX: b.min.x, maxX: b.max.x });
  }
  return out;
};

/** the two sheets: id · kind · world-x/y · focusable (registered while deployed). */
export const spreadPages = (): { id: string; kind: PageKind; worldX: number; worldY: number; focusable: boolean }[] => {
  const out: { id: string; kind: PageKind; worldX: number; worldY: number; focusable: boolean }[] = [];
  for (const k of ['pnl', 'balance'] as const) {
    const sh = sheets[k];
    if (!sh) continue;
    const c = new THREE.Box3().setFromObject(sh).getCenter(new THREE.Vector3());
    out.push({ id: focusId(k), kind: k, worldX: c.x, worldY: c.y, focusable: focusGroups[focusId(k)] !== undefined });
  }
  return out;
};

/** a sheet's rendered stamped rows, keyed by region id (the non-blank/fidelity oracle). */
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

/** the OPAQUE state across BOTH sheets (I-70): min opacity 1 AND every face in the opaque
 *  pass — not see-through. Null when no sheets exist. */
export const spreadOpaque = (): { opaque: boolean; minOpacity: number; opaquePass: boolean } | null => {
  if (!sheets.pnl && !sheets.balance) return null;
  let minOpacity = 1;
  let opaquePass = true;
  for (const k of ['pnl', 'balance'] as const) {
    sheets[k]?.traverse((o: THREE.Object3D) => {
      const mat = (o as THREE.Mesh).material as (THREE.Material & { opacity: number; transparent: boolean }) | undefined;
      if (mat && 'opacity' in mat) {
        minOpacity = Math.min(minOpacity, mat.opacity);
        if (mat.transparent) opaquePass = false;
      }
    });
  }
  return { opaque: minOpacity === 1 && opaquePass, minOpacity, opaquePass };
};
