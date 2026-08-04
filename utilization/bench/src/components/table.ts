/**
 * TABLE component (K-A adapter, I-77) — THE SURFACE. Wraps the EXISTING pure builders
 * (surfaces.layoutFace, stacks.cardStack/cardBack) and the EXISTING onion.ts reading
 * board UNCHANGED, delegating; owns the engine-bound table face (fills stamped from the
 * projection), the count-true deck/discard stacks, the deck/discard FIDGET, and the
 * DRAW-THEATER cluster (doDraw → flight → onion-open) lifted verbatim from the spine.
 *
 * Placement: free{surface:'ground'} — the table is the root surface others bind to
 * (K-A inert metadata; the current geometry is preserved).
 */
import * as THREE from 'three';
import { beginFlourish, completeFlourish } from '@tabletop/presentation';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import { layoutFace, fortuneFaceTexture } from '../surfaces.js';
import { cardBack, cardStack } from '../stacks.js';
import * as onion from '../onion.js';
import { TOWN_TABLE_V2, SHOP_BOARD, BOTY_PACK6 } from '../../../../packs/boty/src/index.js'; // T-1 (I-89): the v2 table child

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

let cx: PlayAreaContext | null = null;

// ── FIDGET (I-67e): PURE THEATER — seeded offsets, meshes only, never state ──
const fidget: Record<string, number> = { deck: 0, discard: 0 };

// ── DRAW THEATER (I-67c): the verb through the same doors; HK-11 at flight end ──
let drawPhase: 'idle' | 'flying' | 'reading' = 'idle';
let flight: { mesh: THREE.Mesh; from: THREE.Vector3; t: number; inst: ReturnType<typeof beginFlourish>; seeded: string; flipped: boolean } | null = null;
let forceMismatch = false; // the committed forced-mismatch drill (VG7d precedent) — one-shot

function doDraw(ctx: PlayAreaContext): void {
  if (drawPhase !== 'idle') { ctx.status('the draw is already in the air — one theater at a time (I-67c)'); return; } // K7-A2 D1
  const before = ctx.projection();
  const active = before.seats[before.turn.seatIdx]!.id;
  if (!ctx.submit('draw', { deck: active })) return;
  const after = ctx.projection();
  const seeded = after.decks[active]?.discardTop ?? '(none)';
  const inst = beginFlourish('card-flip', seeded, '♪ card flip');
  const deckObj = ctx.theater.focusObject('table:deck');
  const from = deckObj ? new THREE.Box3().setFromObject(deckObj).getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 10, 0);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(52, 78), new THREE.MeshBasicMaterial({ map: cardBack() }));
  m.position.copy(from);
  m.rotation.x = -Math.PI / 2;
  ctx.scene.add(m);
  flight = { mesh: m, from, t: 0, inst, seeded, flipped: false };
  drawPhase = 'flying';
  ctx.rebuild(); // I-67a/g: the deck is already one card shorter — the geometry is the count
  ctx.status(`${active} draws — ♪ card flip`);
}

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
      'global-play': ['GLOBAL CARDS IN PLAY', '(routing lands at Q-2)'], // the owner's global section — right of the season
    }, ['deck', 'discard', 'tradespeople-pile', 'equipment-pile']);
    const deckR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'deck')!;
    const discR = TOWN_TABLE_V2.regions.find((rg) => rg.id === 'discard')!;
    t.add(cardStack(deckR, 'deck', v.decks[active]?.drawCount ?? 0, null, fidget['deck']));
    t.add(cardStack(discR, 'discard', v.ownDiscard.length, v.ownDiscard, fidget['discard'])); // the VIEWER'S discard — redaction-honest (I-67a)
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

  // Phase 0: ANY click closes the open reading board; consumed (I-67b)
  consumeClick(ctx) {
    if (onion.onionState().open) { onion.closeOnion(); drawPhase = 'idle'; ctx.status('reading board closed'); return true; }
    return false;
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
      if (v.seats[v.turn.seatIdx]!.id === ctx.viewSeat) { doDraw(ctx); }
      else { fidget['deck'] = ((fidget['deck'] ?? 0) + 1) % 3; ctx.rebuild(); ctx.status(`deck fidget → ${['neat', 'loose pile', 're-scatter'][fidget['deck']]}`); }
    } else if (region === 'discard') {
      fidget['discard'] = ((fidget['discard'] ?? 0) + 1) % 3; ctx.rebuild(); ctx.status(`discard fidget → ${['neat', 'peek', 'spread five'][fidget['discard']]}`);
    }
    return true;
  },

  // the DRAW FLIGHT (I-67c): deck → camera, flipping at the midpoint; HK-11 at the end
  tick(ctx) {
    if (!flight) return;
    flight.t = Math.min(1, flight.t + 0.03);
    const pT = flight.t;
    const ease = pT * pT * (3 - 2 * pT);
    const cam = ctx.camera;
    const dest = cam.position.clone().add(cam.getWorldDirection(new THREE.Vector3()).multiplyScalar(140));
    flight.mesh.position.lerpVectors(flight.from, dest, ease);
    const faceCam = cam.quaternion.clone();
    const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    flight.mesh.quaternion.slerpQuaternions(flat, faceCam, ease);
    flight.mesh.rotateY(Math.PI * (1 - ease)); // the flip on top of the turn-to-camera
    if (pT >= 0.5 && !flight.flipped) {
      flight.flipped = true; // the midpoint face-swap: the classic flip trick
      const displayed = forceMismatch ? 'WRONG-CARD' : flight.seeded;
      (flight.mesh.material as THREE.Material).dispose();
      // A3 (I-69): the flip reveals a FORTUNE face, not bare text; `displayed` may be the
      // drill's lie — the flying card shows it, the reading board then shows the truth.
      flight.mesh.material = new THREE.MeshBasicMaterial({ map: fortuneFaceTexture(displayed) });
    }
    if (pT >= 1) {
      const displayed = forceMismatch ? 'WRONG-CARD' : flight.seeded;
      const verdict = completeFlourish(flight.inst, displayed); // HK-11 — truth wins (R-20)
      onion.setOnionVerdict({ mismatch: verdict.mismatch !== null, displayed, seeded: flight.seeded });
      // A3 (I-69): the reading board opens on the fortune anatomy of the TRUTH-WINS card
      // (verdict.result is the seeded id even when displayed lied — R-20).
      onion.openOnion(verdict.result, verdict.mismatch !== null);
      if (verdict.mismatch) ctx.status('⚑ theater mismatch — truth wins (R-20)');
      ctx.scene.remove(flight.mesh);
      flight = null;
      forceMismatch = false; // the drill is one-shot
      drawPhase = 'reading';
    }
  },

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
      drawPhase: () => drawPhase,
      onionState: onion.onionState,
      onionRegions: onion.onionRegions,
      forceFlipMismatch: (v: boolean) => { forceMismatch = v; },
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
