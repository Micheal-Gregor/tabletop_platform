/**
 * M4 RNGStreams — named streams, deterministic, isolated; human inputs are ARGUMENTS.
 * Traces: S3 F1·M4 ← S2 M4. Axioms: GX-5 (ER-6).
 * I-4 (registered, benign): algorithm = mulberry32 over an FNV-1a fold of (seed ⊕ stream
 * name) — pure JS, portable, byte-stable across platforms. Each stream's sequence depends
 * only on (seed, name, index): consumption on one stream NEVER shifts another.
 */

function fnv1a32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNGStream {
  private readonly next32: () => number;

  constructor(readonly name: string, gameSeed: string) {
    this.next32 = mulberry32(fnv1a32(`${gameSeed}::${name}`));
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.next32();
  }

  /** Uniform integer in [0, n). */
  nextInt(n: number): number {
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`RNGStream(${this.name}): nextInt requires a positive integer, got ${n}`);
    }
    return Math.floor(this.next() * n);
  }
}

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
