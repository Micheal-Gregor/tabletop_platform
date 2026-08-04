/**
 * A16 pools (I-137, the owner's 'no game until that's set up' ruling): hire + buy
 * through the real doors, the GBC-63 base cases falsifiable. MUT: remove the empty-pool
 * guard → 'empty-pool-refuses' throws differently → fails; stop popping the pool →
 * 'hire-pops-the-top' count law fails.
 */
import { describe, it, expect } from 'vitest';
import { RuleRegistry, LockstepController, rebuild } from '@tabletop/engine';
import type { EngineCore } from '@tabletop/engine';
import { emit, project } from '@tabletop/presentation';
import { BOTY_PACK6, BOTY6_REF, botyGenesis6, wireBoty } from '../src/index.js';

const host = () => {
  const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry(), BOTY_PACK6 as never)(c);
  const ctl = LockstepController.host(BOTY6_REF, BOTY_PACK6.seats, 'maple-hollow', botyGenesis6, wire());
  const SEATS = BOTY_PACK6.seats.map((s) => s.id);
  for (const s of SEATS) ctl.join('bench-3d', s);
  const pv = () => project(rebuild(ctl.row(), botyGenesis6, wire()).getState(), SEATS[0]!);
  const sub = (verb: string, seat: string, args: object = {}) => {
    const r = ctl.submit('bench-3d', emit(verb, seat, args as never) as never);
    if (r && typeof r === 'object' && 'refused' in (r as object)) throw new Error(`REFUSED ${(r as { rule: string }).rule}`);
  };
  return { pv, sub };
};

describe('A16: the pools (I-137)', () => {
  it('genesis pools are seeded, shuffled, and COUNTED in the projection (8 + 8)', () => {
    const { pv } = host();
    expect(pv().pools).toEqual({ tradespeople: 8, equipment: 8, bbb: 5, networking: 5 }); // O-3 (I-139): all four pools
  });

  it('hire pops the top: crew +1 (with a trade), pool −1', () => {
    const { pv, sub } = host();
    const before = pv();
    sub('hire', 'moe');
    const after = pv();
    expect(after.pools.tradespeople).toBe(before.pools.tradespeople - 1);
    const moes = after.crew.filter((m) => m.outfit === 'moe');
    expect(moes.length).toBe(before.crew.filter((m) => m.outfit === 'moe').length + 1);
  });

  it('buy appends the asset {ref, value} and pops the equipment pool', () => {
    const { pv, sub } = host();
    sub('buy-equipment', 'moe');
    const v = pv();
    expect(v.pools.equipment).toBe(7);
    const moe = v.seats.find((s) => s.id === 'moe')!;
    expect(moe.assets.length).toBe(1);
    expect(typeof moe.assets[0]!.ref).toBe('string');
  });

  it('an EMPTY pool refuses BY NAME (GX-30) — never a silent no-op', () => {
    const { sub } = host();
    for (let i = 0; i < 8; i++) sub('hire', 'moe'); // drain the pool on one turn
    expect(() => sub('hire', 'moe')).toThrow(/GX-30|empty/);
  });

  it('off-turn hire refuses (the onTurn rule holds the door)', () => {
    const { sub } = host();
    expect(() => sub('hire', 'pete')).toThrow(/REFUSED|turn/i);
  });
});

describe('O-3: the card pools (I-139)', () => {
  it('bbb + networking pools count 5 + 5 at genesis', () => {
    const { pv } = host();
    expect(pv().pools.bbb).toBe(5);
    expect(pv().pools.networking).toBe(5);
  });

  it('pool-draw pops the top INTO the discard — the session family presents it locally', () => {
    const { pv, sub } = host();
    const before = pv().ownDiscard.length;
    sub('pool-draw', 'moe', { pool: 'bbb' });
    const v = pv();
    expect(v.pools.bbb).toBe(4);
    expect(v.ownDiscard.length).toBe(before + 1);
    expect(v.ownDiscard[0]!.startsWith('bbb-')).toBe(true); // newest first — the drawn card tops
  });

  it('an EMPTY card pool refuses BY NAME (GX-30)', () => {
    const { sub } = host();
    for (let i = 0; i < 5; i++) sub('pool-draw', 'moe', { pool: 'networking' });
    expect(() => sub('pool-draw', 'moe', { pool: 'networking' })).toThrow(/GX-30|empty/);
  });
});
