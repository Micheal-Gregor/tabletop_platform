/** GBC-55..57 — layout contracts: declared shadowing, free geometry, the stateless camera. */
import { describe, expect, it } from 'vitest';
import {
  BOARD_PARENT,
  CARD_PARENT,
  LayoutRefusal,
  PARENT_LAYOUTS,
  TABLE_PARENT,
  a11yAudit,
  cameraViewBox,
  extendLayout,
  focusPresets,
  renderLayout,
  validateLayout,
} from '../src/index.js';

describe('GBC-55 · the extension door: shadowing is DECLARED, breakage refuses named (I-50)', () => {
  it('every parent validates; the vocabulary is four', () => {
    for (const p of PARENT_LAYOUTS) expect(() => validateLayout(p)).not.toThrow();
    expect(PARENT_LAYOUTS.map((p) => p.id)).toEqual(['template:card', 'template:card-back', 'template:board', 'template:table']);
  });

  it('a lawful child: override + add + suppress, all QUERYABLE; lineage intact', () => {
    const jobCard = extendLayout(CARD_PARENT, {
      id: 'boty:job-card',
      override: [{ id: 'art', role: 'art', x: 6, y: 16, w: 60, h: 38 }], // narrower art…
      add: [{ id: 'deadline', role: 'deadline-badge', x: 70, y: 16, w: 24, h: 16 }], // …makes room
      suppress: ['modifiers'],
    });
    expect(jobCard.lineage).toEqual(['template:card']);
    expect(jobCard.shadowed).toEqual({ overridden: ['art'], added: ['deadline'], suppressed: ['modifiers'] });
    expect(jobCard.regions.some((r) => r.id === 'deadline')).toBe(true);
    expect(jobCard.regions.some((r) => r.id === 'modifiers')).toBe(false);
    expect(jobCard.regions.some((r) => r.id === 'title')).toBe(true); // inherited untouched
  });

  it('breaking the contract refuses NAMED: undeclared override · colliding add · unknown suppress · escaped region', () => {
    expect(() => extendLayout(CARD_PARENT, { id: 'x', override: [{ id: 'mana-cost', role: 'x', x: 0, y: 0, w: 5, h: 5 }] })).toThrow(/undeclared region "mana-cost"/);
    expect(() => extendLayout(CARD_PARENT, { id: 'x', add: [{ id: 'title', role: 'x', x: 0, y: 0, w: 5, h: 5 }] })).toThrow(/collides/);
    expect(() => extendLayout(CARD_PARENT, { id: 'x', suppress: ['loyalty'] })).toThrow(/unknown region "loyalty"/);
    expect(() => extendLayout(CARD_PARENT, { id: 'x', add: [{ id: 'off', role: 'x', x: 90, y: 90, w: 20, h: 20 }] })).toThrow(/escapes the unit space/);
    expect(() => extendLayout(CARD_PARENT, { id: 'x', shape: [[0, 0], [100, 0]] })).toThrow(/at least three points/);
  });

  it('K7-L closures: duplicate ids, unnamed regions, NaN geometry, escaped shape points ALL refuse (the four survivors)', () => {
    // duplicate id — including the live hole: two ids inside ONE overlay.add
    expect(() =>
      extendLayout(CARD_PARENT, { id: 'x', add: [{ id: 'twin', role: 'r', x: 0, y: 0, w: 5, h: 5 }, { id: 'twin', role: 'r', x: 10, y: 0, w: 5, h: 5 }] })
    ).toThrow(/duplicate region "twin"/);
    // missing id / role
    expect(() => extendLayout(CARD_PARENT, { id: 'x', add: [{ id: '', role: 'r', x: 0, y: 0, w: 5, h: 5 }] })).toThrow(/needs id and role/);
    expect(() => extendLayout(CARD_PARENT, { id: 'x', add: [{ id: 'a', role: '', x: 0, y: 0, w: 5, h: 5 }] })).toThrow(/needs id and role/);
    // NaN coordinate — load-bearing: NaN would sail through the bounds check
    expect(() => extendLayout(CARD_PARENT, { id: 'x', add: [{ id: 'a', role: 'r', x: NaN, y: 0, w: 5, h: 5 }] })).toThrow(/not finite/);
    // shape point escaping the unit space
    expect(() => extendLayout(CARD_PARENT, { id: 'x', shape: [[0, 0], [100, 0], [150, 50]] })).toThrow(/shape point escapes/);
  });

  it('K7-L closure: lineage ACCUMULATES across generations; so does suppression', () => {
    const child = extendLayout(CARD_PARENT, { id: 'child', suppress: ['modifiers'] });
    const grandchild = extendLayout(child, { id: 'grandchild', suppress: ['text'] });
    expect(grandchild.lineage).toEqual(['template:card', 'child']);
    expect(grandchild.regions.some((r) => r.id === 'modifiers')).toBe(false); // suppression carried
    expect(grandchild.regions.some((r) => r.id === 'text')).toBe(false);
    expect(grandchild.regions.some((r) => r.id === 'title')).toBe(true);
  });
});

describe('GBC-56 · geometry tailors freely; the frame renders labeled (I-48b, GX-36/39)', () => {
  it('the FIVE-SIDED player board keeps every parent region; renderLayout is a11y-clean placeholder frame', () => {
    const pentagonBoard = extendLayout(BOARD_PARENT, {
      id: 'boty:pentagon-shop',
      shape: [[50, 0], [100, 38], [82, 100], [18, 100], [0, 38]],
    });
    expect(pentagonBoard.regions.length).toBe(BOARD_PARENT.regions.length); // contract intact
    const svg = renderLayout(pentagonBoard, "Moe's pentagon shop");
    expect(svg).toContain('<polygon');
    expect(svg).toContain('data-role="crew-zone"');
    expect(svg).toContain('[hand-anchor]'); // placeholder frames, no paint
    expect(a11yAudit(svg)).toBe(0);
    const filled = renderLayout(CARD_PARENT, 'job card', { title: 'Brake Job', text: 'work 1 · pays 4' });
    expect(filled).toContain('Brake Job');
    expect(a11yAudit(filled)).toBe(0);
  });
});

describe('GBC-57 · the camera is pure and stateless toward the game (I-50)', () => {
  it('viewBox math: centered, clamped at the world edge, zoom ≥ 1 enforced', () => {
    const world = { w: 1000, h: 600 };
    expect(cameraViewBox({ cx: 500, cy: 300, zoom: 1 }, world)).toBe('0 0 1000 600');
    expect(cameraViewBox({ cx: 500, cy: 300, zoom: 2 }, world)).toBe('250 150 500 300');
    expect(cameraViewBox({ cx: 0, cy: 0, zoom: 2 }, world)).toBe('0 0 500 300'); // clamped
    expect(() => cameraViewBox({ cx: 0, cy: 0, zoom: 0.5 }, world)).toThrow(LayoutRefusal);
  });

  it('focus presets derive from the seat count; same camera → same viewBox, always', () => {
    const world = { w: 1000, h: 600 };
    const p = focusPresets(3, world);
    expect(Object.keys(p)).toEqual(['table', 'overview', 'seat-0', 'seat-1', 'seat-2']);
    expect(cameraViewBox(p['seat-1']!, world)).toBe(cameraViewBox(p['seat-1']!, world)); // pure
    expect(TABLE_PARENT.regions.some((r) => r.role === 'deck')).toBe(true); // the shared center exists to focus on
  });
});
