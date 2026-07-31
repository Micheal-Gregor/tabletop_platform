/** GBC-58/59 — the v1-extraction children: declared shadowing exact, modal-as-card pure (I-51). */
import { describe, expect, it } from 'vitest';
import {
  BOARD_PARENT,
  CARD_PARENT,
  TABLE_PARENT,
  a11yAudit,
  cameraViewBox,
  extendLayout,
  focusPresets,
  renderLayout,
  validateLayout,
} from '@tabletop/presentation';
import { BOTY_LAYOUTS, BOTY_LAYOUT_DERIVATIONS, FORTUNE_CARD, ROUND_CARD, SHOP_BOARD, TOWN_TABLE } from '../src/index.js';

describe('GBC-58 · the four children build lawfully; shadowing EXACT and queryable (I-50/I-51)', () => {
  it('all four validate, are frozen, and name their parent in lineage', () => {
    expect(BOTY_LAYOUTS.map((l) => l.id)).toEqual(['boty:fortune-card', 'boty:round-card', 'boty:shop-board', 'boty:town-table']);
    for (const l of BOTY_LAYOUTS) {
      expect(() => validateLayout(l)).not.toThrow();
      expect(Object.isFrozen(l)).toBe(true);
    }
    expect(FORTUNE_CARD.lineage).toEqual(['template:card']);
    expect(ROUND_CARD.lineage).toEqual(['template:card']);
    expect(SHOP_BOARD.lineage).toEqual(['template:board']);
    expect(TOWN_TABLE.lineage).toEqual(['template:table']);
  });

  it('fortune-card: art-dominant override (I-51b), subtitle+payout adds, modifiers suppressed — no more, no less', () => {
    expect(FORTUNE_CARD.shadowed).toEqual({
      overridden: ['art', 'title', 'text'],
      added: ['subtitle', 'payout'],
      suppressed: ['modifiers'],
    });
    const art = FORTUNE_CARD.regions.find((r) => r.id === 'art')!;
    expect(art.h).toBeGreaterThan(CARD_PARENT.regions.find((r) => r.id === 'art')!.h); // v1's lesson: art DOMINATES
    expect(art.h).toBeGreaterThanOrEqual(50); // measured 55–70% of v1 card height
    expect(FORTUNE_CARD.regions.some((r) => r.id === 'modifiers')).toBe(false);
  });

  it('round-card: same card law, callout+action adds — the interstitial is a CARD, not a dialog', () => {
    expect(ROUND_CARD.shadowed).toEqual({
      overridden: ['art', 'title', 'text'],
      added: ['callout', 'action'],
      suppressed: ['modifiers'],
    });
    expect(ROUND_CARD.regions.find((r) => r.id === 'callout')!.role).toBe('callout');
    expect(ROUND_CARD.regions.find((r) => r.id === 'action')!.role).toBe('action-button');
  });

  it('shop-board: every parent region overridden into the v1 anatomy, six adds, nothing suppressed', () => {
    expect(SHOP_BOARD.shadowed).toEqual({
      overridden: ['identity', 'counters', 'crew', 'equipment', 'local-play', 'hand'],
      added: ['art-banner', 'building-tier', 'jobs-list', 'ar', 'ap', 'actions'],
      suppressed: [],
    });
    expect(SHOP_BOARD.regions.length).toBe(BOARD_PARENT.regions.length + 6);
    // the parent's semantic roles survive the override (contract intact, geometry tailored)
    expect(SHOP_BOARD.regions.find((r) => r.id === 'crew')!.role).toBe('crew-zone');
    expect(SHOP_BOARD.regions.find((r) => r.id === 'equipment')!.role).toBe('equipment-rack');
  });

  it('town-table: standings + log ADDED; the shared-center parent regions untouched', () => {
    expect(TOWN_TABLE.shadowed).toEqual({ overridden: [], added: ['standings', 'log'], suppressed: [] });
    for (const id of TABLE_PARENT.regions.map((r) => r.id)) {
      expect(TOWN_TABLE.regions.find((r) => r.id === id)).toEqual(TABLE_PARENT.regions.find((r) => r.id === id));
    }
  });

  it('K7-v1x D5 closure: every shipped child IS the door\'s own output — extendLayout(parent, overlay) deep-equals it', () => {
    // A hand-built literal (even with forged lineage/shadowed data) cannot survive this:
    // the child on the export surface must equal a LIVE re-run of the extension door.
    expect(BOTY_LAYOUT_DERIVATIONS.length).toBe(BOTY_LAYOUTS.length);
    for (const { parent, overlay, child } of BOTY_LAYOUT_DERIVATIONS) {
      expect(extendLayout(parent, overlay)).toEqual(child);
      expect(BOTY_LAYOUTS).toContain(child); // the fixture covers the whole export surface
    }
  });

  it('the same anatomy WITHOUT declaration refuses named — the I-50 door holds at the content tier', () => {
    // an "add" of a region the parent owns (what SHOP_BOARD lawfully overrides) refuses
    expect(() => extendLayout(BOARD_PARENT, { id: 'x', add: [{ id: 'crew', role: 'r', x: 2, y: 40, w: 30, h: 26 }] })).toThrow(/collides/);
    // a child extending a CHILD still declares: suppressing what fortune-card already removed refuses
    expect(() => extendLayout(FORTUNE_CARD, { id: 'x', suppress: ['modifiers'] })).toThrow(/unknown region "modifiers"/);
    // grandchild lineage accumulates through a v1 child
    const grandchild = extendLayout(FORTUNE_CARD, { id: 'boty:fortune-foil', suppress: ['payout'] });
    expect(grandchild.lineage).toEqual(['template:card', 'boty:fortune-card']);
  });
});

describe('GBC-59 · modal-as-card: one child, two contents; focus is pure composition (I-51a)', () => {
  it('round-card and fortune-card render a11y-clean with their v1 content fills', () => {
    const round = renderLayout(ROUND_CARD, 'round interstitial', {
      title: 'Round 2 · Spring',
      text: 'A town becomes a town when it builds what it can’t carry away.',
      callout: 'CPU 2 leads off this round.',
      action: 'Next ▶',
    });
    const character = renderLayout(FORTUNE_CARD, 'character card', {
      title: 'Hal Ramsey',
      subtitle: 'Chamber of Commerce',
      text: "The Chamber's county fair is good for business.",
      payout: '+$550',
    });
    const drawn = renderLayout(FORTUNE_CARD, 'drawn fortune', {
      title: 'Win the county fair raffle',
      text: 'Your booth wins a ribbon at the county fair.',
      payout: '+$550',
    });
    for (const svg of [round, character, drawn]) {
      expect(a11yAudit(svg)).toBe(0);
      expect(svg).toContain('data-layout=');
    }
    // ONE layout law, two contents: same child id underneath both fills
    expect(character).toContain('data-layout="boty:fortune-card"');
    expect(drawn).toContain('data-layout="boty:fortune-card"');
  });

  it('rendering a child at a focus preset is pure: byte-identical for the same (child, content, camera)', () => {
    const world = { w: 1600, h: 1000 };
    const cam = focusPresets(3, world)['table']!;
    const frame = (): string =>
      `<svg viewBox="${cameraViewBox(cam, world)}">${renderLayout(ROUND_CARD, 'round', { title: 'Round 1 · Spring' })}</svg>`;
    expect(frame()).toBe(frame()); // no state, no time, no randomness — composition only
  });
});
