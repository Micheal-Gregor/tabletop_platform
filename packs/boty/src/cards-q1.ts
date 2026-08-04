/**
 * Q-1 — THE FULL DECK (I-88; owner-ruled 2026-08-03: "instantiate one of every card in
 * the game to that deck"). One card ENTRY per v1 card family from the BOTY inventory
 * (governance/upstream/BOTY_Mechanics_Objects_Inventory.md §2/§3/§5) + the ODG-3 catalog.
 *
 * CONTENT ADDS NO LAW: every fx ⊆ the certified EFX v1.1.1 seven-verb vocabulary.
 * Exactly THREE cards carry effects, where the verb is TRUE to the v1 meaning
 * (commission = pay · toolbox = capitalize · settle = a gated choice window). The other
 * thirty are fx-less INERT EXHIBITS until their docketed ExtensionContract cycles land
 * (spawn_venture, draw_card, form_relation…) — R-2 keeps refusing unknown fx; nothing
 * is invented. This set extends BOTY_PACK6 ONLY (the 3D bench's sandbox variant);
 * the certified slice is untouched.
 */
import type { ContentPack } from '@tabletop/engine';

type CardMap = ContentPack['cards'];

export const Q1_FULL_SET: CardMap = {
  // ── VNT · ventures / composite contracts (spawn is docketed — inert exhibits) ──
  'vnt-project': { fx: [], flavor: 'the Grand Hotel renovation — a marquee project, in phases' },
  'vnt-civic': { fx: [], flavor: 'the town-hall retrofit — every shop gets a contract' },
  'vnt-routed': { fx: [], flavor: 'a general contractor routes a three-trade job' },
  'vnt-incident': { fx: [], flavor: 'a burst main on Elm Street — the town needs hands today' },
  'vnt-expansion': { fx: [], flavor: 'break ground on the second bay — capital, deferred' },
  // ── RTM · routing (subcontract-debt · commission-now · deferred referral) ──
  'rtm-subcontract': { fx: [], flavor: 'not your trade — sub it out, and owe the sub' },
  'rtm-commission': { fx: [{ fx: 'pay', to: 'moe', amount: 1 }], flavor: 'a referral fee, cash on the spot' },
  'rtm-referral': { fx: [], flavor: 'pass the job along — the favor comes back later' },
  // ── IWN · interaction windows (court exists as court-writ) ──
  'iwn-threat': { fx: [], flavor: 'a letter from a lawyer — pay up, or else' },
  'iwn-damages': { fx: [], flavor: 'the judge sets damages' },
  'iwn-settle': {
    fx: [
      {
        fx: 'open_window', kind: 'choice', decider: 'moe',
        options: [
          { label: 'settle', fx: [{ fx: 'pay', to: 'pete', amount: 1 }] },
          { label: 'stand firm', fx: [{ fx: 'grant_favor', to: 'moe', n: 1 }] },
        ],
        auto: 0,
      },
    ],
    flavor: 'settle on the courthouse steps?',
  },
  'iwn-poach': { fx: [], flavor: 'a rival dangles a raise at your best tradesman' },
  'iwn-mayor': { fx: [], flavor: 'the mayor asks a favor — publicly' },
  'iwn-referral-window': { fx: [], flavor: 'a referral waits on your answer' },
  'iwn-routing-window': { fx: [], flavor: 'the GC wants your bid by Friday' },
  'iwn-estate': { fx: [], flavor: "a shuttered shop's estate goes to claims" },
  // ── SVC · standing services / modifiers ──
  'svc-insurance': { fx: [], flavor: 'premiums monthly; sleep nightly' },
  'svc-marketing': { fx: [], flavor: 'the billboard on Route 9' },
  'svc-accountant': { fx: [], flavor: 'the books, kept properly for once' },
  'svc-training': { fx: [], flavor: 'send the crew to certification week' },
  'svc-security': { fx: [], flavor: 'cameras and a lockbox for the yard' },
  // ── GBL · globals (levy exists as town-levy) ──
  'gbl-boom': { fx: [], flavor: "a boom year — everyone's phone rings" },
  'gbl-recession': { fx: [], flavor: 'belt-tightening across Maple Hollow' },
  'gbl-union': { fx: [], flavor: 'the union organizes the trades' },
  // ── economy · crew · jobs staples ──
  'eco-collections': { fx: [], flavor: 'the collections agency takes its cut' },
  'eco-demand-roll': { fx: [], flavor: 'a creditor demands payment — roll for it' },
  'eco-credit-line': { fx: [], flavor: 'the bank extends a line — callable' },
  'eco-factoring': { fx: [], flavor: 'sell the receivable, take the haircut' },
  'crew-review': { fx: [], flavor: 'annual reviews — morale on the line' },
  'crew-hire': { fx: [], flavor: 'a new tradesman answers the ad' },
  'eqp-toolbox': { fx: [{ fx: 'capitalize', owner: 'moe', asset: 'toolbox', amount: 1 }], flavor: 'a proper toolbox joins the shop' },
  'job-defect': { fx: [], flavor: 'a callback — the work failed inspection' },
  'job-theft': { fx: [], flavor: 'someone jimmied the yard gate' },
};

/** The deck-order append (UNDER the existing three — draw[0] stays the top, so the first
 *  draws are unchanged). One of each, the families in catalog order. */
export const Q1_DECK_ADD: readonly string[] = Object.keys(Q1_FULL_SET);

/** Q-2c (I-92) — THE CARD FAMILY map (content DATA): which resolved cards present as
 *  IN PLAY — GLOBAL (the table's global section) or SESSION (the active seat's row) —
 *  versus the plain discard pile. The bench PARTITIONS the projection's discard by this
 *  map (derived-never-stored); it invents no state. Every card not named here: discard. */
export const CARD_FAMILY: Readonly<Record<string, 'global' | 'session'>> = {
  'town-levy': 'global',
  'gbl-boom': 'global',
  'gbl-recession': 'global',
  'gbl-union': 'global',
  'svc-insurance': 'session',
  'svc-marketing': 'session',
  'svc-accountant': 'session',
  'svc-training': 'session',
  'svc-security': 'session',
};
