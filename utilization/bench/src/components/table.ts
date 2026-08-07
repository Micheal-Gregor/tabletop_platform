/**
 * TABLE component (K-A adapter, I-77) — THE SURFACE. Wraps the EXISTING pure builders
 * (surfaces.layoutFace, stacks.cardStack/cardBack) and the EXISTING onion.ts reading
 * board UNCHANGED, delegating; owns the engine-bound table face (fills stamped from the
 * projection), the count-true deck/discard stacks, the deck/discard FIDGET, and the
 * DRAW-THEATER cluster — Q-2 (I-90): doDraw → FLIP AT THE PILE → onion DISPLAYS (no
 * flight) → on close the same card ROUTES to its destination (engine truth).
 *
 * Placement: free{surface:'ground'} — the table is the root surface others bind to
 * (K-A inert metadata; the current geometry is preserved).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { layoutFace, panelTexture } from '../surfaces.js';
import { stackNudging, tickStackNudge, nudgeStack } from '../stacks.js'; // cardStack retired at C-1b2 (I-154) — every pile is instances
import * as onion from '../onion.js';
import * as draw from '../table-draw.js'; // Q-2b (I-91): the flick-to-flip draw cluster (size-gate extraction)
import * as dplay from '../discard-play.js'; // Q-6 (I-94): the live discard pile
import * as supply from '../supply-draw.js'; // C-1c (I-156): the flick-move door on the supply piles
import * as oracles from './table-oracles.js'; // S-1 (I-103): the size-gate oracle extraction
import { CARD_FAMILY, genesisDrawFor } from '../../../../packs/boty/src/index.js'; // Q-2c (I-92) · I-252: the pool reconstruction retired — the state's order projects
const SESSION_SEED = 'maple-hollow'; // the bench session (game3d's host seed — single-source debt on I-154)
import { getTableMode, setTableMode, OBJECT_SCALE, TABLE_SCALE } from '../playarea.js'; // I-145/I-150/I-183
import { handlePileClick } from '../pile-actions.js'; // the size-gate extraction (I-146)
import { worldPoolStack, worldEventStack, eventStackTargets } from '../stacks3d.js'; // C-1b/C-1b2 (I-149/I-154): every pile as instance stacks
import { tickArrivals, arrivalsInfo } from '../arrivals.js'; // PB-9b (I-201)
import { SEAT_YAWS } from '../stage.js';
import { TOWN_TABLE_V2, SHOP_BOARD, BOTY_PACK6, BOOKS_PANEL } from '../../../../packs/boty/src/index.js'; // T-1 (I-89): the v2 table child · BOOKS_PANEL: G-1b (I-102) count law

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

let cx: PlayAreaContext | null = null;

// ── FIDGET (I-67e): PURE THEATER — seeded offsets, meshes only, never state ──
const fidget: Record<string, number> = { deck: 0, discard: 0 };

// ── Q-2c (I-92): THE DERIVED PARTITION — ownDiscard split by CARD_FAMILY (content data):
// global → the table's GLOBAL CARDS IN PLAY slots · session → the active seat's row ·
// else the pile. Derived-never-stored; every card renders exactly once. ──
function partition(ownDiscard: readonly string[]): { global: string[]; session: string[]; pile: string[] } {
  const global: string[] = [], session: string[] = [], pile: string[] = [];
  for (const id of ownDiscard) {
    const f = CARD_FAMILY[id];
    if (f === 'global') global.push(id);
    else if (f === 'session') session.push(id);
    else pile.push(id);
  }
  return { global, session, pile };
}
let tableRoot: THREE.Group | null = null; // G-1 (I-101): the live table group — the RENDERED-rects oracle walks THIS, never the def
let pendingPools: { rid: string; cls: string; count: number; excl: Set<string>; order?: readonly string[] }[] = []; // C-1b/C-1c (I-149/I-156)
let pendingEvents: { rid: string; prefix: string; count: number; faces: readonly string[] | null; order: readonly string[] | null }[] = []; // C-1b2 (I-154)
let poolGroups: THREE.Group[] = []; // I-153: last build's world-space pool stacks — purged each build (stale first-match ghosts poison focusObject)

// ── DRAW THEATER — Q-2b (I-91): the FLICK-TO-FLIP cluster lives in table-draw.ts (the
// size-gate extraction). This adapter delegates: grab/flick/flip/onion/route. ──

export const table: Component = {
  id: 'table',
  anchorKey: 'table',
  placement: { kind: 'free', surface: 'ground' },

  build(ctx) {
    cx = ctx;
    dplay.resetDiscardPlay(); // a rebuild drops any live discard gesture/tween (K7-P D2)
    draw.resetDraw(ctx); // S-1 (I-103): a rebuild drops a live flip/reading/routing theater — never two cards (M4)
    supply.resetSupply(ctx); // C-1c (I-156): same law for the supply theater
    const v = ctx.projection();
    const active = v.seats[v.turn.seatIdx]!.id;
    const ranked = [...v.seats].sort((a, b) => b.cash - a.cash);
    // PB-7 (I-183, owner: 'the center left box show player summary info'): the
    // standings grow into the PLAYER SUMMARY — cash · crew · hand per seat, ranked.
    const standings = ranked.map((s) => `${s.id === active ? '★ ' : ''}${s.id}  $${s.cash} ⚒${v.crew.filter((m) => m.outfit === s.id).length} ✋${s.handCount}`);
    const moves = ctx.moves(); // I-52-registered class (display-only)
    const log = moves.slice(-4).map((m) => `${m.seat} · ${m.type}`);
    // the table: flat on the ground, fills stamped from the projection; deck+discard
    // regions are STACK OBJECTS, not quads (I-67a) — the geometry is the count
    const t = layoutFace(TOWN_TABLE_V2, 0xeef3ee, {
      standings: ['THE TABLE', ...standings],
      log: ['TABLE LOG', ...(log.length ? log : ['(no moves yet)'])],
      // I-130: the `windows` region is REMOVED (suppressed at the def) — prompts live on
      // the onion layer now; its fill left with it. The medal region gets its label.
      'art-banner': [`[art: ${SEASONS[(v.turn.round - 1) % 4]} — Maple Hollow]`], // the SEASON block, top-left (T-1)
      'global-play': ['GLOBAL CARDS IN PLAY'], // Q-2c: the slots fill left-to-right below the label
      medal: ['BOTY — Business of the Year'], // I-130: the medal exhibit's footprint label
    }, ['deck', 'discard', 'tradespeople-pile', 'equipment-pile', 'bbb-pile', 'networking-pile']);
    // C-1b2 (I-154): the EVENT DECK + DISCARD are instance stacks too — queued like the
    // pools, built world-space after the table's pose is final. The viewer's own deck
    // carries the REMAINING ORDER (genesis order minus drawn) so the top instance IS
    // the next card — the flick flips the very object that was drawn (permanence).
    const part = partition(v.ownDiscard);
    const drawCount = v.decks[active]?.drawCount ?? 0;
    const deckOrder = active === ctx.viewSeat
      ? genesisDrawFor(SESSION_SEED, active).filter((id) => !v.ownDiscard.includes(id))
      : null;
    pendingEvents = [
      { rid: 'deck', prefix: `${active}::`, count: drawCount, faces: null, order: deckOrder },
      { rid: 'discard', prefix: `${ctx.viewSeat}::`, count: part.pile.length, faces: part.pile, order: null },
    ];
    const gpR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'global-play')!;
    part.global.slice(0, 6).forEach((id, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(OBJECT_SCALE.card.w / 9, OBJECT_SCALE.card.h / 7), new THREE.MeshBasicMaterial({ map: panelTexture([id], 9, 15) })); // I-150: the control-table card size (÷ the table scale)
      m.position.set(gpR.x + 8 + i * 11 - 50, 50 - (gpR.y + gpR.h - 9), 0.7); // left-fill along the section
      m.userData = { card: true, slotCard: id, family: 'global', region: 'global-play' }; // I-213: a click on a global CARD anchors the SQUARE (the minis predate the anchor system — the stale-anchor conflict closed; C-1e's instances inherit the tag)
      t.add(m);
    });
    // L-4 (I-131): the SESSION (local) cards MOVED to the viewer's seat-front BOTTOM ROW
    // (seat-play's row plan — 'if a local card is drawn, it is added as a bottom row');
    // the Q-2c active-seat placement is superseded on the record. Family tags travel
    // with them, so renderedPartition keeps counting wherever they stand.
    // A16 (I-137): the tradesperson + equipment piles are REAL — counts BIND to the
    // projection's pools (hire/buy pop them; count-true is the law, I-82f discharged).
    // C-1b (I-149): the four SUPPLY DECKS are literal stacks of their Card3D instances
    // ('made each deck an actual deck of cards') — world-space piles (world-sized
    // instances never enter the scaled table group) built after t's pose is final.
    // Membership = the class minus what is visible elsewhere; the remainder of the
    // count PARKS (redaction by absence; permanence holds — parked ≠ destroyed).
    // C-1c (I-156): each pool stack carries the engine's REMAINING order (genesis order
    // minus what was popped from the top) — the flicked top IS the next popped card.
    // I-252 (THE SLICK-LAWYER PHANTOM'S ROOT, superseding the I-156 reconstruction):
    // the order comes from THE ENGINE'S STATE (v.poolOrders), never the genesis-seed
    // suffix — that model was only true while pools popped from the top. A BOTTOM
    // RETURN (a played hand card, a released crew) broke it: hand cards rendered into
    // the pile while the returned card was claimed by NOBODY and stranded wherever it
    // last stood, until a count change happened to re-cover it.
    const po = v.poolOrders;
    pendingPools = [
      { rid: 'tradespeople-pile', cls: 'tradesperson', count: v.pools.tradespeople, excl: new Set(v.crew.map((m) => m.id)), order: po.tradespeople },
      { rid: 'equipment-pile', cls: 'equipment', count: v.pools.equipment, excl: new Set(v.seats.flatMap((s2) => s2.assets.map((a) => a.ref))), order: po.equipment },
      { rid: 'bbb-pile', cls: 'bbb', count: v.pools.bbb, excl: new Set(v.ownDiscard), order: po.bbb },
      { rid: 'networking-pile', cls: 'networking', count: v.pools.networking, excl: new Set(v.ownDiscard), order: po.networking },
    ];
    // O-5 (I-146): THICKNESS — the table is a SLAB on the counter stratum (the A2b
    // thin-box lesson at scale): a 16-unit body under the face, diffuse, NO region tag
    // (the count law holds by construction; every consumer reads live bboxes).
    const slab = new THREE.Mesh(new THREE.BoxGeometry(100, 100, 16), new THREE.MeshBasicMaterial({ color: 0xdfe5df }));
    slab.position.z = -8.2; // under the face IN LOCAL z — the whole group is RAISED below (F-3)
    slab.userData['slab'] = true;
    t.add(slab);
    // I-145: the ORIENTATION MODE (a template option) — 'rotate-to-active' premultiplies
    // the world-yaw so the board's bottom edge faces the active player (the I-133
    // quaternion lesson: flat FIRST, then yawed); 'fixed' (BOTY's config) stays still.
    t.rotation.x = -Math.PI / 2;
    if (getTableMode() === 'rotate-to-active') {
      t.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), SEAT_YAWS[v.turn.seatIdx] ?? 0));
    }
    t.scale.set(TABLE_SCALE.x, TABLE_SCALE.y, 1); // PB-7 (I-183): the single-source scale — the ring follows
    t.position.y = 16.4; // F-3 (I-148): the table SITS ON the counter — slab bottom at y≈0, felt on top ('y+a above the surface, not cut in two')
    t.userData['focus'] = 'table';
    tableRoot = t; // G-1 (I-101): the oracle's walk root
    // the pool stacks need t's WORLD pose — set it now (position/rotation are final),
    // then build them as SCENE-level groups (world-sized instances; count law carried).
    t.updateMatrixWorld(true);
    for (const old of poolGroups) old.parent?.remove(old); // I-153: purge before rebuild
    poolGroups = [];
    for (const pp of pendingPools) {
      const g2 = worldPoolStack(t, pp.rid, pp.cls, pp.count, pp.excl, pp.order ?? null); // I-153/I-156: THIS build's table; identity-true order
      if (g2) { cx!.register(g2); poolGroups.push(g2); }
    }
    pendingPools = [];
    for (const pe of pendingEvents) {
      const g3 = worldEventStack(t, pe.rid, pe.prefix, pe.count, pe.faces, pe.order, fidget[pe.rid] ?? 0); // C-1b2 (I-154)
      if (g3) { cx!.register(g3); poolGroups.push(g3); }
    }
    pendingEvents = [];
    return t;
  },

  // Phase 0: ANY click closes the open reading board; consumed (I-67b). A DRAW reading
  // routes its card on close (Q-2/I-90); a discard flick-read just closes (Q-6/I-94).
  consumeClick(ctx) {
    if (onion.onionState().open) {
      onion.closeOnion();
      if (draw.drawPhaseState() === 'reading') {
        draw.startRoute(ctx);
        ctx.status('reading board closed — the card routes to its place');
      } else {
        ctx.status('reading board closed');
      }
      return true;
    }
    return false;
  },

  // CONTRACT v2: the GRAB protocol — a DISCARD pile card grabs any turn (toss/flick-read,
  // Q-6/I-94); the DECK's top card grabs on the viewer's turn (flick-to-draw, Q-2b/I-91).
  onGrabStart(ctx, hit: PickInfo) {
    // a pile card (region 'discard') OR a card currently OUT of the pile (the
    // `discardLoose` marker — scene-parented, so its region tag is gone; I-95 re-grab)
    if (hit.tags['card'] === true && (hit.region === 'discard' || hit.tags['discardLoose'] === true)) {
      let m: THREE.Object3D | null = hit.object;
      while (m && !m.userData?.['card']) m = m.parent;
      const grp = ctx.theater.focusObject('table:discard');
      if (m && grp) return dplay.discardGrabStart(ctx, m, grp, hit.event);
      return false;
    }
    if (supply.grabStart(ctx, hit)) return true; // C-1c (I-156): the supply flick door
    return draw.grabStart(ctx, hit);
  },
  onGrabMove(ctx, ev: PointerEvent) {
    if (dplay.discardGrabbing() === 'held') { dplay.discardGrabMove(ctx, ev); return; }
    if (supply.supplyPhase() === 'grabbing') { supply.grabMove(ctx, ev); return; }
    draw.grabMove(ctx, ev);
  },
  onGrabEnd(ctx, ev: PointerEvent) {
    if (dplay.discardGrabbing() === 'held') return dplay.discardGrabEnd(ctx, ev);
    if (supply.supplyPhase() === 'grabbing') return supply.grabEnd(ctx, ev);
    return draw.grabEnd(ctx, ev);
  },
  // CONTRACT v3 (S-1, I-103): abort both grab surfaces — a held discard card glides home,
  // a grabbed deck card settles back face down. Graceful for cancel AND rebuild.
  onGrabAbort(_ctx) {
    dplay.discardGrabCancel();
    supply.abortGrab(); // C-1c: a live supply grab settles back face down
    draw.abortGrab();
  },

  // Phase 2: the felt → table; a region click anchors that region (I-66d); a deck click
  // fires the draw on the VIEWER'S turn, else steps the deck fidget; discard clicks step
  // its fidget always. Fidget = PURE THEATER.
  onPick(ctx, hit: PickInfo) {
    if (hit.focus !== 'table') return false;
    // I-227 (owner: 'every time I select a child it zooms out') — the pick's legacy
    // glideTo('table') RETIRED: a click SELECTS, it never travels; travel is the
    // wheel's and the buttons' alone (the I-226 grammar).
    const region = hit.region;
    // I-236: the anchor has ONE author (the resolver) — this pick keeps only its actions
    if (region === 'deck') {
      const v = ctx.projection();
      // Q-2b (I-91): a plain CLICK no longer draws — the flick gesture is the draw. The
      // grab protocol consumed any viewer-turn tap as the nudge; reaching here on the
      // viewer's turn means an edge case (e.g. read-mode entry) — hint, don't act.
      if (v.seats[v.turn.seatIdx]!.id === ctx.viewSeat) { ctx.status('the EVENT DECK — grab the top card and FLICK to flip it'); }
      else { fidget['deck'] = ((fidget['deck'] ?? 0) + 1) % 3; ctx.rebuild(); ctx.status(`event deck fidget → ${['neat', 'loose pile', 're-scatter'][fidget['deck']]}`); }
    } else if (region === 'bbb-pile' || region === 'networking-pile' || region === 'tradespeople-pile' || region === 'equipment-pile') {
      handlePileClick(ctx, region); // O-3/A16 (I-137/I-139) — the pile verbs + off-turn nudge live in pile-actions.ts VERBATIM (size extraction)
    } else if (region === 'discard') {
      // Q-6 (I-94): the 3-step fidget, ANIMATED — the cards TWEEN to the next state's
      // poses (no rebuild snap; the "cheap image thing" closed).
      const grp = ctx.theater.focusObject('table:discard');
      const tbl = ctx.theater.focusObject('table');
      if (grp && grp.parent && tbl) {
        // S-1 (I-103, closing K7-Q M5): the counter commits ONLY when the tween is
        // ACCEPTED. C-1b2 (I-154): with INSTANCE stacks there is no parallel next-group
        // (it would steal the very cards) — the next state's POSES are computed pure and
        // the live cards tween to them (the same trace, the same swap-free honesty).
        const cand = ((fidget['discard'] ?? 0) + 1) % 3;
        const part2 = partition(ctx.projection().ownDiscard);
        const targets = eventStackTargets(tbl, 'discard', part2.pile.length, cand);
        if (targets && dplay.startFidgetPoseTween(ctx, grp as THREE.Group, targets)) {
          fidget['discard'] = cand;
          ctx.status(`discard fidget → ${['neat', 'peek', 'spread five'][cand]} (the cards move)`);
        } else {
          ctx.status('the pile holds still — cards are out of place or mid-move');
        }
      }
    }
    return true;
  },

  // Q-2b/Q-6: the draw step (table-draw) + the live discard (tween/hold/return); delegate.
  tick(ctx) { draw.tickDraw(ctx); supply.tickSupply(ctx); dplay.tickDiscardPlay(ctx); tickStackNudge(); tickArrivals(); }, // + R-1a2 nudge · C-1c supply · PB-9b arrivals (ONE host — the table always builds)

  gate() {
    const ctx = cx!;
    return {
      // G-1b (I-102): the VG8a count law caught up with P-2c — the TWO persistent ledger
      // sheets (the three-objects law, 677d1c5) are genesis-time layoutFace(BOOKS_PANEL)
      // builds, 6 region quads each. The law lagged since that commit (82 vs the true 94);
      // the first fully-read battery (I-100→G-1) surfaced it. Def-driven, like the rest.
      expectedFromDefs: () => TOWN_TABLE_V2.regions.length + BOTY_PACK6.seats.length * SHOP_BOARD.regions.length + 2 * BOOKS_PANEL.regions.length,
      // the render-walking oracles live in table-oracles.ts (S-1's size-gate extraction)
      tableRegionRects: () => oracles.renderedRegionRects(tableRoot, cx!.scene), // I-154: world stacks included (render-true inversion)
      renderedPartition: () => oracles.renderedPartitionCounts(cx!),
      regionCount: () => { let n = 0; ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['region']) n++; }); return n; },
      stamped: (regionId: string) => {
        let out: readonly string[] | null = null;
        ctx.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['region'] === regionId && o.userData?.['renderedLines']) out = o.userData['renderedLines'] as string[]; });
        return out;
      },
      /** the current draw phase (gates WAIT ON STATE — I-67), the onion, the drill, the stacks */
      drawPhase: draw.drawPhaseState,
      /** Q-2/Q-2b oracles: the theater card's live position vs the deck (flip-not-fly),
       *  the completed route record, and the last GESTURE verdict (flicked | weak). */
      drawTheater: () => draw.drawTheaterInfo(cx!),
      lastRoute: draw.lastRoute,
      drawGesture: draw.drawGesture,
      /** Q-6 (I-94) live-discard oracles: the gesture phase · the fidget transition · the
       *  last flick-read record (gates wait on these STATES, never clocks). */
      discardGesture: dplay.discardGrabbing,
      discardPool: dplay.discardPoolSize,
      discardTransitioning: dplay.discardFidgetTransitioning,
      discardFlickRead: dplay.lastFlickRead,
      discardTweenTrace: dplay.discardTweenTrace, // G-1 (I-101): M6's motion teeth
      discardReturnTrace: dplay.discardReturnTrace, // G-1 (I-101): M8's glide teeth
      discardSlideTrace: dplay.discardSlideTrace, // R-1b (I-122): the toss-physics oracle {steps, dist}
      orphanGrabMeshes: () => ({ phase: draw.drawPhaseState(), count: oracles.orphanGrabMeshCount(cx!) }),
      deckNudging: stackNudging, // R-1a2 (I-110): the tap-nudge state (the gate waits on it)
      tableMode: getTableMode, // I-145: the orientation mode (template data)
      slabCount: () => { let n = 0; cx!.scene.traverse((o: THREE.Object3D) => { if (o.userData?.['slab']) n++; }); return n; }, // O-5: table 1 + boards 6
      setTableMode: (m: 'fixed' | 'rotate-to-active') => { setTableMode(m); cx!.rebuild(); }, // the drill door
      tableYawDeg: () => { const t2 = cx!.theater.focusObject('table'); if (!t2) return null; const q = t2.getWorldQuaternion(new THREE.Quaternion()); const up = new THREE.Vector3(0, 0, -1).applyQuaternion(q); return (Math.atan2(up.x, up.z) * 180) / Math.PI; }, // the board's 'up-edge' heading
      // S-1b (I-104): these five were DROPPED by the S-1 extraction surgery — the full
      // battery caught it at VG8j:81 (`onionState is not a function`). Restored verbatim.
      /** Q-2c (I-92) partition oracles: the family DATA + the derived view's sums. */
      cardFamily: (id: string) => CARD_FAMILY[id] ?? 'discard',
      partitionView: () => {
        const v = cx!.projection();
        const p = partition(v.ownDiscard);
        return { global: p.global, session: p.session, pile: p.pile, total: v.ownDiscard.length };
      },
      onionState: onion.onionState,
      onionRegions: onion.onionRegions,
      forceFlipMismatch: draw.setForceFlipMismatch,
      stackInfo: (rid: string) => oracles.stackInfoOf(cx!, rid, fidget[rid] ?? 0),
      deckTopUuid: () => oracles.stackTopUuidOf(cx!, 'deck'), // I-112: the identity oracle
      drawGrabUuid: draw.drawGrabUuid, // I-112: the grabbed mesh's uuid (null at idle)
      drawFlipDir: draw.drawFlipDir, // I-113: the flick's direction (+1 cw · −1 ccw)
      drawFaceUp: draw.drawFaceUp, // I-115/M3: the traveler's face-up truth (≈+1 face-up)
      regionScreenXY: (rid: string) => oracles.regionScreenXYOf(cx!, rid),
      /** C-1c (I-156) supply flick-move oracles: phase · gesture verdict · the last
       *  anchor-change record (id + identity law + end≈target) · the grab identity. */
      supplyPhase: supply.supplyPhase,
      supplyGesture: supply.supplyGesture,
      supplyLastMove: supply.supplyLastMove,
      supplyGrabUuid: supply.supplyGrabUuid,
      arrivals: arrivalsInfo, // PB-9b (I-201): {active, last:{dist, frames}} — a snap-claim mutant records frames ≤ 1
    };
  },
};
