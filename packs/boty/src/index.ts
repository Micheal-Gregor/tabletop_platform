/**
 * BOTY slice — contributions, presets-as-content, and the wire.
 * Tier law: content imports engine + patterns DOWNWARD only; nothing imports content.
 */
import type { EngineCore, Genesis, PackRef, RuleContribution, RuleRegistry } from '@tabletop/engine';
import { validateContribution, wireLibrary, wirePack, wireRules } from '@tabletop/engine';
import { buildGlobal, buildJob, buildRouted, buildRouting } from '@tabletop/patterns';
import { BOTY_PACK, BOTY_REF, botyGenesis } from './pack.js';

export { BOTY_PACK, BOTY_REF, botyGenesis } from './pack.js';

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

/** Wire the whole slice: pack + rules + library + validated contributions. */
export function wireBoty(registry: RuleRegistry): (core: EngineCore) => void {
  return (core: EngineCore): void => {
    wirePack(core, BOTY_PACK);
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
