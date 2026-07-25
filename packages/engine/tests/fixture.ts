/** Shared F1 test fixture: a minimal pack-agnostic wiring (kernel base cases GBC-1..7). */
import type { Genesis, JsonObject, PackRef, Seat } from '../src/index.js';
import { EngineCore } from '../src/index.js';

export const packRef: PackRef = { id: 'test-pack', version: '0.0.1', hash: 'deadbeef' };
export const seats: readonly Seat[] = [{ id: 'A' }, { id: 'B' }];

export const genesis: Genesis = (ref, gameSeats, _seed) => ({
  packId: ref.id,
  seats: gameSeats.map((s) => ({ id: s.id, tally: 0 })),
  round: 1,
});

type SeatRow = { id: string; tally: number };

export function wire(core: EngineCore): void {
  core.registerIntent(
    'tally:add',
    {
      args: (_s, i) => (typeof i.args['n'] === 'number' ? true : 'n must be a number'),
      rules: [
        (_s, i) => {
          const n = i.args['n'] as number;
          return n >= 1 && n <= 3 ? true : { rule: 'TEST-R1', detail: 'n out of 1..3' };
        },
      ],
    },
    (state, intent) => {
      const n = intent.args['n'] as number;
      const rows = state['seats'] as readonly SeatRow[];
      return {
        ...state,
        seats: rows.map((s) => (s.id === intent.seat ? { id: s.id, tally: s.tally + n } : s)),
      } as JsonObject;
    }
  );

  core.registerIntent(
    'dice:roll',
    { args: () => true, rules: [] },
    (state, intent, ctx) => ({
      ...state,
      lastRoll: { seat: intent.seat, value: ctx.rng.stream('dice').nextInt(6) + 1 },
    })
  );
}

export function newCore(seed = 'seed-1'): EngineCore {
  const core = new EngineCore(packRef, seats, seed, genesis);
  wire(core);
  return core;
}

export function tally(core: EngineCore, seatId: string): number {
  const rows = core.getState()['seats'] as readonly SeatRow[];
  return rows.find((s) => s.id === seatId)?.tally ?? NaN;
}
