/**
 * LEDGER component (K-A adapter, I-77) — A10 (I-74): the BOOKS panel as a physical
 * ledger. Wraps the EXISTING ledger.ts module UNCHANGED (ledgerBook/openLedger/
 * closeLedger + its gate surfaces), delegating. The CLOSED book sits FLAT in front of
 * the viewing seat's board; a click flips it open. Placement:
 * bound{surface:'seat-0',region:'front'} (K-A metadata; the current geometry preserved).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import * as ledger from '../ledger.js';

let cx: PlayAreaContext | null = null;

export const ledgerComponent: Component = {
  id: 'ledger',
  anchorKey: 'ledger',
  placement: { kind: 'bound', surface: 'seat-0', region: 'front' },

  build(ctx) {
    cx = ctx;
    // A10 (I-74): the LEDGER — a CLOSED book FLAT in front of the VIEWING seat's board
    // (seat-0, near row +z). The harness registers it under focusGroups['ledger'].
    const book = ledger.ledgerBook(ctx.viewSeat);
    book.position.set(-420, 2, 560);
    return book;
  },

  // Phase 0: ANY click closes the open ledger; consumed (A10/I-74)
  consumeClick(ctx) {
    if (ledger.ledgerState().open) { ledger.closeLedger(); ctx.status('the ledger closes'); return true; }
    return false;
  },

  // Phase 2: the closed ledger — click FLIPS it open on the REAL projection; the ladder
  // anchors it (setLastFocus). Checked before the board/table hits so the nearer book
  // wins its own pixel (guaranteed here by disjoint subtrees + registry order).
  onPick(ctx, hit: PickInfo) {
    if (hit.tags['ledger'] === true) {
      ctx.theater.setLastFocus('ledger');
      ledger.openLedger(ctx.projection(), ctx.viewSeat);
      ctx.status('the ledger flips open — the books (Balance Sheet)');
      return true;
    }
    return false;
  },

  gate() {
    const ctx = cx!;
    return {
      ledgerState: ledger.ledgerState,
      ledgerBalance: ledger.ledgerBalance,
      ledgerRegions: ledger.ledgerRegions,
      booksPanelIds: ledger.booksPanelIds,
      ledgerProjection: () => {
        const v = ctx.projection();
        return {
          seat: ctx.viewSeat,
          cash: v.seats.find((s) => s.id === ctx.viewSeat)!.cash,
          ar: v.receivables.filter((r) => r.holder === ctx.viewSeat).map((r) => r.amount),
          ap: v.debts.filter((d) => d.debtor === ctx.viewSeat).map((d) => d.amount),
        };
      },
      /** the closed book's center projected to canvas pixels (VG8n's real-click helper). */
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
