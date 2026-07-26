/** F5 base cases GBC-33..39 — ledger law, venture lifecycle, crew law, TFX, weave, reckoning. */
import { describe, expect, it } from 'vitest';
import {
  ClosingRefusal,
  LedgerRefusal,
  VentureRefusal,
  derivedBalances,
  post,
  reckon,
  ventures,
} from '../src/index.js';
import type { JsonObject, State, WindowRow } from '../src/index.js';
import { minimalGenesis, newMinimalCore, seatCash, MIN_REF } from './f5-fixture.js';

const g = (): State => minimalGenesis(MIN_REF, [], 'seed');

describe('GBC-33 · balanced or refused (GX-25 = R-5)', () => {
  it('a balanced post lands; cash ≡ derived balances', () => {
    const s = post(g(), [{ account: 'A', delta: -1 }, { account: 'bank', delta: 1 }], 'wages') as State;
    expect((s['seats'] as readonly { id: string; cash: number }[])[0]!.cash).toBe(-1);
    expect(derivedBalances(s)['A']).toBe(-1);
  });

  it('an unbalanced post THROWS naming the imbalance', () => {
    expect(() => post(g(), [{ account: 'A', delta: -1 }], 'oops')).toThrow(LedgerRefusal);
    expect(() => post(g(), [{ account: 'A', delta: -1 }], 'oops')).toThrow(/unbalanced post \(sum -1\)/);
  });

  it('posting without the Ledger loaded refuses', () => {
    const noLedger = { ...g(), ledger: { loaded: false, entries: [] } } as State;
    expect(() => post(noLedger, [{ account: 'A', delta: 0 }], 'x')).toThrow(/without the Ledger loaded/);
  });
});

describe('GBC-34 · venture lifecycle: degenerate and general (GX-26/27)', () => {
  it('degenerate (RC-A′): spawn → assign → work → complete → receivable', () => {
    const { core } = newMinimalCore('gbc34a');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'J1', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [{ to: 'A', amount: 4 }] } } });
    core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'J1', portion: 0 } });
    core.submit({ type: 'crew:work', seat: 'A', args: { crew: 'crew-A' } });
    const s = core.getState();
    expect(ventures(s)[0]!.status).toBe('complete');
    expect((s['receivables'] as readonly { holder: string; amount: number }[])[0]).toMatchObject({ holder: 'A', amount: 4 });
  });

  it('general: routing window GATES the pass; route intent effectuates (I-36); carried debt lands', () => {
    const { core } = newMinimalCore('gbc34b');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V2', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [{ to: 'B', amount: 3 }] } } });
    const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.kind === 'routing' && w.status === 'open');
    expect(win).toBeDefined();
    const blocked = core.submit({ type: 'turn:end', seat: 'A', args: {} });
    expect('refused' in blocked).toBe(true); // R-6 through the weave
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win!.id, option: 0 } });
    core.submit({ type: 'venture:route', seat: 'A', args: { venture: 'V2', to: 'B', debts: [{ debtor: 'A', creditor: 'B', amount: 2, due: 2 }] } });
    const s = core.getState();
    expect(ventures(s)[0]!.portions[0]!.party).toBe('B');
    expect((s['debts'] as readonly { debtor: string }[])[0]!.debtor).toBe('A');
  });

  it('duplicate venture id / zero portions refuse', () => {
    const { core } = newMinimalCore('gbc34c');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'X', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [] } } });
    expect(() =>
      core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'X', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [] } } })
    ).toThrow(VentureRefusal);
    expect(() =>
      core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'Y', initiator: 'A', portions: [], deadline: 2, payoffs: [] } } })
    ).toThrow(/at least one portion/);
  });
});

describe('GBC-35 · one crew, one portion (GX-28)', () => {
  it('busy crew refuses a second assignment; unassigned work refuses; wrong-outfit refuses', () => {
    const { core } = newMinimalCore('gbc35');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'W', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 2 }, { party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [] } } });
    core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'W', portion: 0 } });
    expect(() => core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'W', portion: 1 } })).toThrow(/one portion at a time/);
    expect(() => core.submit({ type: 'crew:work', seat: 'A', args: { crew: 'crew-B' } })).toThrow(/not assigned/);
    expect(() => core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-B', venture: 'W', portion: 1 } })).toThrow(/outfit/);
  });
});

describe('GBC-36/39 · the weave: wrap once → on-round-wrap → TFX tick → resets (GX-29, I-29)', () => {
  it('TFX(table, 1, dur 1) charges both seats at the wrap (balanced) then expires; no second tick', () => {
    const { core } = newMinimalCore('gbc36');
    core.submit({ type: 'tfx:attach', seat: 'A', args: { tfx: { id: 'T', scope: 'table', charge: 1, remaining: 1, source: 'K3' } } });
    core.submit({ type: 'turn:end', seat: 'A', args: {} }); // A → B, same round: no tick
    expect(seatCash(core, 'A')).toBe(0);
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // wrap → tick
    expect(seatCash(core, 'A')).toBe(-1);
    expect(seatCash(core, 'B')).toBe(-1);
    expect((core.getState()['timedEffects'] as unknown[]).length).toBe(0); // expired
    const d = derivedBalances(core.getState());
    expect(d['A']).toBe(-1);
    expect(d['B']).toBe(-1);
    core.submit({ type: 'turn:end', seat: 'A', args: {} });
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // second wrap: nothing to tick
    expect(seatCash(core, 'A')).toBe(-1); // no double charge
  });
});

describe('GBC-37 · debts settle at their due round\'s upkeep (GX-25)', () => {
  it('a debt due r2 settles as a balanced transfer at r2 upkeep', () => {
    const { core } = newMinimalCore('gbc37');
    core.submit({ type: 'venture:spawn', seat: 'A', args: { spec: { id: 'V', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [] } } });
    const win = (core.getState()['windows'] as readonly WindowRow[])[0]!;
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win.id, option: 0 } });
    core.submit({ type: 'venture:route', seat: 'A', args: { venture: 'V', to: 'B', debts: [{ debtor: 'A', creditor: 'B', amount: 2, due: 2 }] } });
    core.submit({ type: 'upkeep', seat: 'A', args: {} }); // r1: not due
    expect(seatCash(core, 'A')).toBe(0);
    core.submit({ type: 'turn:end', seat: 'A', args: {} });
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // wrap → r2
    core.submit({ type: 'upkeep', seat: 'A', args: {} }); // due now
    expect(seatCash(core, 'A')).toBe(-2);
    expect(seatCash(core, 'B')).toBe(2);
    expect((core.getState()['debts'] as unknown[]).length).toBe(0);
  });
});

describe('GBC-38 · the Reckoning (GX-30)', () => {
  it('reckon before closing refuses; at closing it collects, ranks, crowns, ends', () => {
    expect(() => reckon(g())).toThrow(ClosingRefusal);
    const withRec = {
      ...g(),
      turn: { ...(g()['turn'] as JsonObject), status: 'closing' },
      receivables: [{ holder: 'B', amount: 3, source: 'V' }],
    } as State;
    const out = reckon(withRec) as State;
    const results = out['results'] as { champion: string; ranking: readonly { seat: string; cash: number }[] };
    expect(results.champion).toBe('B');
    expect(results.ranking[0]).toMatchObject({ seat: 'B', cash: 3 });
    expect((out['turn'] as { status: string }).status).toBe('ended'); // I-17 closes
    expect((out['receivables'] as unknown[]).length).toBe(0);
  });
});
