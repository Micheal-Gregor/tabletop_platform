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
import { BOARD_PARENT, CARD_PARENT, PANEL_PARENT, TABLE_PARENT, extendLayout } from '@tabletop/presentation';
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
 * Measured (AUDIT-EXT-5 pixel readings): art 65–75% across three instances (modal 68%,
 * column ~65%/~75%); coded at 66% — INSIDE the measured band and the I-51b 55–70 band
 * (the original 52% was RETURNED as Finding 1: under-encoding the very dominance the
 * child exists to express). Then name, italic org line, effect/quote, payout foot.
 */
export const FORTUNE_OVERLAY: LayoutOverlay = {
  id: 'boty:fortune-card',
  override: [
    { id: 'art', role: 'art', x: 6, y: 3, w: 88, h: 66 }, // art-dominant FOR REAL (I-51b, EXT-5 F1)
    { id: 'title', role: 'title', x: 6, y: 71, w: 88, h: 7 }, // the name, BELOW the art
    { id: 'text', role: 'text', x: 6, y: 84, w: 88, h: 6 }, // effect/quote line (italic in v1)
  ],
  add: [
    { id: 'subtitle', role: 'org-subtitle', x: 6, y: 79, w: 88, h: 4 }, // "Chamber of Commerce"
    { id: 'payout', role: 'payout-strip', x: 6, y: 91, w: 88, h: 7 }, // "+$550" gold strip
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
    // O-6 (I-146): crew-zone + equipment-rack RETIRED as regions — 'now cards laid down
    // in front' (behind the board with the folder and hand, I-144); suppressed below.
    { id: 'local-play', role: 'play-zone', x: 2, y: 40, w: 62, h: 26 }, // widened into the freed band
    { id: 'hand', role: 'hand-anchor', x: 66, y: 40, w: 32, h: 26 },
  ],
  add: [
    { id: 'art-banner', role: 'art', x: 2, y: 2, w: 96, h: 16 }, // the shop interior art
    { id: 'building-tier', role: 'building-tier', x: 2, y: 30, w: 96, h: 8 }, // "Garage · tier 1 · cap 2 · Move—Shop"
    { id: 'jobs-list', role: 'jobs-list', x: 2, y: 68, w: 62, h: 12 }, // rows: progress·net·due·crew·sticky·Hold
    { id: 'ar', role: 'receivables', x: 2, y: 82, w: 30, h: 9 }, // "AR — owed to you"
    { id: 'ap', role: 'payables', x: 34, y: 82, w: 30, h: 9 }, // "AP — you owe"
    { id: 'actions', role: 'actions', x: 66, y: 82, w: 32, h: 9 }, // Bank Credit · End turn — LIVE at O-6 (I-146)
  ],
  suppress: ['crew', 'equipment'], // O-6 (I-146): the rack regions retire — cards carry the truth now
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
    { id: 'art-banner', role: 'art', x: 8, y: 1, w: 84, h: 6 }, // "Spring — Maple Hollow" establishing shot (EXT-5 F6)
  ],
};
export const TOWN_TABLE: LayoutDef = extendLayout(TABLE_PARENT, TOWN_OVERLAY);

/**
 * THE V2 TABLE (T-1, I-89; owner-ruled 2026-08-03 with the v1-board screenshots): the
 * 3D bench's table arrangement — season image top-left · GLOBAL CARDS IN PLAY to its
 * right · player summary under the season · the four piles in a row (deck · discard ·
 * tradespeople · equipment) · the dice spot · windows. A SEPARATE CHILD so the certified
 * TOWN_TABLE (SVG bench, V-9, pins) is untouched; same parent, same declared overlay door.
 */
// I-130 (owner-ruled 2026-08-04): the table re-rows — deck+discard with the DICE at the
// far right of the same row; tradesperson+equipment the row below; BBB+networking (two
// NEW staged decks) the row below that; the `windows` region REMOVED ALTOGETHER (prompts
// live on the onion layer now); the freed bottom-right hosts the MEDAL exhibit region
// (role `art` — the governed vocabulary is closed; an exhibit IS an art placement).
export const TOWN_V2_OVERLAY: LayoutOverlay = {
  id: 'boty:town-table-v2',
  override: [
    { id: 'global-play', role: 'play-zone', x: 30, y: 2, w: 68, h: 22 }, // GLOBAL CARDS IN PLAY — right of the season
    { id: 'deck', role: 'deck', x: 30, y: 28, w: 12, h: 24 },
    { id: 'discard', role: 'discard', x: 46, y: 28, w: 12, h: 24 },
    // PB-6 (I-182): the dice region RETIRED — the die lives on the ring (D-1a/I-174); the square was dead weight ('deprecated and should be removed').
    { id: 'supply', role: 'anchor', x: 30, y: 30, w: 46, h: 52, z: 0 }, // PB-6 (I-182): the SUPPLY AREA's read anchor — one box over the deck/discard/pile rows, so read mode can frame the whole exchange
  ],
  add: [
    { id: 'art-banner', role: 'art', x: 2, y: 2, w: 26, h: 22 }, // the SEASON image block, top-left
    { id: 'standings', role: 'standings', x: 2, y: 28, w: 26, h: 32 }, // player summary, under the season
    { id: 'log', role: 'table-log', x: 2, y: 64, w: 26, h: 32 },
    { id: 'tradespeople-pile', role: 'deck', x: 30, y: 56, w: 12, h: 20 }, // row B (I-130) — staged exhibit until the engine deck lands
    { id: 'equipment-pile', role: 'deck', x: 46, y: 56, w: 12, h: 20 }, // row B (I-130) — staged exhibit until the engine deck lands
    { id: 'bbb-pile', role: 'deck', x: 30, y: 79, w: 12, h: 18 }, // row C (I-130) — NEW staged deck
    { id: 'networking-pile', role: 'deck', x: 46, y: 79, w: 12, h: 18 }, // row C (I-130) — NEW staged deck
    { id: 'medal', role: 'art', x: 64, y: 56, w: 30, h: 40 }, // the BOTY MEDAL exhibit (I-130) — the freed bottom-right
  ],
  suppress: ['windows'], // I-130: removed altogether — prompts are onion-layer citizens now
};
export const TOWN_TABLE_V2: LayoutDef = extendLayout(TABLE_PARENT, TOWN_V2_OVERLAY);

// ── THE PARITY CHILDREN (I-55, owner-ruled 2026-08-01; sources: the archived nine +
// the auditor's live-walk evidence in Report-5 Appendix A / inventory §4–5) ──

/**
 * The "Who goes first?" preamble — live v1 interposes it BEFORE the round card
 * (Report-5 F2 evidence). Two modals in sequence, both card-law. The lead-off callout
 * derives from the PROJECTED active seat (the K7-v1x D2 law carries — I-55a).
 */
export const PREAMBLE_OVERLAY: LayoutOverlay = {
  id: 'boty:round-preamble',
  override: [
    { id: 'art', role: 'art', x: 30, y: 8, w: 40, h: 24 }, // the die glyph, small + centered
    { id: 'title', role: 'title', x: 6, y: 36, w: 88, h: 10 }, // "🎲 Who goes first?"
    { id: 'text', role: 'text', x: 6, y: 60, w: 88, h: 16 }, // lore ("lead-off rotates one seat clockwise…")
  ],
  add: [
    { id: 'callout', role: 'callout', x: 6, y: 48, w: 88, h: 10 }, // "{seat} leads off Round {n}!"
    { id: 'action', role: 'action-button', x: 6, y: 86, w: 88, h: 10 }, // "Next ▶" → reveals the round card
  ],
  suppress: ['modifiers'],
};
export const ROUND_PREAMBLE: LayoutDef = extendLayout(CARD_PARENT, PREAMBLE_OVERLAY);

/**
 * The rival summary — the carousel's page (I-55b): a COMPACT shop board. A rival's
 * play zones are ABSENT from the view, not hidden — local-play and hand are SUPPRESSED
 * (the redaction spirit at the layout tier). Paging (prev/next/index) is bench chrome.
 */
export const RIVAL_OVERLAY: LayoutOverlay = {
  id: 'boty:rival-summary',
  override: [
    { id: 'identity', role: 'title', x: 2, y: 20, w: 44, h: 8 },
    { id: 'counters', role: 'counters', x: 52, y: 20, w: 46, h: 8 },
    { id: 'crew', role: 'crew-zone', x: 2, y: 42, w: 47, h: 26 }, // CREW(n) [⚡tier]
    { id: 'equipment', role: 'equipment-rack', x: 51, y: 42, w: 47, h: 26 },
  ],
  add: [
    { id: 'art-banner', role: 'art', x: 2, y: 2, w: 96, h: 16 },
    { id: 'building-tier', role: 'building-tier', x: 2, y: 30, w: 96, h: 8 }, // "{building} · cap {c}"
    { id: 'jobs-list', role: 'jobs-list', x: 2, y: 72, w: 96, h: 24 }, // JOBS(n) [title x/N]
  ],
  suppress: ['local-play', 'hand'],
};
export const RIVAL_SUMMARY: LayoutDef = extendLayout(BOARD_PARENT, RIVAL_OVERLAY);

/**
 * The job card, PROMOTED from bench-local to the pack (I-55e — same id, ONE definition)
 * and enriched to the inventory §4.3 parameters: status badge · progress · value/due ·
 * terms. Measured off 05/06 job rows; regions the stills don't capture at card scale
 * (the variance note lives in `text`) carry inventory-derived placement (I-55d).
 */
export const JOB_OVERLAY: LayoutOverlay = {
  id: 'boty:job-card',
  override: [
    { id: 'title', role: 'title', x: 6, y: 4, w: 62, h: 10 }, // "Tune-up"
    { id: 'art', role: 'art', x: 6, y: 16, w: 60, h: 34 },
    { id: 'text', role: 'text', x: 6, y: 62, w: 88, h: 14 }, // variance note / flavor
  ],
  add: [
    { id: 'status', role: 'status-badge', x: 70, y: 4, w: 24, h: 10 }, // Queued | Active
    { id: 'deadline', role: 'deadline-badge', x: 70, y: 16, w: 24, h: 14 }, // "due turn {t}"
    { id: 'payout', role: 'payout-strip', x: 70, y: 32, w: 24, h: 18 }, // "${v}"
    { id: 'progress', role: 'progress', x: 6, y: 52, w: 88, h: 8 }, // "0/4 · crew 0/2"
    { id: 'terms', role: 'terms', x: 6, y: 78, w: 88, h: 6 }, // "net-30 · sticky"
  ],
  suppress: ['modifiers'],
};
export const JOB_CARD: LayoutDef = extendLayout(CARD_PARENT, JOB_OVERLAY);

/** The tradesperson card (inventory §4.4): portrait-dominant, productivity · tool · status. */
export const TRADESPERSON_OVERLAY: LayoutOverlay = {
  id: 'boty:tradesperson-card',
  override: [
    { id: 'art', role: 'art', x: 6, y: 4, w: 88, h: 46 }, // the portrait
    { id: 'title', role: 'title', x: 6, y: 52, w: 88, h: 8 }, // the name
    { id: 'text', role: 'text', x: 6, y: 72, w: 88, h: 10 }, // flavor quote (italic in v1)
  ],
  add: [
    { id: 'productivity', role: 'productivity', x: 6, y: 62, w: 42, h: 8 }, // "⚡{n} · T{n}"
    { id: 'tool', role: 'tool', x: 52, y: 62, w: 42, h: 8 }, // bare-handed | equipped item
    { id: 'status', role: 'status', x: 6, y: 84, w: 88, h: 8 }, // idle | working {venture}
  ],
  suppress: ['modifiers'],
};
export const TRADESPERSON_CARD: LayoutDef = extendLayout(CARD_PARENT, TRADESPERSON_OVERLAY);

/** The equipment card (inventory §4.5): grade · tenure · assigned-to · cost/rent. */
export const EQUIPMENT_OVERLAY: LayoutOverlay = {
  id: 'boty:equipment-card',
  override: [
    { id: 'art', role: 'art', x: 6, y: 16, w: 88, h: 30 },
    { id: 'text', role: 'text', x: 6, y: 68, w: 88, h: 12 }, // cost / rent line
  ],
  add: [
    { id: 'grade', role: 'grade', x: 6, y: 48, w: 42, h: 8 }, // Basic | Pro
    { id: 'tenure', role: 'tenure', x: 52, y: 48, w: 42, h: 8 }, // owned | rented
    { id: 'assigned', role: 'assigned-to', x: 6, y: 58, w: 88, h: 8 }, // worker or "—"
  ],
  suppress: ['modifiers'],
};
export const EQUIPMENT_CARD: LayoutDef = extendLayout(CARD_PARENT, EQUIPMENT_OVERLAY);

/**
 * The Books panel (EXT-5 F5 closure, I-56b): v1's Books IS the generic report panel —
 * a child of PANEL_PARENT measured off sources 10 + 18. The tab switch is ui-state
 * (same child, different fills); the financial invariants are engine law (M13), the
 * panel only projects them. The cash-vs-paper CALLOUT (source 18, measured ~76–99% of
 * panel height below the total row) is the one BOTY add — the I-56b deferral is
 * DISCHARGED; on the Balance tab the region simply goes unfilled (fills, not layout).
 */
export const BOOKS_OVERLAY: LayoutOverlay = {
  id: 'boty:books',
  add: [
    { id: 'callout', role: 'cash-callout', x: 4, y: 76, w: 92, h: 22, z: 1 }, // net-income-on-paper vs cash-in-bank + teaching line
  ],
};
export const BOOKS_PANEL: LayoutDef = extendLayout(PANEL_PARENT, BOOKS_OVERLAY);

/** The gallery filter vocabulary — content-tier DATA, no engine door (GBC-61). */
export const CARD_KINDS = Object.freeze(['tradespeople', 'equipment', 'jobs', 'persistent', 'playable', 'global'] as const);

export const BOTY_LAYOUTS: readonly LayoutDef[] = Object.freeze([
  FORTUNE_CARD, ROUND_CARD, SHOP_BOARD, TOWN_TABLE, TOWN_TABLE_V2,
  ROUND_PREAMBLE, RIVAL_SUMMARY, JOB_CARD, TRADESPERSON_CARD, EQUIPMENT_CARD,
  BOOKS_PANEL,
]);

/** (parent, overlay, child) triples — the construction-falsifiability fixture (K7-v1x D5). */
export const BOTY_LAYOUT_DERIVATIONS = Object.freeze([
  { parent: CARD_PARENT, overlay: FORTUNE_OVERLAY, child: FORTUNE_CARD },
  { parent: CARD_PARENT, overlay: ROUND_OVERLAY, child: ROUND_CARD },
  { parent: BOARD_PARENT, overlay: SHOP_OVERLAY, child: SHOP_BOARD },
  { parent: TABLE_PARENT, overlay: TOWN_OVERLAY, child: TOWN_TABLE },
  { parent: TABLE_PARENT, overlay: TOWN_V2_OVERLAY, child: TOWN_TABLE_V2 },
  { parent: CARD_PARENT, overlay: PREAMBLE_OVERLAY, child: ROUND_PREAMBLE },
  { parent: BOARD_PARENT, overlay: RIVAL_OVERLAY, child: RIVAL_SUMMARY },
  { parent: CARD_PARENT, overlay: JOB_OVERLAY, child: JOB_CARD },
  { parent: CARD_PARENT, overlay: TRADESPERSON_OVERLAY, child: TRADESPERSON_CARD },
  { parent: CARD_PARENT, overlay: EQUIPMENT_OVERLAY, child: EQUIPMENT_CARD },
  { parent: PANEL_PARENT, overlay: BOOKS_OVERLAY, child: BOOKS_PANEL },
] as const);
