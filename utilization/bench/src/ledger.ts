/**
 * LEDGER — ROADMAP A10, K-C (I-79; SUPERSEDES the batch-1 single-panel ledger of I-74).
 * The BOOKS panel as a physical LEDGER: a CLOSED book sits FLAT in front of the viewing
 * seat's board; a click (the ladder anchors it) FLIPS it OPEN into a TWO-PAGE SPREAD —
 * the P&L on the LEFT page, the Balance Sheet on the RIGHT page (an open book, both
 * visible). Zooming in enters READ mode of the SELECTED report (P&L default, fit-to-frame
 * — the "stuck zoomed" fix); a LEFT/RIGHT pan gesture in read mode switches the read focus
 * to the other report's page. All transitions are SMOOTH (the open animation + the camera
 * glide). The pages, the open animation, and the read/switch live in ledger-spread.ts
 * (kept ≤300-line discipline); THIS module owns the CLOSED book, the two report fill sets,
 * and the balance figures.
 *
 * The Balance-sheet fills are REAL from the projection (I-56d): Assets = cash + Σ AR ·
 * Liabilities = Σ AP · Equity = the identity the reckoning proves (Assets ≡ Liabilities +
 * Equity — the GD5/GD5b law in 3D). The P&L page is HONEST bracketed placeholders — the
 * slice carries no revenue/COGS (I-56d), so NOTHING is invented; the rows read "[—]".
 */
import * as THREE from 'three';
import type { SeatView } from '@tabletop/presentation';
import { BOOKS_PANEL } from '../../../packs/boty/src/index.js';
import { openSpread, closeSpread, tickSpread } from './ledger-spread.js';

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

// ── THE CLOSED BOOK (flat in front of the seat): a thick cover mesh lying face-up. It
// carries userData.ledger (the click opens it) and NO region tag. ──
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

/** The closed-ledger book mesh (flat). The caller (components/ledger) positions it in front
 *  of the viewing seat's board and registers it in focusGroups['ledger'] + the scene.
 *  userData.ledger marks it for the open-click raycast; no region tag. */
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

/** FLIP OPEN into the two-page spread at `anchor`: compute the REAL balance, build the P&L
 *  (honest placeholder) and Balance (real) pages, and start the smooth open animation. */
export function openLedger(view: SeatView, seat: string, anchor: THREE.Vector3): void {
  const bal = computeBalance(view, seat);
  lastBalance = bal;
  isOpen = true;
  openSpread(pnlFills(seat), balanceFills(bal), anchor);
}

/** ANY click closes the open ledger (the A2 reading-board contract) — the spread is removed
 *  and read mode is left. */
export function closeLedger(): void {
  isOpen = false;
  closeSpread();
}

/** the per-frame step — advance the open animation + the read-mode left/right page switch. */
export function tickLedger(): void { tickSpread(); }

// ── the __GAME3D__ gate surfaces (VG8n; state, never pixels — I-57c) ──
export const ledgerState = () => ({ open: isOpen, seat: lastBalance?.seat ?? null });

/** The Balance figures the RIGHT page was built from (I-56d). The gate asserts the identity
 *  on these AND matches them to the independent projection oracle. */
export const ledgerBalance = (): Balance | null => lastBalance;

/** BOOKS_PANEL's region ids from the def (the DOM-vs-LAW oracle: each page carries them). */
export const booksPanelIds = (): readonly string[] => BOOKS_PANEL.regions.map((r) => r.id).slice().sort();

// re-export the spread's gate + read surfaces so the component's gate() aggregates one place.
export {
  spreadPages, pageContent, spreadOpaque, spreadSettled, readSelected, selectedReport,
} from './ledger-spread.js';
