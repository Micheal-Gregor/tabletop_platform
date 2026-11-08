/**
 * kernel/hook-violation — the typed violation HOOK-01 (HK-1) and HOOK-02 (HK-2) throw.
 * Traces: S3 F1·M2 hooks HOOK-01/HOOK-02 · object-model row "MOD-02 HookViolation"
 * (split from core.ts at R1: one class per file; core.ts re-exports it so every import holds).
 */

export class HookViolation extends Error {
  constructor(readonly hook: 'HK-1' | 'HK-2', detail: string) {
    super(`${hook} violated: ${detail}`);
    this.name = 'HookViolation';
  }
}
