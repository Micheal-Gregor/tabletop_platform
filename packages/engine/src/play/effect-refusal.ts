/**
 * play/effect-refusal — the typed refusal an unknown or bypassing effect meets.
 * Traces: S3 F2·M9 refusals REF-03 (R-3) / REF-24 (R-24) · object-model row "MOD-09 EffectRefusal"
 * (split from effects.ts at R1: one class per file; effects.ts re-exports it so every import holds).
 */

export class EffectRefusal extends Error {
  constructor(readonly descriptor: string, readonly rule: string, detail: string) {
    super(`Effect refused [${rule}] descriptor "${descriptor}": ${detail}`);
    this.name = 'EffectRefusal';
  }
}
