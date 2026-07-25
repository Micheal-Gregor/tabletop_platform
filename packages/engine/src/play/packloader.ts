/**
 * M8 PackLoader — validation NAMES defects; EFX closure at load; genesis; wiring.
 * Traces: S3 F2·M8 ← S2 M8 · seam S-5 · I-2 (genesis supplier) · I-10 (schema depth).
 * Axioms: GX-10. Refusals: R-2. Hook: HK-4.
 * Flavor attaches and travels; the engine NEVER reads it (content ≠ behavior).
 */

import type { Genesis, Intent, JsonObject, JsonValue, State } from '../kernel/types.js';
import type { EngineCore } from '../kernel/core.js';
import { RNGStreams } from '../kernel/rng.js';
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
 * HK-4 (M8 side) — at pack load: fx ⊆ EFX ∧ schema valid ∧ versions known → refuse,
 * NAMING every defect (validation names defects — never a bare "invalid").
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
  for (const [cardId, card] of Object.entries(pack.cards ?? {})) {
    for (const d of card.fx ?? []) {
      if (!EFX_V1_1_1.includes(d.fx as (typeof EFX_V1_1_1)[number])) {
        defects.push(`card "${cardId}" carries fx ∉ EFX: "${d.fx}"`);
      }
    }
  }
  for (const [deckRef, deck] of Object.entries(pack.decks ?? {})) {
    for (const cardId of deck.cards ?? []) {
      if (!(cardId in (pack.cards ?? {}))) {
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
      packId: packRef.id,
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
 * never registers a single intent.
 */
export function wirePack(core: EngineCore, pack: ContentPack): void {
  hookHk4ValidatePack(pack);

  const onTurn = (state: State, intent: Intent) =>
    activeSeatId(state) === intent.seat
      ? true
      : ({ rule: 'GX-8/R-1', detail: `not seat "${intent.seat}"'s turn` } as const);

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
      return EffectEngine.applyAll(next, def?.fx ?? [], { windowDepth: 0 });
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

/** Convenience: validate + genesis in one load call (the S-5 door). */
export function loadPack(pack: ContentPack): { genesis: Genesis; wire: (core: EngineCore) => void } {
  hookHk4ValidatePack(pack);
  return { genesis: packGenesis(pack), wire: (core) => wirePack(core, pack) };
}
