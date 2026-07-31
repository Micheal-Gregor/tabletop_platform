/**
 * BOTY v1-EXTRACTION LAYOUTS (I-51) — the four children, measured off the owner's
 * nine v1 screenshots and built THROUGH the extension door (I-50). Content tier:
 * this file imports @tabletop/presentation DOWNWARD only and touches nothing in it —
 * the V-9 pin is safe by construction (I-51c).
 *
 * The v1 lessons realized here:
 *   (a) modal-as-card — the round interstitial and the character/fortune popup are
 *       CARD CHILDREN rendered at a camera focus preset, never dialogs (I-51a);
 *   (b) art dominance — v1 proves art at 55–70% of card height; children OVERRIDE
 *       art taller, the parent's 38% stands (I-51b);
 *   (c) the shop board is BOARD_PARENT thickened — every parent region overridden
 *       into v1's vertical anatomy, six declared adds;
 *   (d) the table gains standings + log — v1's "The table" panel as declared adds.
 */
import { BOARD_PARENT, CARD_PARENT, TABLE_PARENT, extendLayout } from '@tabletop/presentation';
import type { LayoutDef, LayoutOverlay } from '@tabletop/presentation';

/**
 * The OVERLAYS are exported alongside the children so the construction path is
 * FALSIFIABLE (K7-v1x D5): a test re-runs extendLayout(parent, overlay) and requires
 * deep equality with the exported child — a hand-built literal cannot survive WITH ANY
 * OBSERVABLE DRIFT from the door's live output (a byte-exact value clone is the
 * equivalent-mutant boundary, accepted on the record at the K7-v1x re-verify).
 */

/**
 * The fortune/character card — v1's drawn-card AND its character popup are ONE child
 * with two content fills (Hal Ramsey ≡ "Win the county fair raffle", structurally).
 * Measured: art ~0–70%, then name, italic org/quote lines, payout strip at the foot.
 */
export const FORTUNE_OVERLAY: LayoutOverlay = {
  id: 'boty:fortune-card',
  override: [
    { id: 'art', role: 'art', x: 6, y: 4, w: 88, h: 52 }, // art-dominant (I-51b)
    { id: 'title', role: 'title', x: 6, y: 58, w: 88, h: 8 }, // the name, BELOW the art
    { id: 'text', role: 'text', x: 6, y: 74, w: 88, h: 12 }, // effect/quote line (italic in v1)
  ],
  add: [
    { id: 'subtitle', role: 'org-subtitle', x: 6, y: 67, w: 88, h: 6 }, // "Chamber of Commerce"
    { id: 'payout', role: 'payout-strip', x: 6, y: 88, w: 88, h: 8 }, // "+$550" gold strip
  ],
  suppress: ['modifiers'],
};
export const FORTUNE_CARD: LayoutDef = extendLayout(CARD_PARENT, FORTUNE_OVERLAY);

/**
 * The round interstitial — v1's "Round N · Season" card: sepia art, season title,
 * italic lore, gold callout ("CPU 2 leads off this round."), one action. Rendered at
 * a focus preset it IS v1's modal (I-51a).
 */
export const ROUND_OVERLAY: LayoutOverlay = {
  id: 'boty:round-card',
  override: [
    { id: 'art', role: 'art', x: 6, y: 4, w: 88, h: 50 },
    { id: 'title', role: 'title', x: 6, y: 56, w: 88, h: 8 }, // "Round 2 · Spring"
    { id: 'text', role: 'text', x: 6, y: 66, w: 88, h: 14 }, // the lore line (italic in v1)
  ],
  add: [
    { id: 'callout', role: 'callout', x: 6, y: 81, w: 88, h: 7 }, // the gold lead-off line
    { id: 'action', role: 'action-button', x: 6, y: 89, w: 88, h: 8 }, // "Next ▶"
  ],
  suppress: ['modifiers'],
};
export const ROUND_CARD: LayoutDef = extendLayout(CARD_PARENT, ROUND_OVERLAY);

/**
 * The shop board — v1's middle column decomposed onto BOARD_PARENT: every parent
 * region overridden into the proven vertical anatomy, six adds for what v1 grew.
 * Top→bottom: art banner · identity/counters · building-tier · tradespeople(crew) /
 * equipment / local-play · jobs list / hand · AR · AP · actions.
 */
export const SHOP_OVERLAY: LayoutOverlay = {
  id: 'boty:shop-board',
  override: [
    { id: 'identity', role: 'title', x: 2, y: 20, w: 44, h: 8 }, // "Jumpin_Jack · mechanic"
    { id: 'counters', role: 'counters', x: 52, y: 20, w: 46, h: 8 }, // "$3,350 · overhead $100/turn"
    { id: 'crew', role: 'crew-zone', x: 2, y: 40, w: 30, h: 26 }, // TRADESPEOPLE portrait rack (hire/fire)
    { id: 'equipment', role: 'equipment-rack', x: 34, y: 40, w: 30, h: 26 }, // buy/rent + owned w/ dispose
    { id: 'local-play', role: 'play-zone', x: 66, y: 40, w: 32, h: 26 },
    { id: 'hand', role: 'hand-anchor', x: 66, y: 68, w: 32, h: 12 },
  ],
  add: [
    { id: 'art-banner', role: 'art', x: 2, y: 2, w: 96, h: 16 }, // the shop interior art
    { id: 'building-tier', role: 'building-tier', x: 2, y: 30, w: 96, h: 8 }, // "Garage · tier 1 · cap 2 · Move—Shop"
    { id: 'jobs-list', role: 'jobs-list', x: 2, y: 68, w: 62, h: 12 }, // rows: progress·net·due·crew·sticky·Hold
    { id: 'ar', role: 'receivables', x: 2, y: 82, w: 30, h: 9 }, // "AR — owed to you"
    { id: 'ap', role: 'payables', x: 34, y: 82, w: 30, h: 9 }, // "AP — you owe"
    { id: 'actions', role: 'actions', x: 66, y: 82, w: 32, h: 9 }, // Bank Credit · End turn
  ],
};
export const SHOP_BOARD: LayoutDef = extendLayout(BOARD_PARENT, SHOP_OVERLAY);

/**
 * The town table — TABLE_PARENT plus v1's "The table" panel: ranked standings rows
 * (gold cash, active row gold-outlined — skin-era treatments, recorded not painted)
 * and the TABLE LOG.
 */
export const TOWN_OVERLAY: LayoutOverlay = {
  id: 'boty:town-table',
  add: [
    { id: 'standings', role: 'standings', x: 8, y: 66, w: 50, h: 28 }, // ranked player rows
    { id: 'log', role: 'table-log', x: 62, y: 70, w: 30, h: 26 }, // the table log
  ],
};
export const TOWN_TABLE: LayoutDef = extendLayout(TABLE_PARENT, TOWN_OVERLAY);

export const BOTY_LAYOUTS: readonly LayoutDef[] = Object.freeze([FORTUNE_CARD, ROUND_CARD, SHOP_BOARD, TOWN_TABLE]);

/** (parent, overlay, child) triples — the construction-falsifiability fixture (K7-v1x D5). */
export const BOTY_LAYOUT_DERIVATIONS = Object.freeze([
  { parent: CARD_PARENT, overlay: FORTUNE_OVERLAY, child: FORTUNE_CARD },
  { parent: CARD_PARENT, overlay: ROUND_OVERLAY, child: ROUND_CARD },
  { parent: BOARD_PARENT, overlay: SHOP_OVERLAY, child: SHOP_BOARD },
  { parent: TABLE_PARENT, overlay: TOWN_OVERLAY, child: TOWN_TABLE },
] as const);
