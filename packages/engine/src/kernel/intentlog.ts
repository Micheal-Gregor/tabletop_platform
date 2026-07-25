/**
 * M3 IntentLog — record-after-success; the log IS the game (with the row).
 * Traces: S3 F1·M3 ← S2 M3 · seam S-2 · I-1. Axioms: GX-3, GX-4. Refusal tests: R-9.
 * The log holds ONLY succeeded intents. Appending is core's job AFTER apply (HK-2);
 * this module refuses to be the place where ordering discipline is negotiable.
 */

import type { GameRow, Intent, PackRef, Seat } from './types.js';

export class DivergenceError extends Error {
  constructor(readonly index: number, readonly refusalDetail: string) {
    super(
      `Replay divergence at move ${index}: ${refusalDetail} — full rebuild refused (GX-4/R-9); never patch`
    );
    this.name = 'DivergenceError';
  }
}

export class IntentLog {
  private readonly entries: Intent[] = [];

  /** Append AFTER success only — core enforces the ordering (HK-2); the log stays append-only. */
  append(intent: Intent): void {
    this.entries.push(intent);
  }

  get length(): number {
    return this.entries.length;
  }

  snapshot(): readonly Intent[] {
    return [...this.entries];
  }

  /** The persisted row (S-2 / I-1): {packRef, seed, seats, moves}. */
  toRow(packRef: PackRef, seed: string, seats: readonly Seat[]): GameRow {
    return { packRef, seed, seats, moves: this.snapshot() };
  }
}
