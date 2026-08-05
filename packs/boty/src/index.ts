/**
 * BOTY slice — contributions, presets-as-content, layouts, and the wire.
 * Tier law: content imports engine + patterns + presentation DOWNWARD only;
 * nothing imports content.
 */
import type { EngineCore, Genesis, PackRef, RuleContribution, RuleRegistry } from '@tabletop/engine';
import { validateContribution, wireLibrary, wirePack, wireRules } from '@tabletop/engine';
import type { ContentPack } from '@tabletop/engine';
import { buildGlobal, buildJob, buildRouted, buildRouting } from '@tabletop/patterns';
import { BOTY_PACK, BOTY_REF, botyGenesis } from './pack.js';

export { BOTY_PACK, BOTY_REF, botyGenesis, BOTY_PACK6, BOTY6_REF, botyGenesis6, FULL_DECK, shuffledDeckFor, genesisDrawFor, GENESIS_IN_PLAY, CARD_SET_6, genesisPoolOrders } from './pack.js'; // P-3 (I-131): the order fn exported so pins derive from the implementation
export { CARD_FAMILY } from './cards-q1.js'; // Q-2c (I-92): the derived-partition family data
export {
  BOTY_LAYOUTS, BOTY_LAYOUT_DERIVATIONS, CARD_KINDS,
  FORTUNE_CARD, ROUND_CARD, SHOP_BOARD, TOWN_TABLE, TOWN_TABLE_V2,
  ROUND_PREAMBLE, RIVAL_SUMMARY, JOB_CARD, TRADESPERSON_CARD, EQUIPMENT_CARD, BOOKS_PANEL,
  FORTUNE_OVERLAY, ROUND_OVERLAY, SHOP_OVERLAY, TOWN_OVERLAY, TOWN_V2_OVERLAY,
  PREAMBLE_OVERLAY, RIVAL_OVERLAY, JOB_OVERLAY, TRADESPERSON_OVERLAY, EQUIPMENT_OVERLAY, BOOKS_OVERLAY,
} from './layouts.js';

const VOCABS = { efx: '1.1.1', hooks: '1.0' };

/** The slice contributions — fire at the wrap (I-46c); validated at the MR3 door. */
export const BOTY_CONTRIBUTIONS: readonly RuleContribution[] = [
  {
    id: 'city-inspection',
    bearer: { kind: 'Card' },
    trigger: 'on-round-wrap',
    condition: { op: 'always' },
    effects: [{ fx: 'levy', scope: 'table', amount: 1 }],
    declaredSlots: [],
    slotWrites: [],
    vocabVersions: VOCABS,
  },
  {
    id: 'boom-times',
    bearer: { kind: 'Card' },
    trigger: 'on-round-wrap',
    condition: { op: 'always' },
    effects: [{ fx: 'grant_favor', to: 'edie', n: 1 }],
    declaredSlots: [{ name: 'booms', reset: 'per-round' }],
    slotWrites: [{ slot: 'booms', increment: 1 }],
    vocabVersions: VOCABS,
  },
];

// ── Presets consumed AS CONTENT (ODG-3/I-41): data built by the catalog's thin
// builders; the engine's doors re-validate every fragment on entry. ──

/** RC-A′: a brake job at Moe's — spawn/assign/work/complete → receivable. */
export const botyJob = () => buildJob({ id: 'J1', initiator: 'moe', task: 'mechanic', amount: 4, deadline: 2 });

/** The 3-trade GC contract — three unassigned portions force the routing window. */
export const botyGcContract = () =>
  buildRouted({ id: 'G1', initiator: 'moe', tasks: ['mechanic', 'plumbing', 'electrical'], amount: 6, deadline: 3 });

/** A recession sweeps the table for one round. */
export const botyRecession = () => buildGlobal({ id: 'recession', charge: 1, rounds: 1, source: 'GLB' });

/** Subcontract-with-AP: the GC routes to Pete, carrying a payable due r3 (the debt web). */
export const botySubcontract = () =>
  buildRouting('subcontract-debt', { venture: 'G1', from: 'moe', to: 'pete', amount: 2, due: 3 });

/** Wire the whole slice: pack + rules + library + validated contributions.
 *  W-1 (I-121, closing K7-Q B1): the PACK is a parameter — the 3D bench passes
 *  BOTY_PACK6 so its 36-card deck is DRAWABLE (the wired catalog finally matches the
 *  hosted variant); the default keeps the FROZEN game.ts (and every existing caller)
 *  byte-unchanged on the certified BOTY_PACK. */
export function wireBoty(registry: RuleRegistry, pack: ContentPack = BOTY_PACK as unknown as ContentPack): (core: EngineCore) => void {
  return (core: EngineCore): void => {
    wirePack(core, pack);
    wireRules(core, registry);
    wireLibrary(core, registry);
    for (const c of BOTY_CONTRIBUTIONS) {
      validateContribution(c); // defense-in-depth DUPLICATE — THE door lives inside register() (K7-BOTY D2/MUT-3)
      registry.register(c);
    }
  };
}

export function loadBoty(): { ref: PackRef; genesis: Genesis; wire: (registry: RuleRegistry) => (core: EngineCore) => void } {
  return { ref: BOTY_REF, genesis: botyGenesis, wire: wireBoty };
}
