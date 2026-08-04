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
import { cardStack } from '../stacks.js';
import * as onion from '../onion.js';
import * as draw from '../table-draw.js'; // Q-2b (I-91): the flick-to-flip draw cluster (size-gate extraction)
import { CARD_FAMILY } from '../../../../packs/boty/src/index.js'; // Q-2c (I-92)
import { TOWN_TABLE_V2, SHOP_BOARD, BOTY_PACK6 } from '../../../../packs/boty/src/index.js'; // T-1 (I-89): the v2 table child

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
let sessionGroup: THREE.Group | null = null; // purged each build (the K7-P D2 pattern)

// ── DRAW THEATER — Q-2b (I-91): the FLICK-TO-FLIP cluster lives in table-draw.ts (the
// size-gate extraction). This adapter delegates: grab/flick/flip/onion/route. ──

export const table: Component = {
  id: 'table',
  anchorKey: 'table',
  placement: { kind: 'free', surface: 'ground' },

  build(ctx) {
    cx = ctx;
    const v = ctx.projection();
    const active = v.seats[v.turn.seatIdx]!.id;
    const ranked = [...v.seats].sort((a, b) => b.cash - a.cash);
    const standings = ranked.map((s) => `${s.id === active ? '★ ' : ''}${s.id}  $${s.cash}`);
    const moves = ctx.moves(); // I-52-registered class (display-only)
    const log = moves.slice(-4).map((m) => `${m.seat} · ${m.type}`);
    const openWindows = v.windows.filter((w) => w.status === 'open').length;
    // the table: flat on the ground, fills stamped from the projection; deck+discard
    // regions are STACK OBJECTS, not quads (I-67a) — the geometry is the count
    const t = layoutFace(TOWN_TABLE_V2, 0xeef3ee, {
      standings: ['THE TABLE', ...standings],
      log: ['TABLE LOG', ...(log.length ? log : ['(no moves yet)'])],
      windows: ['windows', openWindows ? `${openWindows} open — prompts at A8` : 'none open'],
      'art-banner': [`[art: ${SEASONS[(v.turn.round - 1) % 4]} — Maple Hollow]`], // the SEASON block, top-left (T-1)
      'global-play': ['GLOBAL CARDS IN PLAY'], // Q-2c: the slots fill left-to-right below the label
    }, ['deck', 'discard', 'tradespeople-pile', 'equipment-pile']);
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
    if (sessionGroup) { sessionGroup.parent?.remove(sessionGroup); sessionGroup = null; }
    if (part.session.length) {
      const seatObj = ctx.theater.focusObject(`seat-${v.turn.seatIdx}`);
      if (seatObj) {
        const bb = new THREE.Box3().setFromObject(seatObj);
        const c = bb.getCenter(new THREE.Vector3());
        const dir = c.z > 0 ? -1 : 1; // toward the table — "under the active player's seat"
        const sg = new THREE.Group();
        part.session.slice(0, 6).forEach((id, i) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(52, 78), new THREE.MeshBasicMaterial({ map: panelTexture([id], 10, 16) }));
          m.rotation.x = -Math.PI / 2;
          m.position.set(c.x - 150 + i * 62, 2, c.z + dir * 70); // left-fill across the board's front
          m.userData = { card: true, slotCard: id, family: 'session' };
          sg.add(m);
        });
        sessionGroup = sg;
        ctx.scene.add(sg);
      }
    }
    // T-1 (I-89): the A16 pile STACKS — STAGED EXHIBITS (pure theater, like the die): the
    // slice has no tradesperson/equipment decks yet; counts bind to state when the engine
    // decks land (I-82f). Six face-down cards each, at their v2 regions.
    const tpR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'tradespeople-pile')!;
    const eqR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'equipment-pile')!;
    t.add(cardStack(tpR, 'tradespeople-pile', 6, null, 0));
    t.add(cardStack(eqR, 'equipment-pile', 6, null, 0));
    t.rotation.x = -Math.PI / 2;
    t.scale.set(9, 7, 1);
    t.userData['focus'] = 'table';
    return t;
  },

  // Phase 0: ANY click closes the open reading board; consumed (I-67b). Q-2 (I-90): the
  // close starts the ROUTE — the same card travels to its destination, then idle.
  consumeClick(ctx) {
    if (onion.onionState().open) {
      onion.closeOnion();
      draw.startRoute(ctx);
      ctx.status('reading board closed — the card routes to the discard');
      return true;
    }
    return false;
  },

  // CONTRACT v2 (Q-2b, I-91): the GRAB protocol — the deck's top card grabs on the
  // viewer's turn; flick past the threshold to draw, too soft settles back face down.
  onGrabStart(ctx, hit: PickInfo) { return draw.grabStart(ctx, hit); },
  onGrabMove(ctx, ev: PointerEvent) { draw.grabMove(ctx, ev); },
  onGrabEnd(ctx, ev: PointerEvent) { return draw.grabEnd(ctx, ev); },

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
    } else if (region === 'discard') {
      fidget['discard'] = ((fidget['discard'] ?? 0) + 1) % 3; ctx.rebuild(); ctx.status(`discard fidget → ${['neat', 'peek', 'spread five'][fidget['discard']]}`);
    }
    return true;
  },

  // Q-2b (I-91): the whole draw step — momentum flip → onion display · settle-back ·
  // route — lives in table-draw.ts; delegate.
  tick(ctx) { draw.tickDraw(ctx); },

  gate() {
    const ctx = cx!;
    return {
      expectedFromDefs: () => TOWN_TABLE_V2.regions.length + BOTY_PACK6.seats.length * SHOP_BOARD.regions.length,
      /** T-1 (I-89): the v2 table def's region rects — the arrangement oracle (the def IS
       *  the owner's spec; render≡def is VG8a's standing law). */
      tableRegionRects: () => TOWN_TABLE_V2.regions.map((r) => ({ id: r.id, x: r.x, y: r.y, w: r.w, h: r.h })),
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
      stackInfo: (rid: string) => {
        const grp = ctx.theater.focusObject(`table:${rid}`);
        if (!grp) return null;
        const cards: THREE.Object3D[] = [];
        grp.traverse((o: THREE.Object3D) => { if (o.userData?.['card']) cards.push(o); });
        cards.sort((a, b) => (a.userData['idx'] as number) - (b.userData['idx'] as number));
        return {
          count: cards.length,
          fidget: fidget[rid] ?? 0,
          topFace: cards.length ? ((cards[cards.length - 1]!.userData['renderedLines'] as string[] | undefined)?.[0] ?? null) : null,
          top: cards.slice(-5).map((o) => { const w = new THREE.Vector3(); o.getWorldPosition(w); return { x: w.x, y: w.y, z: w.z }; }),
        };
      },
      /** VG8i's input-drive helper: a table region's center projected to canvas pixels. */
      regionScreenXY: (rid: string) => {
        const o = ctx.theater.focusObject(`table:${rid}`);
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
