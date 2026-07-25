/**
 * M6 Deck — draw/discard/reserve; shuffle + draw from named streams; living inject
 * order-preserving; empty draw legal (Stage-2b S8).
 * Traces: S3 F2·M6 ← S2 M6. Axioms: GX-12, GX-5 (streams).
 */

import type { JsonObject, State } from '../kernel/types.js';
import type { RNGStreams } from '../kernel/rng.js';

export interface DeckRow extends JsonObject {
  readonly draw: readonly string[];
  readonly discard: readonly string[];
  readonly reserve: readonly string[];
}

export function decks(state: State): Record<string, DeckRow> {
  return state['decks'] as Record<string, DeckRow>;
}

/** Fisher–Yates over the deck's OWN named stream — deterministic per (seed, deckRef). */
export function shuffledOrder(cards: readonly string[], rng: RNGStreams, deckRef: string): string[] {
  const out = [...cards];
  const stream = rng.stream(`deck:${deckRef}`);
  for (let i = out.length - 1; i > 0; i--) {
    const j = stream.nextInt(i + 1);
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}

/** Draw the top card. Empty deck → {card: null} — LEGAL, never an error (GX-12). */
export function drawTop(state: State, deckRef: string): { next: JsonObject; card: string | null } {
  const all = decks(state);
  const deck = all[deckRef];
  if (!deck) return { next: state as JsonObject, card: null };
  const [top, ...rest] = deck.draw;
  if (top === undefined) return { next: state as JsonObject, card: null };
  const next = {
    ...state,
    decks: { ...all, [deckRef]: { ...deck, draw: rest, discard: [top, ...deck.discard] } },
  } as JsonObject;
  return { next, card: top };
}

/** Move a card between draw and reserve (scripted/reserve ops). */
export function toReserve(state: State, deckRef: string, card: string): JsonObject {
  const all = decks(state);
  const deck = all[deckRef];
  if (!deck || !deck.draw.includes(card)) return state as JsonObject;
  return {
    ...state,
    decks: {
      ...all,
      [deckRef]: {
        ...deck,
        draw: deck.draw.filter((c) => c !== card),
        reserve: [...deck.reserve, card],
      },
    },
  } as JsonObject;
}
