/**
 * M12a Outfit + M12b Crew — seat roles (EX-3) and the one-portion-at-a-time crew law.
 * Traces: S3 F5·M12a/b · CRW. Axiom: GX-28. Viability policies = pack policy args (N/A set).
 */
import type { JsonObject, State } from '../kernel/types.js';
import { VentureRefusal, ventures, completeIfDone } from './ventures.js';

export interface CrewRow extends JsonObject {
  readonly id: string;
  readonly outfit: string;
  readonly assignedTo?: { readonly venture: string; readonly portion: number };
}

export function crewOf(state: State): readonly CrewRow[] {
  return (state['crew'] as readonly CrewRow[]) ?? [];
}

/** GX-28: one crew member, one portion — assigning a busy member refuses. */
export function assignCrew(state: State, crewId: string, ventureId: string, portionIdx: number): JsonObject {
  const member = crewOf(state).find((c) => c.id === crewId);
  if (!member) throw new VentureRefusal(ventureId, 'GX-28', `unknown crew "${crewId}"`);
  if (member.assignedTo !== undefined) {
    throw new VentureRefusal(ventureId, 'GX-28/CRW', `crew "${crewId}" already assigned — one portion at a time`);
  }
  const v = ventures(state).find((x) => x.id === ventureId);
  if (!v || v.status !== 'open') throw new VentureRefusal(ventureId, 'GX-28', 'no open venture');
  const portion = v.portions[portionIdx];
  if (!portion) throw new VentureRefusal(ventureId, 'GX-28', `no portion ${portionIdx}`);
  if (portion.party !== member.outfit) {
    throw new VentureRefusal(ventureId, 'GX-28', `portion belongs to "${portion.party}", not crew's outfit "${member.outfit}"`);
  }
  if (portion.done) throw new VentureRefusal(ventureId, 'GX-28', 'portion already done');
  return {
    ...state,
    crew: crewOf(state).map((c) => (c.id === crewId ? { ...c, assignedTo: { venture: ventureId, portion: portionIdx } } : c)),
  } as JsonObject;
}

/** Work burns exactly one unit; at zero the portion completes and the crew frees. */
export function workCrew(state: State, crewId: string): JsonObject {
  const member = crewOf(state).find((c) => c.id === crewId);
  if (!member?.assignedTo) throw new VentureRefusal(crewId, 'GX-28', 'crew is not assigned — nothing to work');
  const { venture: ventureId, portion: idx } = member.assignedTo;
  const v = ventures(state).find((x) => x.id === ventureId);
  if (!v) throw new VentureRefusal(ventureId, 'GX-28', 'assigned venture vanished');
  // K7-F5 D9 (DF5-9): work lands only on an OPEN venture — a lapsed/complete one refuses.
  if (v.status !== 'open') {
    throw new VentureRefusal(ventureId, 'GX-26/GX-28', `venture is '${v.status}', not open — no further work`);
  }
  const portion = v.portions[idx]!;
  const remaining = portion.work - 1;
  const donePortion = remaining <= 0;
  let next: JsonObject = {
    ...state,
    ventures: ventures(state).map((x) =>
      x.id === ventureId
        ? { ...x, portions: x.portions.map((p, i) => (i === idx ? { ...p, work: Math.max(remaining, 0), done: donePortion || p.done } : p)) }
        : x
    ),
  } as JsonObject;
  if (donePortion) {
    const freed: CrewRow = { id: member.id, outfit: member.outfit };
    next = { ...next, crew: crewOf(next).map((c) => (c.id === crewId ? freed : c)) } as JsonObject;
    next = completeIfDone(next, ventureId);
  }
  return next;
}

// ── A16 POOLS (I-137, owner-ruled 2026-08-04): hire a tradesperson · buy equipment.
// The pools carry their card DATA INLINE ({id, trade/name, cost}) — content-as-data,
// the engine stays content-agnostic; the pack's genesis seeds them (shared piles,
// seeded shuffle). S-3 module-native intents (the venture:spawn precedent); costs levy
// through EffectEngine at the wire (R-24 — the sole applier); cost 0 posts nothing
// (GBC-63). An EMPTY pool refuses BY NAME — never a silent no-op. ──
export interface PoolCard extends JsonObject {
  readonly id: string;
  readonly cost: number;
}
export interface Pools extends JsonObject {
  readonly tradespeople: readonly (PoolCard & { readonly trade: string })[];
  readonly equipment: readonly (PoolCard & { readonly name: string })[];
}
export function poolsOf(state: State): Pools {
  return (state['pools'] as Pools) ?? { tradespeople: [], equipment: [] };
}

/** GX-30: hire the TOP tradesperson card → a new crew member for the seat. */
export function hireCrew(state: State, seat: string): { next: JsonObject; cost: number } {
  const pools = poolsOf(state);
  const top = pools.tradespeople[0];
  if (!top) throw new VentureRefusal('pool', 'GX-30', 'the tradesperson pool is empty — no one to hire');
  // I-152 (owner-ruled): 'the first tradesperson is a free draw' — a seat's FIRST
  // hire levies nothing; every later hire pays the card's cost.
  const firstHire = !crewOf(state).some((c) => (c as { outfit?: string }).outfit === seat);
  const next = {
    ...state,
    pools: { ...pools, tradespeople: pools.tradespeople.slice(1) },
    crew: [...crewOf(state), { id: top.id, outfit: seat, trade: top.trade }],
  };
  return { next, cost: firstHire ? 0 : top.cost };
}

/** GX-30: buy the TOP equipment card → a seat asset {ref, value}. */
export function buyEquipment(state: State, seat: string): { next: JsonObject; cost: number } {
  const pools = poolsOf(state);
  const top = pools.equipment[0];
  if (!top) throw new VentureRefusal('pool', 'GX-30', 'the equipment pool is empty — nothing to buy');
  const seats = (state['seats'] as readonly JsonObject[]).map((s) =>
    s['id'] === seat
      ? { ...s, assets: [...((s['assets'] as readonly JsonObject[]) ?? []), { ref: top.id, value: top.cost }] }
      : s,
  );
  const next = { ...state, pools: { ...pools, equipment: pools.equipment.slice(1) }, seats };
  return { next, cost: top.cost };
}

/** O-3 (I-139): draw from a CARD pool (bbb · networking) — the top card joins the
 *  seat's DISCARD, where the content's family presents it IN PLAY (the local row).
 *  GX-30 on empty; the same content-as-data law as hire/buy. */
export function drawFromPool(state: State, seat: string, pool: 'bbb' | 'networking'): JsonObject {
  const pools = poolsOf(state) as Pools & { readonly bbb?: readonly PoolCard[]; readonly networking?: readonly PoolCard[] };
  const list = (pools[pool] ?? []) as readonly PoolCard[];
  const top = list[0];
  if (!top) throw new VentureRefusal('pool', 'GX-30', `the ${pool} deck is empty — nothing to draw`);
  const decks = state['decks'] as Record<string, { draw: readonly string[]; discard: readonly string[]; reserve: readonly string[] }>;
  const mine = decks[seat] ?? { draw: [], discard: [], reserve: [] };
  return {
    ...state,
    pools: { ...pools, [pool]: list.slice(1) },
    decks: { ...decks, [seat]: { ...mine, discard: [top.id, ...mine.discard] } }, // newest first (the deck.ts convention)
  };
}
