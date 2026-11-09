/**
 * M4 RNGStreams — named streams, deterministic, isolated; human inputs are ARGUMENTS.
 * Traces: S3 F1·M4 ← S2 M4. Axioms: GX-5 (ER-6).
 * I-4 (registered, benign): algorithm = mulberry32 over an FNV-1a fold of (seed ⊕ stream
 * name) — pure JS, portable, byte-stable across platforms. Each stream's sequence depends
 * only on (seed, name, index): consumption on one stream NEVER shifts another.
 * R1: RNGStream lives in rng-stream.ts (one class per file); it is re-exported here so every
 * existing import of it from this file keeps working.
 */

import { RNGStream } from './rng-stream.js';

export { RNGStream } from './rng-stream.js';

export class RNGStreams {
  private readonly streams = new Map<string, RNGStream>();

  constructor(private readonly gameSeed: string) {}

  /** Get-or-create the named stream. Same (seed, name) → same sequence, always. */
  stream(name: string): RNGStream {
    let s = this.streams.get(name);
    if (!s) {
      s = new RNGStream(name, this.gameSeed);
      this.streams.set(name, s);
    }
    return s;
  }
}
