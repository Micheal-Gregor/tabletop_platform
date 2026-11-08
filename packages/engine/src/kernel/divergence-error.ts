/**
 * kernel/divergence-error — the typed refusal rebuild throws when a replay diverges (REF-09, R-9).
 * Traces: S3 F1·M3 refusal REF-09 · object-model row "MOD-03 DivergenceError"
 * (split from intentlog.ts at R1: one class per file; intentlog.ts re-exports it so every import holds).
 */

export class DivergenceError extends Error {
  constructor(readonly index: number, readonly refusalDetail: string) {
    super(
      `Replay divergence at move ${index}: ${refusalDetail} — full rebuild refused (GX-4/R-9); never patch`
    );
    this.name = 'DivergenceError';
  }
}
