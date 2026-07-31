/**
 * GBC-46/GBC-47 — the BOTY slice: content proves the platform (ODG-4, Option A).
 * The reconciliation law (I-46a): final cash ≡ derivedBalances + known EFX deltas.
 */
import { describe, expect, it } from 'vitest';
import {
  EngineCore,
  RuleRegistry,
  derivedBalances,
  hookHk4ValidatePack,
  rebuild,
  readSlot,
  ventures,
} from '@tabletop/engine';
import type { State, WindowRow } from '@tabletop/engine';
import {
  BOTY_CONTRIBUTIONS,
  BOTY_PACK,
  BOTY_REF,
  botyGcContract,
  botyGenesis,
  botyJob,
  botyRecession,
  botySubcontract,
  wireBoty,
} from '../src/index.js';

const newBoty = (seed = 'maple-hollow') => {
  const registry = new RuleRegistry();
  const core = new EngineCore(BOTY_REF, BOTY_PACK.seats, seed, botyGenesis);
  wireBoty(registry)(core);
  return { core, registry };
};

const cash = (core: EngineCore, id: string): number =>
  (core.getState()['seats'] as readonly { id: string; cash: number }[]).find((s) => s.id === id)!.cash;

describe('GBC-46 · the pack LOADS through the doors (GX-10/R-15)', () => {
  it('the shipped pack validates; a poisoned variant refuses NAMING the fx; contributions pass MR3', () => {
    expect(() => hookHk4ValidatePack(BOTY_PACK)).not.toThrow();
    const poisoned = { ...BOTY_PACK, cards: { ...BOTY_PACK.cards, hex: { fx: [{ fx: 'summon_dragon' }] } } };
    expect(() => hookHk4ValidatePack(poisoned as never)).toThrow(/summon_dragon/);
    // K7-BOTY D4: prove the MR3 door refuses a poisoned contribution AT WIRE (not a length check)
    const poisonedRegistry = new RuleRegistry();
    expect(() =>
      poisonedRegistry.register({ ...BOTY_CONTRIBUTIONS[0]!, id: 'bad', trigger: 'on-dragon-sneeze' })
    ).toThrow(/on-dragon-sneeze/);
    expect(() => newBoty()).not.toThrow();
  });
});

describe('GBC-47 · THE SLICE GAME — content drives the whole machine', () => {
  it('three shops, three rounds: moe +4 (champion), pete -2, edie -6; books reconcile; replay ×2 byte-identical', () => {
    const { core } = newBoty('maple-hollow');
    const ok = (r: unknown, what: string) => {
      if (r && typeof r === 'object' && 'refused' in r) throw new Error(`${what}: ${JSON.stringify(r)}`);
    };

    // ── Round 1 ── moe: wages, posting, the brake job end-to-end (RC-A′ preset)
    ok(core.submit({ type: 'upkeep', seat: 'moe', args: { overhead: 1 } }), 'moe upkeep r1');
    ok(core.submit({ type: 'deck:draw', seat: 'moe', args: { deck: 'moe' } }), 'moe draw'); // job-posting, fx-less
    // K7-BOTY D3: observe the drawn card's IDENTITY (kills the deck-order mutant)
    expect((core.getState()['decks'] as Record<string, { discard: readonly string[] }>)['moe']!.discard[0]).toBe('job-posting');
    ok(core.submit({ type: 'venture:spawn', seat: 'moe', args: { spec: botyJob() as never } }), 'spawn J1');
    ok(core.submit({ type: 'crew:assign', seat: 'moe', args: { crew: 'crew-moe', venture: 'J1', portion: 0 } }), 'assign');
    ok(core.submit({ type: 'crew:work', seat: 'moe', args: { crew: 'crew-moe' } }), 'work');
    expect(ventures(core.getState()).find((v) => v.id === 'J1')!.status).toBe('complete');
    ok(core.submit({ type: 'turn:end', seat: 'moe', args: {} }), 'moe end r1');
    // pete: wages, word-of-mouth INJECTS payday into pete's living deck (order-preserving)
    ok(core.submit({ type: 'upkeep', seat: 'pete', args: { overhead: 1 } }), 'pete upkeep r1');
    ok(core.submit({ type: 'deck:draw', seat: 'pete', args: { deck: 'pete' } }), 'pete draw');
    expect((core.getState()['decks'] as Record<string, { draw: readonly string[] }>)['pete']!.draw[0]).toBe('payday');
    ok(core.submit({ type: 'turn:end', seat: 'pete', args: {} }), 'pete end r1');
    // edie: wages, the town levies everyone (EFX), a recession attaches (TFX preset)
    ok(core.submit({ type: 'upkeep', seat: 'edie', args: { overhead: 1 } }), 'edie upkeep r1');
    ok(core.submit({ type: 'deck:draw', seat: 'edie', args: { deck: 'edie' } }), 'edie draw'); // town-levy: all −1
    ok(core.submit({ type: 'tfx:attach', seat: 'edie', args: { tfx: botyRecession() as never } }), 'recession');
    ok(core.submit({ type: 'turn:end', seat: 'edie', args: {} }), 'edie end r1 (WRAP)');
    // wrap 1: city-inspection levies (−1 each), boom-times favors edie, recession ticks (−1 each, LEDGER), expires
    expect(cash(core, 'moe')).toBe(-4); // −1 wages −1 town −1 inspection −1 recession
    expect(cash(core, 'pete')).toBe(-4);
    expect(cash(core, 'edie')).toBe(-4);
    expect((core.getState()['timedEffects'] as unknown[]).length).toBe(0);
    expect(readSlot(core.getState(), 'boom-times', 'booms')).toBeUndefined(); // per-round reset swept it

    // ── Round 2 ── moe: the van, the GC contract → gated routing → subcontract to Pete w/ debt
    ok(core.submit({ type: 'upkeep', seat: 'moe', args: {} }), 'moe upkeep r2');
    ok(core.submit({ type: 'deck:draw', seat: 'moe', args: { deck: 'moe' } }), 'moe draw r2'); // new-van: capitalize
    expect((core.getState()['seats'] as readonly { id: string; assets: readonly { id: string }[] }[])[0]!.assets[0]).toMatchObject({ ref: 'van', value: 3 });
    ok(core.submit({ type: 'venture:spawn', seat: 'moe', args: { spec: botyGcContract() as never } }), 'spawn G1');
    const rwin = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.kind === 'routing' && w.status === 'open');
    expect(rwin).toBeDefined();
    expect('refused' in core.submit({ type: 'turn:end', seat: 'moe', args: {} })).toBe(true); // R-6 gates
    ok(core.submit({ type: 'window:resolve', seat: 'moe', args: { window: rwin!.id, option: 0 } }), 'resolve routing');
    ok(core.submit({ type: 'venture:route', seat: 'moe', args: botySubcontract().routeArgs as never }), 'route G1');
    expect((core.getState()['debts'] as readonly { debtor: string; creditor: string }[])[0]).toMatchObject({ debtor: 'moe', creditor: 'pete' });
    ok(core.submit({ type: 'turn:end', seat: 'moe', args: {} }), 'moe end r2');
    // pete: the injected payday clears (+2 EFX), then works all three GC portions (one at a time)
    ok(core.submit({ type: 'upkeep', seat: 'pete', args: {} }), 'pete upkeep r2');
    ok(core.submit({ type: 'deck:draw', seat: 'pete', args: { deck: 'pete' } }), 'pete draw r2'); // payday +2
    for (const portion of [0, 1, 2]) {
      ok(core.submit({ type: 'crew:assign', seat: 'pete', args: { crew: 'crew-pete', venture: 'G1', portion } }), `assign p${portion}`);
      ok(core.submit({ type: 'crew:work', seat: 'pete', args: { crew: 'crew-pete' } }), `work p${portion}`);
    }
    expect(ventures(core.getState()).find((v) => v.id === 'G1')!.status).toBe('complete');
    ok(core.submit({ type: 'turn:end', seat: 'pete', args: {} }), 'pete end r2');
    // edie: good press (favor), wrap 2
    ok(core.submit({ type: 'upkeep', seat: 'edie', args: {} }), 'edie upkeep r2');
    ok(core.submit({ type: 'deck:draw', seat: 'edie', args: { deck: 'edie' } }), 'edie draw r2'); // good-press
    ok(core.submit({ type: 'turn:end', seat: 'edie', args: {} }), 'edie end r2 (WRAP)');
    expect(cash(core, 'moe')).toBe(-5); // −4 −1 inspection
    expect(cash(core, 'pete')).toBe(-3); // −4 +2 payday −1 inspection
    expect(cash(core, 'edie')).toBe(-5);

    // ── Round 3 ── moe: the debt SETTLES at its due round's upkeep; crossroads pays gold
    ok(core.submit({ type: 'upkeep', seat: 'moe', args: {} }), 'moe upkeep r3'); // settle moe→pete 2
    expect(cash(core, 'moe')).toBe(-7);
    expect(cash(core, 'pete')).toBe(-1);
    expect((core.getState()['debts'] as unknown[]).length).toBe(0);
    ok(core.submit({ type: 'deck:draw', seat: 'moe', args: { deck: 'moe' } }), 'moe draw r3'); // crossroads window
    const cwin = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.kind === 'choice' && w.status === 'open')!;
    ok(core.submit({ type: 'window:resolve', seat: 'moe', args: { window: cwin.id, option: 0 } }), 'take gold'); // +2
    expect(cash(core, 'moe')).toBe(-5);
    ok(core.submit({ type: 'turn:end', seat: 'moe', args: {} }), 'moe end r3');
    // pete: papers served (sue right recorded)
    ok(core.submit({ type: 'upkeep', seat: 'pete', args: {} }), 'pete upkeep r3');
    ok(core.submit({ type: 'deck:draw', seat: 'pete', args: { deck: 'pete' } }), 'pete draw r3'); // court-writ
    expect((core.getState()['seats'] as readonly { id: string; sueRights: readonly unknown[] }[])[1]!.sueRights.length).toBe(1);
    ok(core.submit({ type: 'turn:end', seat: 'pete', args: {} }), 'pete end r3');
    // edie: flavor card, final wrap → 'closing'
    ok(core.submit({ type: 'upkeep', seat: 'edie', args: {} }), 'edie upkeep r3');
    ok(core.submit({ type: 'deck:draw', seat: 'edie', args: { deck: 'edie' } }), 'edie draw r3'); // gc-flavor
    ok(core.submit({ type: 'turn:end', seat: 'edie', args: {} }), 'edie end r3 (WRAP → closing)');
    expect((core.getState()['turn'] as { status: string }).status).toBe('closing');

    // ── The Reckoning ──
    ok(core.submit({ type: 'closing:reckon', seat: 'moe', args: {} }), 'reckon');
    const s = core.getState();
    const results = s['results'] as { champion: string; ranking: readonly { seat: string; cash: number }[]; closingOrder: readonly string[] };
    expect(results.champion).toBe('moe'); // receivables J1(4) + G1(6) force-collect
    expect(results.ranking).toEqual([
      { seat: 'moe', cash: 4 },
      { seat: 'pete', cash: -2 },
      { seat: 'edie', cash: -6 },
    ]);
    expect(results.closingOrder).toEqual(['moe', 'edie', 'pete']); // trailing-first, pre-collection
    const favor = (s['seats'] as readonly { id: string; favor: number }[]).find((x) => x.id === 'edie')!.favor;
    expect(favor).toBe(4); // good-press 1 + boom-times ×3 wraps

    // ── The books (I-46a reconciliation): cash ≡ derived + KNOWN EFX deltas ──
    const entries = (s['ledger'] as { entries: readonly { legs: readonly { account: string; delta: number }[] }[] }).entries;
    for (const e of entries) expect(e.legs.reduce((t, l) => t + l.delta, 0)).toBe(0); // every entry balanced
    const derived = derivedBalances(s);
    const efx = { moe: -1 - 3 + 2, pete: -1 - 3 + 2, edie: -1 - 3 }; // town-levy · inspections ×3 · payday/gold
    expect(derived['moe']! + efx.moe).toBe(4);
    expect(derived['pete']! + efx.pete).toBe(-2);
    expect(derived['edie']! + efx.edie).toBe(-6);

    // ── Replay (AX-4/SUP-1): the row rebuilds byte-identical, twice ──
    const row = core.toRow();
    const wire = (c: EngineCore) => wireBoty(new RuleRegistry())(c);
    expect(rebuild(row, botyGenesis, wire).getStateHash()).toBe(core.getStateHash());
    expect(rebuild(row, botyGenesis, wire).getStateHash()).toBe(core.getStateHash());
  });
});
