/**
 * M9 EffectEngine — the SOLE applier of effects (seam S-3; the S5 boundary law).
 * Traces: S3 F2·M9 ← S2 M9. Axioms: GX-7, GX-11. Refusals: R-3, R-24 (engine side),
 * R-17 (engine side). Hook: HK-9 (M9 side).
 *
 * EFX v1.1.1 is CLOSED and SEALED. Growth only through an ExtensionContract cycle
 * (S-7; the docket: spawn_venture, draw_card, form_relation — NOT members, NOT here).
 *
 * R-24's structural half: the per-descriptor mutators below are MODULE-PRIVATE — the
 * only exported application surface is EffectEngine.apply (GBC-15 asserts this).
 * R-3's design: HK-9 is THE refusal point for unknown descriptors (halt-not-skip);
 * the dispatch table is total over the sealed vocabulary by construction.
 */

import type { JsonObject, JsonValue, State } from '../kernel/types.js';

/** EFX v1.1.1 — sealed. I-05 generativity bound: content parameterizes, never defines. */
export const EFX_V1_1_1 = Object.freeze([
  'pay',
  'capitalize',
  'grant_favor',
  'levy',
  'deck_inject',
  'grant_sue_right',
  'open_window',
] as const);

export type EfxName = (typeof EFX_V1_1_1)[number];

export interface EffectDescriptor extends JsonObject {
  readonly fx: string; // validated ∈ EFX at HK-9; typed loosely so content can be REFUSED, not miscompiled
}

export class EffectRefusal extends Error {
  constructor(readonly descriptor: string, readonly rule: string, detail: string) {
    super(`Effect refused [${rule}] descriptor "${descriptor}": ${detail}`);
    this.name = 'EffectRefusal';
  }
}

/** Apply-context: window depth (I-13) travels with every application. */
export interface EffectContext {
  readonly windowDepth: number;
  /** Stream draw, supplied by core's ApplyContext when needed (deck shuffle-in). */
  readonly drawInt?: (streamName: string, n: number) => number;
}

/**
 * HK-9 (M9 side) — before rule dispatch / effect application: descriptor must be a
 * member of the sealed vocabulary. THE refusal point for R-3: delete this call and an
 * unknown descriptor silently no-ops — the named halt-not-skip test fails (falsifiable).
 */
export function hookHk9BeforeEffectApply(d: EffectDescriptor): void {
  if (!EFX_V1_1_1.includes(d.fx as EfxName)) {
    throw new EffectRefusal(String(d.fx), 'GX-7/R-3/HK-9', 'unknown descriptor — halt, never skip');
  }
  if (!Object.isFrozen(EFX_V1_1_1)) {
    throw new EffectRefusal(String(d.fx), 'GX-7/HK-9', 'vocabulary unsealed — dispatch integrity lost');
  }
}

// ─── private typed mutators (R-24: NOT exported; reachable only through apply) ───

type SeatRow = {
  id: string;
  cash: number;
  favor: number;
  assets: JsonValue[];
  sueRights: JsonValue[];
  eliminated: boolean;
};

function seatRows(state: State): readonly SeatRow[] {
  return state['seats'] as readonly SeatRow[];
}

function mapSeat(state: State, seatId: string, f: (s: SeatRow) => SeatRow): JsonObject {
  const rows = seatRows(state);
  if (!rows.some((s) => s.id === seatId)) {
    throw new EffectRefusal('pay/levy/…', 'GX-7', `unknown seat "${seatId}" in effect target`);
  }
  return { ...state, seats: rows.map((s) => (s.id === seatId ? f(s) : s)) } as JsonObject;
}

function fxPay(state: State, d: EffectDescriptor): JsonObject {
  const to = d['to'] as string;
  const amount = d['amount'] as number;
  const from = d['from'] as string | undefined;
  let next = mapSeat(state, to, (s) => ({ ...s, cash: s.cash + amount }));
  if (from !== undefined) {
    next = mapSeat(next, from, (s) => ({ ...s, cash: s.cash - amount }));
  }
  return next; // balanced-move POSTING is Ledger law (F5, R-5) — N/A-by-absence here
}

function fxCapitalize(state: State, d: EffectDescriptor): JsonObject {
  const owner = d['owner'] as string;
  const asset = d['asset'] as string;
  const amount = d['amount'] as number;
  return mapSeat(state, owner, (s) => ({
    ...s,
    assets: [...s.assets, { ref: asset, value: amount }],
  }));
}

function fxGrantFavor(state: State, d: EffectDescriptor): JsonObject {
  const to = d['to'] as string;
  const n = d['n'] as number;
  return mapSeat(state, to, (s) => ({ ...s, favor: s.favor + n }));
}

function fxLevy(state: State, d: EffectDescriptor): JsonObject {
  const scope = d['scope'] as string;
  const amount = d['amount'] as number;
  if (scope === 'table') {
    const rows = seatRows(state);
    return {
      ...state,
      seats: rows.map((s) => (s.eliminated ? s : { ...s, cash: s.cash - amount })),
    } as JsonObject;
  }
  return mapSeat(state, scope, (s) => ({ ...s, cash: s.cash - amount }));
}

function fxDeckInject(state: State, d: EffectDescriptor): JsonObject {
  const deckRef = d['deck'] as string;
  const card = d['card'] as string;
  const policy = (d['policy'] as string) ?? 'top';
  const decks = state['decks'] as Record<string, { draw: string[]; discard: string[]; reserve: string[] }>;
  const deck = decks[deckRef];
  if (!deck) throw new EffectRefusal('deck_inject', 'GX-12', `unknown deck "${deckRef}"`);
  const draw =
    policy === 'bottom' ? [...deck.draw, card] : [card, ...deck.draw]; // order-preserving (GX-12)
  return {
    ...state,
    decks: { ...decks, [deckRef]: { ...deck, draw } },
  } as JsonObject;
}

function fxGrantSueRight(state: State, d: EffectDescriptor): JsonObject {
  const holder = d['holder'] as string;
  return mapSeat(state, holder, (s) => ({
    ...s,
    sueRights: [...s.sueRights, { against: d['against'] as string, window: d['window'] as string }],
  }));
}

function fxOpenWindow(state: State, d: EffectDescriptor, ctx: EffectContext): JsonObject {
  if (ctx.windowDepth >= 1) {
    // GX-11 / R-17 (engine side): depth-1 law — a window may not spawn a window.
    throw new EffectRefusal('open_window', 'GX-11/R-17', 'open_window from inside a window application');
  }
  const windows = state['windows'] as readonly JsonObject[];
  const counter = (state['windowSeq'] as number) ?? 0;
  const win: JsonObject = {
    id: `w${counter + 1}`,
    kind: d['kind'] as string,
    decider: d['decider'] as string,
    options: d['options'] as JsonValue,
    auto: (d['auto'] as number) ?? 0,
    gated: (d['gated'] as boolean) ?? true,
    status: 'open',
  };
  return { ...state, windows: [...windows, win], windowSeq: counter + 1 } as JsonObject;
}

// ─── the sole exported application surface ───

export class EffectEngine {
  /** Apply ONE descriptor. HK-9 gates; unknown → loud EffectRefusal (R-3). */
  static apply(state: State, d: EffectDescriptor, ctx: EffectContext): JsonObject {
    hookHk9BeforeEffectApply(d);
    switch (d.fx as EfxName) {
      case 'pay':
        return fxPay(state, d);
      case 'capitalize':
        return fxCapitalize(state, d);
      case 'grant_favor':
        return fxGrantFavor(state, d);
      case 'levy':
        return fxLevy(state, d);
      case 'deck_inject':
        return fxDeckInject(state, d);
      case 'grant_sue_right':
        return fxGrantSueRight(state, d);
      case 'open_window':
        return fxOpenWindow(state, d, ctx);
    }
  }

  /** Apply a list in order (a card's fx, a window option's fx). */
  static applyAll(state: State, fxList: readonly EffectDescriptor[], ctx: EffectContext): JsonObject {
    let s: JsonObject = state as JsonObject;
    for (const d of fxList) s = EffectEngine.apply(s, d, ctx);
    return s;
  }
}
