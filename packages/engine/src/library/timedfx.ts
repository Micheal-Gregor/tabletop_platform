/**
 * M14 TimedEffects — standing effects that tick at the round wrap (once, GX-9 guards).
 * Traces: S3 F5·M14 · RC-G · RE-10 (a Timer PIECE is not this module).
 * Axiom: GX-29. Charges post BALANCED when the Ledger is loaded (RC-D) else via EffectEngine.
 */
import type { JsonObject, State } from '../kernel/types.js';
import { EffectEngine } from '../play/effects.js';
import { ledgerLoaded, post } from './ledger.js';

export interface TimedFx extends JsonObject {
  readonly id: string;
  readonly scope: string; // 'table' | outfit id
  readonly charge: number; // per-tick levy amount
  readonly remaining: number; // duration in rounds
  readonly source: string;
}

export function timedEffects(state: State): readonly TimedFx[] {
  return (state['timedEffects'] as readonly TimedFx[]) ?? [];
}

function refuseUnusableId(state: State, tfx: TimedFx): void {
  if (!tfx.id || typeof tfx.id !== 'string') {
    throw new Error(`TimedFx refused [GX-29]: missing or duplicate id "${tfx.id}"`);
  }
  if (timedEffects(state).some((t) => t.id === tfx.id)) {
    throw new Error(`TimedFx refused [GX-29]: missing or duplicate id "${tfx.id}"`);
  }
}

function refuseBadDuration(tfx: TimedFx): void {
  if (!Number.isInteger(tfx.remaining) || tfx.remaining < 1) {
    throw new Error(`TimedFx refused [GX-29]: duration must be a positive integer`);
  }
}

// K7-F5 D2 (DF5-2): the attach door refuses brick values — a NaN charge makes the
// state unhashable (GX-3/I-5′); an Infinity charge bricks every subsequent wrap.
function refuseBrickCharge(tfx: TimedFx): void {
  if (typeof tfx.charge !== 'number' || !Number.isFinite(tfx.charge) || tfx.charge < 0) {
    throw new Error(`TimedFx refused [GX-29/I-5′]: charge must be a finite non-negative number, got ${String(tfx.charge)}`);
  }
}

function refuseUnknownScope(state: State, tfx: TimedFx): void {
  if (tfx.scope === 'table') return;
  const seatIds = ((state['seats'] as readonly { id: string }[]) ?? []).map((s) => s.id);
  if (!seatIds.includes(tfx.scope)) {
    throw new Error(`TimedFx refused [GX-29]: scope must be 'table' or a seat id, got "${tfx.scope}"`);
  }
}

export function attachTimedFx(state: State, tfx: TimedFx): JsonObject {
  refuseUnusableId(state, tfx);
  refuseBadDuration(tfx);
  refuseBrickCharge(tfx);
  refuseUnknownScope(state, tfx);
  // K7-F5 r2 NEW-1: store a row CONSTRUCTED from validated named fields — never the
  // caller's object (an unknown field would ride into state and break hashability).
  const row: TimedFx = { id: tfx.id, scope: tfx.scope, charge: tfx.charge, remaining: tfx.remaining, source: tfx.source };
  return { ...state, timedEffects: [...timedEffects(state), row] } as JsonObject;
}

/** The table levy: every living seat pays t.charge to the bank (Ledger when loaded, RC-D), else EffectEngine. */
function levyTable(state: JsonObject, t: TimedFx): JsonObject {
  const living = (state['seats'] as readonly { id: string; eliminated: boolean }[]).filter((s) => !s.eliminated);
  if (!ledgerLoaded(state)) {
    return EffectEngine.apply(state, { fx: 'levy', scope: 'table', amount: t.charge }, { windowDepth: 0 });
  }
  return post(
    state,
    [...living.map((s) => ({ account: s.id, delta: -t.charge })), { account: 'bank', delta: t.charge * living.length }],
    `tfx:${t.id} table levy`
  );
}

/** The outfit levy: one account pays t.charge to the bank (Ledger when loaded, RC-D), else EffectEngine. */
function levyOutfit(state: JsonObject, t: TimedFx): JsonObject {
  if (!ledgerLoaded(state)) {
    return EffectEngine.apply(state, { fx: 'levy', scope: t.scope, amount: t.charge }, { windowDepth: 0 });
  }
  return post(state, [{ account: t.scope, delta: -t.charge }, { account: 'bank', delta: t.charge }], `tfx:${t.id} levy`);
}

/** One effect's charge at the wrap: nothing owed unless the charge is positive. */
function chargeOne(state: JsonObject, t: TimedFx): JsonObject {
  if (!(t.charge > 0)) return state;
  return t.scope === 'table' ? levyTable(state, t) : levyOutfit(state, t);
}

/** The wrap tick (GX-29): charge, decrement, expire. Called ONLY by the turn:end weave. */
export function tickTimedEffects(state: State): JsonObject {
  let next: JsonObject = state as JsonObject;
  for (const t of timedEffects(next)) next = chargeOne(next, t);
  const ticked = timedEffects(next)
    .map((t) => ({ ...t, remaining: t.remaining - 1 }))
    .filter((t) => t.remaining > 0);
  return { ...next, timedEffects: ticked } as JsonObject;
}
