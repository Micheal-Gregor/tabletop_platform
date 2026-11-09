/**
 * M13 Ledger — balanced-move law where loaded (opt-in, QG1-Q2).
 * Traces: S3 F5·M13. Axiom: GX-25. Refusal: R-5. RC-D: cash ≡ derived balances.
 * S5 held: application flows through EffectEngine (pay = credit, levy = debit);
 * 'bank' is the implicit absorbing account (no cash on state).
 */
import type { JsonObject, State } from '../kernel/types.js';
import { EffectEngine } from '../play/effects.js';

export interface LedgerLeg {
  readonly account: string; // seat id or 'bank'
  readonly delta: number;
}

export class LedgerRefusal extends Error {
  constructor(readonly rule: string, detail: string) {
    super(`Ledger refused [${rule}]: ${detail}`);
    this.name = 'LedgerRefusal';
  }
}

export function ledgerLoaded(state: State): boolean {
  return (state['ledger'] as { loaded?: boolean } | undefined)?.loaded === true;
}

function requireLoaded(state: State): void {
  if (!ledgerLoaded(state)) {
    throw new LedgerRefusal('GX-25', 'post without the Ledger loaded — load it or move resources directly');
  }
}

function requireLegs(legs: readonly LedgerLeg[]): void {
  if (legs.length === 0) throw new LedgerRefusal('GX-25', 'empty post');
}

/**
 * K7-F5 D10 (DF5-10): 'bank' is the RESERVED implicit account — a seat wearing the
 * name would silently escape application while appearing in legs. Refuse the collision.
 */
function requireNoBankSeat(state: State): void {
  if (((state['seats'] as readonly { id: string }[]) ?? []).some((s) => s.id === 'bank')) {
    throw new LedgerRefusal('GX-25', `a seat named 'bank' collides with the reserved implicit account`);
  }
}

function requireFiniteLeg(leg: LedgerLeg): void {
  if (typeof leg.delta !== 'number' || !Number.isFinite(leg.delta)) {
    throw new LedgerRefusal('GX-25/I-5′', `non-finite leg on "${leg.account}"`);
  }
}

/** R-5: unbalanced resource move with Ledger loaded → post THROWS. */
function requireBalanced(legs: readonly LedgerLeg[], memo: string): void {
  const sum = legs.reduce((total, leg) => total + leg.delta, 0);
  if (sum !== 0) {
    throw new LedgerRefusal('GX-25/R-5', `unbalanced post (sum ${sum}) — "${memo}"`);
  }
}

/** Every refusal a post can meet, in the order a post meets them. */
function requireValidPost(state: State, legs: readonly LedgerLeg[], memo: string): void {
  requireLoaded(state);
  requireLegs(legs);
  requireNoBankSeat(state);
  legs.forEach(requireFiniteLeg);
  requireBalanced(legs, memo);
}

/** One leg applied through the EffectEngine: a credit is a pay, a debit is a levy. */
function applyLeg(state: JsonObject, leg: LedgerLeg): JsonObject {
  return leg.delta > 0
    ? EffectEngine.apply(state, { fx: 'pay', to: leg.account, amount: leg.delta }, { windowDepth: 0 })
    : EffectEngine.apply(state, { fx: 'levy', scope: leg.account, amount: -leg.delta }, { windowDepth: 0 });
}

/** The bank is implicit and a zero leg moves nothing: only the rest reach the EffectEngine. */
function applyLegs(state: State, legs: readonly LedgerLeg[]): JsonObject {
  let next: JsonObject = state as JsonObject;
  for (const leg of legs) {
    if (leg.account === 'bank' || leg.delta === 0) continue;
    next = applyLeg(next, leg);
  }
  return next;
}

/** K7-F5 D10: read the ledger region from NEXT, not the stale pre-application state. */
function appendEntry(next: JsonObject, legs: readonly LedgerLeg[], memo: string): JsonObject {
  const ledger = next['ledger'] as { loaded: boolean; entries: readonly JsonObject[] };
  return {
    ...next,
    ledger: { ...ledger, entries: [...ledger.entries, { legs: legs as unknown as JsonObject[], memo }] },
  } as JsonObject;
}

/** GX-25/R-5 — THE balanced post: legs must sum to zero; unbalanced THROWS. */
export function post(state: State, legs: readonly LedgerLeg[], memo: string): JsonObject {
  requireValidPost(state, legs, memo);
  return appendEntry(applyLegs(state, legs), legs, memo);
}

/** A two-party transfer as a balanced pair. */
export function transfer(state: State, from: string, to: string, amount: number, memo: string): JsonObject {
  return post(state, [{ account: from, delta: -amount }, { account: to, delta: amount }], memo);
}

/** RC-D: per-seat sums of ledger legs — final cash must equal these (derived, never stored). */
export function derivedBalances(state: State): Record<string, number> {
  const out: Record<string, number> = {};
  const entries = ((state['ledger'] as { entries?: readonly { legs: readonly LedgerLeg[] }[] })?.entries) ?? [];
  for (const e of entries) {
    for (const leg of e.legs) {
      if (leg.account === 'bank') continue;
      out[leg.account] = (out[leg.account] ?? 0) + leg.delta;
    }
  }
  return out;
}
