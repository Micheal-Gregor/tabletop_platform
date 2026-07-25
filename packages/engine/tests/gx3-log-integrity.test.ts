/**
 * K7 round-1 regression set — defects 2 and 3.
 * GX-3/GX-4: the log is truth-STABLE (no caller aliasing can tamper the row).
 * I-7: seat legality comes from the row's authoritative seats; the kernel is pack-agnostic
 * (a genesis without a 'seats' key plays fine).
 */
import { describe, expect, it } from 'vitest';
import { EngineCore, rebuild } from '../src/index.js';
import type { Genesis, Intent, JsonObject } from '../src/index.js';
import { genesis, newCore, packRef, seats, wire } from './fixture.js';

describe('GX-3 · logged intents are frozen copies — aliasing severed (K7 defect 2)', () => {
  it('post-success caller mutation cannot tamper the row; rebuild matches live', () => {
    const core = newCore('alias-seed');
    const intent = { type: 'tally:add', seat: 'A', args: { n: 2 } } as {
      type: string;
      seat: string;
      args: Record<string, number>;
    };
    const r = core.submit(intent as unknown as Intent);
    expect('ok' in r && r.ok).toBe(true);

    // the attack K7 demonstrated: mutate the caller's object AFTER success
    intent.args['n'] = 999;

    const row = core.toRow();
    expect(row.moves[0]?.args['n']).toBe(2); // the row kept the truth
    const replayed = rebuild(row, genesis, wire);
    expect(replayed.getStateHash()).toBe(core.getStateHash()); // truth-stable
  });

  it('logged entries are deep-frozen — no engine API returns a mutable reference (GBC-5 clause)', () => {
    const core = newCore('alias-seed2');
    core.submit({ type: 'tally:add', seat: 'B', args: { n: 1 } });
    const move = core.toRow().moves[0]!;
    expect(Object.isFrozen(move)).toBe(true);
    expect(Object.isFrozen(move.args)).toBe(true);
    expect(() => {
      (move.args as Record<string, unknown>)['n'] = 999;
    }).toThrow();
  });
});

describe('I-7 · seat legality from the row, not a state schema (K7 defect 3)', () => {
  const bareGenesis: Genesis = (ref) => ({ packId: ref.id, counter: 0 }) as JsonObject;

  function wireBare(core: EngineCore): void {
    core.registerIntent(
      'counter:tick',
      { args: () => true, rules: [] },
      (state) => ({ ...state, counter: (state['counter'] as number) + 1 })
    );
  }

  it('a genesis WITHOUT a seats key plays fine — kernel is pack-agnostic', () => {
    const core = new EngineCore(packRef, seats, 'bare-seed', bareGenesis);
    wireBare(core);
    const r = core.submit({ type: 'counter:tick', seat: 'A', args: {} });
    expect('ok' in r && r.ok).toBe(true);
    expect(core.getState()['counter']).toBe(1);
  });

  it('unknown seat still refused — against the ROW seats, uninfluenced by state content', () => {
    const core = new EngineCore(packRef, seats, 'bare-seed2', bareGenesis);
    wireBare(core);
    const r = core.submit({ type: 'counter:tick', seat: 'Z', args: {} });
    expect('refused' in r && r.code === 'UNKNOWN_SEAT').toBe(true);
  });

  it('an applier cannot mint a guard-known seat by writing state (the divergence K7 named)', () => {
    const core = new EngineCore(packRef, seats, 'mint-seed', bareGenesis);
    wireBare(core);
    core.registerIntent(
      'seats:mint',
      { args: () => true, rules: [] },
      (state) => ({ ...state, seats: [{ id: 'Z' }] }) // content writes a seats key — so what
    );
    const minted = core.submit({ type: 'seats:mint', seat: 'A', args: {} });
    expect('ok' in minted && minted.ok).toBe(true);

    const r = core.submit({ type: 'counter:tick', seat: 'Z', args: {} });
    expect('refused' in r && r.code === 'UNKNOWN_SEAT').toBe(true); // row governs, still
  });
});
