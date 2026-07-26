/** F3 fixture: an ontology-bearing genesis (I-22 regions) + a wired core helper. */
import type { Genesis, JsonObject } from '../src/index.js';
import { EngineCore, wireOntology, wirePack } from '../src/index.js';
import { F2_PACK, f2PackRef, f2Seats } from './f2-fixture.js';

export const ontoGenesis: Genesis = () =>
  ({
    seats: [
      { id: 'A', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
      { id: 'B', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
    ],
    turn: { round: 1, seatIdx: 0, phase: 'start', wrappedRound: 0, maxRounds: 3, status: 'playing' },
    decks: { main: { draw: [], discard: [], reserve: [] } },
    windows: [],
    windowSeq: 0,
    components: {
      t1: { kind: 'Tile', edges: ['a', 'b'] },
      t2: { kind: 'Tile', edges: ['b', 'c'] },
      t3: { kind: 'Tile', edges: ['c', 'd'] },
      tok: { kind: 'Token', value: 0 },
      card1: { kind: 'Card', faceUp: false },
      fig: { kind: 'Figure', pose: 'standing' },
    },
    surfaces: { table: { topology: 'grid' } },
    relations: [],
    relationEvents: [],
    relationSeq: 0,
  }) as JsonObject;

export function newOntoCore(seed = 'f3-seed'): EngineCore {
  const core = new EngineCore(f2PackRef, f2Seats, seed, ontoGenesis);
  wirePack(core, F2_PACK);
  wireOntology(core);
  return core;
}
