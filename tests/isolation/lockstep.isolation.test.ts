import { describe, it, expect } from 'vitest';
import { EngineCore } from '../../packages/engine/src/kernel/core.js';
import type { Genesis, Intent, PackRef, Seat } from '../../packages/engine/src/kernel/types.js';
import { LockstepController } from '../../packages/engine/src/transport/lockstep.js';
import { TransportRefusal } from '../../packages/engine/src/transport/transport-refusal.js';

// OS-12 isolation test for LockstepController (MOD-27, packages/engine/src/transport/lockstep.ts).
// Declared inputs: core, seats. Operations: join, leave, takeover, submit, listenerFaults, subscribe,
// row, stateHash, holderOf (and the host and resume factories). Every controller here is built from a
// core and a seat list and nothing else; each test varies one and asserts the answer differs. No
// environment, clock, globals or network is touched.

const REF: PackRef = { id: 'pack-x', version: '1.0.0', hash: 'h1' };
const TABLE: readonly Seat[] = [{ id: 'north' }, { id: 'south' }];
const SOLO: readonly Seat[] = [{ id: 'east' }];
const GENESIS: Genesis = (_ref, _seats, seed) => ({ seed, tally: 0 });

const NORTH_BUMP: Intent = { type: 'bump', seat: 'north', args: {} };
const SOUTH_BUMP: Intent = { type: 'bump', seat: 'south', args: {} };
const NORTH_TELEPORT: Intent = { type: 'teleport', seat: 'north', args: {} };

// The constructor is private (host and resume are the production wiring points); this test builds
// the controller from exactly its declared inputs, a core and a seat list.
type ControllerOf = new (core: EngineCore, seats: readonly Seat[]) => LockstepController;
const Direct = LockstepController as unknown as ControllerOf;

function wireBump(core: EngineCore): void {
  const spec = { args: () => true, rules: [] };
  core.registerIntent('bump', spec, (state) => ({ ...state, tally: Number(state.tally) + 1 }));
}

function coreOf(seed: string, seats: readonly Seat[]): EngineCore {
  const core = new EngineCore(REF, seats, seed, GENESIS);
  wireBump(core);
  return core;
}

interface ControllerInputs {
  readonly core: EngineCore;
  readonly seats: readonly Seat[];
}

function build(changed: Partial<ControllerInputs>): LockstepController {
  const all = { core: coreOf('seed-1', TABLE), seats: TABLE, ...changed };
  return new Direct(all.core, all.seats);
}

/** A controller in which client c1 holds the seat north. */
function hosted(): LockstepController {
  const controller = build({});
  controller.join('c1', 'north');
  return controller;
}

function refusalOf(attempt: () => void): string {
  try {
    attempt();
    return 'did not throw';
  } catch (error) {
    return (error as Error).message;
  }
}

interface Heard {
  readonly move: Intent;
  readonly index: number;
  readonly hash: string;
}

function hear(controller: LockstepController): Heard[] {
  const heard: Heard[] = [];
  controller.subscribe((move, index, hash) => heard.push({ move, index, hash }));
  return heard;
}

describe('LockstepController isolation: each declared input changes what it answers', () => {
  it('core: the row and the state hash follow the core handed in', () => {
    const one = build({ core: coreOf('seed-1', TABLE) });
    const two = build({ core: coreOf('seed-2', TABLE) });
    expect(one.row().seed).toBe('seed-1');
    expect(two.row()).not.toEqual(one.row());
    expect(two.stateHash()).not.toBe(one.stateHash());
  });

  it('core: a core already holding a move numbers the next move after it', () => {
    const used = coreOf('seed-1', TABLE);
    used.submit(NORTH_BUMP);
    const resumed = build({ core: used });
    const fresh = build({ core: coreOf('seed-1', TABLE) });
    resumed.join('c1', 'north');
    fresh.join('c1', 'north');
    const heardResumed = hear(resumed);
    const heardFresh = hear(fresh);
    resumed.submit('c1', NORTH_BUMP);
    fresh.submit('c1', NORTH_BUMP);
    expect(heardResumed.map((h) => h.index)).not.toEqual(heardFresh.map((h) => h.index));
  });

  it('seats: who may join follows the seat list', () => {
    const table = build({ seats: TABLE });
    const solo = build({ seats: SOLO });
    expect(refusalOf(() => table.join('c1', 'north'))).toBe('did not throw');
    expect(refusalOf(() => solo.join('c1', 'north'))).toContain('unknown seat');
  });

  it('seats: the holder a seat answers with follows the seat list', () => {
    const table = build({ seats: TABLE });
    const solo = build({ seats: SOLO });
    table.join('c1', 'north');
    solo.join('c1', 'east');
    expect(table.holderOf('north')).toBe('c1');
    expect(solo.holderOf('north')).not.toBe(table.holderOf('north'));
    expect(solo.holderOf('east')).toBe('c1');
  });
});

describe('LockstepController isolation: join(clientId, seat)', () => {
  it('clientId: the holder may rejoin, another client may not take a held seat', () => {
    const controller = hosted();
    const holder = refusalOf(() => controller.join('c1', 'north'));
    const other = refusalOf(() => controller.join('c2', 'north'));
    expect(holder).toBe('did not throw');
    expect(other).toContain('held by a present client');
    expect(other).not.toEqual(holder);
  });

  it('seat: a seat on the list is taken, a seat off it is refused and typed', () => {
    const controller = build({});
    const known = refusalOf(() => controller.join('c1', 'south'));
    const unknown = refusalOf(() => controller.join('c1', 'nowhere'));
    expect(unknown).not.toEqual(known);
    expect(() => controller.join('c1', 'nowhere')).toThrow(TransportRefusal);
    expect(controller.holderOf('south')).toBe('c1');
  });

  it('one client may hold several seats', () => {
    const controller = hosted();
    controller.join('c1', 'south');
    expect(controller.holderOf('north')).toBe('c1');
    expect(controller.holderOf('south')).toBe(controller.holderOf('north'));
  });
});

describe('LockstepController isolation: leave(clientId) and takeover(clientId, seat)', () => {
  it('leave: a departed holder frees the seat; another client leaving frees nothing', () => {
    const gone = hosted();
    const stayed = hosted();
    gone.leave('c1');
    stayed.leave('c9');
    expect(refusalOf(() => gone.join('c2', 'north'))).toBe('did not throw');
    expect(refusalOf(() => stayed.join('c2', 'north'))).toContain('held by a present client');
  });

  it('leave: the seat stays mapped to the client that left', () => {
    const controller = hosted();
    const before = controller.holderOf('north');
    controller.leave('c1');
    expect(controller.holderOf('north')).toBe(before);
  });

  it('takeover: a departed holder gives the seat to the client that asks', () => {
    const two = hosted();
    const four = hosted();
    two.leave('c1');
    four.leave('c1');
    two.takeover('c2', 'north');
    four.takeover('c4', 'north');
    expect(two.holderOf('north')).toBe('c2');
    expect(four.holderOf('north')).not.toBe(two.holderOf('north'));
  });

  it('takeover: a seat held by a present client is refused, a departed holder\'s is not', () => {
    const controller = hosted();
    controller.join('c3', 'south');
    controller.leave('c1');
    const departed = refusalOf(() => controller.takeover('c2', 'north'));
    const present = refusalOf(() => controller.takeover('c2', 'south'));
    expect(departed).toBe('did not throw');
    expect(present).not.toEqual(departed);
    expect(present).toContain('held by a present client');
  });
});

describe('LockstepController isolation: submit(clientId, intent)', () => {
  it('clientId: the holder writes, a client that does not hold the seat is refused and unlogged', () => {
    const controller = hosted();
    const held = controller.submit('c1', NORTH_BUMP);
    const stranger = controller.submit('c2', NORTH_BUMP);
    expect(held).toMatchObject({ ok: true });
    expect(stranger).toMatchObject({ refused: true, rule: 'GX-32/writer' });
    expect(stranger).not.toEqual(held);
    expect(controller.row().moves).toEqual([NORTH_BUMP]);
  });

  it('intent: the seat decides who must hold it, the type decides what the core says', () => {
    const controller = hosted();
    const north = controller.submit('c1', NORTH_BUMP);
    const south = controller.submit('c1', SOUTH_BUMP);
    const teleport = controller.submit('c1', NORTH_TELEPORT);
    expect(south).not.toEqual(north);
    expect(teleport).toMatchObject({ refused: true, code: 'ILLEGAL_TYPE' });
    expect(teleport).not.toEqual(north);
    expect(controller.row().moves).toHaveLength(1);
  });

  it('a refused submit reaches no listener; a logged one reaches each with its index and hash', () => {
    const controller = hosted();
    const heard = hear(controller);
    controller.submit('c2', NORTH_BUMP);
    expect(heard).toHaveLength(0);
    controller.submit('c1', NORTH_BUMP);
    expect(heard).toEqual([{ move: NORTH_BUMP, index: 0, hash: controller.stateHash() }]);
  });

  it('the listener hears a sealed copy, never the caller\'s own object', () => {
    const controller = hosted();
    const heard = hear(controller);
    controller.submit('c1', NORTH_BUMP);
    expect(heard[0].move).toEqual(NORTH_BUMP);
    expect(heard[0].move).not.toBe(NORTH_BUMP);
    expect(Object.isFrozen(heard[0].move)).toBe(true);
  });
});

describe('LockstepController isolation: subscribe(listener) and listenerFaults()', () => {
  it('listener: a subscribed listener hears each move, one that unsubscribed hears no more', () => {
    const controller = hosted();
    const kept = hear(controller);
    const heard: number[] = [];
    const stop = controller.subscribe((_move, index) => heard.push(index));
    controller.submit('c1', NORTH_BUMP);
    stop();
    controller.submit('c1', NORTH_BUMP);
    expect(heard).toEqual([0]);
    expect(kept.map((h) => h.index)).not.toEqual(heard);
  });

  it('listenerFaults: a throwing listener is evicted and recorded; the others still hear', () => {
    const controller = hosted();
    const quiet = hosted();
    const heard = hear(controller);
    controller.subscribe(() => {
      throw new Error('boom');
    });
    controller.submit('c1', NORTH_BUMP);
    controller.submit('c1', NORTH_BUMP);
    expect(controller.listenerFaults()).toEqual([{ index: 0, error: 'boom' }]);
    expect(quiet.listenerFaults()).not.toEqual(controller.listenerFaults());
    expect(heard.map((h) => h.index)).toEqual([0, 1]);
  });

  it('listenerFaults: a thrown value that is not an Error is recorded as text, frozen', () => {
    const error = hosted();
    const plain = hosted();
    error.subscribe(() => {
      throw new Error('42');
    });
    plain.subscribe(() => {
      throw 42;
    });
    error.submit('c1', NORTH_BUMP);
    plain.submit('c1', NORTH_BUMP);
    expect(plain.listenerFaults()).toEqual(error.listenerFaults());
    expect(Object.isFrozen(plain.listenerFaults()[0])).toBe(true);
    expect(plain.listenerFaults()).not.toBe(plain.listenerFaults());
  });
});

describe('LockstepController isolation: row(), stateHash(), holderOf(seat)', () => {
  it('row: carries the logged moves, so it differs after a submit, and is the core\'s row', () => {
    const core = coreOf('seed-1', TABLE);
    const controller = build({ core });
    controller.join('c1', 'north');
    const before = controller.row();
    controller.submit('c1', NORTH_BUMP);
    expect(controller.row()).not.toEqual(before);
    expect(controller.row()).toEqual(core.toRow());
    expect(controller.row().moves).toEqual([NORTH_BUMP]);
  });

  it('stateHash: a logged move changes it, and it is the core\'s hash', () => {
    const core = coreOf('seed-1', TABLE);
    const controller = build({ core });
    controller.join('c1', 'north');
    const before = controller.stateHash();
    controller.submit('c1', NORTH_BUMP);
    expect(controller.stateHash()).not.toBe(before);
    expect(controller.stateHash()).toBe(core.getStateHash());
  });

  it('holderOf: the client that joined, undefined for a seat nobody holds', () => {
    const controller = hosted();
    expect(controller.holderOf('north')).toBe('c1');
    expect(controller.holderOf('south')).not.toBe(controller.holderOf('north'));
    expect(controller.holderOf('south')).toBeUndefined();
  });
});

describe('LockstepController isolation: host and resume make the controller from its inputs', () => {
  it('host: the seats and seed handed in are the controller\'s own', () => {
    const table = LockstepController.host(REF, TABLE, 'seed-1', GENESIS, wireBump);
    const solo = LockstepController.host(REF, SOLO, 'seed-2', GENESIS, wireBump);
    expect(table.row().seats).toEqual(TABLE);
    expect(solo.row()).not.toEqual(table.row());
    expect(solo.stateHash()).not.toBe(table.stateHash());
  });

  it('resume: the row rebuilds the same state, a packRef that differs is refused whole', () => {
    const live = LockstepController.host(REF, TABLE, 'seed-1', GENESIS, wireBump);
    live.join('c1', 'north');
    live.submit('c1', NORTH_BUMP);
    const resumed = LockstepController.resume(live.row(), REF, GENESIS, wireBump);
    expect(resumed.stateHash()).toBe(live.stateHash());
    const other = { ...REF, hash: 'tampered' };
    expect(refusalOf(() => LockstepController.resume(live.row(), other, GENESIS, wireBump))).toContain('HASH mismatch');
  });
});
