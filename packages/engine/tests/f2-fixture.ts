/** Shared F2 fixture: a minimal valid ContentPack exercising every F2 surface. */
import { EngineCore, loadPack } from '../src/index.js';
import type { ContentPack, PackRef, Seat } from '../src/index.js';

export const f2PackRef: PackRef = { id: 'f2-test', version: '1.0.0', hash: 'cafef00d' };
export const f2Seats: readonly Seat[] = [{ id: 'A' }, { id: 'B' }];

export const F2_PACK: ContentPack = {
  id: 'f2-test',
  version: '1.0.0',
  efxVersion: '1.1.1',
  maxRounds: 2,
  seats: [{ id: 'A' }, { id: 'B' }],
  cards: {
    payday: { fx: [{ fx: 'pay', to: 'A', amount: 3 }], flavor: 'a good day' },
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
    trap: {
      fx: [
        {
          fx: 'open_window',
          kind: 'nested',
          decider: 'A',
          options: [
            {
              label: 'recurse',
              fx: [{ fx: 'open_window', kind: 'inner', decider: 'A', options: [], auto: 0 }],
            },
          ],
          auto: 0,
        },
      ],
    },
  },
  decks: {
    main: { cards: ['payday', 'tax', 'charter', 'favor', 'seed_card', 'writ', 'crossroads', 'trap'] },
  },
};

export function newF2Core(seed = 'f2-seed', pack: ContentPack = F2_PACK): EngineCore {
  const { genesis, wire } = loadPack(pack);
  const core = new EngineCore(f2PackRef, f2Seats, seed, genesis);
  wire(core);
  return core;
}

export function seat(core: EngineCore, id: string): { cash: number; favor: number; assets: unknown[]; sueRights: unknown[] } {
  const rows = core.getState()['seats'] as readonly { id: string; cash: number; favor: number; assets: unknown[]; sueRights: unknown[] }[];
  const s = rows.find((r) => r.id === id);
  if (!s) throw new Error(`fixture: no seat ${id}`);
  return s;
}
