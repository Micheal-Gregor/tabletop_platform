import { describe, it, expect } from 'vitest';
import { EngineCore, HookViolation, type Applier } from '../../packages/engine/src/kernel/core.js';
import { Guard, type IntentSpec } from '../../packages/engine/src/kernel/guard.js';
import type { Genesis, Intent, PackRef, Seat } from '../../packages/engine/src/kernel/types.js';

// OS-12 isolation test for EngineCore (MOD-02, packages/engine/src/kernel/core.ts).
// Declared inputs: packRef, seats, seed, genesis, guard. Operations: registerIntent, supersedeIntent,
// getState, getStateHash, getLogLength, toRow, submit. Every core here is built from those five
// inputs and nothing else; each test varies one and asserts the answer differs. No environment,
// clock, globals or network is touched.

const PACK_A: PackRef = { id: 'pack-a', version: '1.0.0', hash: 'aaaa' };
const PACK_B: PackRef = { id: 'pack-b', version: '2.0.0', hash: 'bbbb' };
const SEATS_AB: readonly Seat[] = [{ id: 'a' }, { id: 'b' }];
const SEATS_C: readonly Seat[] = [{ id: 'c' }];

const COUNTER: Genesis = (packRef, seats, seed) => ({
  pack: packRef.id,
  seatCount: seats.length,
  seed,
  n: 0,
});
const OTHER: Genesis = () => ({ pack: 'other', seatCount: 0, seed: 'none', n: 100 });

const ALWAYS: IntentSpec = { args: () => true, rules: [] };
const NEVER: IntentSpec = {
  args: () => true,
  rules: [() => ({ rule: 'R-NEVER', detail: 'the table is closed' })],
};
const BUMP: Applier = (state) => ({ ...state, n: Number(state.n) + 1 });
const BUMP_TEN: Applier = (state) => ({ ...state, n: Number(state.n) + 10 });
const ROLL: Applier = (state, _intent, ctx) => ({
  ...state,
  roll: ctx.rng.stream('dice').nextInt(1000000),
});

const STEP_A: Intent = { type: 'step', seat: 'a', args: {} };

interface CoreInputs {
  readonly packRef: PackRef;
  readonly seats: readonly Seat[];
  readonly seed: string;
  readonly genesis: Genesis;
  readonly guard: Guard;
}

function inputs(): CoreInputs {
  return { packRef: PACK_A, seats: SEATS_AB, seed: 'seed-1', genesis: COUNTER, guard: new Guard() };
}

function build(changed: Partial<CoreInputs>): EngineCore {
  const all = { ...inputs(), ...changed };
  return new EngineCore(all.packRef, all.seats, all.seed, all.genesis, all.guard);
}

function thrownBy(attempt: () => void): string {
  try {
    attempt();
  } catch (error) {
    return (error as Error).message;
  }
  return 'did not throw';
}

function steppable(changed: Partial<CoreInputs>): EngineCore {
  const core = build(changed);
  core.registerIntent('step', ALWAYS, BUMP);
  return core;
}

describe('EngineCore isolation: each declared input changes what it answers', () => {
  it('packRef: the row and the genesis state follow it', () => {
    const a = build({ packRef: PACK_A });
    const b = build({ packRef: PACK_B });
    expect(a.toRow().packRef).toEqual(PACK_A);
    expect(b.toRow().packRef).not.toEqual(a.toRow().packRef);
    expect(b.getState()).not.toEqual(a.getState());
  });

  it('seats: the row follows them, and so does who may submit', () => {
    const ab = steppable({ seats: SEATS_AB });
    const c = steppable({ seats: SEATS_C });
    expect(ab.toRow().seats).toEqual(SEATS_AB);
    expect(c.toRow().seats).not.toEqual(ab.toRow().seats);
    expect(c.submit(STEP_A)).not.toEqual(ab.submit(STEP_A));
  });

  it('seed: the row, the genesis state and the streams the applier draws follow it', () => {
    const one = build({ seed: 'seed-1' });
    const two = build({ seed: 'seed-2' });
    expect(one.toRow().seed).toBe('seed-1');
    expect(two.toRow().seed).not.toBe(one.toRow().seed);
    expect(two.getStateHash()).not.toBe(one.getStateHash());
  });

  it('seed: an applier drawing from a named stream gets a different draw', () => {
    const one = build({ seed: 'seed-1' });
    const two = build({ seed: 'seed-2' });
    one.registerIntent('roll', ALWAYS, ROLL);
    two.registerIntent('roll', ALWAYS, ROLL);
    one.submit({ ...STEP_A, type: 'roll' });
    two.submit({ ...STEP_A, type: 'roll' });
    expect(two.getState().roll).not.toBe(one.getState().roll);
  });

  it('genesis: the state it makes is the state the core starts in', () => {
    const counter = build({ genesis: COUNTER });
    const other = build({ genesis: OTHER });
    expect(counter.getState().n).toBe(0);
    expect(other.getState()).not.toEqual(counter.getState());
    expect(other.getStateHash()).not.toBe(counter.getStateHash());
  });
});

describe('EngineCore isolation: the guard handed in is the guard that judges', () => {
  function held(): Guard {
    const guard = new Guard();
    guard.register('step', ALWAYS);
    return guard;
  }

  it('a guard already holding a type collides on registerIntent; a fresh one does not', () => {
    const preloaded = build({ guard: held() });
    const fresh = build({ guard: new Guard() });
    const collided = thrownBy(() => preloaded.registerIntent('step', ALWAYS, BUMP));
    const accepted = thrownBy(() => fresh.registerIntent('step', ALWAYS, BUMP));
    expect(collided).toContain('already registered');
    expect(accepted).toBe('did not throw');
  });

  it('a type the guard knows but the core has no applier for is an engine defect', () => {
    const preloaded = build({ guard: held() });
    const fresh = build({ guard: new Guard() });
    const refused = fresh.submit(STEP_A);
    expect(refused).toMatchObject({ refused: true, code: 'ILLEGAL_TYPE' });
    expect(thrownBy(() => preloaded.submit(STEP_A))).toContain('no applier registered');
    expect(() => preloaded.submit(STEP_A)).toThrow(HookViolation);
  });

  it('the verdict a guard gives is the verdict the core acts on', () => {
    const open = build({ guard: new Guard() });
    const closed = build({ guard: new Guard() });
    open.registerIntent('step', ALWAYS, BUMP);
    closed.registerIntent('step', NEVER, BUMP);
    expect(closed.submit(STEP_A)).not.toEqual(open.submit(STEP_A));
    expect(closed.getLogLength()).not.toBe(open.getLogLength());
  });
});

describe('EngineCore isolation: registerIntent(type, spec, applier)', () => {
  it('type: a type already held collides; a new type does not', () => {
    const core = steppable({});
    const held = thrownBy(() => core.registerIntent('step', ALWAYS, BUMP));
    const fresh = thrownBy(() => core.registerIntent('jump', ALWAYS, BUMP));
    expect(held).toContain('already registered');
    expect(fresh).not.toEqual(held);
  });

  it('spec: the spec registered decides the submit', () => {
    const legal = build({});
    const refused = build({});
    legal.registerIntent('step', ALWAYS, BUMP);
    refused.registerIntent('step', NEVER, BUMP);
    expect(refused.submit(STEP_A)).not.toEqual(legal.submit(STEP_A));
  });

  it('applier: the applier registered decides the state the submit makes', () => {
    const one = build({});
    const ten = build({});
    one.registerIntent('step', ALWAYS, BUMP);
    ten.registerIntent('step', ALWAYS, BUMP_TEN);
    one.submit(STEP_A);
    ten.submit(STEP_A);
    expect(ten.getState().n).not.toBe(one.getState().n);
  });
});

describe('EngineCore isolation: supersedeIntent(type, ground, spec, applier)', () => {
  it('type: a registered type is superseded; an unregistered one is refused', () => {
    const core = steppable({});
    const replaced = thrownBy(() => core.supersedeIntent('step', 'K7-F5 D1', ALWAYS, BUMP));
    const missing = thrownBy(() => core.supersedeIntent('jump', 'K7-F5 D1', ALWAYS, BUMP));
    expect(replaced).toBe('did not throw');
    expect(missing).toContain('cannot supersede unregistered');
  });

  it('ground: a named ground is accepted; an empty one is refused', () => {
    const core = steppable({});
    const named = thrownBy(() => core.supersedeIntent('step', 'I-33', ALWAYS, BUMP));
    const empty = thrownBy(() => core.supersedeIntent('step', '', ALWAYS, BUMP));
    expect(empty).toContain('requires a named ground');
    expect(empty).not.toEqual(named);
  });

  it('spec: the spec superseded in decides the next submit', () => {
    const kept = steppable({});
    const closed = steppable({});
    closed.supersedeIntent('step', 'close the table', NEVER, BUMP);
    expect(closed.submit(STEP_A)).not.toEqual(kept.submit(STEP_A));
  });

  it('applier: the applier superseded in decides the state the next submit makes', () => {
    const kept = steppable({});
    const faster = steppable({});
    faster.supersedeIntent('step', 'count by ten', ALWAYS, BUMP_TEN);
    kept.submit(STEP_A);
    faster.submit(STEP_A);
    expect(faster.getState().n).not.toBe(kept.getState().n);
  });
});

describe('EngineCore isolation: submit(intent)', () => {
  it('intent: a registered type succeeds; an unregistered one is refused', () => {
    const core = steppable({});
    const done = core.submit(STEP_A);
    const refused = core.submit({ ...STEP_A, type: 'teleport' });
    expect(done).toMatchObject({ ok: true });
    expect(refused).not.toEqual(done);
  });

  it('intent: the seat decides, a seat the row does not hold is refused', () => {
    const core = steppable({});
    const held = core.submit(STEP_A);
    const unheld = core.submit({ ...STEP_A, seat: 'q' });
    expect(unheld).toMatchObject({ refused: true, code: 'UNKNOWN_SEAT' });
    expect(unheld).not.toEqual(held);
  });

  it('a refused intent leaves the state byte-unchanged and logs nothing (R-1)', () => {
    const core = steppable({});
    const hashBefore = core.getStateHash();
    core.submit({ ...STEP_A, type: 'teleport' });
    expect(core.getStateHash()).toBe(hashBefore);
    expect(core.getLogLength()).toBe(0);
    core.submit(STEP_A);
    expect(core.getStateHash()).not.toBe(hashBefore);
  });
});

describe('EngineCore isolation: getState, getStateHash, getLogLength, toRow', () => {
  it('getState: a submit changes it, and what it returns is deep-frozen (R-10)', () => {
    const core = steppable({});
    const before = core.getState();
    core.submit(STEP_A);
    expect(core.getState()).not.toEqual(before);
    expect(Object.isFrozen(core.getState())).toBe(true);
  });

  it('getStateHash: a submit changes it, and equal inputs give an equal hash', () => {
    const core = steppable({});
    const twin = steppable({});
    const before = core.getStateHash();
    core.submit(STEP_A);
    expect(core.getStateHash()).not.toBe(before);
    expect(twin.getStateHash()).toBe(before);
  });

  it('getLogLength: counts the intents that succeeded, and only those', () => {
    const core = steppable({});
    const empty = core.getLogLength();
    core.submit(STEP_A);
    expect(core.getLogLength()).not.toBe(empty);
    core.submit({ ...STEP_A, type: 'teleport' });
    expect(core.getLogLength()).toBe(1);
  });

  it('toRow: carries the succeeded moves, so it differs after a submit', () => {
    const core = steppable({});
    const before = core.toRow();
    core.submit(STEP_A);
    expect(core.toRow()).not.toEqual(before);
    expect(core.toRow().moves).toEqual([STEP_A]);
  });
});
