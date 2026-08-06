/** G-C (I-168): the base-case's laws — kingdoms, the chain, bounds, sockets. */
import { describe, it, expect } from 'vitest';
import { UI_OBJECTS, uiObject, chainIntegrity, kingdomIntegrity } from '../src/ui-object.js';
import { OBJECT_SCALE } from '../src/playarea.js';
import { gridSpacing } from '../src/anchor-grid.js';

describe('G-C: the UI object base-case (I-168)', () => {
  it('the kingdom law holds: surfaces immutable+grabless, pieces never immutable', () => {
    expect(kingdomIntegrity()).toEqual({ ok: true, broken: [] });
  });
  it('the chain closes: every span/socket placement resolves to a real parent + socket', () => {
    expect(chainIntegrity()).toEqual({ ok: true, broken: [] });
  });
  it('the table anchors ABOVE the origin (resting face at y=0 — the owner law)', () => {
    const t = uiObject('table')!;
    expect(t.placement).toEqual({ kind: 'origin', above: true });
  });
  it('the card is a free body with the pair socket: equipment-under exists inside its bound', () => {
    const c = uiObject('card')!;
    expect(c.physics).toBe('dynamic');
    const sock = c.childGrid!.sockets.find((s) => s.id === 'equipment-under')!;
    expect(Math.abs(sock.at.y)).toBeLessThanOrEqual(OBJECT_SCALE.card.h / 2);
    expect(c.affordances.flick).toBe(true); // the flick-move door is an affordance, not a special case
  });
  it('every bound covers its object: boundGp·spacing ≥ the real half-extent', () => {
    const s = gridSpacing();
    expect(uiObject('card')!.boundGp * s).toBeGreaterThanOrEqual(Math.hypot(OBJECT_SCALE.card.w, OBJECT_SCALE.card.h) / 2);
    expect(uiObject('die')!.boundGp * s).toBeGreaterThanOrEqual(OBJECT_SCALE.die / 2);
    expect(uiObject('table')!.boundGp * s).toBeGreaterThanOrEqual(570);
  });
  it('the scripts split: no affordance ever names an outcome — click carries a VERB only', () => {
    for (const o of UI_OBJECTS) {
      if (o.affordances.click) expect(typeof o.affordances.click).toBe('string'); // an intent verb (R-23's door)
    }
    expect(UI_OBJECTS.length).toBeGreaterThanOrEqual(8);
  });
});
