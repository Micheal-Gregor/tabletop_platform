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
    // A10/P-2c: the LEDGER — the closed FOLDER flat at the LEFT EDGE of the seat play
    // area (Q-3/I-93, discharging I-84(5a)): position DERIVED from the live seat-0 board
    // bbox (the K-D pattern, no magic point), holding its TWO PERSISTENT SHEET OBJECTS
    // (the three-objects law, I-86). Registered under focusGroups['ledger'].
    const book = ledger.ledgerBook(ctx.viewSeat, ctx.projection());
    const board = ctx.theater.focusObject('seat-0');
    if (board) {
      // L-5b (I-132): the SEAT FRAME LAW — the ledger sits PARALLEL TO ITS BOARD (the
      // owner: 'position of the ledger at each seat needs to be parallel to the board
      // seat'). Position + yaw derive from the board's OWN quaternion: left end of the
      // seat line (lateral −225), a step toward the player (normal +130) — the same
      // offsets the axis-aligned pose had, expressed in the board's frame.
      board.updateWorldMatrix(true, true);
      const c = new THREE.Box3().setFromObject(board).getCenter(new THREE.Vector3());
      const q = board.getWorldQuaternion(new THREE.Quaternion());
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      n.y = 0; n.normalize(); // toward the player, horizontal
      const lat = new THREE.Vector3(n.z, 0, -n.x); // the board's side axis
      book.position.copy(c).addScaledVector(lat, -225).addScaledVector(n, 130).setY(2);
      book.rotation.y = Math.atan2(n.x, n.z); // parallel to the board
    } else {
      book.position.set(-420, 2, 560); // defensive fallback (caught by the left-edge gate)
    }
    bookRoot = book;
    return book;
  },

  // Phase 0 (P-2, I-84 — the "cannot view the balance sheet" fix): a click while OPEN
  // closes the ledger UNLESS it lands on a report PAGE — a page click FALLS THROUGH to
  // Phase 2, where onPick ANCHORS that report (K-C closed on ANY click, so the Balance
  // page could never be selected; the any-click-closes contract is narrowed by exactly
  // the page exception).
  consumeClick(ctx, ev) {
    if (!ledger.ledgerState().open) return false;
    const r = ctx.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, ctx.camera);
    const hits = ray.intersectObjects(ctx.scene.children, true);
    for (const hit of hits) { // nearest MESH decides (edge LineSegments are skipped — K7-P D6)
      if (!(hit.object instanceof THREE.Mesh)) continue;
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        if (o.userData?.['ledgerPage']) return false; // a page — fall through to onPick (anchor)
        o = o.parent;
      }
      break; // the nearest mesh chain is not a page — the click is "elsewhere"
    }
    ledger.closeLedger();
    ctx.status('the ledger closes');
    return true;
  },

  // Phase 2: the closed folder — click FLIPS it open (cover swings, the reports RISE); an
  // OPEN report page — click ANCHORS it and zooms into its reading view (P-2, I-84).
  onPick(ctx, hit: PickInfo) {
    const page = hit.tags['ledgerPage'] as ledger.PageKind | undefined;
    if (page && ledger.ledgerState().open) {
      ledger.anchorPage(page);
      ctx.status(`reading the ${page === 'pnl' ? 'P&L' : 'Balance Sheet'} — zoom out for the spread`);
      return true;
    }
    if (hit.tags['ledger'] === true && bookRoot) {
      ctx.theater.setLastFocus('ledger');
      ledger.openLedger(ctx.projection(), ctx.viewSeat, anchorOf(bookRoot));
      ctx.status('the ledger flips open — the P&L (left) and Balance Sheet (right) rise; click a report to read it');
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
      // P-2 (I-84): the folder-fold pose (settles 1 open / 0 closed) — the flip-open state
      ledgerCoverOpen: ledger.ledgerCoverOpen,
      // P-2b/P-2c: the fold-then-deploy sequencing record + the THREE-OBJECTS oracles
      ledgerSpreadStartCover: ledger.ledgerSpreadStartCover,
      ledgerSheetIds: ledger.sheetIds,
      ledgerSheetsHome: ledger.sheetsHome,
      ledgerFolderForm: ledger.ledgerFolderForm,
      /** the FOLDER's world-top y — the RISE oracle (the pages must stand ABOVE it). */
      ledgerFolderY: () => (bookRoot ? new THREE.Box3().setFromObject(bookRoot).max.y : null),
      /** Q-3 (I-93; RE-DERIVED at I-132): the LEFT-EDGE oracle — 'left' in the BOARD'S
       *  OWN FRAME (lateral coordinate < the board's left edge), since the seat frames
       *  rotate with the corners now. The world-x form was placement-specific; the LAW
       *  (the books sit left of your board) is frame-relative. */
      ledgerLeftOfBoard: () => {
        const board = cx!.theater.focusObject('seat-0');
        if (!bookRoot || !board) return null;
        board.updateWorldMatrix(true, true);
        const c = new THREE.Box3().setFromObject(board).getCenter(new THREE.Vector3());
        const q = board.getWorldQuaternion(new THREE.Quaternion());
        const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        n.y = 0; n.normalize();
        const lat = new THREE.Vector3(n.z, 0, -n.x);
        const f = new THREE.Box3().setFromObject(bookRoot).getCenter(new THREE.Vector3());
        const latCoord = f.clone().sub(c).dot(lat);
        return { folderLat: latCoord, boardLeftLat: -130, left: latCoord < -130 };
      },
      /** a standing page's world bbox width/height — the PORTRAIT (report-sized) oracle. */
      ledgerPageBBox: (kind: 'pnl' | 'balance') => {
        const p = ledger.spreadPages().find((x) => x.kind === kind);
        const o = p ? ctx.theater.focusObject(p.id) : null;
        if (!o) return null;
        const b = new THREE.Box3().setFromObject(o);
        return { w: b.max.x - b.min.x, h: b.max.y - b.min.y };
      },
      /** a report page's centre projected to canvas pixels (the REAL-click helper for the
       *  anchor-per-report checks — the gate clicks the actual page, no synthetic call). */
      ledgerPageScreenXY: (kind: 'pnl' | 'balance') => {
        const p = ledger.spreadPages().find((x) => x.kind === kind);
        if (!p) return null;
        const o = ctx.theater.focusObject(p.id);
        if (!o) return null;
        const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
        ctx.camera.updateMatrixWorld();
        const v = c.project(ctx.camera);
        const r = ctx.renderer.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
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
