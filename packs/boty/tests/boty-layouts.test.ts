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
import {
  BOOKS_PANEL, BOTY_LAYOUTS, BOTY_LAYOUT_DERIVATIONS, CARD_KINDS,
  EQUIPMENT_CARD, FORTUNE_CARD, JOB_CARD, RIVAL_SUMMARY, ROUND_CARD, ROUND_PREAMBLE,
  SHOP_BOARD, TOWN_TABLE, TRADESPERSON_CARD,
} from '../src/index.js';

describe('GBC-58 · the four children build lawfully; shadowing EXACT and queryable (I-50/I-51)', () => {
  it('all children validate, are frozen, and name their parent in lineage', () => {
    expect(BOTY_LAYOUTS.map((l) => l.id)).toEqual([
      'boty:fortune-card', 'boty:round-card', 'boty:shop-board', 'boty:town-table',
      'boty:town-table-v2', // T-1 (I-89): the 3D bench's v2 table child — same parent, same overlay door
      'boty:round-preamble', 'boty:rival-summary', 'boty:job-card', 'boty:tradesperson-card', 'boty:equipment-card',
      'boty:books',
    ]);
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
    // AUDIT-EXT-5 F1 closure: the coded fraction must sit INSIDE the measured band
    // (auditor's pixel readings 65–75%, I-51b band 55–70) — ≥50 alone let 52% ship.
    expect(art.h).toBeGreaterThanOrEqual(55);
    expect(art.h).toBeLessThanOrEqual(70);
    expect(art.h).toBeGreaterThan(ROUND_CARD.regions.find((r) => r.id === 'art')!.h); // v1: fortune art MORE dominant than round art
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

  it('shop-board: the O-6 anatomy — crew + equipment RETIRED as regions (I-146)', () => {
    // O-6 (I-146, owner-ruled): 'minus tradesperson and equipment which are now cards
    // laid down in front' — the rack regions are SUPPRESSED on the record; the cards
    // behind the board carry the truth. The old nothing-suppressed pin superseded.
    expect(SHOP_BOARD.shadowed).toEqual({
      overridden: ['identity', 'counters', 'local-play', 'hand'],
      added: ['art-banner', 'building-tier', 'jobs-list', 'ar', 'ap', 'actions'],
      suppressed: ['crew', 'equipment'],
    });
    expect(SHOP_BOARD.regions.length).toBe(BOARD_PARENT.regions.length + 6 - 2);
    expect(SHOP_BOARD.regions.find((r) => r.id === 'crew')).toBeUndefined();
    expect(SHOP_BOARD.regions.find((r) => r.id === 'equipment')).toBeUndefined();
  });

  it('town-table: standings + log + art-banner ADDED (EXT-5 F6); the shared-center parent regions untouched', () => {
    expect(TOWN_TABLE.shadowed).toEqual({ overridden: [], added: ['standings', 'log', 'art-banner'], suppressed: [] });
    for (const id of TABLE_PARENT.regions.map((r) => r.id)) {
      expect(TOWN_TABLE.regions.find((r) => r.id === id)).toEqual(TABLE_PARENT.regions.find((r) => r.id === id));
    }
  });

  it('K7-v1x D5 closure: every shipped child IS the door\'s own output — extendLayout(parent, overlay) deep-equals it', () => {
    // A hand-built literal cannot survive this WITH ANY OBSERVABLE DRIFT: the child on
    // the export surface must equal a LIVE re-run of the extension door (a byte-exact
    // value clone is the accepted equivalent-mutant boundary — K7-v1x re-verify).
    // TWO-WAY coverage (K7-parity D6): the fixture's child ids ARE the export surface —
    // a duplicated fixture entry can no longer mask a missing child.
    expect(BOTY_LAYOUT_DERIVATIONS.map((d) => d.child.id)).toEqual(BOTY_LAYOUTS.map((l) => l.id));
    for (const { parent, overlay, child } of BOTY_LAYOUT_DERIVATIONS) {
      expect(extendLayout(parent, overlay)).toEqual(child);
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

describe('GBC-60 · the parity children (I-55): exact shadowing, redaction-suppression, one job-card definition', () => {
  it('round-preamble: die-glyph art small+centered, callout+action adds — the preamble is a CARD, sequenced before round-card', () => {
    expect(ROUND_PREAMBLE.shadowed).toEqual({
      overridden: ['art', 'title', 'text'],
      added: ['callout', 'action'],
      suppressed: ['modifiers'],
    });
    const art = ROUND_PREAMBLE.regions.find((r) => r.id === 'art')!;
    expect(art.w).toBeLessThan(50); // a glyph, not a dominant panel — the preamble inverts art dominance
    expect(ROUND_PREAMBLE.lineage).toEqual(['template:card']);
  });

  it('rival-summary: local-play and hand SUPPRESSED — a rival\'s play zones are ABSENT, not hidden', () => {
    expect(RIVAL_SUMMARY.shadowed).toEqual({
      overridden: ['identity', 'counters', 'crew', 'equipment'],
      added: ['art-banner', 'building-tier', 'jobs-list'],
      suppressed: ['local-play', 'hand'],
    });
    expect(RIVAL_SUMMARY.regions.some((r) => r.id === 'local-play')).toBe(false);
    expect(RIVAL_SUMMARY.regions.some((r) => r.id === 'hand')).toBe(false);
    expect(RIVAL_SUMMARY.lineage).toEqual(['template:board']);
  });

  it('job-card (PROMOTED, §4.3): status/deadline/payout/progress/terms declared exactly', () => {
    expect(JOB_CARD.shadowed).toEqual({
      overridden: ['title', 'art', 'text'],
      added: ['status', 'deadline', 'payout', 'progress', 'terms'],
      suppressed: ['modifiers'],
    });
    expect(JOB_CARD.regions.find((r) => r.id === 'status')!.role).toBe('status-badge');
    expect(JOB_CARD.regions.find((r) => r.id === 'terms')!.role).toBe('terms');
  });

  it('tradesperson-card (§4.4): portrait-dominant with productivity/tool/status', () => {
    expect(TRADESPERSON_CARD.shadowed).toEqual({
      overridden: ['art', 'title', 'text'],
      added: ['productivity', 'tool', 'status'],
      suppressed: ['modifiers'],
    });
    const art = TRADESPERSON_CARD.regions.find((r) => r.id === 'art')!;
    expect(art.h).toBeGreaterThan(CARD_PARENT.regions.find((r) => r.id === 'art')!.h); // portrait dominates
  });

  it('equipment-card (§4.5): grade/tenure/assigned declared exactly', () => {
    expect(EQUIPMENT_CARD.shadowed).toEqual({
      overridden: ['art', 'text'],
      added: ['grade', 'tenure', 'assigned'],
      suppressed: ['modifiers'],
    });
    expect(EQUIPMENT_CARD.regions.some((r) => r.id === 'title')).toBe(true); // inherited untouched
  });

  it('GBC-62 · boty:books: the panel child with the measured cash-callout (I-56b DISCHARGED via source 18)', () => {
    expect(BOOKS_PANEL.kind).toBe('panel');
    expect(BOOKS_PANEL.lineage).toEqual(['template:panel']);
    expect(BOOKS_PANEL.shadowed).toEqual({ overridden: [], added: ['callout'], suppressed: [] });
    expect(BOOKS_PANEL.regions.map((r) => r.role)).toEqual(['title', 'mode-tabs', 'line-items', 'total', 'footnote', 'cash-callout']);
    // source-18 measured geometry: the panel's FOOT band, ~76–99% of panel height
    // (bottom edge floored per K7-vg obs 6 — a shrinking callout can no longer pass)
    const callout = BOOKS_PANEL.regions.find((r) => r.id === 'callout')!;
    expect(callout.y).toBeGreaterThanOrEqual(74);
    expect(callout.y + callout.h).toBeGreaterThanOrEqual(95);
    expect(callout.y + callout.h).toBeLessThanOrEqual(100);
    // the tab switch is FILLS, not layout: one child renders both statements a11y-clean
    const pnl = renderLayout(BOOKS_PANEL, 'The books · moe (P&L)', { title: 'The books · moe', tabs: 'P&L | Balance', total: 'Net income', footnote: 'profit isn\'t cash' });
    const bal = renderLayout(BOOKS_PANEL, 'The books · moe (Balance)', { title: 'The books · moe', tabs: 'P&L | Balance', total: 'Liabilities + equity', footnote: 'The books always balance.' });
    expect(a11yAudit(pnl)).toBe(0);
    expect(a11yAudit(bal)).toBe(0);
    expect(pnl).toContain('data-layout="boty:books"');
    expect(bal).toContain('data-layout="boty:books"');
  });

  it('every parity child renders a11y-clean', () => {
    for (const child of [ROUND_PREAMBLE, RIVAL_SUMMARY, JOB_CARD, TRADESPERSON_CARD, EQUIPMENT_CARD]) {
      expect(a11yAudit(renderLayout(child, child.id))).toBe(0);
    }
  });
});

describe('GBC-61 · vocabulary-as-data: CARD_KINDS labels filters, defines no behavior', () => {
  it('the 6-kind set is frozen and exactly the inventory\'s', () => {
    expect([...CARD_KINDS]).toEqual(['tradespeople', 'equipment', 'jobs', 'persistent', 'playable', 'global']);
    expect(Object.isFrozen(CARD_KINDS)).toBe(true);
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
