/**
 * transport/transport-refusal — the typed refusal writer discipline and resume meet.
 * Traces: S-2 · GX-31 (packRef mismatch refuses WHOLE) · GX-32 (writer discipline) · object-model row
 * "MOD-27 TransportRefusal" (split from lockstep.ts at R1: one class per file; lockstep.ts re-exports
 * it so every import holds).
 */

export class TransportRefusal extends Error {
  constructor(readonly rule: string, detail: string) {
    super(`Transport refused [${rule}]: ${detail}`);
    this.name = 'TransportRefusal';
  }
}
