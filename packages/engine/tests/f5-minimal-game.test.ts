/**
 * GBC-40 — THE MINIMAL GAME, end-to-end (Stage-2b S0..S10, σ=7).
 * The rule, stated independently of any pin (SP-5): the Stage-2b script + the ranking
 * law → A ends at 0, B at +3, B is champion; every ledger entry balanced; final cash
 * ≡ derived balances (RC-D); rebuild from the row ×2 is byte-identical (AX-4).
 * Feeds V-1 — the vector is PINNED only at the owner's R gate (DISCHARGE mechanism).
 * Overhead is an upkeep ARGUMENT, r1 only (I-35); routing effectuation = the logged
 * venture:route intent carrying the decision as arguments (I-36).
 */
import { describe, expect, it } from 'vitest';
import { RuleRegistry, rebuild, ventures } from '../src/index.js';
import type { WindowRow } from '../src/index.js';
import { minimalGenesis, newMinimalCore, seatCash, wireMinimal } from './f5-fixture.js';

describe('GBC-40 · the MINIMAL game (Stage-2b S0..S10)', () => {
  it('plays the full script: A ends at 0, B at +3, B is champion; books balance; replay ×2 byte-identical', () => {
    const { core } = newMinimalCore('sigma-7');

    // ── Round 1 · seat A ──────────────────────────────────────────────
    core.submit({ type: 'upkeep', seat: 'A', args: { overhead: 1 } }); // wages: A −1 (I-35)
    core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'A' } }); // → K2 (fx-less, I-34)
    core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'V2', initiator: 'A', portions: [{ task: 'β', work: 1 }], deadline: 2, payoffs: [{ to: 'B', amount: 3 }] } },
    });
    // GX-27: the unassigned portion opened a GATED routing window — it blocks the pass (R-6).
    const win = (core.getState()['windows'] as readonly WindowRow[]).find((w) => w.kind === 'routing' && w.status === 'open');
    expect(win).toBeDefined();
    const gateProbe = core.submit({ type: 'turn:end', seat: 'A', args: {} });
    expect('refused' in gateProbe).toBe(true);
    // The decision is recorded at the window; effectuation is the logged route intent (I-36).
    core.submit({ type: 'window:resolve', seat: 'A', args: { window: win!.id, option: 0 } });
    core.submit({
      type: 'venture:route', seat: 'A',
      args: { venture: 'V2', to: 'B', debts: [{ debtor: 'A', creditor: 'B', amount: 2, due: 2 }] },
    });
    // Negative probe (R-1 through the weave): B acting on A's turn → typed refusal, unlogged.
    const movesBefore = core.getLogLength();
    const hashBefore = core.getStateHash();
    const offTurn = core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'B' } });
    expect('refused' in offTurn).toBe(true);
    expect(core.getLogLength()).toBe(movesBefore); // not logged
    expect(core.getStateHash()).toBe(hashBefore); // state byte-unchanged
    core.submit({ type: 'turn:end', seat: 'A', args: {} }); // A → B, same round

    // ── Round 1 · seat B ──────────────────────────────────────────────
    core.submit({ type: 'upkeep', seat: 'B', args: { overhead: 1 } }); // wages: B −1
    core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'B' } }); // → K3
    core.submit({ type: 'tfx:attach', seat: 'B', args: { tfx: { id: 'T', scope: 'table', charge: 1, remaining: 1, source: 'K3' } } });
    core.submit({ type: 'crew:assign', seat: 'B', args: { crew: 'crew-B', venture: 'V2', portion: 0 } });
    core.submit({ type: 'crew:work', seat: 'B', args: { crew: 'crew-B' } }); // → V2 complete → receivable (B, 3)
    expect(ventures(core.getState()).find((v) => v.id === 'V2')!.status).toBe('complete');
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // WRAP: TFX ticks A −1 / B −1 (balanced), expires
    expect(seatCash(core, 'A')).toBe(-2); // −1 wages, −1 tfx
    expect(seatCash(core, 'B')).toBe(-2);
    expect((core.getState()['timedEffects'] as unknown[]).length).toBe(0);

    // ── Round 2 · seat A ──────────────────────────────────────────────
    core.submit({ type: 'upkeep', seat: 'A', args: {} }); // no overhead (I-35); debt due r2 settles: A −2 / B +2
    expect(seatCash(core, 'A')).toBe(-4);
    expect(seatCash(core, 'B')).toBe(0);
    expect((core.getState()['debts'] as unknown[]).length).toBe(0);
    core.submit({ type: 'deck:draw', seat: 'A', args: { deck: 'A' } }); // → K1
    core.submit({
      type: 'venture:spawn', seat: 'A',
      args: { spec: { id: 'J1', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [{ to: 'A', amount: 4 }] } },
    }); // fully assigned — no routing window
    expect((core.getState()['windows'] as readonly WindowRow[]).filter((w) => w.status === 'open').length).toBe(0);
    core.submit({ type: 'crew:assign', seat: 'A', args: { crew: 'crew-A', venture: 'J1', portion: 0 } });
    core.submit({ type: 'crew:work', seat: 'A', args: { crew: 'crew-A' } }); // → J1 complete → receivable (A, 4)
    core.submit({ type: 'turn:end', seat: 'A', args: {} });

    // ── Round 2 · seat B ──────────────────────────────────────────────
    core.submit({ type: 'upkeep', seat: 'B', args: {} });
    core.submit({ type: 'deck:draw', seat: 'B', args: { deck: 'B' } }); // empty draw — LEGAL (GX-12, S8)
    core.submit({ type: 'turn:end', seat: 'B', args: {} }); // wrap → round 3 > maxRounds 2 → status 'closing'
    expect((core.getState()['turn'] as { status: string }).status).toBe('closing');

    // ── The Reckoning (S10) ───────────────────────────────────────────
    core.submit({ type: 'closing:reckon', seat: 'A', args: {} });
    const s = core.getState();
    const results = s['results'] as {
      closingOrder: readonly string[];
      ranking: readonly { seat: string; cash: number }[];
      champion: string;
    };
    expect(results.closingOrder).toEqual(['A', 'B']); // trailing-first (A at −4 trailed)
    expect(seatCash(core, 'A')).toBe(0); // −1 −1 −2 +4
    expect(seatCash(core, 'B')).toBe(3); // −1 −1 +2 +3
    expect(results.champion).toBe('B');
    expect(results.ranking).toEqual([{ seat: 'B', cash: 3 }, { seat: 'A', cash: 0 }]);
    expect((s['turn'] as { status: string }).status).toBe('ended'); // I-17 closes

    // ── The books (GX-25 / RC-D) ──────────────────────────────────────
    const entries = (s['ledger'] as { entries: readonly { legs: readonly { account: string; delta: number }[] }[] }).entries;
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.legs.reduce((sum, l) => sum + l.delta, 0)).toBe(0); // every entry balanced
    }
    const derived: Record<string, number> = {};
    for (const e of entries) for (const l of e.legs) if (l.account !== 'bank') derived[l.account] = (derived[l.account] ?? 0) + l.delta;
    expect(derived['A']).toBe(seatCash(core, 'A')); // cash ≡ derived balances
    expect(derived['B']).toBe(seatCash(core, 'B'));

    // ── Replay (AX-4 / V-2's law on THIS row) ─────────────────────────
    const row = core.toRow();
    const wireForRebuild = (c: Parameters<ReturnType<typeof wireMinimal>>[0]) => wireMinimal(new RuleRegistry())(c);
    const r1 = rebuild(row, minimalGenesis, wireForRebuild);
    const r2 = rebuild(row, minimalGenesis, wireForRebuild);
    expect(r1.getStateHash()).toBe(core.getStateHash());
    expect(r2.getStateHash()).toBe(core.getStateHash());
  });
});
