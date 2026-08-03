/**
 * LEDGER — ROADMAP A10 (I-74): the BOOKS panel as a physical LEDGER. A CLOSED book
 * sits FLAT in front of the viewing seat's board; a click (the ladder anchors it) FLIPS
 * it OPEN, revealing the measured BOOKS_PANEL def (I-56) as the open ledger — title ·
 * mode-tabs · line-items · total · footnote + the BOTY cash-vs-paper callout.
 *
 * The Balance-sheet FILLS are REAL from the projection (I-56d): Assets = cash + Σ AR ·
 * Liabilities = Σ AP · Equity = the identity the reckoning proves (Assets ≡ Liabilities +
 * Equity — the GD5/GD5b law in 3D). P&L is a single bracketed TAB-LABEL placeholder — no
 * P&L rows are rendered, no figures invented (I-56d). The open panel reuses the A3b OPAQUE
 * discipline (I-70): every face opacity 1, in the transparent pass, sorted ABOVE the veil,
 * depthTest off — so the card fully covers the 55% veil ("not transparent"). Unskinned
 * (D-1); diffused light only. game3d.ts owns a THIN registration (build the book in
 * buildScene, the open click, and the __GAME3D__ surfaces); this module owns the geometry.
 */
import * as THREE from 'three';
import type { SeatView } from '@tabletop/presentation';
import { camera } from './stage.js';
import { layoutFace } from './surfaces.js';
import { BOOKS_PANEL } from '../../../packs/boty/src/index.js';

// ── the open ledger's state — the overlay is camera-parented (like the A2 reading board),
// so it survives a buildScene rebuild and always faces the reader; null when the book is
// CLOSED. lastBalance holds the figures the open fills were BUILT from (the gate reads
// them; a fill mutation moves both the stamp and this stored figure together). ──
let overlay: THREE.Group | null = null;
let panelFace: THREE.Object3D | null = null;
type Balance = {
  seat: string; cash: number; ar: number; ap: number;
  assets: number; liabilities: number; equity: number;
};
let lastBalance: Balance | null = null;

/** Assets = cash + Σ receivables held by the seat · Liabilities = Σ debts the seat owes ·
 *  Equity = the identity the reckoning proves (I-56d; the same read as the certified SVG
 *  bench's popBooks). REAL from the projection — no invented figures. */
function computeBalance(view: SeatView, seat: string): Balance {
  const cash = view.seats.find((s) => s.id === seat)?.cash ?? 0;
  const ar = view.receivables.filter((r) => r.holder === seat).reduce((a, b) => a + b.amount, 0);
  const ap = view.debts.filter((d) => d.debtor === seat).reduce((a, b) => a + b.amount, 0);
  const assets = cash + ar;
  const liabilities = ap;
  const equity = assets - liabilities; // Assets ≡ Liabilities + Equity (GD5/GD5b)
  return { seat, cash, ar, ap, assets, liabilities, equity };
}

/** The Balance-sheet fills, keyed by BOOKS_PANEL region id. The tabs region carries the
 *  SINGLE bracketed P&L placeholder next to the live Balance tab (no P&L rows anywhere —
 *  I-56d); body/total/footnote carry the REAL figures; the callout is the BOTY cash-vs-
 *  paper teaching line (a constant lesson over the REAL cash — no invented figure). */
function ledgerFills(b: Balance): Readonly<Record<string, readonly string[]>> {
  return {
    title: [`The books · ${b.seat}`],
    tabs: [`[P&L — next increment] · Balance Sheet`],
    body: [
      `Assets $${b.assets} (cash $${b.cash} · AR $${b.ar})`,
      `Liabilities $${b.liabilities}`,
      `Equity $${b.equity}`,
    ],
    total: [`Liabilities + equity $${b.liabilities + b.equity}`],
    footnote: [`Assets $${b.assets} = Liabilities $${b.liabilities} + Equity $${b.equity}. The books always balance.`],
    callout: [`Cash in bank $${b.cash} — profit on paper isn't cash.`],
  };
}

// ── THE CLOSED BOOK (flat in front of the seat): a thick cover mesh lying face-up. It
// carries userData.ledger (the click opens it) and NO region tag (so the VG8a scene-region
// count is untouched — the panel's regions live only on the OPEN overlay). ──
function coverTexture(seat: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7a5b3a'; g.fillRect(0, 0, 256, 320); // a ledger-brown board cover (D-1: volume, not paint)
  g.strokeStyle = '#5c4429'; g.lineWidth = 8; g.strokeRect(10, 10, 236, 300);
  g.fillStyle = '#efe7d6'; g.font = 'bold 26px system-ui';
  g.fillText('THE BOOKS', 26, 150);
  g.font = '18px system-ui'; g.fillText(seat, 26, 186);
  return new THREE.CanvasTexture(c);
}

/** The closed-ledger book mesh (flat). The caller (game3d buildScene) positions it in
 *  front of the viewing seat's board and registers it in focusGroups['ledger'] + the
 *  scene. userData.ledger marks it for the open-click raycast; no region tag. */
export function ledgerBook(seat: string): THREE.Group {
  const grp = new THREE.Group();
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(140, 180, 18),
    new THREE.MeshBasicMaterial({ map: coverTexture(seat) }),
  );
  cover.add(new THREE.LineSegments(new THREE.EdgesGeometry(cover.geometry), new THREE.LineBasicMaterial({ color: 0x4a3620 })));
  grp.add(cover);
  grp.rotation.x = -Math.PI / 2; // lie FLAT — the cover faces up, off the board's felt
  grp.userData['ledger'] = true; // the open-click marker (no region tag)
  grp.userData['focus'] = 'ledger';
  return grp;
}

/** FLIP OPEN: build the BOOKS_PANEL face from the REAL projection fills and present it
 *  camera-parented over a dark veil, OPAQUE (the I-70 discipline). Closes any prior open. */
export function openLedger(view: SeatView, seat: string): void {
  closeLedger();
  const bal = computeBalance(view, seat);
  lastBalance = bal;
  overlay = new THREE.Group();
  // the veil: 55% dark, transparent, depthTest off (the A2/A3 reading-board surround)
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(480, 320), new THREE.MeshBasicMaterial({ color: 0x14181c, transparent: true, opacity: 0.55, depthTest: false }));
  veil.renderOrder = 90;
  veil.userData['veil'] = true; // the gate reads its renderOrder to prove the panel sorts ABOVE it
  overlay.add(veil);
  // the OPEN ledger = the measured BOOKS_PANEL as a face (I-56); regions from the def only
  const face = layoutFace(BOOKS_PANEL, 0xffffff, ledgerFills(bal));
  face.scale.set(2.6, 2.6, 1); // panel to frame; the 0..100-unit regions stay proportional
  face.position.z = 2;
  // OPAQUE OVER THE VEIL (I-70): three.js draws the whole opaque pass before the
  // transparent one, so an opaque panel would draw FIRST and the veil would paint 55%
  // over it. Put every face in the TRANSPARENT pass at FULL opacity with a renderOrder
  // ABOVE the veil (90) — it sorts AFTER the veil and fully covers it; depthTest off
  // keeps the overlay above the scene, depthWrite off keeps the panel's own regions layered.
  face.traverse((o) => {
    const mat = (o as THREE.Mesh).material as (THREE.MeshBasicMaterial | THREE.LineBasicMaterial) | undefined;
    if (mat && 'opacity' in mat) { mat.transparent = true; mat.opacity = 1; mat.depthTest = false; mat.depthWrite = false; o.renderOrder = 92; }
  });
  panelFace = face;
  overlay.add(face);
  overlay.position.z = -150;
  camera.add(overlay);
}

/** ANY click closes the open ledger (the A2 reading-board contract). */
export function closeLedger(): void {
  if (overlay) { camera.remove(overlay); overlay = null; panelFace = null; }
}

// ── the __GAME3D__ gate surfaces (VG8n; state, never pixels — I-57c) ──
export const ledgerState = () => ({ open: overlay !== null, seat: lastBalance?.seat ?? null });

/** The figures the OPEN fills were built from (I-56d). The gate asserts the balance
 *  identity on these AND matches them to the independent projection — a fill mutation
 *  moves both the stamp and this stored figure, so the gate fails BY NAME. */
export const ledgerBalance = (): Balance | null => lastBalance;

/** BOOKS_PANEL's region ids from the def (the DOM-vs-LAW oracle for VG8n). */
export const booksPanelIds = (): readonly string[] => BOOKS_PANEL.regions.map((r) => r.id).slice().sort();

/** The open panel's rendered anatomy + the A3b opaque paint-state — every card face
 *  opacity 1 AND in the transparent pass AND sorted ABOVE the veil (the three conditions
 *  that make it COVER the veil). Null when the book is closed. */
export const ledgerRegions = () => {
  if (!overlay || !panelFace) return null;
  const regions: Record<string, { h: number; lines: readonly string[] | null }> = {};
  let minOpacity = 1, allTransparentPass = true, minPanelOrder = Infinity;
  panelFace.traverse((o: THREE.Object3D) => {
    const mat = (o as THREE.Mesh).material as (THREE.Material & { opacity: number; transparent: boolean }) | undefined;
    if (mat && 'opacity' in mat) {
      minOpacity = Math.min(minOpacity, mat.opacity);
      if (!mat.transparent) allTransparentPass = false;
      minPanelOrder = Math.min(minPanelOrder, o.renderOrder);
    }
    const rid = o.userData?.['region'];
    if (typeof rid === 'string') {
      const b = new THREE.Box3().setFromObject(o);
      regions[rid] = { h: b.max.y - b.min.y, lines: (o.userData['renderedLines'] as string[]) ?? null };
    }
  });
  let veilOrder = -Infinity;
  overlay.traverse((o: THREE.Object3D) => { if (o.userData?.['veil']) veilOrder = o.renderOrder; });
  return {
    ids: Object.keys(regions).sort(), regions,
    opaque: minOpacity === 1 && allTransparentPass, minOpacity, transparentPass: allTransparentPass,
    overVeil: minPanelOrder > veilOrder, panelOrder: minPanelOrder, veilOrder,
  };
};
