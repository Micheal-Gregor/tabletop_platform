/**
 * M1 StateTree — one root; on-state ids; derived-never-stored; frozen exposure.
 * Traces: S3 F1·M1 ← S2 M1. Axioms: GX-1 (structural leg), GX-6.
 * R-10's structural half lives here: every state the engine exposes is deep-frozen,
 * so "mutation bypassing Guard" is not merely forbidden — it throws.
 */

import type { JsonValue, State } from './types.js';

/** Deep-freeze a state tree in place and return it typed as State. */
export function freezeDeep<T extends JsonValue>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      freezeDeep(child as JsonValue);
    }
  }
  return value;
}

/** Canonical JSON: object keys sorted at every depth — the byte-stable form GX-4 hashes. */
export function canonicalJson(value: JsonValue): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    // K7 defect 6: JSON.stringify maps NaN/Infinity → "null", which would let a corrupt
    // numeric state hash equal to a null state. Refuse loudly instead (GX-2 discipline).
    throw new Error(`canonicalJson: non-finite number ${value} is not a legal state value`);
  }
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${(value as readonly JsonValue[]).map(canonicalJson).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, JsonValue>)[k] as JsonValue)}`)
    .join(',')}}`;
}

/** FNV-1a 64-bit over canonical JSON — pure, portable (no platform imports; ER-7). */
export function hashState(state: State): string {
  const text = canonicalJson(state);
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}
