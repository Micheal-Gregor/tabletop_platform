/**
 * K7-F5 round-1 closures (DF5-1..DF5-10) — every test here exists to KILL a named
 * mutant or reconstruct a live probe from the K7 report. On-path, falsifying, per RD-8.
 */
import { describe, expect, it } from 'vitest';
import {
  EngineCore,
  Guard,
  HookHk5Violation,
  LedgerRefusal,
  RuleRegistry,
  VentureRefusal,
  attachTimedFx,
  post,
  readSlot,
  routeVenture,
  spawnVenture,
  ventures,
  workCrew,
} from '../src/index.js';
import type { JsonObject, RuleContribution, State, WindowRow } from '../src/index.js';
import { MIN_REF, MIN_SEATS, minimalGenesis, newMinimalCore, seatCash, wireMinimal } from './f5-fixture.js';

const VOCABS = { efx: '1.1.1', hooks: '1.0' };

describe('D1 · turn:pass is superseded by the weave (kills the weave-bypass — Probe-1)', () => {
  it('with the library wired, a raw turn:pass refuses (typed, unlogged) and cannot wrap the round', () => {
    const { core } = newMinimalCore('d1');
    core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: { id: 'T', scope: 'table', charge: 1, remaining: 1, source: 'K3' } } });
    core.submit({ type: 'turn:end', seat: 'A', args: {} }); // A → B lawfully
    const moves = core.getLogLength();
    const hash = core.getStateHash();
    const res = core.submit({ type: 'turn:pass', seat: 'B', args: {} }); // the bypass attempt AT the wrap seat
    expect('refused' in res).toBe(true);
    expect((res as { rule: string }).rule).toMatch(/I-37|GX-29/);
    expect(core.getLogLength()).toBe(moves); // never logged
    expect(core.getStateHash()).toBe(hash); // round did NOT wrap, TFX did NOT skip its tick
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // the lawful woven pass still works
    expect(seatCash(core, 'A')).toBe(-1); // and the tick happened
  });

  it('superseding an unregistered intent refuses; supersession without a ground refuses', () => {
    const core = new EngineCore(MIN_REF, MIN_SEATS, 'd1b', minimalGenesis);
    expect(() => core.supersedeIntent('no:such', 'ground', { args: () => true, rules: [] }, (s) => s as JsonObject)).toThrow(/unregistered/);
    // NEW-3: the empty-ground leg, exercised (a supersession must name its ground)
    core.registerIntent('x:y', { args: () => true, rules: [] }, (s) => s as JsonObject);
    expect(() => core.supersedeIntent('x:y', '', { args: () => true, rules: [] }, (s) => s as JsonObject)).toThrow(/named ground/);
  });
});

describe('D2 · HK-5 lives on the turn:end path (kills L2 — the theater finding)', () => {
  it('a suborned Guard cannot carry turn:end over an open gated window — HK-5 blocks in the applier', () => {
    const lyingGuard = { register: () => undefined, supersede: () => undefined, check: () => ({ legal: true }) } as unknown as Guard;
    const core = new EngineCore(MIN_REF, MIN_SEATS, 'd2', minimalGenesis, lyingGuard);
    wireMinimal(new RuleRegistry())(core);
    // spawn with an unassigned portion → gated routing window opens
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [] } } });
    const logBefore = core.getLogLength();
    // the Guard-rule leg is suborned (lying LEGAL) — only HK-5 in the applier stands:
    expect(() => core.submit({ type: 'turn:end', seat: 'A', args: {} })).toThrow(HookHk5Violation);
    expect(core.getLogLength()).toBe(logBefore); // the violated pass was never logged
  });
});

describe('D3 · the wrap dispatches on-round-wrap AND resets per-round slots (kills M1, M4)', () => {
  it('an on-round-wrap contribution fires at the wrap; its per-round slot is reset in the same weave', () => {
    const { core, registry } = newMinimalCore('d3');
    const contrib: RuleContribution = {
      id: 'wrap-watcher',
      bearer: { kind: 'Card' },
      trigger: 'on-round-wrap',
      condition: { op: 'always' },
      effects: [{ fx: 'grant_favor', to: 'A', n: 1 }],
      declaredSlots: [{ name: 'wraps', reset: 'per-round' }],
      slotWrites: [{ slot: 'wraps', increment: 1 }],
      vocabVersions: VOCABS,
    };
    registry.register(contrib);
    core.submit({ type: 'turn:end', seat: 'A', args: {} }); // no wrap yet
    let favor = (core.getState()['seats'] as readonly { id: string; favor: number }[]).find((s) => s.id === 'A')!.favor;
    expect(favor).toBe(0); // dispatch is wrap-only
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // THE WRAP
    favor = (core.getState()['seats'] as readonly { id: string; favor: number }[]).find((s) => s.id === 'A')!.favor;
    expect(favor).toBe(1); // the bus leg ran (M1 dies)
    // the slot was written by the dispatch, then the per-round reset cleared it (M4 dies):
    expect(readSlot(core.getState(), 'wrap-watcher', 'wraps')).toBeUndefined();
  });
});

describe('D4 · lapse at the wrap: status flips, crew frees, work refuses (kills M3; Probe-4)', () => {
  it('a past-deadline open venture lapses at the wrap and releases its crew', () => {
    const { core } = newMinimalCore('d4');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'L', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 2 }], deadline: 1, payoffs: [{ to: 'A', amount: 4 }] } } });
    core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'L', portion: 0 } });
    core.submit({ type: 'turn:end', seat: 'A', args: {} });
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // wrap → round 2 > deadline 1 → lapse
    const s = core.getState();
    expect(ventures(s).find((v) => v.id === 'L')!.status).toBe('lapsed');
    const crewA = (s['crew'] as readonly { id: string; assignedTo?: unknown }[]).find((c) => c.id === 'crew-A')!;
    expect(crewA.assignedTo).toBeUndefined(); // stranded crew freed at lapse
    // freed crew has nothing to work; re-assignment to the lapsed venture refuses:
    expect(() => core.submit({ type: 'crew:work', seat: 'A', args: { crew: 'crew-A' } })).toThrow(/not assigned/);
    expect(() => core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'L', portion: 0 } })).toThrow(/no open venture/);
  });

  it('work on a non-open venture refuses even with a forged assignment (module door)', () => {
    const forged = {
      ...minimalGenesis(MIN_REF, [], 'd4b'),
      ventures: [{ id: 'X', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1, done: false }], deadline: 1, payoffs: [], status: 'lapsed' }],
      crew: [{ id: 'crew-A', outfit: 'A', assignedTo: { venture: 'X', portion: 0 } }],
    } as State;
    expect(() => workCrew(forged, 'crew-A')).toThrow(/not open — no further work/);
  });
});

describe('D5 · routing a non-open venture refuses (kills F)', () => {
  it('venture:route on a LAPSED venture with an unassigned portion → refusal, no route', () => {
    const { core } = newMinimalCore('d5');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 1, payoffs: [] } } });
    const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.status === 'open')!;
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 1 } }); // decline
    core.submit({ type: 'turn:end', seat: 'A', args: {} });
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // wrap → lapse
    expect(ventures(core.getState()).find((v) => v.id === 'V')!.status).toBe('lapsed');
    expect(() =>
      core.submit({ type: 'venture:route', seat: 'A', args: { venture: 'V', to: 'B', debts: [] } })
    ).toThrow(VentureRefusal);
    expect(ventures(core.getState()).find((v) => v.id === 'V')!.portions[0]!.party).toBeUndefined();
  });
});

describe('D6 · door validation: brick values refused typed and unlogged (Probes 2a/2b/2c; kills P, O)', () => {
  it('tfx:attach with NaN charge → refused; state stays hashable', () => {
    const { core } = newMinimalCore('d6a');
    const hash = core.getStateHash();
    const res = core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: { id: 'T', scope: 'table', charge: NaN, remaining: 1, source: 'x' } } });
    expect('refused' in res).toBe(true);
    expect(core.getStateHash()).toBe(hash); // never committed — GX-3 holds
  });

  it('tfx:attach with Infinity charge → refused (the permanent-wrap-brick class)', () => {
    const { core } = newMinimalCore('d6b');
    const res = core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: { id: 'T', scope: 'table', charge: Infinity, remaining: 1, source: 'x' } } });
    expect('refused' in res).toBe(true);
  });

  it('tfx:attach duplicate id → refused at the module door (kills O)', () => {
    const { core } = newMinimalCore('d6c');
    core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: { id: 'T', scope: 'table', charge: 1, remaining: 2, source: 'x' } } });
    expect(() =>
      core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: { id: 'T', scope: 'table', charge: 1, remaining: 2, source: 'x' } } })
    ).toThrow(/duplicate id/);
  });

  it('venture:spawn with a payoff to an unknown seat → refused (the unreachable-Reckoning class)', () => {
    const { core } = newMinimalCore('d6d');
    const res = core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'V', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [{ to: 'GHOST', amount: 3 }] } },
    });
    expect('refused' in res).toBe(true);
    expect(ventures(core.getState()).length).toBe(0);
  });

  it('venture:spawn with a non-finite payoff amount → refused', () => {
    const { core } = newMinimalCore('d6e');
    const res = core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'V', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [{ to: 'B', amount: NaN }] } },
    });
    expect('refused' in res).toBe(true);
  });

  it('venture:route with malformed debts → refused; nothing lands', () => {
    const { core } = newMinimalCore('d6f');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [] } } });
    const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.status === 'open')!;
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 0 } });
    for (const debts of [
      [{ debtor: 'A', creditor: 'B', amount: Infinity, due: 2 }],
      [{ debtor: 'GHOST', creditor: 'B', amount: 1, due: 2 }],
      [{ debtor: 'A', creditor: 'B', amount: 1, due: 0 }],
      ['not-an-object'],
    ]) {
      const res = core.submit({ type: 'venture:route', seat: 'A', args: { venture: 'V', to: 'B', debts } });
      expect('refused' in res).toBe(true);
    }
    expect((core.getState()['debts'] as unknown[]).length).toBe(0);
  });

  it('upkeep with NaN / negative overhead → refused', () => {
    const { core } = newMinimalCore('d6g');
    expect('refused' in core.submit({ type: 'upkeep', seat: 'A', args: { overhead: NaN } })).toBe(true);
    expect('refused' in core.submit({ type: 'upkeep', seat: 'A', args: { overhead: -1 } })).toBe(true);
  });

  it('a direct post with a non-finite leg → LedgerRefusal naming it (kills P)', () => {
    const g = minimalGenesis(MIN_REF, [], 'd6h') as State;
    expect(() => post(g, [{ account: 'A', delta: NaN }, { account: 'bank', delta: NaN }], 'x')).toThrow(/non-finite leg/);
  });
});

describe('D9 · unknown-field smuggling refused at every persisting door (r2 NEW-1 — NEW-PROBE-5)', () => {
  it('venture:spawn with an unknown NaN field → refused; state stays hashable', () => {
    const { core } = newMinimalCore('d9a');
    const hash = core.getStateHash();
    const res = core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'V', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [], sneak: NaN } },
    });
    expect('refused' in res).toBe(true);
    expect((res as { detail: string }).detail).toMatch(/unknown field.*sneak/);
    expect(core.getStateHash()).toBe(hash); // never committed — GX-3 holds
  });

  it('portion and payoff sub-objects refuse unknown fields too', () => {
    const { core } = newMinimalCore('d9b');
    let res = core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'V', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1, sneak: NaN }], deadline: 2, payoffs: [] } },
    });
    expect('refused' in res).toBe(true);
    res = core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'V', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [{ to: 'B', amount: 1, sneak: NaN }] } },
    });
    expect('refused' in res).toBe(true);
  });

  it('tfx:attach with an unknown NaN field → refused; state stays hashable', () => {
    const { core } = newMinimalCore('d9c');
    const hash = core.getStateHash();
    const res = core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: { id: 'T', scope: 'table', charge: 1, remaining: 1, source: 'x', sneak: NaN } } });
    expect('refused' in res).toBe(true);
    expect(core.getStateHash()).toBe(hash);
  });

  it('venture:route with a debt carrying an unknown NaN field → refused; nothing lands', () => {
    const { core } = newMinimalCore('d9d');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [] } } });
    const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.status === 'open')!;
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 0 } });
    const res = core.submit({
      type: 'venture:route', seat: 'A',
      args: { venture: 'V', to: 'B', debts: [{ debtor: 'A', creditor: 'B', amount: 1, due: 2, sneak: NaN }] },
    });
    expect('refused' in res).toBe(true);
    expect((core.getState()['debts'] as unknown[]).length).toBe(0);
    expect(() => core.getStateHash()).not.toThrow();
  });

  it('the structural leg: module row construction drops nothing INTO state that was not validated', () => {
    // Direct module call bypassing the wire door — the constructed row still carries
    // only the named fields (belt AND suspenders; the door refuses, the module constructs).
    const g = minimalGenesis(MIN_REF, [], 'd9e') as State;
    const out = attachTimedFx(g, { id: 'T', scope: 'table', charge: 1, remaining: 1, source: 'x', sneak: 7 } as never) as State;
    const row = (out['timedEffects'] as readonly Record<string, unknown>[])[0]!;
    expect('sneak' in row).toBe(false);
    // K7-F5 r3 OBS-r3: the spawn-row and route-debts construction legs, asserted directly
    // (kills MF/MG — the doors no longer mask the modules).
    const spawned = spawnVenture(g, { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1, sneak: 7 }], deadline: 2, payoffs: [{ to: 'B', amount: 1, sneak: 7 }], sneak: 7 } as never) as State;
    const vRow = (spawned['ventures'] as readonly Record<string, unknown>[])[0]!;
    expect('sneak' in vRow).toBe(false);
    expect('sneak' in (vRow['portions'] as readonly Record<string, unknown>[])[0]!).toBe(false);
    expect('sneak' in (vRow['payoffs'] as readonly Record<string, unknown>[])[0]!).toBe(false);
    const routed = routeVenture(spawned, 'V', 'B', [{ debtor: 'A', creditor: 'B', amount: 1, due: 2, sneak: 7 }] as never) as State;
    expect('sneak' in (routed['debts'] as readonly Record<string, unknown>[])[0]!).toBe(false);
  });
});

describe('D7 · unloaded-Ledger upkeep is coherent (Probe-3 — GBC-37 in the opt-out configuration)', () => {
  it('wages levy and debt settlement flow through EffectEngine; debts are settled, never deleted unpaid', () => {
    const g: typeof minimalGenesis = (ref, seats, seed) => ({
      ...(minimalGenesis(ref, seats, seed) as JsonObject),
      ledger: { loaded: false, entries: [] },
      debts: [{ debtor: 'A', creditor: 'B', amount: 2, due: 1 }],
    });
    const core = new EngineCore(MIN_REF, MIN_SEATS, 'd7', g);
    wireMinimal(new RuleRegistry())(core);
    core.submit({ type: 'upkeep', seat: 'A', args: { overhead: 1 } });
    expect(seatCash(core, 'A')).toBe(-3); // −1 wages (levy), −2 settlement (levy)
    expect(seatCash(core, 'B')).toBe(2); // +2 settlement (pay) — the debt was PAID
    expect((core.getState()['debts'] as unknown[]).length).toBe(0);
    expect((core.getState()['ledger'] as { entries: unknown[] }).entries.length).toBe(0); // no ghost entries
  });
});

describe('D10 · EXT-4B closures: the spawn door legs FA-1 named (deadline / work / party)', () => {
  it('venture:spawn with deadline 0 / NaN → refused typed, hash stable (kills FA-1a)', () => {
    const { core } = newMinimalCore('d10a');
    const hash = core.getStateHash();
    for (const deadline of [0, NaN, -1, 1.5]) {
      const res = core.submit({
        type: 'venture:spawn', seat: 'A',
        args: { spec: { id: 'V', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline, payoffs: [] } },
      });
      expect('refused' in res).toBe(true);
      expect((res as { detail: string }).detail).toMatch(/deadline/);
    }
    expect(core.getStateHash()).toBe(hash);
  });

  it('venture:spawn with portion.work 0 / NaN → refused typed, hash stable (kills FA-1b)', () => {
    const { core } = newMinimalCore('d10b');
    const hash = core.getStateHash();
    for (const work of [0, NaN, -2, 0.5]) {
      const res = core.submit({
        type: 'venture:spawn', seat: 'A',
        args: { spec: { id: 'V', initiator: 'A', portions: [{ party: 'A', task: 'α', work }], deadline: 2, payoffs: [] } },
      });
      expect('refused' in res).toBe(true);
      expect((res as { detail: string }).detail).toMatch(/work/);
    }
    expect(core.getStateHash()).toBe(hash);
  });

  it('venture:spawn with portion.party an unknown seat → refused typed, hash stable (kills FA-1c)', () => {
    const { core } = newMinimalCore('d10c');
    const hash = core.getStateHash();
    const res = core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'V', initiator: 'A', portions: [{ party: 'GHOST', task: 'α', work: 1 }], deadline: 2, payoffs: [] } },
    });
    expect('refused' in res).toBe(true);
    expect((res as { detail: string }).detail).toMatch(/party.*GHOST/);
    expect(core.getStateHash()).toBe(hash);
  });
});

describe('D11 · EXT-4B FA-3: crew assignment edge refusals', () => {
  it('assigning to an out-of-range portion index refuses; assigning to a DONE portion refuses', () => {
    const { core } = newMinimalCore('d11');
    core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'W', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }, { party: 'A', task: 'α', work: 2 }], deadline: 2, payoffs: [] } },
    });
    expect(() => core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'W', portion: 9 } })).toThrow(/no portion 9/);
    core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'W', portion: 0 } });
    core.submit({ type: 'crew:work', seat: 'A', args: { crew: 'crew-A' } }); // portion 0 → done, crew freed
    expect(() => core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'W', portion: 0 } })).toThrow(/already done/);
  });
});

describe('D12 · EXT-4B FA-4: the per-turn slot reset leg of the weave', () => {
  it('a per-turn slot clears after a NON-wrapping turn:end', () => {
    const registry = new RuleRegistry();
    registry.register({
      id: 'turn-scratch',
      bearer: { kind: 'Card' },
      trigger: 'on-card-drawn',
      condition: { op: 'always' },
      effects: [],
      declaredSlots: [{ name: 't', reset: 'per-turn' }],
      slotWrites: [],
      vocabVersions: { efx: '1.1.1', hooks: '1.0' },
    });
    // slot pre-populated at genesis (the on-state region the weave must sweep)
    const g: typeof minimalGenesis = (ref, seats, seed) => ({
      ...(minimalGenesis(ref, seats, seed) as JsonObject),
      ruleSlots: { 'turn-scratch': { t: 5 } },
    });
    const core = new EngineCore(MIN_REF, MIN_SEATS, 'd12', g);
    wireMinimal(registry)(core);
    expect(readSlot(core.getState(), 'turn-scratch', 't')).toBe(5);
    core.submit({ type: 'turn:end', seat: 'A', args: {} }); // A → B, NO wrap
    expect(readSlot(core.getState(), 'turn-scratch', 't')).toBeUndefined(); // per-turn sweep ran
  });
});

describe('D8 · the reserved bank account (DF5-10)', () => {
  it("a seat named 'bank' collides with the implicit account → post refuses", () => {
    const g = {
      ...(minimalGenesis(MIN_REF, [], 'd8') as JsonObject),
      seats: [
        { id: 'bank', role: 'α', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
        { id: 'B', role: 'β', cash: 0, favor: 0, assets: [], sueRights: [], eliminated: false },
      ],
    } as State;
    expect(() => post(g, [{ account: 'bank', delta: -1 }, { account: 'B', delta: 1 }], 'x')).toThrow(LedgerRefusal);
    expect(() => post(g, [{ account: 'bank', delta: -1 }, { account: 'B', delta: 1 }], 'x')).toThrow(/reserved implicit account/);
  });
});
