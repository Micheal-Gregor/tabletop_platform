/**
 * MP8 TheaterSync + the D-2 FLOURISH LIBRARY (owner-ratified: reusable presentation
 * flourishes — dice throws, card flips — as DATA presets tied to object classes).
 * Traces: S3 F6 · R-20 · HK-11 · EP-2 · D-2. Axiom GX-38: THEATER OVER TRUTH — at
 * animation complete, displayed ≡ seeded or the mismatch is FLAGGED and the seeded
 * result wins, always. Sound placeholders are captions that SELF-REMOVE (D-1).
 */
export interface Flourish {
  readonly id: string;
  readonly durationMs: number;
  readonly steps: readonly string[];
  readonly sound: string; // a sound.* token — the Placeholder renders it as a caption
}

/** D-2 — the flourish library: presentation-tier presets, pure data. */
export const FLOURISHES: Readonly<Record<string, Flourish>> = Object.freeze({
  'card-flip': Object.freeze({ id: 'card-flip', durationMs: 400, steps: ['lift', 'flip', 'settle'], sound: 'sound.card-flip' }),
  'die-throw': Object.freeze({ id: 'die-throw', durationMs: 700, steps: ['shake', 'tumble', 'rest'], sound: 'sound.die-throw' }),
  'coin-slide': Object.freeze({ id: 'coin-slide', durationMs: 300, steps: ['slide', 'clink'], sound: 'sound.coin-clink' }),
  'piece-hop': Object.freeze({ id: 'piece-hop', durationMs: 250, steps: ['rise', 'arc', 'land'], sound: 'sound.piece-tap' }),
});

export class TheaterRefusal extends Error {
  constructor(detail: string) {
    super(`Theater refused [GX-38]: ${detail}`);
    this.name = 'TheaterRefusal';
  }
}

/** A transient caption (the D-1 sound placeholder): appears, then self-removes. */
export interface Caption {
  readonly text: string;
  readonly ttlMs: number;
}

export interface FlourishInstance {
  readonly flourish: Flourish;
  /** THE TRUTH — captured from the seeded engine result BEFORE any animation runs. */
  readonly seededResult: string;
  readonly captions: readonly Caption[];
}

export interface SyncVerdict {
  /** Truth wins: ALWAYS the seeded result, mismatch or not (R-20). */
  readonly result: string;
  readonly mismatch: { readonly flagged: true; readonly displayed: string; readonly seeded: string } | null;
}

export function beginFlourish(flourishId: string, seededResult: string, soundCaption: string): FlourishInstance {
  const flourish = Object.hasOwn(FLOURISHES, flourishId) ? FLOURISHES[flourishId] : undefined;
  if (!flourish) throw new TheaterRefusal(`unknown flourish "${flourishId}" — the library is data, extend it there`);
  return {
    flourish,
    seededResult,
    captions: [{ text: soundCaption, ttlMs: flourish.durationMs + 800 }], // D-1: brief, then gone
  };
}

/** HK-11 — at animation complete: displayed ≡ seeded, or FLAG + truth wins (R-20). */
export function hookHk11AtAnimationComplete(displayed: string, seeded: string): SyncVerdict {
  if (displayed !== seeded) {
    return { result: seeded, mismatch: { flagged: true, displayed, seeded } }; // truth wins
  }
  return { result: seeded, mismatch: null };
}

export function completeFlourish(instance: FlourishInstance, displayedResult: string): SyncVerdict {
  return hookHk11AtAnimationComplete(displayedResult, instance.seededResult);
}

/** D-1 self-removal: tick captions down; expired ones VANISH. Pure — returns the rest. */
export function tickCaptions(captions: readonly Caption[], elapsedMs: number): readonly Caption[] {
  return captions
    .map((c) => ({ text: c.text, ttlMs: c.ttlMs - elapsedMs }))
    .filter((c) => c.ttlMs > 0);
}
