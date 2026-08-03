/**
 * LEDGER component (K-C, I-79) — A10: the BOOKS panel as a physical ledger. Wraps the
 * ledger.ts module (ledgerBook/openLedger/closeLedger/tickLedger + its gate surfaces),
 * delegating. The CLOSED book sits FLAT in front of the viewing seat's board; a click
 * flips it open into the two-page spread (P&L left, Balance right). Placement:
 * bound{surface:'seat-0',region:'front'}. The component goes through ctx only — the
 * read/switch discipline lives in ledger.ts/ledger-spread.ts (a bench object module,
 * which may touch camera.ts/stage.ts as it already does; the DROP-IN purity rule binds
 * this ADAPTER, which stays ctx-only).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import * as ledger from '../ledger.js';

let cx: PlayAreaContext | null = null;
let bookRoot: THREE.Object3D | null = null;

// the OPEN spread stands above the closed book, front of the viewing seat's board.
const anchorOf = (book: THREE.Object3D): THREE.Vector3 =>
  book.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 138, 0));

export const ledgerComponent: Component = {
  id: 'ledger',
  anchorKey: 'ledger',
  placement: { kind: 'bound', surface: 'seat-0', region: 'front' },

  build(ctx) {
    cx = ctx;
    // A10: the LEDGER — a CLOSED book FLAT in front of the VIEWING seat's board (seat-0,
    // near row +z). The harness registers it under focusGroups['ledger'].
    const book = ledger.ledgerBook(ctx.viewSeat);
    book.position.set(-420, 2, 560);
    bookRoot = book;
    return book;
  },

  // Phase 0: ANY click closes the open ledger; consumed. Closing also leaves read mode
  // (the pages can no longer be a read target) — handled inside ledger.closeLedger.
  consumeClick(ctx) {
    if (ledger.ledgerState().open) { ledger.closeLedger(); ctx.status('the ledger closes'); return true; }
    return false;
  },

  // Phase 2: the closed ledger — click FLIPS it open into the two-page spread on the REAL
  // projection; the ladder anchors the P&L (setLastFocus, inside openLedger).
  onPick(ctx, hit: PickInfo) {
    if (hit.tags['ledger'] === true && bookRoot) {
      ctx.theater.setLastFocus('ledger');
      ledger.openLedger(ctx.projection(), ctx.viewSeat, anchorOf(bookRoot));
      ctx.status('the ledger flips open — P&L (left) · Balance Sheet (right); zoom in to read, drag to switch');
      return true;
    }
    return false;
  },

  // per-frame: advance the open animation + the read-mode left/right page switch.
  tick() { ledger.tickLedger(); },

  gate() {
    const ctx = cx!;
    return {
      ledgerState: ledger.ledgerState,
      ledgerBalance: ledger.ledgerBalance,
      booksPanelIds: ledger.booksPanelIds,
      // the two-page spread surfaces (SUPERSEDES the batch-1 ledgerRegions)
      ledgerPages: ledger.spreadPages,
      ledgerPageContent: ledger.pageContent,
      ledgerOpaque: ledger.spreadOpaque,
      ledgerSettled: ledger.spreadSettled,
      ledgerSelected: ledger.selectedReport,
      // enter READ of the selected page (the zoom-to-read primitive the gate drives)
      ledgerReadSelected: ledger.readSelected,
      ledgerProjection: () => {
        const v = ctx.projection();
        return {
          seat: ctx.viewSeat,
          cash: v.seats.find((s) => s.id === ctx.viewSeat)!.cash,
          ar: v.receivables.filter((r) => r.holder === ctx.viewSeat).map((r) => r.amount),
          ap: v.debts.filter((d) => d.debtor === ctx.viewSeat).map((d) => d.amount),
        };
      },
      /** the closed book's center projected to canvas pixels (the real-click helper). */
      ledgerScreenXY: () => {
        const o = ctx.theater.focusObject('ledger');
        if (!o) return null;
        const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
        ctx.camera.updateMatrixWorld();
        const v = c.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
    };
  },
};
