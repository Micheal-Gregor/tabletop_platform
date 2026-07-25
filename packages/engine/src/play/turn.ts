/**
 * M5 TurnMachine — five phases (I-9: start · draw · resolution · maintenance · cleanup),
 * seat pass, round wrap EXACTLY once, end-trigger + Closing slot flag.
 * Traces: S3 F2·M5 ← S2 M5. Axioms: GX-9. Refusals: R-8. Hook: HK-3.
 * Both-check law: advance consults Guard (rule checks at registration) AND WindowManager
 * (HK-5 on the applier path) — RE-1 lineage, neither subsumes the other.
 */

import type { JsonObject, State } from '../kernel/types.js';

export const PHASES = Object.freeze(['start', 'draw', 'resolution', 'maintenance', 'cleanup'] as const);

export interface TurnRow extends JsonObject {
  readonly round: number;
  readonly seatIdx: number;
  readonly phase: string;
  /** GX-9: the round number that last wrapped — HK-3's flag. */
  readonly wrappedRound: number;
  readonly maxRounds: number;
  readonly status: string; // 'playing' | 'closing' | 'ended'
}

export class HookHk3Violation extends Error {
  constructor(detail: string) {
    super(`HK-3 violated: ${detail}`);
    this.name = 'HookHk3Violation';
  }
}

export function turnRow(state: State): TurnRow {
  return state['turn'] as TurnRow;
}

/** HK-3 — at round wrap: wrap flag unset this round → block + flag (GX-9/R-8). */
export function hookHk3AtRoundWrap(turn: TurnRow): void {
  if (turn.wrappedRound >= turn.round) {
    throw new HookHk3Violation(
      `second wrap-tick in round ${turn.round} (last wrapped: ${turn.wrappedRound})`
    );
  }
}

/** Step to the next phase within the seat's turn (advisory ordering at F2 — I-9). */
export function advancePhase(state: State): JsonObject {
  const turn = turnRow(state);
  const idx = PHASES.indexOf(turn.phase as (typeof PHASES)[number]);
  const nextPhase = PHASES[Math.min(idx + 1, PHASES.length - 1)] as string;
  return { ...state, turn: { ...turn, phase: nextPhase } } as JsonObject;
}

function livingSeatCount(state: State): number {
  const rows = state['seats'] as readonly { eliminated: boolean }[];
  return rows.filter((s) => !s.eliminated).length;
}

function nextLivingSeatIdx(state: State, from: number): number {
  const rows = state['seats'] as readonly { eliminated: boolean }[];
  let idx = from;
  for (let hop = 0; hop < rows.length; hop++) {
    idx = (idx + 1) % rows.length;
    if (!rows[idx]!.eliminated) return idx;
  }
  return from;
}

/**
 * Seat pass: advance to the next living seat (I-12); wrapping past the last seat wraps
 * the round through HK-3 — exactly once. End-trigger: round > maxRounds → 'closing'
 * (the Closing Round SLOT — M15 opts in at F5; the flag is the slot).
 */
export function passSeat(state: State): JsonObject {
  const turn = turnRow(state);
  const next = nextLivingSeatIdx(state, turn.seatIdx);
  const wraps = next <= turn.seatIdx || livingSeatCount(state) === 1;
  if (!wraps) {
    return { ...state, turn: { ...turn, seatIdx: next, phase: 'start' } } as JsonObject;
  }
  hookHk3AtRoundWrap(turn); // GX-9: the wrap gate — block + flag
  const newRound = turn.round + 1;
  const status = newRound > turn.maxRounds ? 'closing' : turn.status;
  return {
    ...state,
    turn: {
      ...turn,
      round: newRound,
      wrappedRound: turn.round,
      seatIdx: next,
      phase: 'start',
      status,
    },
  } as JsonObject;
}

/** A forced re-wrap in the same round — exists so R-8 has a genuine forbidden input. */
export function forceRoundWrap(state: State): JsonObject {
  const turn = turnRow(state);
  hookHk3AtRoundWrap(turn);
  return {
    ...state,
    turn: { ...turn, round: turn.round + 1, wrappedRound: turn.round },
  } as JsonObject;
}
