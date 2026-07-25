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
import { EFX_V1_1_1, EffectEngine, EffectRefusal } from './effects.js';
import type { EffectDescriptor } from './effects.js';
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
 */
export function hookHk4ValidatePack(pack: ContentPack): void {
  const defects: string[] = [];
  if (!pack.id) defects.push('missing pack id');
  if (pack.efxVersion !== SUPPORTED_EFX_VERSION) {
    defects.push(`unknown EFX version "${pack.efxVersion}" (supported: ${SUPPORTED_EFX_VERSION})`);
  }
  if (!Number.isInteger(pack.maxRounds) || pack.maxRounds < 1) {
    defects.push(`maxRounds must be a positive integer, got ${pack.maxRounds}`);
  }
  if (!pack.seats || pack.seats.length < 1) defects.push('pack declares no seats');

  const seatIds = new Set((pack.seats ?? []).map((s) => s.id));
  const cardIds = new Set(Object.keys(pack.cards ?? {}));
  const deckRefs = new Set(Object.keys(pack.decks ?? {}));

  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const isSeat = (v: unknown): boolean => typeof v === 'string' && seatIds.has(v);

  // Per-descriptor arg schema — the "schema valid" leg of HK-4 (recursive over window options).
  const checkFx = (d: EffectDescriptor, where: string, defectsOut: string[]): void => {
    if (!EFX_V1_1_1.includes(d.fx as (typeof EFX_V1_1_1)[number])) {
      defectsOut.push(`${where} carries fx ∉ EFX: "${d.fx}"`);
      return;
    }
    const need = (cond: boolean, what: string): void => {
      if (!cond) defectsOut.push(`${where} · ${d.fx}: ${what}`);
    };
    switch (d.fx) {
      case 'pay':
        need(isSeat(d['to']), `"to" must be a declared seat, got ${JSON.stringify(d['to'])}`);
        need(finite(d['amount']), `"amount" must be a finite number, got ${JSON.stringify(d['amount'])}`);
        need(d['from'] === undefined || isSeat(d['from']), `"from" must be a declared seat`);
        break;
      case 'capitalize':
        need(isSeat(d['owner']), `"owner" must be a declared seat`);
        need(typeof d['asset'] === 'string', `"asset" must be a string`);
        need(finite(d['amount']), `"amount" must be a finite number`);
        break;
      case 'grant_favor':
        need(isSeat(d['to']), `"to" must be a declared seat`);
        need(finite(d['n']), `"n" must be a finite number`);
        break;
      case 'levy':
        need(d['scope'] === 'table' || isSeat(d['scope']), `"scope" must be 'table' or a declared seat`);
        need(finite(d['amount']), `"amount" must be a finite number`);
        break;
      case 'deck_inject':
        need(typeof d['deck'] === 'string' && deckRefs.has(d['deck'] as string), `"deck" must reference a declared deck`);
        need(typeof d['card'] === 'string' && cardIds.has(d['card'] as string), `"card" must reference a cataloged card (no smuggling)`);
        need(d['policy'] === undefined || d['policy'] === 'top' || d['policy'] === 'bottom', `"policy" must be top|bottom`);
        break;
      case 'grant_sue_right':
        need(isSeat(d['holder']), `"holder" must be a declared seat`);
        need(isSeat(d['against']), `"against" must be a declared seat`);
        need(typeof d['window'] === 'string', `"window" must be a string`);
        break;
      case 'open_window': {
        need(typeof d['kind'] === 'string', `"kind" must be a string`);
        need(isSeat(d['decider']), `"decider" must be a declared seat (an undecidable window bricks the game)`);
        const options = d['options'];
        need(Array.isArray(options), `"options" must be an array`);
        if (Array.isArray(options)) {
          const auto = d['auto'] ?? 0;
          need(
            Number.isInteger(auto) && (auto as number) >= 0 && (options.length === 0 || (auto as number) < options.length),
            `"auto" index ${JSON.stringify(d['auto'])} out of range (${options.length} options)`
          );
          options.forEach((opt, i) => {
            const o = opt as { label?: unknown; fx?: unknown };
            if (typeof o?.label !== 'string') defectsOut.push(`${where} · open_window option ${i}: "label" must be a string`);
            for (const inner of (o?.fx as EffectDescriptor[] | undefined) ?? []) {
              checkFx(inner, `${where} · open_window option ${i}`, defectsOut);
            }
          });
        }
        break;
      }
    }
  };

  for (const [cardId, card] of Object.entries(pack.cards ?? {})) {
    for (const d of card.fx ?? []) checkFx(d, `card "${cardId}"`, defects);
  }
  for (const [deckRef, deck] of Object.entries(pack.decks ?? {})) {
    for (const cardId of deck.cards ?? []) {
      if (!cardIds.has(cardId)) {
        defects.push(`deck "${deckRef}" references unknown card "${cardId}"`);
      }
    }
  }
  if (defects.length > 0) throw new PackLoadRefusal(defects);
}

/** I-2/I-8: genesis = deterministic f(pack, seats, seed); decks shuffled on named streams. */
export function packGenesis(pack: ContentPack): Genesis {
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
 */
export function wirePack(core: EngineCore, rawPack: ContentPack): void {
  hookHk4ValidatePack(rawPack);
  const pack = freezeDeep(structuredClone(rawPack) as unknown as JsonObject) as unknown as ContentPack;

  const onTurn = (state: State, intent: Intent) =>
    activeSeatId(state) === intent.seat
      ? true
      : ({ rule: 'M5/turn-order (S2)', detail: `not seat "${intent.seat}"'s turn` } as const);

  // deck:draw — draw own top card; its fx apply through EffectEngine (S-3; I-11).
  core.registerIntent(
    'deck:draw',
    {
      args: (_s, i) => (typeof i.args['deck'] === 'string' ? true : 'deck ref required'),
      rules: [onTurn],
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

  // turn:advance — phase step (I-9 advisory ordering at F2).
  core.registerIntent(
    'turn:advance',
    { args: () => true, rules: [onTurn] },
    (state) => advancePhase(state)
  );

  // turn:pass — BOTH-CHECK: Guard rule refuses over open gated windows (R-6) AND HK-5
  // guards the applier path (defense in depth; divergence-injectable).
  core.registerIntent(
    'turn:pass',
    {
      args: () => true,
      rules: [
        onTurn,
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

  // window:resolve — decider takes the decision (logged by submission).
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

  // window:auto — auto-policy takes the decision for an ELIMINATED decider; the intent
  // itself is the log entry (GX-8/R-7: decided AND logged, never skipped).
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
  hookHk4ValidatePack(rawPack);
  const pack = freezeDeep(structuredClone(rawPack) as unknown as JsonObject) as unknown as ContentPack;
  return { genesis: packGenesis(pack), wire: (core) => wirePack(core, pack) };
}
