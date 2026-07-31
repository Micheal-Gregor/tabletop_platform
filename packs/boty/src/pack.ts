/**
 * BOTY — the first content pack (ODG-4), Phase-4 REPRESENTATIVE SLICE (owner-ruled).
 * Content adds NO law: every card fx ⊆ EFX v1.1.1; postings are fx-less (venture spawn
 * is a library intent, I-34); the pack rides the engine, never reaches into it.
 * Three shops of Maple Hollow: Moe's Garage (mechanic) · Pete's Pipes (plumber) ·
 * Edie's Electric (electrician).
 */
import type { ContentPack, Genesis, JsonObject, PackRef } from '@tabletop/engine';

export const BOTY_REF: PackRef = { id: 'boty', version: '0.1.0', hash: 'boty-slice-1' };

export const BOTY_PACK: ContentPack = {
  id: 'boty',
  version: '0.1.0',
  efxVersion: '1.1.1',
  maxRounds: 3,
  seats: [{ id: 'moe' }, { id: 'pete' }, { id: 'edie' }],
  cards: {
    // fx-less postings: the VENTURE is spawned by a library intent (I-34)
    'job-posting': { fx: [], flavor: 'a brake job walks in' },
    'gc-flavor': { fx: [], flavor: 'the GC bid board' },
    // EFX-carrying cards — the seven-verb vocabulary, exercised as CONTENT
    'town-levy': { fx: [{ fx: 'levy', scope: 'table', amount: 1 }], flavor: 'the town assesses everyone' },
    'good-press': { fx: [{ fx: 'grant_favor', to: 'edie', n: 1 }], flavor: 'the Gazette runs a puff piece' },
    'new-van': { fx: [{ fx: 'capitalize', owner: 'moe', asset: 'van', amount: 3 }], flavor: 'a work van joins the fleet' },
    'court-writ': { fx: [{ fx: 'grant_sue_right', holder: 'pete', against: 'moe', window: 'court' }], flavor: 'papers are served' },
    // living-deck injection (BOTY's feast/famine order-preserving inject)
    'word-of-mouth': { fx: [{ fx: 'deck_inject', deck: 'pete', card: 'payday', policy: 'top' }], flavor: 'a referral spreads' },
    'payday': { fx: [{ fx: 'pay', to: 'pete', amount: 2 }], flavor: 'the check clears' },
    // choice window (gated, decider moe)
    'crossroads': {
      fx: [
        {
          fx: 'open_window', kind: 'choice', decider: 'moe',
          options: [
            { label: 'take gold', fx: [{ fx: 'pay', to: 'moe', amount: 2 }] },
            { label: 'take favor', fx: [{ fx: 'grant_favor', to: 'moe', n: 1 }] },
          ],
          auto: 0,
        },
      ],
      flavor: 'a fork in the road',
    },
  },
  decks: {
    moe: { cards: ['job-posting', 'new-van', 'crossroads'] },
    pete: { cards: ['word-of-mouth', 'court-writ'] }, // 'payday' arrives by living-deck injection
    edie: { cards: ['town-levy', 'good-press', 'gc-flavor'] },
  },
};

/** The slice genesis: three shops, one tradesman each, scripted decks, Ledger LOADED. */
export const botyGenesis: Genesis = () =>
  ({
    seats: [
      { id: 'moe', trade: 'mechanic', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
      { id: 'pete', trade: 'plumber', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
      { id: 'edie', trade: 'electrician', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
    ],
    turn: { round: 1, seatIdx: 0, phase: 'start', wrappedRound: 0, maxRounds: 3, status: 'playing' },
    decks: {
      moe: { draw: ['job-posting', 'new-van', 'crossroads'], discard: [], reserve: [] },
      pete: { draw: ['word-of-mouth', 'court-writ'], discard: [], reserve: [] },
      edie: { draw: ['town-levy', 'good-press', 'gc-flavor'], discard: [], reserve: [] },
    },
    windows: [], windowSeq: 0,
    components: {}, surfaces: {}, relations: [], relationEvents: [], relationSeq: 0,
    crew: [
      { id: 'crew-moe', outfit: 'moe' },
      { id: 'crew-pete', outfit: 'pete' },
      { id: 'crew-edie', outfit: 'edie' },
    ],
    ventures: [], debts: [], receivables: [], timedEffects: [],
    ledger: { loaded: true, entries: [] },
  }) as JsonObject;
