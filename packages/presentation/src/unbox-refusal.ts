/**
 * MP6 UnboxRefusal — the typed refusal unbox meets (own refs only).
 * Traces: S3 F6 · GX-35 · object-model row "MOD-33 UnboxRefusal" (split from projector.ts at R1:
 * one class per file; projector.ts re-exports it so every import holds).
 */
export class UnboxRefusal extends Error {
  constructor(detail: string) {
    super(`Unbox refused [GX-35]: ${detail}`);
    this.name = 'UnboxRefusal';
  }
}
