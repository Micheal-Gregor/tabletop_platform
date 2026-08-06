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
import { STATION_BOX } from '../playarea.js'; // PB-3 (I-177): the reposition clamp

let cx: PlayAreaContext | null = null;
let bookRoot: THREE.Object3D | null = null;
let bookOffset: { lat: number; out: number } | null = null; // PB-3 (I-177): the dragged ledger's claim (survives rebuilds)
let bookGrab: { plane: THREE.Plane; ray: THREE.Raycaster; start: THREE.Vector3; moved: number } | null = null;
let sheetGrab: { page: ledger.PageKind; plane: THREE.Plane; ray: THREE.Raycaster; moved: number; obj: THREE.Object3D } | null = null; // I-230: the reports drag like cards
const ledgerYaw = (): number => { const b = bookRoot; if (!b) return 0; const q = b.getWorldQuaternion(new THREE.Quaternion()); const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q); n.y = 0; n.normalize(); return Math.atan2(n.x, n.z); };

// the OPEN spread stands above the closed book, front of the viewing seat's board.
const anchorOf = (book: THREE.Object3D): THREE.Vector3 =>
  book.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 8, 0)); // I-229: the flat era — the pages lie ATOP the folder, not 138 above it

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
      book.position.copy(c).addScaledVector(lat, bookOffset?.lat ?? -190).addScaledVector(n, bookOffset?.out ?? 168).setY(6); // I-230: the HIERARCHY — area, then cards, then the FOLDER above them // G-B3 (I-165) default = the LEDGER SPAN's center · PB-3 (I-177): the OWNER may drag it — the offset is presentation state, like a card's stick
      // I-133 (the owner's screenshot catch — 'the folder rotated 45° instead of staying
      // flat'): the world-yaw PREMULTIPLIES the built pose. Setting rotation.y MUTATED
      // the folder's Euler (its flatness lives in rotation.x = −π/2; a .y write
      // composited a tilt and stood the folder on edge). Flat FIRST, then yawed.
      book.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(n.x, n.z)));
      ledger.setSpreadYaw(Math.atan2(n.x, n.z)); // O-1 (I-138): the risen pages follow the seat frame — no board overlap
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

  // PB-3 (I-177, the owner: 'I should be able to reposition the ledger … the same way
  // I move around cards'): a DRAG on the closed folder moves it — the board-frame
  // offset is stored (presentation state, like a card's stick) and clamped to the
  // station; release re-seats it. A TAP (<8u) falls through to the open (below).
  onGrabStart(ctx, hit: PickInfo) {
    // I-230: a DEPLOYED report grabs like a card — drag it anywhere in the play area.
    const pg = hit.tags['ledgerPage'] as ledger.PageKind | undefined;
    if (pg && ledger.ledgerState().open) {
      sheetGrab = { page: pg, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -8), ray: new THREE.Raycaster(), moved: 0, obj: (hit.object.parent ?? hit.object) };
      return true;
    }
    if (hit.tags['ledger'] !== true || !bookRoot || ledger.ledgerState().open) return false;
    bookGrab = { plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), -4), ray: new THREE.Raycaster(), start: bookRoot.position.clone(), moved: 0 };
    return true;
  },
  onGrabMove(ctx, ev: PointerEvent) {
    if (sheetGrab) {
      const r = ctx.renderer.domElement.getBoundingClientRect();
      sheetGrab.ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
      const p = new THREE.Vector3();
      if (sheetGrab.ray.ray.intersectPlane(sheetGrab.plane, p)) {
        const before = sheetGrab.obj.position.clone();
        sheetGrab.obj.position.set(p.x, Math.max(10, p.y + 12), p.z);
        sheetGrab.moved += sheetGrab.obj.position.distanceTo(before) > 0 ? sheetGrab.obj.position.distanceTo(before) : 0;
      }
      return;
    }
    if (!bookGrab || !bookRoot) return;
    const r = ctx.renderer.domElement.getBoundingClientRect();
    bookGrab.ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), ctx.camera);
    const p = new THREE.Vector3();
    if (bookGrab.ray.ray.intersectPlane(bookGrab.plane, p)) {
      bookRoot.position.set(p.x, 6, p.z);
      bookGrab.moved = Math.max(bookGrab.moved, p.distanceTo(bookGrab.start));
    }
  },
  onGrabEnd(ctx, _ev: PointerEvent) {
    if (sheetGrab) {
      const g2 = sheetGrab;
      sheetGrab = null;
      if (g2.moved < 8) { // the tap keeps its meaning: anchor the page for reading
        ledger.anchorPage(g2.page);
        ctx.status(`reading the ${g2.page === 'pnl' ? 'P&L' : 'Balance Sheet'} — zoom in for the close view`);
        return true;
      }
      // the DROP: store the claim in the folder's own frame — the report stays put
      if (bookRoot) {
        const anchor = anchorOf(bookRoot);
        const yaw = ledgerYaw();
        const lat = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const rel = g2.obj.position.clone().sub(anchor);
        ledger.setSheetClaim(g2.page, { lat: rel.dot(lat), out: rel.dot(n) });
        g2.obj.position.setY(anchor.y + 6);
        ctx.status(`${g2.page === 'pnl' ? 'the P&L' : 'the Balance Sheet'} stays where you put it — it returns to the folder when the books close`);
      }
      return true;
    }
    if (!bookGrab || !bookRoot) return false;
    const wasTap = bookGrab.moved < 8;
    if (wasTap) {
      bookRoot.position.copy(bookGrab.start);
      bookGrab = null;
      ctx.theater.setLastFocus('ledger');
      ledger.openLedger(ctx.projection(), ctx.viewSeat, anchorOf(bookRoot));
      ctx.status('the ledger flips open — the P&L (left) and Balance Sheet (right) rise; click a report to read it');
      return true;
    }
    // store the new claim in the SEAT-0 board frame, clamped to the station box
    const board = ctx.theater.focusObject('seat-0');
    if (board) {
      board.updateWorldMatrix(true, true);
      const c = new THREE.Box3().setFromObject(board).getCenter(new THREE.Vector3());
      const q = board.getWorldQuaternion(new THREE.Quaternion());
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q); n.y = 0; n.normalize();
      const lat = new THREE.Vector3(n.z, 0, -n.x);
      const rel = bookRoot.position.clone().sub(c);
      bookOffset = {
        lat: Math.max(-STATION_BOX.halfW + 70, Math.min(STATION_BOX.halfW - 70, rel.dot(lat))),
        out: Math.max(40, Math.min(STATION_BOX.depth - 30, rel.dot(n))),
      };
    }
    bookGrab = null;
    ctx.rebuild(); // the claim re-seats it (the same folder object, re-posed)
    ctx.status('the ledger settles at its new spot — your claim holds');
    return true;
  },
  onGrabAbort(_ctx) { if (bookGrab && bookRoot) { bookRoot.position.copy(bookGrab.start); bookGrab = null; } },

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
      ledgerUpright: ledger.spreadUpright, // G-D (I-166): lean + heading error per displayed sheet
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
        return { folderLat: latCoord, boardLeftLat: -130, left: latCoord < -130 }; // (−180 sits left of the board's −130 edge ✓)
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
