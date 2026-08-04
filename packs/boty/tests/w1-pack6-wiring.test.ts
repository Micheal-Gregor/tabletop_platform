/**
 * W-1 (I-121, closing K7-Q B1 by the owner's ruling "wire PACK6 — make the deck real"):
 * the coverage K7-Q F5 named as ABSENT — the PACK6 variant meets HK-4, its decks are
 * integral, and THE B1 REGRESSION: all 36 draws succeed through the bench's own doors
 * with effects LIVE (empirically probed before pinning — every draw returns ok; even
 * crossroads' gated window does not block subsequent draws). MUT: revert the game3d
 * wiring to BOTY_PACK → draw #4 throws GX-10 "absent from the pack catalog" → false.
 */
import { describe, it, expect } from 'vitest';
import {
  RuleRegistry, LockstepController, rebuild, wirePack,
  hookHk4ValidatePack, PackLoadRefusal,
} from '@tabletop/engine';
import type { EngineCore } from '@tabletop/engine';
import { emit, project } from '@tabletop/presentation';
import { BOTY_PACK6, BOTY6_REF, botyGenesis6, wireBoty, genesisDrawFor } from '../src/index.js';

describe('W-1: the PACK6 wiring (I-121)', () => {
  it('BOTY_PACK6 meets HK-4 (and a poisoned fx twin is REFUSED)', () => {
    expect(() => hookHk4ValidatePack(BOTY_PACK6 as never)).not.toThrow();
    const goodCard = Object.values(BOTY_PACK6.cards)[0] as unknown as Record<string, unknown>;
    const poisoned = {
      ...BOTY_PACK6,
      cards: { ...BOTY_PACK6.cards, 'w1-poison': { ...goodCard, fx: [{ fx: 'not_a_verb' }] } },
    };
    expect(() => hookHk4ValidatePack(poisoned as never)).toThrow(PackLoadRefusal);
  });

  it('every deck id exists in the PACK6 catalog (the exact B1 shape, statically)', () => {
    const catalog = new Set(Object.keys(BOTY_PACK6.cards));
    for (const [seat, deck] of Object.entries(BOTY_PACK6.decks as Record<string, { cards: readonly string[] }>)) {
      for (const id of deck.cards) {
        expect(catalog.has(id), `deck ${seat} references "${id}" — absent from the catalog (B1)`).toBe(true);
      }
    }
  });

  it('THE B1 REGRESSION: all 36 draws succeed through the bench doors, effects live', () => {
    // the bench's exact wire pattern: a FRESH registry per wire (wireBoty's contract)
    const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry(), BOTY_PACK6 as never)(c);
    const controller = LockstepController.host(BOTY6_REF, BOTY_PACK6.seats, 'maple-hollow', botyGenesis6, wire());
    const SEATS = BOTY_PACK6.seats.map((s) => s.id);
    for (const s of SEATS) controller.join('bench-3d', s);
    const projectNow = () => project(rebuild(controller.row(), botyGenesis6, wire()).getState(), SEATS[0]!);
    const N = genesisDrawFor('maple-hollow', 'moe').length; // O-4 (I-138): the derived genesis draw (in-play pair excluded)
    for (let i = 1; i <= N; i++) {
      const v = projectNow();
      const active = v.seats[v.turn.seatIdx]!.id;
      let outcome = 'ok';
      try {
        const res = controller.submit('bench-3d', emit('draw', active, { deck: active }) as never);
        if (res && typeof res === 'object' && 'refused' in (res as object)) outcome = `REFUSED ${(res as { rule: string }).rule}`;
      } catch (e) { outcome = `THREW ${(e as Error).name}: ${(e as Error).message.slice(0, 60)}`; }
      expect(outcome, `draw #${i}`).toBe('ok'); // the empirically pinned truth: every draw succeeds
    }
  });

  it('wirePack(BOTY_PACK6) itself loads clean (the page-load path)', () => {
    const wire = () => (c: EngineCore) => wirePack(c, BOTY_PACK6 as never);
    expect(() => LockstepController.host(BOTY6_REF, BOTY_PACK6.seats, 'maple-hollow', botyGenesis6, wire())).not.toThrow();
  });
});
