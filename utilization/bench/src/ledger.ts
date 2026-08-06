/**
 * LEDGER — ROADMAP A10, P-2 ledger v3 (I-84; SUPERSEDES I-79's interaction model — the
 * pages/fills/opacity carry). The BOOKS panel as a physical FOLDER: closed it sits FLAT in
 * front of the viewing seat's board; a click FLIPS IT OPEN — the cover swings on its hinge
 * and the two REPORTS RISE from the folder into their standing positions: the P&L on the
 * LEFT, the Balance Sheet on the RIGHT (both visible). ANCHOR-PER-REPORT: clicking a
 * report selects it and zooms smoothly into its READING view ("If I select the balance
 * sheet, it will zoom in to reading view for the balance sheet" — owner playtest-2); the
 * ladder carries read↔scene; the K-C read-mode pan-switch is RETIRED. All transitions are
 * SMOOTH (the rise animation + the camera glide). The pages, the rise, and anchorPage live
 * in ledger-spread.ts (≤300-line discipline); THIS module owns the CLOSED folder + cover
 * hinge, the two report fill sets, and the balance figures.
 *
 * The Balance-sheet fills are REAL from the projection (I-56d): Assets = cash + Σ AR ·
 * Liabilities = Σ AP · Equity = the identity the reckoning proves (Assets ≡ Liabilities +
 * Equity — the GD5/GD5b law in 3D). The P&L page is HONEST bracketed placeholders — the
 * slice carries no revenue/COGS (I-56d), so NOTHING is invented; the rows read "[—]".
 */
import * as THREE from 'three';
import type { SeatView } from '@tabletop/presentation';
import { BOOKS_PANEL } from '../../../packs/boty/src/index.js';
import { buildSheets, stampSheet, deploySheets, retractSheets, tickSpread, sheetsHome, sheetBBoxes, setSpreadYaw, spreadUpright } from './ledger-spread.js';
export { spreadUpright }; // G-D (I-166): the upright law's oracle (the FLAT law since I-229)
export { setSheetClaim, sheetClaimOf } from './ledger-spread.js'; // I-230: the reports' drag claims

type Balance = {
  seat: string; cash: number; ar: number; ap: number;
  assets: number; liabilities: number; equity: number;
};
let lastBalance: Balance | null = null;
let isOpen = false;

/** Assets = cash + Σ receivables held by the seat · Liabilities = Σ debts the seat owes ·
 *  Equity = the identity the reckoning proves (I-56d). REAL from the projection. */
function computeBalance(view: SeatView, seat: string): Balance {
  const cash = view.seats.find((s) => s.id === seat)?.cash ?? 0;
  const ar = view.receivables.filter((r) => r.holder === seat).reduce((a, b) => a + b.amount, 0);
  const ap = view.debts.filter((d) => d.debtor === seat).reduce((a, b) => a + b.amount, 0);
  const assets = cash + ar;
  const liabilities = ap;
  const equity = assets - liabilities; // Assets ≡ Liabilities + Equity (GD5/GD5b)
  return { seat, cash, ar, ap, assets, liabilities, equity };
}

/** the P&L (LEFT) page fills — HONEST bracketed placeholders (I-56d: no revenue/COGS in the
 *  slice, so NOTHING is invented; every figure reads "[—]"). */
function pnlFills(seat: string): Readonly<Record<string, readonly string[]>> {
  return {
    title: [`Profit & Loss · ${seat}`],
    tabs: [`‹ P&L › · Balance Sheet`],
    body: [`Revenue [—]`, `Cost of goods sold [—]`, `Gross profit [—]`, `Operating expenses [—]`],
    total: [`Net income [—]`],
    footnote: [`No revenue / COGS in this slice — figures pending (I-56d).`],
    callout: [`Profit on paper isn't cash — the P&L is not yet sourced.`],
  };
}

/** the Balance-sheet (RIGHT) page fills — REAL from the projection; the footnote speaks the
 *  identity (kept byte-stable so the gate's balance-identity oracle reads it). */
function balanceFills(b: Balance): Readonly<Record<string, readonly string[]>> {
  return {
    title: [`Balance Sheet · ${b.seat}`],
    tabs: [`P&L · ‹ Balance Sheet ›`],
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

// ── THE CLOSED FOLDER (flat in front of the seat): a SHEET FOLDED IN HALF holding two
// grouped paper sheets (P-2b, I-85 — the owner's reference picture). It carries
// userData.ledger (the click opens it) and NO region tag. ──
function coverTexture(seat: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const g = c.getContext('2d')!;
  g.fillStyle = '#cda45e'; g.fillRect(0, 0, 256, 320); // a manila folder face
  g.strokeStyle = '#a8823f'; g.lineWidth = 6; g.strokeRect(8, 8, 240, 304);
  g.fillStyle = '#4a3a1c'; g.font = 'bold 26px system-ui';
  g.fillText('THE BOOKS', 26, 150);
  g.font = '18px system-ui'; g.fillText(seat, 26, 186);
  return new THREE.CanvasTexture(c);
}

/** The closed FOLDER (flat): a BACK half + a NARROWER FRONT flap hinged at the LEFT edge
 *  (P-2c, I-86 — the owner's picture: the front swings LEFT to unfold, and the flap is
 *  shorter than the back so the TWO SHEET OBJECTS' right edges are visible inside). The
 *  sheets are PERSISTENT page objects built here WITH the folder (the three-objects law):
 *  buildSheets adds them as folder children, stamped from the genesis projection. The
 *  caller (components/ledger) positions the folder and registers focusGroups['ledger']. */
let coverPivot: THREE.Group | null = null;
let coverAmt = 0; // 0 = folded closed · 1 = unfolded, lying flat open
let backMesh: THREE.Mesh | null = null;
let frontMesh: THREE.Mesh | null = null;
export function ledgerBook(seat: string, view: SeatView): THREE.Group {
  const grp = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: coverTexture(seat) });
  // BACK half — full size; the fold hinge is its LEFT edge (local x = −75).
  const back = new THREE.Mesh(new THREE.BoxGeometry(150, 200, 2), mat);
  back.add(new THREE.LineSegments(new THREE.EdgesGeometry(back.geometry), new THREE.LineBasicMaterial({ color: 0xa8823f })));
  grp.add(back);
  backMesh = back;
  // THE TWO PERSISTENT SHEET OBJECTS — built INSIDE the folder, stamped from the live
  // projection (re-stamped at every open); their right edges peek past the shorter flap.
  const bal = computeBalance(view, seat);
  lastBalance = bal;
  buildSheets(grp, pnlFills(seat), balanceFills(bal));
  // FRONT flap — NARROWER than the back (the sheets' right edges stay visible), hinged at
  // the LEFT fold edge: the pivot swings it LEFT, up and over, to lie flat (stage 1).
  const pivot = new THREE.Group();
  pivot.position.set(-75, 0, 5.2);
  const front = new THREE.Mesh(new THREE.BoxGeometry(132, 196, 2), mat);
  front.position.x = 66; // offset so the hinge rotates the flap about the left fold edge
  front.add(new THREE.LineSegments(new THREE.EdgesGeometry(front.geometry), new THREE.LineBasicMaterial({ color: 0xa8823f })));
  pivot.add(front);
  grp.add(pivot);
  coverPivot = pivot;
  frontMesh = front;
  coverAmt = 0;
  isOpen = false; // a rebuild resets the whole ledger state machine (K7-P D2)
  pendingAt = null;
  grp.rotation.x = -Math.PI / 2; // lie FLAT on the table — the folder faces up
  grp.userData['ledger'] = true; // the open-click marker (no region tag)
  grp.userData['focus'] = 'ledger';
  return grp;
}

/** OPEN (the owner's two-stage transform, P-2b/P-2c): RE-STAMP the persistent sheets from
 *  the live projection (the objects persist; their content refreshes), then stage 1 = the
 *  front flap swings LEFT and the folder lies flat (tickLedger); stage 2 fires ONLY when
 *  the fold has settled — the SAME sheet objects deploy to the display pose. */
let pendingAt: THREE.Vector3 | null = null;
let spreadStartCover: number | null = null; // the coverAmt at the instant stage 2 fired (the sequencing record)
export function openLedger(view: SeatView, seat: string, anchor: THREE.Vector3): void {
  const bal = computeBalance(view, seat);
  lastBalance = bal;
  stampSheet('pnl', pnlFills(seat));
  stampSheet('balance', balanceFills(bal));
  isOpen = true;
  pendingAt = anchor.clone();
}

/** A non-page click closes the open ledger — the sheets RETURN into the folder (the same
 *  objects), read mode is left, and only THEN does the fold shut (gated in tickLedger). */
export function closeLedger(): void {
  isOpen = false;
  pendingAt = null;
  retractSheets();
}

/** the per-frame step — stage 1: the fold (the front flap swings LEFT about the hinge; the
 *  folder lies flat); the stage-2 HANDOFF (sequenced: the deploy fires only at fold-settle,
 *  RECORDED for the gate); on close the fold shutting is GATED on the sheets being HOME
 *  (the folder cannot shut through its own sheets); then the sheets' own deploy/return step. */
export function tickLedger(): void {
  const target = isOpen ? 1 : sheetsHome() ? 0 : 1; // shut only after the sheets are back inside
  if (coverPivot && coverAmt !== target) {
    coverAmt += (target - coverAmt) * 0.16 + Math.sign(target - coverAmt) * 0.02;
    coverAmt = Math.max(0, Math.min(1, coverAmt));
    coverPivot.rotation.y = -Math.PI * coverAmt; // the flap swings LEFT — up, over, and flat
  }
  // stage 2: the SAME sheets deploy — ONLY when the fold has settled AND the sheets are
  // actually HOME (K7-P D1: a re-open during the return glide must WAIT for the sheets to
  // arrive, not consume the deploy into a no-op and poison the sequencing record).
  if (pendingAt && isOpen && coverAmt >= 0.999 && sheetsHome()) {
    spreadStartCover = coverAmt;
    deploySheets(pendingAt);
    pendingAt = null;
  }
  tickSpread();
}

/** the folder-fold pose STATE (VG8n asserts it settles open/closed — a geometry-state read). */
export const ledgerCoverOpen = (): number => coverAmt;
/** the RECORDED coverAmt at the instant stage 2 fired (the fold-then-deploy sequencing law). */
export const ledgerSpreadStartCover = (): number | null => spreadStartCover;
/** THE FOLDER FORM oracle (P-2c): the flap NARROWER than the back; the sheets' right edges
 *  PEEK past the flap's right edge (closed pose — world-x bboxes); the flap's centre offset
 *  vs the back (open = the flap lies LEFT: strongly negative). All live geometry reads. */
export function ledgerFolderForm(): { backW: number; frontW: number; sheetPeekX: number; frontOffsetX: number } | null {
  if (!backMesh || !frontMesh) return null;
  const bb = new THREE.Box3().setFromObject(backMesh);
  const fb = new THREE.Box3().setFromObject(frontMesh);
  const bc = bb.getCenter(new THREE.Vector3());
  const fc = fb.getCenter(new THREE.Vector3());
  let sheetMaxX = -Infinity;
  for (const s of sheetBBoxes()) sheetMaxX = Math.max(sheetMaxX, s.maxX);
  return {
    backW: bb.max.x - bb.min.x,
    frontW: fb.max.x - fb.min.x,
    sheetPeekX: sheetMaxX - fb.max.x, // > 0 closed = the right edges are visible past the flap
    frontOffsetX: fc.x - bc.x, // ≈ 0 closed · strongly NEGATIVE open (the flap swung LEFT)
  };
}

// ── the __GAME3D__ gate surfaces (VG8n; state, never pixels — I-57c) ──
export const ledgerState = () => ({ open: isOpen, seat: lastBalance?.seat ?? null });

/** The Balance figures the RIGHT page was built from (I-56d). The gate asserts the identity
 *  on these AND matches them to the independent projection oracle. */
export const ledgerBalance = (): Balance | null => lastBalance;

/** BOOKS_PANEL's region ids from the def (the DOM-vs-LAW oracle: each page carries them). */
export const booksPanelIds = (): readonly string[] => BOOKS_PANEL.regions.map((r) => r.id).slice().sort();

// re-export the sheets' gate + read surfaces so the component's gate() aggregates one place.
export {
  spreadPages, pageContent, spreadOpaque, spreadSettled, readSelected, selectedReport,
  anchorPage, sheetIds, sheetsHome, setSpreadYaw,
} from './ledger-spread.js';
export type { PageKind } from './ledger-spread.js';
