/** F7 base cases GBC-41..43 — the lockstep controller over the MINIMAL wiring. */
import { describe, expect, it } from 'vitest';
import { LockstepController, RuleRegistry, TransportRefusal, rebuild } from '../src/index.js';
import type { EngineCore, Intent } from '../src/index.js';
import { MIN_REF, MIN_SEATS, minimalGenesis, wireMinimal } from './f5-fixture.js';

const wire = () => (c: EngineCore) => wireMinimal(new RuleRegistry())(c);

function playedController(seed = 'f7'): LockstepController {
  const t = LockstepController.host(MIN_REF, MIN_SEATS, seed, minimalGenesis, wire());
  t.join('cA', 'A');
  t.join('cB', 'B');
  t.submit('cA', { type: 'upkeep', seat: 'A', args: { overhead: 1 } });
  t.submit('cA', { type: 'deck:draw', seat: 'A', args: { deck: 'A' } });
  t.submit('cA', { type: 'turn:end', seat: 'A', args: {} });
  t.submit('cB', { type: 'upkeep', seat: 'B', args: { overhead: 1 } });
  return t;
}

describe('GBC-41 · lockstep: every subscriber sees the SAME ordered moves (GX-31)', () => {
  it('two subscribers receive identical sequences; the row replays byte-identical', () => {
    const t = LockstepController.host(MIN_REF, MIN_SEATS, 'gbc41', minimalGenesis, wire());
    t.join('cA', 'A');
    t.join('cB', 'B');
    const seenA: [string, number, string][] = [];
    const seenB: [string, number, string][] = [];
    t.subscribe((m: Intent, i, h) => seenA.push([m.type, i, h]));
    t.subscribe((m: Intent, i, h) => seenB.push([m.type, i, h]));
    t.submit('cA', { type: 'upkeep', seat: 'A', args: { overhead: 1 } });
    t.submit('cA', { type: 'turn:end', seat: 'A', args: {} });
    t.submit('cB', { type: 'upkeep', seat: 'B', args: { overhead: 1 } });
    expect(seenA.length).toBe(3);
    expect(seenA).toEqual(seenB); // identical order, indices, hashes
    // a refused submit reaches NO subscriber (unlogged — GX-3):
    t.submit('cB', { type: 'deck:draw', seat: 'A', args: { deck: 'A' } }); // writer breach
    expect(seenA.length).toBe(3);
    // the row is the session: replay is byte-identical to the live state
    const r = rebuild(t.row(), minimalGenesis, wire());
    expect(r.getStateHash()).toBe(t.stateHash());
  });

  it('an unsubscribed listener stops receiving', () => {
    const t = LockstepController.host(MIN_REF, MIN_SEATS, 'gbc41b', minimalGenesis, wire());
    t.join('cA', 'A');
    const seen: string[] = [];
    const off = t.subscribe((m: Intent) => seen.push(m.type));
    t.submit('cA', { type: 'upkeep', seat: 'A', args: {} });
    off();
    t.submit('cA', { type: 'deck:draw', seat: 'A', args: { deck: 'A' } });
    expect(seen).toEqual(['upkeep']);
  });
});

describe('GBC-42 · resume: packRef mismatch refuses WHOLE, each leg NAMED (GX-31 = SUP-1)', () => {
  it('id, version, and hash mismatches each refuse with the leg named; a match resumes byte-identical', () => {
    const row = playedController('gbc42').row();
    expect(() => LockstepController.resume(row, { ...MIN_REF, id: 'OTHER' }, minimalGenesis, wire())).toThrow(TransportRefusal);
    expect(() => LockstepController.resume(row, { ...MIN_REF, id: 'OTHER' }, minimalGenesis, wire())).toThrow(/ID mismatch/);
    expect(() => LockstepController.resume(row, { ...MIN_REF, version: '9.9.9' }, minimalGenesis, wire())).toThrow(/VERSION mismatch/);
    expect(() => LockstepController.resume(row, { ...MIN_REF, hash: 'tampered' }, minimalGenesis, wire())).toThrow(/HASH mismatch/);
    const live = playedController('gbc42');
    const resumed = LockstepController.resume(live.row(), MIN_REF, minimalGenesis, wire());
    expect(resumed.stateHash()).toBe(live.stateHash());
  });
});

describe('GBC-43 · writer discipline + takeover (GX-32)', () => {
  it('a non-holder submit refuses typed and unlogged; departure enables takeover; play continues', () => {
    const t = playedController('gbc43'); // B's turn now; cB holds B
    const before = t.row().moves.length;
    // cA does not hold B — writer breach, typed, unlogged
    const res = t.submit('cA', { type: 'deck:draw', seat: 'B', args: { deck: 'B' } });
    expect('refused' in res).toBe(true);
    expect((res as { rule: string }).rule).toMatch(/GX-32/);
    expect(t.row().moves.length).toBe(before);
    // a seat held by a PRESENT client cannot be taken
    expect(() => t.join('cC', 'B')).toThrow(/held by a present client/);
    // the holder departs → takeover succeeds → play continues on the same row
    t.leave('cB');
    t.takeover('cC', 'B');
    expect(t.holderOf('B')).toBe('cC');
    const ok = t.submit('cC', { type: 'deck:draw', seat: 'B', args: { deck: 'B' } });
    expect('refused' in ok).toBe(false);
    expect(t.row().moves.length).toBe(before + 1);
    // and the healed session still replays byte-identical
    expect(rebuild(t.row(), minimalGenesis, wire()).getStateHash()).toBe(t.stateHash());
  });

  it('joining an unknown seat refuses; the host may hold several seats (AI parity)', () => {
    const t = LockstepController.host(MIN_REF, MIN_SEATS, 'gbc43b', minimalGenesis, wire());
    expect(() => t.join('host', 'Z')).toThrow(/unknown seat/);
    t.join('host', 'A');
    t.join('host', 'B'); // host-driven AI: one client, both seats
    expect('refused' in t.submit('host', { type: 'upkeep', seat: 'A', args: {} })).toBe(false);
  });
});

describe('K7-F7 closures D1/D2/D7 · the fan-out is sealed and isolated (GX-31)', () => {
  it('D1: a THROWING listener is contained + evicted — the writer still gets its result; survivors see every move', () => {
    const t = LockstepController.host(MIN_REF, MIN_SEATS, 'd1', minimalGenesis, wire());
    t.join('cA', 'A');
    const survivor: number[] = [];
    t.subscribe(() => { throw new Error('poison'); });
    t.subscribe((_m, i) => survivor.push(i));
    const r1 = t.submit('cA', { type: 'upkeep', seat: 'A', args: {} }); // must NOT throw
    const r2 = t.submit('cA', { type: 'deck:draw', seat: 'A', args: { deck: 'A' } });
    expect('refused' in r1).toBe(false);
    expect('refused' in r2).toBe(false);
    expect(survivor).toEqual([0, 1]); // the survivor missed nothing
    expect(t.row().moves.length).toBe(2); // log advanced normally
    expect(t.listenerFaults().length).toBe(1); // the fault surfaced (I-45), once — evicted
  });

  it('D2: a MUTATING listener cannot alter what later listeners observe (sealed fan-out)', () => {
    const t = LockstepController.host(MIN_REF, MIN_SEATS, 'd2', minimalGenesis, wire());
    t.join('cA', 'A');
    const seen: string[] = [];
    t.subscribe((m) => { try { (m as { type: string }).type = 'FORGED'; } catch { /* frozen — good */ } });
    t.subscribe((m) => seen.push(m.type));
    t.submit('cA', { type: 'upkeep', seat: 'A', args: {} });
    expect(seen).toEqual(['upkeep']); // not FORGED
    expect(t.row().moves[0]!.type).toBe('upkeep'); // and the row is untouched
  });

  it('D7: resuming a TAMPERED row → DivergenceError through rebuild, no partial state (R-9)', () => {
    const row = playedController('d7').row();
    const tampered = structuredClone(row) as { moves: { args: Record<string, unknown> }[] };
    tampered.moves[0]!.args = { overhead: 999999 }; // legal-shaped but... make it ILLEGAL:
    (tampered.moves[0] as { seat: string }).seat = 'GHOST'; // unknown seat → refusal mid-replay
    expect(() => LockstepController.resume(tampered as never, MIN_REF, minimalGenesis, wire())).toThrow(/[Dd]ivergence/);
  });
});
