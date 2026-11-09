/**
 * ontology/kind-refusal — the typed refusal admission and respecification meet.
 * Traces: S3 F3·ME1 refusals REF-14 (R-14) · HOOK-07 · object-model row "MOD-10 KindRefusal"
 * (split from kinds.ts at R1: one class per file; kinds.ts re-exports it so every import holds).
 */

export class KindRefusal extends Error {
  constructor(readonly kind: string, readonly rule: string, detail: string) {
    super(`Kind refused [${rule}] "${kind}": ${detail}`);
    this.name = 'KindRefusal';
  }
}
