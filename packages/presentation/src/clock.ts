/**
 * MP9 ClockDriver + Adaptation/A11y floor — the TWO-CLOCK law (GX-39).
 * Traces: S3 F6 · ODG-e1 (stays OPEN — no TimeSource binding; the presentation clock
 * is LOCAL, I-47). The game clock DERIVES from the projected view; the animation
 * timeline never writes a state byte.
 */
import type { SeatView } from './projector.js';
import { hookHk10BeforeRenderRead } from './projector.js';

export interface DisplayClock {
  readonly round: number;
  readonly phase: string;
  readonly status: string;
  readonly activeSeat: string;
}

/** Clock one: THE GAME CLOCK — pure derivation from the view (never stored). */
export function displayClock(view: SeatView): DisplayClock {
  hookHk10BeforeRenderRead(view);
  return {
    round: view.turn.round,
    phase: view.turn.phase,
    status: view.turn.status,
    activeSeat: view.seats[view.turn.seatIdx]?.id ?? '?',
  };
}

/** Clock two: THE ANIMATION TIMELINE — local, monotonic, and utterly stateless
 *  toward the game (advancing it touches nothing but itself). */
export class Timeline {
  private t = 0;
  now(): number {
    return this.t;
  }
  advance(ms: number): number {
    if (!Number.isFinite(ms) || ms < 0) throw new Error('Timeline refused: advance must be finite and non-negative');
    this.t += ms;
    return this.t;
  }
}
