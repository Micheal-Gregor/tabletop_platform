/**
 * M15 ClosingRound — the Reckoning: consumes the 'closing' slot (I-17 CLOSES here).
 * Traces: S3 F5·M15 · RCK · QG1-Q1 (eligibility = content policy).
 * Axiom: GX-30: trailing-first order · close-books force-collects receivables (balanced)
 * · rank by cash · champion · status 'ended'.
 */
import type { JsonObject, State } from '../kernel/types.js';
import { EffectEngine } from '../play/effects.js';
import { ledgerLoaded, post } from './ledger.js';
import { receivablesOf } from './ventures.js';

export class ClosingRefusal extends Error {
  constructor(detail: string) {
    super(`Closing refused [GX-30]: ${detail}`);
    this.name = 'ClosingRefusal';
  }
}

export function reckon(state: State): JsonObject {
  const turn = state['turn'] as { status: string };
  if (turn.status !== 'closing') {
    throw new ClosingRefusal(`reckon requires status 'closing', got '${turn.status}' — the end-trigger owns entry`);
  }
  let next: JsonObject = state as JsonObject;
  // trailing-first order (ascending cash) — recorded; restricted-move policies are content
  const seatsAsc = [...(next['seats'] as readonly { id: string; cash: number; eliminated: boolean }[])]
    .filter((s) => !s.eliminated)
    .sort((a, b) => a.cash - b.cash)
    .map((s) => s.id);
  // close-books: force-collect every receivable as a balanced post (bank funds them)
  for (const r of receivablesOf(next)) {
    next = ledgerLoaded(next)
      ? post(next, [{ account: 'bank', delta: -r.amount }, { account: r.holder, delta: r.amount }], `collect:${r.source}`)
      : EffectEngine.apply(next, { fx: 'pay', to: r.holder, amount: r.amount }, { windowDepth: 0 });
  }
  next = { ...next, receivables: [] } as JsonObject;
  const ranked = [...(next['seats'] as readonly { id: string; cash: number; eliminated: boolean }[])]
    .filter((s) => !s.eliminated)
    .sort((a, b) => b.cash - a.cash);
  return {
    ...next,
    results: {
      closingOrder: seatsAsc,
      ranking: ranked.map((s) => ({ seat: s.id, cash: s.cash })),
      champion: ranked[0]?.id ?? null,
    },
    turn: { ...(next['turn'] as JsonObject), status: 'ended' }, // I-17's reserved word, finally set
  } as JsonObject;
}
