/**
 * F7 base case GBC-44 — preset fidelity floor (feeds V-4; pinned only at the owner's R
 * gate). The builders emit DATA; every behavioral assertion here exercises that data
 * THROUGH THE ENGINE's doors (GX-33). Catalog counts are law: 6/3/9/2 + closing.
 */
import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  CLOSING_DEFAULTS,
  IWN_KINDS,
  PatternRefusal,
  ROUTING_MODELS,
  buildGlobal,
  buildJob,
  buildModifier,
  buildRouted,
  buildRouting,
  buildWindow,
} from '../src/index.js';
import { EffectEngine, ventures } from '@tabletop/engine';
import type { State, WindowRow } from '@tabletop/engine';
import { minimalGenesis, newMinimalCore, seatCash, MIN_REF } from '../../engine/tests/f5-fixture.js';

describe('the catalog counts are law (GX-33)', () => {
  it('6 VNT · 3 RTM · 9 IWN · 2 TFX + closing defaults', () => {
    const families = Object.values(CATALOG).map((e) => e.family);
    expect(families.filter((f) => f === 'VNT').length).toBe(6);
    expect(families.filter((f) => f === 'RTM').length).toBe(3);
    expect(families.filter((f) => f === 'IWN').length).toBe(9);
    expect(families.filter((f) => f === 'TFX').length).toBe(2);
    expect(families.filter((f) => f === 'CLOSING').length).toBe(1);
    for (const e of Object.values(CATALOG)) expect(e.doc.length).toBeGreaterThan(0); // every entry cites its inventory ground
  });
});

describe('GBC-44 · preset fidelity floor — fragments exercised THROUGH the engine', () => {
  it("the 'job' preset builds RC-A′: spawn → assign → work → complete → receivable", () => {
    const frag = buildJob({ id: 'J1', initiator: 'A', task: 'α', amount: 4, deadline: 2 });
    const { core } = newMinimalCore('v4-job');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: frag as never } });
    core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'J1', portion: 0 } });
    core.submit({ type: 'crew:work', seat: 'A', args: { crew: 'crew-A' } });
    const s = core.getState();
    expect(ventures(s)[0]!.status).toBe('complete');
    expect((s['receivables'] as readonly { holder: string; amount: number }[])[0]).toMatchObject({ holder: 'A', amount: 4 });
  });

  it("the 'routed' preset spawns three unassigned portions and OPENS the routing window (GX-27)", () => {
    const frag = buildRouted({ id: 'R1', initiator: 'A', tasks: ['α', 'β', 'γ'], amount: 6, deadline: 2 });
    expect(frag.portions.every((p) => p.party === undefined)).toBe(true);
    const { core } = newMinimalCore('v4-routed');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: frag as never } });
    const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.kind === 'routing' && w.status === 'open');
    expect(win).toBeDefined();
    expect('refused' in core.submit({ type: 'turn:end', seat: 'A', args: {} })).toBe(true); // gated
  });

  it("an IWN preset ('court') opens its NAMED gated window through EffectEngine", () => {
    const frag = buildWindow('court', { decider: 'A' });
    const s = EffectEngine.apply(minimalGenesis(MIN_REF, [], 'v4-iwn') as State, frag as never, { windowDepth: 0 }) as State;
    const win = (s['windows'] as readonly WindowRow[])[0]!;
    expect(win.kind).toBe('court');
    expect(win.gated).toBe(true); // engine-reserved gating (I-19)
    expect(win.status).toBe('open');
  });

  it("the 'global' TFX preset ticks at the wrap, charging the table (GX-29)", () => {
    const frag = buildGlobal({ id: 'recession', charge: 1, rounds: 1, source: 'GLB' });
    const { core } = newMinimalCore('v4-tfx');
    core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: frag as never } });
    core.submit({ type: 'turn:end', seat: 'A', args: {} });
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // WRAP
    expect(seatCash(core, 'A')).toBe(-1);
    expect(seatCash(core, 'B')).toBe(-1);
    expect((core.getState()['timedEffects'] as unknown[]).length).toBe(0); // expired
  });

  it("the 'modifier' TFX preset scopes to ONE outfit", () => {
    const frag = buildModifier({ id: 'insurance', outfit: 'B', charge: 1, rounds: 1, source: 'MOD' });
    const { core } = newMinimalCore('v4-mod');
    core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: frag as never } });
    core.submit({ type: 'turn:end', seat: 'A', args: {} });
    core.submit({ type: 'turn:end', seat: 'B', args: {} });
    expect(seatCash(core, 'A')).toBe(0);
    expect(seatCash(core, 'B')).toBe(-1); // only the named outfit
  });

  it('the three RTM models carry their documented shapes; subcontract-debt routes THROUGH the engine with its debt', () => {
    const sub = buildRouting('subcontract-debt', { venture: 'V', from: 'A', to: 'B', amount: 2, due: 2 });
    expect(sub.routeArgs.debts.length).toBe(1);
    expect(sub.windowed).toBe(true);
    const com = buildRouting('commission-now', { venture: 'V', from: 'A', to: 'B', amount: 1 });
    expect(com.upfront).toMatchObject({ fx: 'pay', to: 'B', amount: 1 });
    expect(com.routeArgs.debts.length).toBe(0);
    expect(com.windowed).toBe(false);
    const def = buildRouting('deferred-referral', { venture: 'V', from: 'A', to: 'B' });
    expect(def.windowed).toBe(true);
    expect(def.routeArgs.debts.length).toBe(0);
    // the subcontract fragment drives the REAL engine path (spawn → window → route w/ debt):
    const { core } = newMinimalCore('v4-rtm');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [] } } });
    const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.status === 'open')!;
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 0 } });
    core.submit({ type: 'venture:route', seat: 'A', args: sub.routeArgs as never });
    expect((core.getState()['debts'] as readonly { creditor: string }[])[0]!.creditor).toBe('B');
  });

  it('closing defaults state the M15 law (trailing-first, force-collect, AP survives)', () => {
    expect(CLOSING_DEFAULTS.order).toBe('trailing-first');
    expect(CLOSING_DEFAULTS.receivables).toBe('force-collect');
    expect(CLOSING_DEFAULTS.payablesSurvive).toBe(true);
  });
});

describe('builders REFUSE bad params at build (GX-33) and never extend the vocabulary', () => {
  it('bad work / deadline / amount / kind / model / charge each refuse, named', () => {
    expect(() => buildJob({ id: 'J', initiator: 'A', task: 'α', work: 0, amount: 4, deadline: 2 })).toThrow(PatternRefusal);
    expect(() => buildJob({ id: 'J', initiator: 'A', task: 'α', amount: NaN, deadline: 2 })).toThrow(/amount/);
    expect(() => buildJob({ id: 'J', initiator: 'A', task: 'α', amount: 4, deadline: 0 })).toThrow(/deadline/);
    expect(() => buildWindow('inquisition' as never, { decider: 'A' })).toThrow(/unknown window kind/);
    expect(() => buildRouting('carrier-pigeon' as never, { venture: 'V', from: 'A', to: 'B' })).toThrow(/unknown routing model/);
    expect(() => buildGlobal({ id: 'G', charge: Infinity, rounds: 1, source: 'x' })).toThrow(/charge/);
    expect(IWN_KINDS.length).toBe(9);
    expect(ROUTING_MODELS.length).toBe(3);
  });

  it('a window option smuggling a non-EFX fx or a nested open_window refuses at BUILD', () => {
    expect(() =>
      buildWindow('threat', { decider: 'A', options: [{ label: 'x', fx: [{ fx: 'summon_dragon' }] }] })
    ).toThrow(/∉ EFX/);
    expect(() =>
      buildWindow('threat', { decider: 'A', options: [{ label: 'x', fx: [{ fx: 'open_window' }] }] })
    ).toThrow(/statically dead/);
    expect(() => buildWindow('threat', { decider: 'A', options: [] })).toThrow(/at least one option/);
    expect(() => buildWindow('threat', { decider: 'A', auto: 5 })).toThrow(/out of range/);
  });
});
