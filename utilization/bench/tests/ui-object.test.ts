/** G-C (I-168): the base-case's laws — kingdoms, the chain, bounds, sockets. */
import { describe, it, expect } from 'vitest';
import { UI_OBJECTS, uiObject, chainIntegrity, chainIntegrityOf, kingdomIntegrity } from '../src/ui-object.js';
import { OBJECT_SCALE } from '../src/playarea.js';
import { gridSpacing } from '../src/anchor-grid.js';

describe('G-C: the UI object base-case (I-168)', () => {
  it("I-209: every object DECLARES its zone; the seat board is a SEAT citizen and the die a BOARD one (the owner's corrections, pinned)", () => {
    for (const o of UI_OBJECTS) expect(['board', 'seat']).toContain(o.zone);
    expect(uiObject('seat-board')!.zone).toBe('seat'); // 'it is in the seat play area'
    expect(uiObject('die')!.zone).toBe('board'); // 'by accident or default' no more
    expect(uiObject('table')!.zone).toBe('board');
    expect(uiObject('folder')!.zone).toBe('seat');
  });
  it('the kingdom law holds: surfaces immutable+grabless, pieces never immutable', () => {
    expect(kingdomIntegrity()).toEqual({ ok: true, broken: [] });
  });
  it('the chain closes: every span/socket placement resolves to a real parent + socket', () => {
    expect(chainIntegrity()).toEqual({ ok: true, broken: [] });
  });
  it('K7-V M-2: the chain law has TEETH — a dangling parent AND a dangling socket are NAMED', () => {
    const bad = [
      ...UI_OBJECTS,
      { id: 'ghost-a', kind: 'piece', placement: { kind: 'socket', parent: 'nobody', socket: 'x' }, boundGp: 1, physics: 'dynamic', affordances: {} },
      { id: 'ghost-b', kind: 'piece', placement: { kind: 'socket', parent: 'card', socket: 'no-such-socket' }, boundGp: 1, physics: 'dynamic', affordances: {} },
    ] as never;
    const r = chainIntegrityOf(bad);
    expect(r.ok).toBe(false);
    expect(r.broken.join(' ')).toContain('ghost-a');
    expect(r.broken.join(' ')).toContain('ghost-b');
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
  it('the scripts split (K7-V minor: made non-vacuous): the ONLY click affordance in the library is the folder\'s, and it names the known verb', () => {
    const clickers = UI_OBJECTS.filter((o) => o.affordances.click !== undefined);
    expect(clickers.map((o) => [o.id, o.affordances.click])).toEqual([['folder', 'open-ledger']]); // pinned — a new click must come HERE with its verb
  });
  it('K7-V minor: EVERY object\'s bound is positive; every known extent is covered', () => {
    const s = gridSpacing();
    for (const o of UI_OBJECTS) expect(o.boundGp).toBeGreaterThan(0);
    expect(uiObject('folder')!.boundGp * s).toBeGreaterThanOrEqual(Math.hypot(OBJECT_SCALE.folder.w, OBJECT_SCALE.folder.h) / 2);
    expect(uiObject('seat-board')!.boundGp * s).toBeGreaterThanOrEqual(130); // the 260-board's half
    expect(uiObject('medal')!.boundGp * s).toBeGreaterThanOrEqual(58); // the brass rim's radius
  });
});
