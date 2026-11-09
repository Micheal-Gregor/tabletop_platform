/**
 * MP5 SeatProjector + MP6 Unboxer — THE one legal read (S-6; scoped purity).
 * Traces: S3 F6 · R-19 · HK-10 · I-47. Axiom GX-35: views are branded, deep-frozen,
 * and REDACTED per seat; any render read outside the projection refuses.
 */
import type { State } from '@tabletop/engine';
import { freezeDeep } from '@tabletop/engine';
import { UnboxRefusal } from './unbox-refusal.js';

// UnboxRefusal lives in its own file (one class per file); re-exported so every import holds.
export { UnboxRefusal } from './unbox-refusal.js';

export class ProjectionBreach extends Error {
  constructor(detail: string) {
    super(`Projection breach [GX-35/R-19]: ${detail}`);
    this.name = 'ProjectionBreach';
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
    readonly handCount: number; // C-1d (I-171): hidden hands COUNT publicly
  }[];
  /** Redaction law (I-47): contents for the OWN deck's discard only; counts for all. */
  readonly decks: Readonly<Record<string, { readonly drawCount: number; readonly discardTop: string | null }>>;
  /** Options are ABSENT unless this seat is the decider. */
  readonly windows: readonly { readonly id: string; readonly kind: string; readonly decider: string; readonly status: string; readonly options: readonly string[] | null }[];
  readonly ventures: readonly { readonly id: string; readonly status: string; readonly portions: number }[];
  // A16 pools (I-137): COUNTS ONLY — the piles are face down (redaction); `?? empty`
  // tolerates pool-less v1 states (the frozen SVG bench projects unchanged).
  readonly pools: { readonly tradespeople: number; readonly equipment: number; readonly bbb: number; readonly networking: number };
  /** I-252 (superseding A16's counts-only FOR POOLS, on the record): the pools'
   *  REMAINING ORDER — ids top→bottom ([0] = the next popped). The piles are SHARED
   *  objects the bench renders identity-true (C-1c); its genesis-seed reconstruction
   *  broke the moment a card returned to the BOTTOM (GX-33 plays, releases) — hand
   *  cards rendered into the pile while the returned card was claimed by NOBODY (the
   *  stranded-ghost class). The counts-only redaction was nominal: the seed is public.
   *  Counts stay for chrome. */
  readonly poolOrders: { readonly tradespeople: readonly string[]; readonly equipment: readonly string[]; readonly bbb: readonly string[]; readonly networking: readonly string[] };
  readonly debts: readonly { readonly debtor: string; readonly creditor: string; readonly amount: number; readonly due: number }[];
  readonly receivables: readonly { readonly holder: string; readonly amount: number; readonly source: string }[];
  readonly results: unknown;
  readonly ownDiscard: readonly string[];
  readonly ownHand: readonly string[]; // C-1d (I-171): the VIEWER'S hand — ids only; other hands project as COUNTS (redaction)
  /** Q-3 (I-93): the CREW — public state (every player sees every shop's staff, the v1
   *  board's own truth); the 3D bench's tradespeople rows render from THIS field only
   *  (R-19: no render read outside the projector). Additive. */
  // A5 (I-128): `assignedTo` is a TRUTH-DECLARATION — the projector already passes the
  // raw crew array through whole, so the field flowed undeclared; assignments are public
  // in the certified SVG bench (I-59b), so declaring it is redaction-consistent.
  readonly crew: readonly { readonly id: string; readonly outfit: string; readonly assignedTo?: { readonly venture: string }; readonly gear?: string }[]; // G-C2 (I-170): the attached equipment rides the row, declared
}

/** HK-10 — before render read: the object MUST be a branded projection. */
export function hookHk10BeforeRenderRead(view: unknown): asserts view is SeatView {
  if (typeof view !== 'object' || view === null || (view as { __seatView?: unknown }).__seatView !== true) {
    throw new ProjectionBreach('render read outside SeatProjector — pass the PROJECTED view, never raw state');
  }
}

type RawDecks = Record<string, { draw: readonly string[]; discard: readonly string[] }>;
type RawWindow = { id: string; kind: string; decider: string; status: string; options: readonly { label: string }[] };
type RawVenture = { id: string; status: string; portions: readonly unknown[] };
type RawPools = Record<string, readonly unknown[] | undefined> | undefined;
type SeatRow = SeatView['seats'][number];
type HandOwner = { hand?: readonly { id: string }[] } | undefined;

/** The viewer must be a seat of the state; anything else is no projection at all. */
function checkSeatKnown(seats: SeatView['seats'], seat: string): void {
  if (!seats.some((s) => s.id === seat)) throw new ProjectionBreach(`unknown seat "${seat}"`);
}

function rawDecks(state: State): RawDecks {
  return (state['decks'] as RawDecks) ?? {};
}

/** Decks as COUNTS for every seat: the draw count and the discard's top; contents REDACTED. */
function deckCounts(decksRaw: RawDecks): SeatView['decks'] {
  const decks: Record<string, { drawCount: number; discardTop: string | null }> = {};
  for (const [ref, d] of Object.entries(decksRaw)) {
    decks[ref] = { drawCount: d.draw.length, discardTop: d.discard[0] ?? null };
  }
  return decks;
}

/** Window options are ABSENT unless the viewer is the decider (I-47). */
function optionsFor(w: RawWindow, seat: string): readonly string[] | null {
  return w.decider === seat ? w.options.map((o) => o.label) : null;
}

function windowViews(state: State, seat: string): SeatView['windows'] {
  const windows = (state['windows'] as readonly RawWindow[]) ?? [];
  return windows.map((w) => ({ id: w.id, kind: w.kind, decider: w.decider, status: w.status, options: optionsFor(w, seat) }));
}

function turnView(state: State): SeatView['turn'] {
  const turn = state['turn'] as SeatView['turn'];
  return { round: turn.round, seatIdx: turn.seatIdx, phase: turn.phase, status: turn.status };
}

/** A seat's hand as its owner holds it: [] when the seat is absent or holds none. */
function handOf(owner: HandOwner): readonly { id: string }[] {
  return owner?.hand ?? [];
}

/** Every seat's public row; a hidden hand COUNTS publicly (C-1d, I-171). */
function seatViews(seats: SeatView['seats']): SeatView['seats'] {
  return seats.map((s: SeatRow) => ({
    id: s.id, cash: s.cash, favor: s.favor, assets: s.assets, sueRights: s.sueRights, eliminated: s.eliminated,
    handCount: handOf(s as unknown as HandOwner).length,
  }));
}

/** The VIEWER'S hand — ids only (C-1d, I-171); other hands project as counts. */
function ownHandOf(seats: SeatView['seats'], seat: string): readonly string[] {
  return handOf(seats.find((s) => s.id === seat) as unknown as HandOwner).map((c) => c.id);
}

function ventureViews(state: State): SeatView['ventures'] {
  const ventures = (state['ventures'] as readonly RawVenture[]) ?? [];
  return ventures.map((v) => ({ id: v.id, status: v.status, portions: v.portions.length }));
}

function rawPools(state: State): RawPools {
  return state['pools'] as RawPools;
}

function pileSize(pools: RawPools, name: string): number {
  return pools?.[name]?.length ?? 0;
}

/** A16 (I-137): pools as COUNTS — the piles are face down; `?? 0` tolerates pool-less v1 states. */
function poolCounts(state: State): SeatView['pools'] {
  const pools = rawPools(state);
  return {
    tradespeople: pileSize(pools, 'tradespeople'),
    equipment: pileSize(pools, 'equipment'),
    bbb: pileSize(pools, 'bbb'),
    networking: pileSize(pools, 'networking'),
  };
}

function pileIds(pile: readonly unknown[] | undefined): string[] {
  return (pile ?? []).map((e) => String((e as { id?: unknown })?.id ?? e));
}

/** I-252: THE STATE'S pool order (top→bottom), never a reconstruction. */
function poolOrders(state: State): SeatView['poolOrders'] {
  const pools = rawPools(state);
  return {
    tradespeople: pileIds(pools?.['tradespeople']),
    equipment: pileIds(pools?.['equipment']),
    bbb: pileIds(pools?.['bbb']),
    networking: pileIds(pools?.['networking']),
  };
}

/** The brand is the view's own `__seatView` mark; the deep freeze severs every alias to the state. */
function sealView(view: SeatView): SeatView {
  return freezeDeep(structuredClone(view) as never) as unknown as SeatView;
}

/** THE projection: derive, redact, brand, freeze. The sole S-6 read. */
export function project(state: State, seat: string): SeatView {
  const seats = state['seats'] as SeatView['seats'];
  checkSeatKnown(seats, seat);
  const decksRaw = rawDecks(state);
  const decks = deckCounts(decksRaw);
  const windows = windowViews(state, seat);
  const view: SeatView = {
    __seatView: true,
    seat,
    turn: turnView(state),
    seats: seatViews(seats),
    decks,
    windows,
    ventures: ventureViews(state),
    debts: (state['debts'] as SeatView['debts']) ?? [],
    receivables: (state['receivables'] as SeatView['receivables']) ?? [],
    results: state['results'] ?? null,
    ownDiscard: decksRaw[seat]?.discard ?? [],
    ownHand: ownHandOf(seats, seat), // C-1d (I-171)
    crew: (state['crew'] as SeatView['crew']) ?? [], // Q-3 (I-93): public crew, additive
    pools: poolCounts(state),
    poolOrders: poolOrders(state),
  };
  return sealView(view);
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
