/**
 * Golden-vector scenarios — V-2 (replay byte-equality) and V-3 (EFX dispatch table).
 * COMPUTED from the reference implementation (never hand-written); persisted to
 * V-2.json / V-3.json at the owner-approved R-gate discharge (2026-07-25); re-derived
 * on every suite run by packages/engine/tests/vectors.test.ts. A mismatch is a
 * DIVERGENCE to explain — never a value to update silently.
 */
import {
  EngineCore,
  EffectEngine,
  hashState,
  loadPack,
  packGenesis,
  rebuild,
} from '../packages/engine/src/index.js';
import type { ContentPack, EffectDescriptor, PackRef, Seat, WindowRow } from '../packages/engine/src/index.js';

export const VECTOR_PACK_REF: PackRef = { id: 'vector-pack', version: '1.0.0', hash: 'v3c70r' };
export const VECTOR_SEATS: readonly Seat[] = [{ id: 'A' }, { id: 'B' }];
export const V2_SEED = 'sigma-7'; // the Stage-2b seed name, carried as the vector's seed

export const VECTOR_PACK: ContentPack = {
  id: 'vector-pack',
  version: '1.0.0',
  efxVersion: '1.1.1',
  maxRounds: 2,
  seats: [{ id: 'A' }, { id: 'B' }],
  cards: {
    payday: { fx: [{ fx: 'pay', to: 'A', amount: 3 }] },
    transfer: { fx: [{ fx: 'pay', to: 'B', from: 'A', amount: 1 }] },
    tax: { fx: [{ fx: 'levy', scope: 'table', amount: 1 }] },
    charter: { fx: [{ fx: 'capitalize', owner: 'B', asset: 'ship', amount: 4 }] },
    favor: { fx: [{ fx: 'grant_favor', to: 'B', n: 2 }] },
    seed_card: { fx: [{ fx: 'deck_inject', deck: 'main', card: 'payday', policy: 'bottom' }] },
    writ: { fx: [{ fx: 'grant_sue_right', holder: 'A', against: 'B', window: 'court' }] },
    crossroads: {
      fx: [
        {
          fx: 'open_window',
          kind: 'choice',
          decider: 'A',
          options: [
            { label: 'take gold', fx: [{ fx: 'pay', to: 'A', amount: 2 }] },
            { label: 'take favor', fx: [{ fx: 'grant_favor', to: 'A', n: 1 }] },
          ],
          auto: 1,
        },
      ],
    },
  },
  decks: {
    main: { cards: ['payday', 'transfer', 'tax', 'charter', 'favor', 'seed_card', 'writ', 'crossroads'] },
  },
};

function mustOk(r: unknown, what: string): void {
  if (r && typeof r === 'object' && 'refused' in (r as object)) {
    throw new Error(`vector scenario defect at ${what}: ${JSON.stringify(r)}`);
  }
}

/** V-2: a deterministic full-machinery scenario (draws · window · wrap), replayed twice. */
export function computeV2(): {
  finalHash: string;
  rebuiltHash1: string;
  rebuiltHash2: string;
  moveCount: number;
  row: unknown;
} {
  const { genesis, wire } = loadPack(VECTOR_PACK);
  const core = new EngineCore(VECTOR_PACK_REF, VECTOR_SEATS, V2_SEED, genesis);
  wire(core);

  const resolveOpenWindows = (seatOfRecord: string): void => {
    for (const w of core.getState()['windows'] as readonly WindowRow[]) {
      if (w.status === 'open') {
        mustOk(
          core.submit({ type: 'window:resolve', seat: w.decider, args: { window: w.id, option: 0 } }),
          `resolve ${w.id} (${seatOfRecord})`
        );
      }
    }
  };

  // Round 1: A draws three, resolves anything opened, passes; B draws two, passes (wrap).
  for (let i = 0; i < 3; i++) {
    mustOk(core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } }), `A draw ${i}`);
    resolveOpenWindows('A');
  }
  mustOk(core.submit({ type: 'turn:advance', seat: 'A', args: {} }), 'A advance');
  mustOk(core.submit({ type: 'turn:pass', seat: 'A', args: {} }), 'A pass r1');
  for (let i = 0; i < 2; i++) {
    mustOk(core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'main' } }), `B draw ${i}`);
    resolveOpenWindows('B');
  }
  mustOk(core.submit({ type: 'turn:pass', seat: 'B', args: {} }), 'B pass r1 (wrap)');
  // Round 2: A draws the injected/remaining cards, passes; B passes (end-trigger → closing).
  for (let i = 0; i < 2; i++) {
    mustOk(core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'main' } }), `A draw r2·${i}`);
    resolveOpenWindows('A');
  }
  mustOk(core.submit({ type: 'turn:pass', seat: 'A', args: {} }), 'A pass r2');
  mustOk(core.submit({ type: 'turn:pass', seat: 'B', args: {} }), 'B pass r2');

  const row = core.toRow();
  const r1 = rebuild(row, packGenesis(VECTOR_PACK), (c) => loadPack(VECTOR_PACK).wire(c));
  const r2 = rebuild(row, packGenesis(VECTOR_PACK), (c) => loadPack(VECTOR_PACK).wire(c));
  return {
    finalHash: core.getStateHash(),
    rebuiltHash1: r1.getStateHash(),
    rebuiltHash2: r2.getStateHash(),
    moveCount: row.moves.length,
    row,
  };
}

/** V-3: each EFX descriptor applied in isolation to the genesis state → resulting hash. */
export function computeV3(): Array<{ descriptor: EffectDescriptor; stateHashAfter: string }> {
  const genesisState = packGenesis(VECTOR_PACK)(VECTOR_PACK_REF, VECTOR_SEATS, V2_SEED);
  const table: EffectDescriptor[] = [
    { fx: 'pay', to: 'A', amount: 3 },
    { fx: 'pay', to: 'B', from: 'A', amount: 1 },
    { fx: 'capitalize', owner: 'B', asset: 'ship', amount: 4 },
    { fx: 'grant_favor', to: 'B', n: 2 },
    { fx: 'levy', scope: 'table', amount: 1 },
    { fx: 'levy', scope: 'A', amount: 2 },
    { fx: 'deck_inject', deck: 'main', card: 'payday', policy: 'top' },
    { fx: 'deck_inject', deck: 'main', card: 'tax', policy: 'bottom' },
    { fx: 'grant_sue_right', holder: 'A', against: 'B', window: 'court' },
    { fx: 'open_window', kind: 'choice', decider: 'A', options: [{ label: 'o', fx: [] }], auto: 0 },
  ];
  return table.map((descriptor) => ({
    descriptor,
    stateHashAfter: hashState(EffectEngine.apply(genesisState, descriptor, { windowDepth: 0 })),
  }));
}
