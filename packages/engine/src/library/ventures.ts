/**
 * M10 Venture + M11 Routing — the SOLE contract primitive (RC-A′) and its routing.
 * Traces: S3 F5·M10/M11 · T2/T3 · RC-E. Axioms: GX-26, GX-27 (I-36).
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

/** Lapse check at the wrap: past-deadline open ventures lapse (penalty paths = pack params). */
export function lapseExpired(state: State, newRound: number): JsonObject {
  const rows = ventures(state);
  if (!rows.some((v) => v.status === 'open' && newRound > v.deadline)) return state as JsonObject;
  return {
    ...state,
    ventures: rows.map((v) => (v.status === 'open' && newRound > v.deadline ? { ...v, status: 'lapsed' } : v)),
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
