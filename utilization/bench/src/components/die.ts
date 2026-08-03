/**
 * DIE component (K-A adapter, I-77) — A4 (I-73): the ROUND-CARD SEQUENCE + a SEEDED
 * ROLLING EXHIBIT die. Wraps the EXISTING die.ts UNCHANGED (buildDie/rollDie/deadRoll/
 * tickDie + the round sequence + its gate surfaces), delegating. PERSISTENT: built ONCE
 * after the first buildScene (so the `table:dice` region anchor resolves), never rebuilt
 * on state change (the die touches no game state). Placement: free{surface:'table'} —
 * the die is free to tumble anywhere on the table's whole area.
 *
 * `openRoundSequence` is re-exported for the spine's #round-btn bar wiring (bar wiring
 * stays harness-level per the plan; the round sequence is this component's feature).
 */
import * as THREE from 'three';
import type { Component, PlayAreaContext, PickInfo } from '../component.js';
import {
  buildDie, rollDie, deadRoll, tickDie, dieScreenXY, diePhaseState, dieVerdictState,
  dieUpFace, dieFaces, setForceDieMismatch, advanceRoundModal, roundModalState,
} from '../die.js';

export { openRoundSequence } from '../die.js';

let cx: PlayAreaContext | null = null;

export const die: Component = {
  id: 'die',
  persistent: true,
  placement: { kind: 'free', surface: 'table' },

  // A4 (I-73): built ONCE resting on the TOWN_TABLE 'dice' region anchor — NOT a table
  // child (the table's 9×7 scale would distort the cube), NOT rebuilt on state change.
  // buildDie self-adds to the scene; this returns null (persistent, not in builtRoots).
  build(ctx) {
    cx = ctx;
    ctx.scene.updateMatrixWorld(true);
    const diceObj = ctx.theater.focusObject('table:dice');
    const diceAnchor = diceObj ? new THREE.Box3().setFromObject(diceObj).getCenter(new THREE.Vector3()) : null;
    buildDie(ctx.scene, diceAnchor);
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
    };
  },
};
