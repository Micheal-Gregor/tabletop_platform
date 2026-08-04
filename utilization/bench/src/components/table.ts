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
import { cardStack, stackNudging, tickStackNudge } from '../stacks.js';
import * as onion from '../onion.js';
import * as draw from '../table-draw.js'; // Q-2b (I-91): the flick-to-flip draw cluster (size-gate extraction)
import * as dplay from '../discard-play.js'; // Q-6 (I-94): the live discard pile
import * as oracles from './table-oracles.js'; // S-1 (I-103): the size-gate oracle extraction
import { CARD_FAMILY } from '../../../../packs/boty/src/index.js'; // Q-2c (I-92)
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
    const v = ctx.projection();
    const active = v.seats[v.turn.seatIdx]!.id;
    const ranked = [...v.seats].sort((a, b) => b.cash - a.cash);
    const standings = ranked.map((s) => `${s.id === active ? '★ ' : ''}${s.id}  $${s.cash}`);
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
    const deckR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'deck')!;
    const discR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'discard')!;
    t.add(cardStack(deckR, 'deck', v.decks[active]?.drawCount ?? 0, null, fidget['deck']));
    // Q-2c (I-92): the pile renders the PARTITION's pile slice; globals + session cards
    // render IN PLAY (left-filled, discard order). pile + global + session ≡ ownDiscard.
    const part = partition(v.ownDiscard);
    t.add(cardStack(discR, 'discard', part.pile.length, part.pile, fidget['discard'])); // the VIEWER'S discard — redaction-honest (I-67a)
    const gpR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'global-play')!;
    part.global.slice(0, 6).forEach((id, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 15), new THREE.MeshBasicMaterial({ map: panelTexture([id], 9, 15) }));
      m.position.set(gpR.x + 8 + i * 11 - 50, 50 - (gpR.y + gpR.h - 9), 0.7); // left-fill along the section
      m.userData = { card: true, slotCard: id, family: 'global' };
      t.add(m);
    });
    // L-4 (I-131): the SESSION (local) cards MOVED to the viewer's seat-front BOTTOM ROW
    // (seat-play's row plan — 'if a local card is drawn, it is added as a bottom row');
    // the Q-2c active-seat placement is superseded on the record. Family tags travel
    // with them, so renderedPartition keeps counting wherever they stand.
    // A16 (I-137): the tradesperson + equipment piles are REAL — counts BIND to the
    // projection's pools (hire/buy pop them; count-true is the law, I-82f discharged).
    const tpR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'tradespeople-pile')!;
    const eqR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'equipment-pile')!;
    t.add(cardStack(tpR, 'tradespeople-pile', v.pools.tradespeople, null, 0));
    t.add(cardStack(eqR, 'equipment-pile', v.pools.equipment, null, 0));
    // I-130: the TWO NEW staged decks (BBB · Networking) — row C, same staging law as
    // A16 (counts bind to state when their engine decks land; presentation stages).
    const bbR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'bbb-pile')!;
    const nwR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'networking-pile')!;
    t.add(cardStack(bbR, 'bbb-pile', 6, null, 0));
    t.add(cardStack(nwR, 'networking-pile', 6, null, 0));
    t.rotation.x = -Math.PI / 2;
    t.scale.set(9, 7, 1);
    t.userData['focus'] = 'table';
    tableRoot = t; // G-1 (I-101): the oracle's walk root
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
    return draw.grabStart(ctx, hit);
  },
  onGrabMove(ctx, ev: PointerEvent) {
    if (dplay.discardGrabbing() === 'held') { dplay.discardGrabMove(ctx, ev); return; }
    draw.grabMove(ctx, ev);
  },
  onGrabEnd(ctx, ev: PointerEvent) {
    if (dplay.discardGrabbing() === 'held') return dplay.discardGrabEnd(ctx, ev);
    return draw.grabEnd(ctx, ev);
  },
  // CONTRACT v3 (S-1, I-103): abort both grab surfaces — a held discard card glides home,
  // a grabbed deck card settles back face down. Graceful for cancel AND rebuild.
  onGrabAbort(_ctx) {
    dplay.discardGrabCancel();
    draw.abortGrab();
  },

  // Phase 2: the felt → table; a region click anchors that region (I-66d); a deck click
  // fires the draw on the VIEWER'S turn, else steps the deck fidget; discard clicks step
  // its fidget always. Fidget = PURE THEATER.
  onPick(ctx, hit: PickInfo) {
    if (hit.focus !== 'table') return false;
    ctx.theater.glideTo('table');
    const region = hit.region;
    if (region) { ctx.theater.setLastFocus(`table:${region}`); ctx.status(`anchored: ${region} — zoom in for its read view`); }
    if (region === 'deck') {
      const v = ctx.projection();
      // Q-2b (I-91): a plain CLICK no longer draws — the flick gesture is the draw. The
      // grab protocol consumed any viewer-turn tap as the nudge; reaching here on the
      // viewer's turn means an edge case (e.g. read-mode entry) — hint, don't act.
      if (v.seats[v.turn.seatIdx]!.id === ctx.viewSeat) { ctx.status('grab the top card and FLICK to flip it'); }
      else { fidget['deck'] = ((fidget['deck'] ?? 0) + 1) % 3; ctx.rebuild(); ctx.status(`deck fidget → ${['neat', 'loose pile', 're-scatter'][fidget['deck']]}`); }
    } else if (region === 'tradespeople-pile' || region === 'equipment-pile') {
      // A16 (I-137): YOUR turn → the pile's verb through the doors (hire / buy); a
      // refusal (empty pool, off-turn) speaks via submitVerb's status. The hire-flight
      // flourish is the registered polish row — the rebuild renders truth today.
      const v3 = ctx.projection();
      if (v3.seats[v3.turn.seatIdx]!.id === ctx.viewSeat) {
        const verb = region === 'tradespeople-pile' ? 'hire' : 'buy-equipment';
        if (ctx.submit(verb, {})) {
          ctx.rebuild();
          ctx.status(verb === 'hire' ? 'hired — a new tradesperson joins your crew' : 'bought — the equipment joins your rack');
        }
      } else {
        ctx.status(`${region === 'tradespeople-pile' ? 'the tradesperson pool' : 'the equipment pool'} — hire on your turn`);
      }
    } else if (region === 'discard') {
      // Q-6 (I-94): the 3-step fidget, ANIMATED — the cards TWEEN to the next state's
      // poses (no rebuild snap; the "cheap image thing" closed).
      const grp = ctx.theater.focusObject('table:discard');
      if (grp && grp.parent) {
        // S-1 (I-103, closing K7-Q M5): the counter commits ONLY when the tween is
        // ACCEPTED — a refused click (cards out, tween live) advances nothing and says
        // so, so the pile can never SNAP to an unanimated state on the next rebuild.
        const cand = ((fidget['discard'] ?? 0) + 1) % 3;
        const v2 = ctx.projection();
        const part2 = partition(v2.ownDiscard);
        const discR2 = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'discard')!;
        const next = cardStack(discR2, 'discard', part2.pile.length, part2.pile, cand);
        grp.parent.add(next);
        if (dplay.startFidgetTween(ctx, grp as THREE.Group, next)) {
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
  tick(ctx) { draw.tickDraw(ctx); dplay.tickDiscardPlay(ctx); tickStackNudge(); }, // + R-1a2: the stack-proof nudge

  gate() {
    const ctx = cx!;
    return {
      // G-1b (I-102): the VG8a count law caught up with P-2c — the TWO persistent ledger
      // sheets (the three-objects law, 677d1c5) are genesis-time layoutFace(BOOKS_PANEL)
      // builds, 6 region quads each. The law lagged since that commit (82 vs the true 94);
      // the first fully-read battery (I-100→G-1) surfaced it. Def-driven, like the rest.
      expectedFromDefs: () => TOWN_TABLE_V2.regions.length + BOTY_PACK6.seats.length * SHOP_BOARD.regions.length + 2 * BOOKS_PANEL.regions.length,
      // the render-walking oracles live in table-oracles.ts (S-1's size-gate extraction)
      tableRegionRects: () => oracles.renderedRegionRects(tableRoot),
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
    };
  },
};
