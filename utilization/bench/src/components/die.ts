/**
 * DIE component (K-A adapter, I-77) — the ROUND-CARD SEQUENCE + a SEEDED ROLLING EXHIBIT
 * die. Wraps die.ts, delegating. PERSISTENT: built ONCE after the first buildScene, never
 * rebuilt on state change (the die touches no game state). Placement: free{surface:'table'}
 * — rolls TRAVEL and settle anywhere on the table's whole area (K-E, I-81), while the
 * `table:dice` region is the die's HOME (P-1, I-83): the fixed spot it is built at, tossed
 * from, and glides back to after each settled result is read — the home marker, NOT a cage
 * (I-73's cage stays retired).
 *
 * `openRoundSequence` is re-exported for the spine's #round-btn bar wiring (bar wiring
 * stays harness-level per the plan; the round sequence is this component's feature).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import {
  buildDie, rollDie, deadRoll, tickDie, dieScreenXY, diePhaseState, dieVerdictState,
  dieUpFace, dieFaces, setForceDieMismatch, advanceRoundModal, roundModalState,
  dieRestInfo, dieTableRect, dieHome,
} from '../die.js';
import type { TableRect } from '../die.js';

export { openRoundSequence } from '../die.js';

let cx: PlayAreaContext | null = null;

/** The table's world footprint + surface-top y, DERIVED from the LIVE table group (the
 *  SAME object buildScene places — components/box.ts reads it the same way). This is the
 *  WHOLE table area the die is free to tumble across (K-E, I-81), NOT the tiny 'dice'
 *  sub-region and NOT a magic square — the caged-die fix. */
function tableRect(ctx: PlayAreaContext): TableRect | null {
  const t = ctx.theater.focusObject('table');
  if (!t) return null;
  t.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(t);
  return { minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, topY: b.max.y };
}

export const die: Component = {
  id: 'die',
  persistent: true,
  placement: { kind: 'free', surface: 'table' },

  // A4 (I-73) + K-E (I-81): built ONCE resting ON TOP of the table surface, FREE to tumble
  // across the table's WHOLE area — NOT a table child (the table's 9×7 scale would distort
  // the cube), NOT rebuilt on state change. The table area is DERIVED from the LIVE table
  // bbox (COMPONENTS order builds the table before this persistent die, so focusObject
  // resolves) — NOT the tiny 'dice' sub-region, NOT a magic square (the caged-die fix).
  // buildDie self-adds to the scene; this returns null (persistent, not in builtRoots).
  build(ctx) {
    cx = ctx;
    ctx.scene.updateMatrixWorld(true);
    // P-1 (I-83): the HOME = the live `table:dice` REGION object's world-bbox centre —
    // derived, not a magic point; the home marker only, never the roll cage (I-81 stands).
    let home: { x: number; z: number } | null = null;
    const region = ctx.theater.focusObject('table:dice');
    if (region) {
      region.updateWorldMatrix(true, true);
      const rb = new THREE.Box3().setFromObject(region);
      home = { x: (rb.min.x + rb.max.x) / 2, z: (rb.min.z + rb.max.z) / 2 };
    }
    buildDie(ctx.scene, tableRect(ctx), home);
    return null;
  },

  // Phase 0: a click through an OPEN round sequence advances it preamble → round-card →
  // dismiss (I-55a); consumed.
  consumeClick(ctx) {
    if (roundModalState().open) {
      advanceRoundModal();
      const rs = roundModalState();
      ctx.status(rs.open ? `round → ${rs.stage}` : 'round sequence dismissed');
      return true;
    }
    return false;
  },

  // Phase 2: a touch on the die — viewer's turn → the SEEDED roll (HK-11); else a lazy
  // dead-roll FIDGET (no state change; the die never reaches the engine). (A4/I-73)
  onPick(ctx, hit: PickInfo) {
    if (hit.tags['die']) {
      const vd = ctx.projection();
      if (vd.seats[vd.turn.seatIdx]!.id === ctx.viewSeat) { rollDie(); ctx.status('rolling the die — ♪ die throw'); }
      else { deadRoll(); ctx.status('die fidget — a dead roll (not your turn)'); }
      return true;
    }
    return false;
  },

  tick() {
    tickDie(); // A4 (I-73): the seeded toss / dead-roll animation step (HK-11 at settle)
  },

  gate() {
    const ctx = cx!;
    return {
      /** A4 (I-73) surfaces: the seeded rolling die exhibit (gates WAIT ON diePhase STATE,
       *  assert geometry/verdict STATE never pixels) and the round-card sequence. */
      diePhase: diePhaseState,
      dieVerdict: dieVerdictState,
      dieUpFace,
      dieFaces,
      forceDieMismatch: setForceDieMismatch,
      dieScreenXY: () => dieScreenXY(ctx.renderer),
      roundModalState,
      /** K-E (I-81) free-tumble surfaces: the die's rest STATE (centre x/z + bbox underside
       *  y, so on-table is asserted as geometry — the underside ≈ the table top) and the
       *  LIVE table area it is free to tumble across (so the gate proves the settle spread
       *  spans a large fraction of the WHOLE table, not the old dice sub-square). */
      dieRestInfo,
      dieTableRect,
      /** P-1 (I-83) home surfaces: the derived dice-region home the die starts from and
       *  returns to (die-returns-home asserts rest position ≈ home after a full cycle). */
      dieHome,
      /** the `table:dice` REGION's live world centre, recomputed here INDEPENDENTLY of the
       *  die module (K7-P D5: dieHome must match the REGION, not merely itself). */
      dieRegionCenter: () => {
        const r = cx!.theater.focusObject('table:dice');
        if (!r) return null;
        r.updateWorldMatrix(true, true);
        const b = new THREE.Box3().setFromObject(r);
        return { x: (b.min.x + b.max.x) / 2, z: (b.min.z + b.max.z) / 2 };
      },
    };
  },
};
