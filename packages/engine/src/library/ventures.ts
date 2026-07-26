/**
 * M10 Venture + M11 Routing — the SOLE contract primitive (RC-A′) and its routing.
 * Traces: S3 F5·M10/M11 · RC-A′ · RC-E (Stage-2b). Axioms: GX-26, GX-27 (I-36/I-38).
 * Lifecycle: spawn → assigned → work → all-complete → payoff receivables | lapse.
 * Spawning is a LIBRARY INTENT (I-34); content-triggered spawn awaits the docket.
 */
import type { JsonObject, JsonValue, State } from '../kernel/types.js';
import { EffectEngine } from '../play/effects.js';

export interface PortionSpec extends JsonObject {
  readonly party?: string; // unassigned → routing needed
  readonly task: string; // role required
  readonly work: number;
}

export interface VentureSpec extends JsonObject {
  readonly id: string;
  readonly initiator: string;
  readonly portions: readonly PortionSpec[];
  readonly deadline: number;
  readonly payoffs: readonly { readonly to: string; readonly amount: number }[];
}

export class VentureRefusal extends Error {
  constructor(readonly venture: string, readonly rule: string, detail: string) {
    super(`Venture refused [${rule}] "${venture}": ${detail}`);
    this.name = 'VentureRefusal';
  }
}

type VentureRow = VentureSpec & { readonly status: string; readonly portions: readonly (PortionSpec & { done?: boolean })[] };

export function ventures(state: State): readonly VentureRow[] {
  return (state['ventures'] as readonly VentureRow[]) ?? [];
}

/** Spawn (GX-26). If a portion needs routing (no party), a gated routing window opens (GX-27). */
export function spawnVenture(state: State, spec: VentureSpec): JsonObject {
  if (!spec.id || ventures(state).some((v) => v.id === spec.id)) {
    throw new VentureRefusal(spec.id || '<unnamed>', 'GX-26', 'missing or duplicate venture id');
  }
  if (!Array.isArray(spec.portions) || spec.portions.length < 1) {
    throw new VentureRefusal(spec.id, 'GX-26', 'a venture carries at least one portion');
  }
  for (const p of spec.portions) {
    if (!Number.isInteger(p.work) || p.work < 1) throw new VentureRefusal(spec.id, 'GX-26', 'portion work must be a positive integer');
  }
  // K7-F5 D2 (DF5-2): the spawn door refuses brick values — a payoff to nobody or a
  // non-finite amount would make the Reckoning unreachable (GX-30) or the state unhashable.
  if (!Number.isInteger(spec.deadline) || spec.deadline < 1) {
    throw new VentureRefusal(spec.id, 'GX-26', 'deadline must be a positive integer round');
  }
  const seatIds = new Set(((state['seats'] as readonly { id: string }[]) ?? []).map((s) => s.id));
  for (const pay of spec.payoffs ?? []) {
    if (typeof pay.amount !== 'number' || !Number.isFinite(pay.amount) || pay.amount <= 0) {
      throw new VentureRefusal(spec.id, 'GX-26/I-5′', `payoff amount must be finite and positive, got ${String(pay.amount)}`);
    }
    if (!seatIds.has(pay.to)) {
      throw new VentureRefusal(spec.id, 'GX-26', `payoff to unknown seat "${pay.to}"`);
    }
  }
  for (const p of spec.portions) {
    if (p.party !== undefined && !seatIds.has(p.party)) {
      throw new VentureRefusal(spec.id, 'GX-26', `portion party unknown seat "${p.party}"`);
    }
  }
  const row: VentureRow = { ...spec, status: 'open', portions: spec.portions.map((p) => ({ ...p, done: false })) };
  let next: JsonObject = { ...state, ventures: [...ventures(state), row] } as JsonObject;
  if (spec.portions.some((p) => p.party === undefined)) {
    // GX-27: windowed routing — the gated IWN blocks advance; effectuation = venture:route (I-36).
    next = EffectEngine.apply(
      next,
      {
        fx: 'open_window', kind: 'routing', decider: spec.initiator,
        options: [{ label: `route ${spec.id}`, fx: [] }, { label: 'decline', fx: [] }],
        auto: 0,
      },
      { windowDepth: 0 }
    );
  }
  return next;
}

/** Routing effectuation (I-36): decision arrives as ARGUMENTS on the logged intent. */
export function routeVenture(
  state: State,
  ventureId: string,
  to: string,
  carriedDebts: readonly { debtor: string; creditor: string; amount: number; due: number }[]
): JsonObject {
  const v = ventures(state).find((x) => x.id === ventureId);
  if (!v || v.status !== 'open') throw new VentureRefusal(ventureId, 'GX-27', 'no open venture to route');
  if (!v.portions.some((p) => p.party === undefined)) throw new VentureRefusal(ventureId, 'GX-27', 'nothing unassigned to route');
  const updated = ventures(state).map((x) =>
    x.id === ventureId
      ? { ...x, portions: x.portions.map((p) => (p.party === undefined ? { ...p, party: to } : p)) }
      : x
  );
  const debts = ((state['debts'] as readonly JsonObject[]) ?? []).concat(carriedDebts as unknown as JsonObject[]);
  return { ...state, ventures: updated, debts } as JsonObject;
}

/** All portions done → complete: payoffs become receivables (RC-E — collected at close-books). */
export function completeIfDone(state: State, ventureId: string): JsonObject {
  const v = ventures(state).find((x) => x.id === ventureId);
  if (!v || v.status !== 'open' || !v.portions.every((p) => p.done)) return state as JsonObject;
  const receivables = ((state['receivables'] as readonly JsonObject[]) ?? []).concat(
    v.payoffs.map((p) => ({ holder: p.to, amount: p.amount, source: v.id })) as unknown as JsonObject[]
  );
  return {
    ...state,
    ventures: ventures(state).map((x) => (x.id === ventureId ? { ...x, status: 'complete' } : x)),
    receivables,
  } as JsonObject;
}

/**
 * Lapse check at the wrap: past-deadline open ventures lapse — status flip + CREW
 * RELEASE (K7-F5 D9/DF5-9: a lapsed venture accepts no further work; stranded crew
 * frees here). Penalty paths (levies, favor hits) = pack policy args, N/A-by-absence.
 */
export function lapseExpired(state: State, newRound: number): JsonObject {
  const rows = ventures(state);
  const lapsing = new Set(rows.filter((v) => v.status === 'open' && newRound > v.deadline).map((v) => v.id));
  if (lapsing.size === 0) return state as JsonObject;
  const crew = (state['crew'] as readonly { id: string; outfit: string; assignedTo?: { venture: string } }[]) ?? [];
  return {
    ...state,
    ventures: rows.map((v) => (lapsing.has(v.id) ? { ...v, status: 'lapsed' } : v)),
    crew: crew.map((c) => (c.assignedTo && lapsing.has(c.assignedTo.venture) ? { id: c.id, outfit: c.outfit } : c)),
  } as JsonObject;
}

export function receivablesOf(state: State): readonly { holder: string; amount: number; source: string }[] {
  return (state['receivables'] as readonly { holder: string; amount: number; source: string }[]) ?? [];
}

export function debtsOf(state: State): readonly { debtor: string; creditor: string; amount: number; due: number }[] {
  return (state['debts'] as readonly { debtor: string; creditor: string; amount: number; due: number }[]) ?? [];
}

export function setDebts(state: State, debts: readonly JsonValue[]): JsonObject {
  return { ...state, debts } as JsonObject;
}
