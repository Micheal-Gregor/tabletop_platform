/** F5 fixture: the MINIMAL genesis (Stage-2b) + a fully wired library core. */
import type { Genesis, JsonObject } from '../src/index.js';
import { EngineCore, RuleRegistry, wireLibrary, wirePack, wireRules } from '../src/index.js';
import type { ContentPack, PackRef, Seat } from '../src/index.js';

export const MIN_REF: PackRef = { id: 'MINIMAL', version: '1.0.0', hash: 'sigma7' };
export const MIN_SEATS: readonly Seat[] = [{ id: 'A' }, { id: 'B' }];

/** The MINIMAL pack: three cards, fx-less (ventures/tfx spawn via library intents — I-34). */
export const MIN_PACK: ContentPack = {
  id: 'MINIMAL', version: '1.0.0', efxVersion: '1.1.1', maxRounds: 2,
  seats: [{ id: 'A' }, { id: 'B' }],
  cards: { K1: { fx: [], flavor: 'single-portion venture' }, K2: { fx: [], flavor: 'venture requiring role β' }, K3: { fx: [], flavor: 'table timed effect' } },
  decks: { A: { cards: ['K2', 'K1'] }, B: { cards: ['K3'] } },
};

/** Stage-2b genesis: per-seat dealt decks (deal order per the script), roles α/β, crew, Ledger LOADED. */
export const minimalGenesis: Genesis = () =>
  ({
    seats: [
      { id: 'A', role: 'α', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
      { id: 'B', role: 'β', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
    ],
    turn: { round: 1, seatIdx: 0, phase: 'start', wrappedRound: 0, maxRounds: 2, status: 'playing' },
    decks: { A: { draw: ['K2', 'K1'], discard: [], reserve: [] }, B: { draw: ['K3'], discard: [], reserve: [] } },
    windows: [], windowSeq: 0,
    components: {}, surfaces: {}, relations: [], relationEvents: [], relationSeq: 0,
    crew: [{ id: 'crew-A', outfit: 'A' }, { id: 'crew-B', outfit: 'B' }],
    ventures: [], debts: [], receivables: [], timedEffects: [],
    ledger: { loaded: true, entries: [] },
  }) as JsonObject;

export function wireMinimal(registry: RuleRegistry) {
  return (core: EngineCore): void => {
    wirePack(core, MIN_PACK);
    wireRules(core, registry);
    wireLibrary(core, registry);
  };
}

export function newMinimalCore(seed = 'sigma-7'): { core: EngineCore; registry: RuleRegistry } {
  const registry = new RuleRegistry();
  const core = new EngineCore(MIN_REF, MIN_SEATS, seed, minimalGenesis);
  wireMinimal(registry)(core);
  return { core, registry };
}

export function seatCash(core: EngineCore, id: string): number {
  return (core.getState()['seats'] as readonly { id: string; cash: number }[]).find((s) => s.id === id)!.cash;
}
