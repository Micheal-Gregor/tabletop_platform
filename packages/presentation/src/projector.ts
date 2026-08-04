/**
 * MP5 SeatProjector + MP6 Unboxer — THE one legal read (S-6; scoped purity).
 * Traces: S3 F6 · R-19 · HK-10 · I-47. Axiom GX-35: views are branded, deep-frozen,
 * and REDACTED per seat; any render read outside the projection refuses.
 */
import type { State } from '@tabletop/engine';
import { freezeDeep } from '@tabletop/engine';

export class ProjectionBreach extends Error {
  constructor(detail: string) {
    super(`Projection breach [GX-35/R-19]: ${detail}`);
    this.name = 'ProjectionBreach';
  }
}

export class UnboxRefusal extends Error {
  constructor(detail: string) {
    super(`Unbox refused [GX-35]: ${detail}`);
    this.name = 'UnboxRefusal';
  }
}

export interface SeatView {
  readonly __seatView: true;
  readonly seat: string;
  readonly turn: { readonly round: number; readonly seatIdx: number; readonly phase: string; readonly status: string };
  readonly seats: readonly {
    readonly id: string;
    readonly cash: number;
    readonly favor: number;
    readonly assets: readonly { readonly ref: string; readonly value: number }[];
    readonly sueRights: readonly unknown[];
    readonly eliminated: boolean;
  }[];
  /** Redaction law (I-47): contents for the OWN deck's discard only; counts for all. */
  readonly decks: Readonly<Record<string, { readonly drawCount: number; readonly discardTop: string | null }>>;
  /** Options are ABSENT unless this seat is the decider. */
  readonly windows: readonly { readonly id: string; readonly kind: string; readonly decider: string; readonly status: string; readonly options: readonly string[] | null }[];
  readonly ventures: readonly { readonly id: string; readonly status: string; readonly portions: number }[];
  readonly debts: readonly { readonly debtor: string; readonly creditor: string; readonly amount: number; readonly due: number }[];
  readonly receivables: readonly { readonly holder: string; readonly amount: number; readonly source: string }[];
  readonly results: unknown;
  readonly ownDiscard: readonly string[];
  /** Q-3 (I-93): the CREW — public state (every player sees every shop's staff, the v1
   *  board's own truth); the 3D bench's tradespeople rows render from THIS field only
   *  (R-19: no render read outside the projector). Additive. */
  // A5 (I-128): `assignedTo` is a TRUTH-DECLARATION — the projector already passes the
  // raw crew array through whole, so the field flowed undeclared; assignments are public
  // in the certified SVG bench (I-59b), so declaring it is redaction-consistent.
  readonly crew: readonly { readonly id: string; readonly outfit: string; readonly assignedTo?: { readonly venture: string } }[];
}

/** HK-10 — before render read: the object MUST be a branded projection. */
export function hookHk10BeforeRenderRead(view: unknown): asserts view is SeatView {
  if (typeof view !== 'object' || view === null || (view as { __seatView?: unknown }).__seatView !== true) {
    throw new ProjectionBreach('render read outside SeatProjector — pass the PROJECTED view, never raw state');
  }
}

/** THE projection: derive, redact, brand, freeze. The sole S-6 read. */
export function project(state: State, seat: string): SeatView {
  const seats = state['seats'] as SeatView['seats'];
  if (!seats.some((s) => s.id === seat)) throw new ProjectionBreach(`unknown seat "${seat}"`);
  const turn = state['turn'] as SeatView['turn'];
  const decksRaw = (state['decks'] as Record<string, { draw: readonly string[]; discard: readonly string[] }>) ?? {};
  const decks: Record<string, { drawCount: number; discardTop: string | null }> = {};
  for (const [ref, d] of Object.entries(decksRaw)) {
    decks[ref] = { drawCount: d.draw.length, discardTop: d.discard[0] ?? null }; // contents REDACTED
  }
  const windows = ((state['windows'] as readonly { id: string; kind: string; decider: string; status: string; options: readonly { label: string }[] }[]) ?? []).map(
    (w) => ({
      id: w.id, kind: w.kind, decider: w.decider, status: w.status,
      options: w.decider === seat ? w.options.map((o) => o.label) : null, // decider-only (I-47)
    })
  );
  const view: SeatView = {
    __seatView: true,
    seat,
    turn: { round: turn.round, seatIdx: turn.seatIdx, phase: turn.phase, status: turn.status },
    seats: seats.map((s) => ({ id: s.id, cash: s.cash, favor: s.favor, assets: s.assets, sueRights: s.sueRights, eliminated: s.eliminated })),
    decks,
    windows,
    ventures: ((state['ventures'] as readonly { id: string; status: string; portions: readonly unknown[] }[]) ?? []).map((v) => ({ id: v.id, status: v.status, portions: v.portions.length })),
    debts: (state['debts'] as SeatView['debts']) ?? [],
    receivables: (state['receivables'] as SeatView['receivables']) ?? [],
    results: state['results'] ?? null,
    ownDiscard: decksRaw[seat]?.discard ?? [],
    crew: (state['crew'] as SeatView['crew']) ?? [], // Q-3 (I-93): public crew, additive
  };
  return freezeDeep(structuredClone(view) as never) as unknown as SeatView;
}

/** MP6 — validated reveal: only the seat's OWN refs unbox. */
export function unbox(view: SeatView, what: 'discard-top', ref: string): string {
  hookHk10BeforeRenderRead(view);
  if (what === 'discard-top') {
    if (ref !== view.seat) throw new UnboxRefusal(`seat "${view.seat}" may not unbox "${ref}"'s cards — not yours`);
    const top = view.ownDiscard[0];
    if (top === undefined) throw new UnboxRefusal('nothing to reveal');
    return top;
  }
  throw new UnboxRefusal(`unknown reveal "${String(what)}"`);
}
