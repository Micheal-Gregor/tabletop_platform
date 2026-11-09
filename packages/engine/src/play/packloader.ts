/**
 * M8 PackLoader — validation NAMES defects; EFX closure at load; genesis; wiring.
 * Traces: S3 F2·M8 ← S2 M8 · seam S-5 · I-2 (genesis supplier) · I-10 (schema depth).
 * Axioms: GX-10. Refusals: R-2. Hook: HK-4.
 * Flavor attaches and travels; the engine NEVER reads it (content ≠ behavior).
 */

import type { Genesis, Intent, JsonObject, JsonValue, State } from '../kernel/types.js';
import type { EngineCore } from '../kernel/core.js';
import { RNGStreams } from '../kernel/rng.js';
import { freezeDeep } from '../kernel/statetree.js';
import { onTurnRule } from '../kernel/discipline.js';
import { EFX_V1_1_1, EffectEngine, EffectRefusal } from './effects.js';
import type { EffectDescriptor, EfxName } from './effects.js';
import { shuffledOrder, drawTop } from './deck.js';
import {
  hookHk5BeforeSeatAdvance,
  resolveWindow,
  autoResolveWindow,
  openGatedWindows,
} from './windows.js';
import { passSeat, advancePhase } from './turn.js';

export const SUPPORTED_EFX_VERSION = '1.1.1';

export interface CardDef {
  readonly fx: readonly EffectDescriptor[];
  readonly flavor?: string;
}

export interface ContentPack {
  readonly id: string;
  readonly version: string;
  readonly efxVersion: string;
  readonly maxRounds: number;
  readonly seats: readonly { readonly id: string; readonly eliminated?: boolean }[];
  readonly cards: Readonly<Record<string, CardDef>>;
  readonly decks: Readonly<Record<string, { readonly cards: readonly string[] }>>;
}

export class PackLoadRefusal extends Error {
  constructor(readonly defects: readonly string[]) {
    super(`Pack refused [GX-10/R-2/HK-4] — defects: ${defects.join(' · ')}`);
    this.name = 'PackLoadRefusal';
  }
}

/**
 * HK-4 (M8 side) — at pack load: fx ⊆ EFX ∧ SCHEMA VALID (per-descriptor arg shapes,
 * K7-F2 defect 4) ∧ versions known → refuse, NAMING every defect.
 * A pack that validates can never commit an illegal value (NaN cash), reference a
 * nonexistent seat/deck/card, or open an undecidable window (defects 4, 5, 7 closures).
 *
 * One named check per section of the pack, each naming its own defects; they are gathered
 * in the order the pack is read: id, EFX version, maxRounds, seats, then cards, then decks.
 * Flavor is never read here — it attaches and travels, and no check looks at it.
 */
export function hookHk4ValidatePack(pack: ContentPack): void {
  const gathered = [
    ...packIdDefects(pack),
    ...efxVersionDefects(pack),
    ...maxRoundsDefects(pack),
    ...seatsDefects(pack),
  ];
  const scope = packScope(pack);
  gathered.push(...cardsDefects(pack, scope), ...decksDefects(pack, scope));
  if (gathered.length > 0) throw new PackLoadRefusal(gathered);
}

/** What the pack declares — the seats, cards and decks a descriptor's arguments may name. */
interface PackScope {
  readonly seatIds: ReadonlySet<string>;
  readonly cardIds: ReadonlySet<string>;
  readonly deckRefs: ReadonlySet<string>;
}

function packScope(pack: ContentPack): PackScope {
  return {
    seatIds: new Set((pack.seats ?? []).map((s) => s.id)),
    cardIds: new Set(Object.keys(pack.cards ?? {})),
    deckRefs: new Set(Object.keys(pack.decks ?? {})),
  };
}

/** Pack shape: the pack carries an id. */
function packIdDefects(pack: ContentPack): string[] {
  return pack.id ? [] : ['missing pack id'];
}

/** Versions: the pack's EFX version is the one this loader knows. */
function efxVersionDefects(pack: ContentPack): string[] {
  if (pack.efxVersion === SUPPORTED_EFX_VERSION) return [];
  return [`unknown EFX version "${pack.efxVersion}" (supported: ${SUPPORTED_EFX_VERSION})`];
}

/** Pack shape: maxRounds is a positive integer. */
function maxRoundsDefects(pack: ContentPack): string[] {
  if (Number.isInteger(pack.maxRounds) && pack.maxRounds >= 1) return [];
  return [`maxRounds must be a positive integer, got ${pack.maxRounds}`];
}

/** Pack shape: seats are declared, and at least one is living at genesis. */
function seatsDefects(pack: ContentPack): string[] {
  if (!pack.seats || pack.seats.length < 1) return ['pack declares no seats'];
  // ext-audit-2 OBS-3: a game with no living seat is degenerate at the door.
  if (pack.seats.every((s) => s.eliminated === true)) {
    return ['pack declares no LIVING seat (all eliminated at genesis)'];
  }
  return [];
}

/** Cards: every card's fx list passes the descriptor checks. */
function cardsDefects(pack: ContentPack, scope: PackScope): string[] {
  return Object.entries(pack.cards ?? {}).flatMap(([cardId, card]) => cardDefects(cardId, card, scope));
}

function cardDefects(cardId: string, card: CardDef, scope: PackScope): string[] {
  // ext-audit-2 F2-R2-3: a non-array card.fx is NAMED, never a raw TypeError.
  if (card?.fx !== undefined && !Array.isArray(card.fx)) {
    return [`card "${cardId}": "fx" must be an array, got ${JSON.stringify(card.fx)}`];
  }
  return fxListDefects(card.fx ?? [], `card "${cardId}"`, scope);
}

/** Decks: every card a deck lists is in the catalog. */
function decksDefects(pack: ContentPack, scope: PackScope): string[] {
  return Object.entries(pack.decks ?? {}).flatMap(([deckRef, deck]) =>
    Array.from(deck.cards ?? [])
      .filter((cardId) => !scope.cardIds.has(cardId))
      .map((cardId) => `deck "${deckRef}" references unknown card "${cardId}"`)
  );
}

/** Each descriptor in a list, in order, through the one descriptor check. */
function fxListDefects(list: readonly EffectDescriptor[], where: string, scope: PackScope): string[] {
  return Array.from(list, (d) => fxDefects(d, where, scope)).flat();
}

/**
 * One effect descriptor — the "schema valid" leg of HK-4 (recursive over window options):
 * an object with a string "fx" (EXT3-A sibling), the fx within EFX, then that fx's own
 * argument checks from the table below.
 */
function fxDefects(d: EffectDescriptor, where: string, scope: PackScope): string[] {
  if (d === null || typeof d !== 'object' || typeof (d as { fx?: unknown }).fx !== 'string') {
    return [`${where}: effect must be an object with a string "fx", got ${JSON.stringify(d)}`];
  }
  if (!EFX_V1_1_1.includes(d.fx as EfxName)) return [`${where} carries fx ∉ EFX: "${d.fx}"`];
  return FX_CHECKS[d.fx as EfxName](d, where, scope);
}

/** Whether each condition held; the sentence of each one that did not, in order. */
function unmet(needs: readonly (readonly [boolean, string])[]): string[] {
  return needs.filter(([met]) => !met).map(([, what]) => what);
}

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isSeat(scope: PackScope, v: unknown): boolean {
  return typeof v === 'string' && scope.seatIds.has(v);
}

/** A descriptor's own argument checks: the sentence of each argument that fails. */
type FxArgCheck = (d: EffectDescriptor, scope: PackScope) => string[];

/** A descriptor's whole check: its argument defects, each led by where it sits and which fx it is. */
type FxCheck = (d: EffectDescriptor, where: string, scope: PackScope) => string[];

function led(args: FxArgCheck): FxCheck {
  return (d, where, scope) => args(d, scope).map((what) => `${where} · ${d.fx}: ${what}`);
}

function payArgs(d: EffectDescriptor, scope: PackScope): string[] {
  return unmet([
    [isSeat(scope, d['to']), `"to" must be a declared seat, got ${JSON.stringify(d['to'])}`],
    [finite(d['amount']), `"amount" must be a finite number, got ${JSON.stringify(d['amount'])}`],
    [d['from'] === undefined || isSeat(scope, d['from']), `"from" must be a declared seat`],
  ]);
}

function capitalizeArgs(d: EffectDescriptor, scope: PackScope): string[] {
  return unmet([
    [isSeat(scope, d['owner']), `"owner" must be a declared seat`],
    [typeof d['asset'] === 'string', `"asset" must be a string`],
    [finite(d['amount']), `"amount" must be a finite number`],
  ]);
}

function grantFavorArgs(d: EffectDescriptor, scope: PackScope): string[] {
  return unmet([
    [isSeat(scope, d['to']), `"to" must be a declared seat`],
    [finite(d['n']), `"n" must be a finite number`],
  ]);
}

function levyArgs(d: EffectDescriptor, scope: PackScope): string[] {
  return unmet([
    [d['scope'] === 'table' || isSeat(scope, d['scope']), `"scope" must be 'table' or a declared seat`],
    [finite(d['amount']), `"amount" must be a finite number`],
  ]);
}

function deckInjectArgs(d: EffectDescriptor, scope: PackScope): string[] {
  return unmet([
    [typeof d['deck'] === 'string' && scope.deckRefs.has(d['deck'] as string), `"deck" must reference a declared deck`],
    [
      typeof d['card'] === 'string' && scope.cardIds.has(d['card'] as string),
      `"card" must reference a cataloged card (no smuggling)`,
    ],
    [d['policy'] === undefined || d['policy'] === 'top' || d['policy'] === 'bottom', `"policy" must be top|bottom`],
  ]);
}

function grantSueRightArgs(d: EffectDescriptor, scope: PackScope): string[] {
  return unmet([
    [isSeat(scope, d['holder']), `"holder" must be a declared seat`],
    [isSeat(scope, d['against']), `"against" must be a declared seat`],
    [typeof d['window'] === 'string', `"window" must be a string`],
  ]);
}

/** open_window: its own arguments, then (in order) each option's label, fx shape and inner fx. */
function openWindowCheck(d: EffectDescriptor, where: string, scope: PackScope): string[] {
  return [...led(openWindowArgs)(d, where, scope), ...optionsDefects(d, where, scope)];
}

function openWindowArgs(d: EffectDescriptor, scope: PackScope): string[] {
  const options = d['options'];
  const head = unmet([
    [typeof d['kind'] === 'string', `"kind" must be a string`],
    [isSeat(scope, d['decider']), `"decider" must be a declared seat (an undecidable window bricks the game)`],
    // ext-audit-2 F2-R2-5 (I-19): gating is engine-reserved — content may not set it.
    [d['gated'] === undefined, `"gated" is engine-reserved — every content window gates (S-8)`],
    [Array.isArray(options), `"options" must be an array`],
  ]);
  return Array.isArray(options) ? [...head, ...optionCountDefects(d, options)] : head;
}

function optionCountDefects(d: EffectDescriptor, options: readonly JsonValue[]): string[] {
  // K7-F2 NEW-1 closure: a window MUST carry at least one option — a
  // zero-option gated window has no path to decision (GX-8) and bricks the game.
  const auto = d['auto'] ?? 0;
  return unmet([
    [options.length >= 1, `"options" must carry at least one option (an undecidable window bricks the game)`],
    [
      Number.isInteger(auto) && (auto as number) >= 0 && (auto as number) < Math.max(options.length, 1),
      `"auto" index ${JSON.stringify(d['auto'])} out of range (${options.length} options)`,
    ],
  ]);
}

function optionsDefects(d: EffectDescriptor, where: string, scope: PackScope): string[] {
  const options = d['options'];
  if (!Array.isArray(options)) return [];
  return options.flatMap((opt, i) => optionDefects(opt, `${where} · open_window option ${i}`, scope));
}

/** One window option: a string label, and its fx (when present) an array of valid descriptors. */
function optionDefects(opt: JsonValue, at: string, scope: PackScope): string[] {
  const o = opt as { label?: unknown; fx?: unknown };
  const label = typeof o?.label !== 'string' ? [`${at}: "label" must be a string`] : [];
  // ext-audit-2 F2-R2-3: malformed fx shapes are NAMED, never thrown raw.
  if (o?.fx !== undefined && !Array.isArray(o.fx)) {
    return [...label, `${at}: "fx" must be an array, got ${JSON.stringify(o.fx)}`];
  }
  const inner = (o?.fx as EffectDescriptor[] | undefined) ?? [];
  return [...label, ...Array.from(inner, (d) => innerFxDefects(d, at, scope)).flat()];
}

function innerFxDefects(inner: EffectDescriptor, at: string, scope: PackScope): string[] {
  // ext-audit-2 F2-R2-1 (the NEW-1 sibling): open_window inside a window
  // option is STATICALLY DEAD under the depth-1 law — resolving it can only
  // refuse, and if it is the sole/auto path the game bricks. Refused at load.
  if (inner?.fx === 'open_window') {
    return [`${at}: contains open_window — statically dead under the depth-1 law (no path to decision)`];
  }
  return fxDefects(inner, at, scope);
}

/** Per-descriptor argument checks: one row per fx in EFX v1.1.1 (the type holds the table to the closure). */
const FX_CHECKS: Readonly<Record<EfxName, FxCheck>> = Object.freeze({
  pay: led(payArgs),
  capitalize: led(capitalizeArgs),
  grant_favor: led(grantFavorArgs),
  levy: led(levyArgs),
  deck_inject: led(deckInjectArgs),
  grant_sue_right: led(grantSueRightArgs),
  open_window: openWindowCheck,
});

/** I-2/I-8: genesis = deterministic f(pack, seats, seed); decks shuffled on named streams. */
export function packGenesis(rawPack: ContentPack): Genesis {
  // K7 OBS-B: seal here too — packGenesis is exported; the last aliasing edge closes.
  const pack = freezeDeep(structuredClone(rawPack) as unknown as JsonObject) as unknown as ContentPack;
  return (packRef, seats, seed) => {
    const rng = new RNGStreams(seed);
    const decks: Record<string, JsonValue> = {};
    for (const [deckRef, deck] of Object.entries(pack.decks)) {
      decks[deckRef] = {
        draw: shuffledOrder(deck.cards, rng, deckRef),
        discard: [],
        reserve: [],
      };
    }
    return {
      seats: seats.map((s) => ({
        id: s.id,
        cash: 0,
        favor: 0,
        assets: [],
        sueRights: [],
        eliminated: pack.seats.find((p) => p.id === s.id)?.eliminated === true,
      })),
      turn: {
        round: 1,
        seatIdx: 0,
        phase: 'start',
        wrappedRound: 0,
        maxRounds: pack.maxRounds,
        status: 'playing',
      },
      decks: decks as JsonValue,
      windows: [],
      windowSeq: 0,
    } as JsonObject;
  };
}

function activeSeatId(state: State): string {
  const turn = state['turn'] as { seatIdx: number };
  const rows = state['seats'] as readonly { id: string }[];
  return rows[turn.seatIdx]?.id ?? '';
}

/**
 * Wire the F2 intent set into a core. Load-validates FIRST (HK-4) — an invalid pack
 * never registers a single intent — and SEALS the pack at the door (K7-F2 defect 8:
 * post-validation mutation of the caller's pack object must be inert — the F1 D-2
 * aliasing law, applied to content).
 *
 * The five intents are registered one step each, in this order: deck:draw, turn:advance,
 * turn:pass, window:resolve, window:auto.
 */
export function wirePack(core: EngineCore, rawPack: ContentPack): void {
  // K7-F4 NEW-2 note applied here too: clone FIRST, validate the CLONE (getter-proof).
  const pack = freezeDeep(structuredClone(rawPack) as unknown as JsonObject) as unknown as ContentPack;
  hookHk4ValidatePack(pack);

  registerDeckDraw(core, pack);
  registerTurnAdvance(core);
  registerTurnPass(core);
  registerWindowResolve(core);
  registerWindowAuto(core);
}

// The five steps below use the shared turn discipline (K7-F4 D10): onTurnRule.

// deck:draw — draw own top card; its fx apply through EffectEngine (S-3; I-11).
function registerDeckDraw(core: EngineCore, pack: ContentPack): void {
  core.registerIntent(
    'deck:draw',
    {
      args: (_s, i) => (typeof i.args['deck'] === 'string' ? true : 'deck ref required'),
      rules: [onTurnRule],
    },
    (state, intent) => {
      const { next, card } = drawTop(state, intent.args['deck'] as string);
      if (card === null) return next; // empty draw is LEGAL (GX-12)
      const def = pack.cards[card];
      if (!def) {
        // K7-F2 defect 7 closure: a drawn card absent from the catalog is a HALT,
        // never a silent logged no-op (GX-10 halt-not-skip at the card level).
        throw new EffectRefusal(card, 'GX-10', `drawn card "${card}" absent from the pack catalog — halt`);
      }
      return EffectEngine.applyAll(next, def.fx, { windowDepth: 0 });
    }
  );
}

// turn:advance — phase step (I-9 advisory ordering at F2).
function registerTurnAdvance(core: EngineCore): void {
  core.registerIntent(
    'turn:advance',
    { args: () => true, rules: [onTurnRule] },
    (state) => advancePhase(state)
  );
}

// turn:pass — BOTH-CHECK: Guard rule refuses over open gated windows (R-6) AND HK-5
// guards the applier path (defense in depth; divergence-injectable).
function registerTurnPass(core: EngineCore): void {
  core.registerIntent(
    'turn:pass',
    {
      args: () => true,
      rules: [
        onTurnRule,
        (state) =>
          openGatedWindows(state).length === 0
            ? true
            : ({
                rule: 'GX-8/R-6',
                detail: `open gated window blocks advance: ${openGatedWindows(state)
                  .map((w) => w.id)
                  .join(', ')}`,
              } as const),
      ],
    },
    (state) => {
      hookHk5BeforeSeatAdvance(state); // HK-5 on the real path
      return passSeat(state);
    }
  );
}

// window:resolve — decider takes the decision (logged by submission).
function registerWindowResolve(core: EngineCore): void {
  core.registerIntent(
    'window:resolve',
    {
      args: (_s, i) =>
        typeof i.args['window'] === 'string' && typeof i.args['option'] === 'number'
          ? true
          : 'window (string) and option (number) required',
      rules: [],
    },
    (state, intent) =>
      resolveWindow(state, intent.args['window'] as string, intent.args['option'] as number, intent.seat)
  );
}

// window:auto — auto-policy takes the decision for an ELIMINATED decider; the intent
// itself is the log entry (GX-8/R-7: decided AND logged, never skipped).
function registerWindowAuto(core: EngineCore): void {
  core.registerIntent(
    'window:auto',
    {
      args: (_s, i) => (typeof i.args['window'] === 'string' ? true : 'window ref required'),
      rules: [],
    },
    (state, intent) => autoResolveWindow(state, intent.args['window'] as string)
  );
}

/** Convenience: validate + SEAL + genesis in one load call (the S-5 door). */
export function loadPack(rawPack: ContentPack): { genesis: Genesis; wire: (core: EngineCore) => void } {
  const pack = freezeDeep(structuredClone(rawPack) as unknown as JsonObject) as unknown as ContentPack;
  hookHk4ValidatePack(pack);
  return { genesis: packGenesis(pack), wire: (core) => wirePack(core, pack) };
}
