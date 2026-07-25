/**
 * kernel/types — shared kernel types.
 * Traces: S3 F1 (Object Model row "kernel/types") · I-1 (PackRef on the row) · I-2 (Genesis).
 * Governed by: CLAUDE.md (root) — TABLETOP conformance build.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | JsonObject;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/** I-1 (registered, latent→F-route SP-1): the row names its pack or replay is underdetermined. */
export interface PackRef {
  readonly id: string;
  readonly version: string;
  readonly hash: string;
}

export interface Seat {
  readonly id: string;
}

/**
 * An intent — the ONLY doorway to mutation (S-1).
 * Human inputs travel as `args` (GX-5 / ER-6) — never as entropy.
 */
export interface Intent {
  readonly type: string;
  readonly seat: string;
  readonly args: JsonObject;
}

/** GX-2 / R-1: refusals are TYPED. code = machine class, rule = the cited law, detail = human text. */
export interface Refusal {
  readonly refused: true;
  readonly code:
    | 'ILLEGAL_TYPE'
    | 'UNKNOWN_SEAT'
    | 'RULE_REFUSED'
    | 'MALFORMED_ARGS';
  readonly rule: string;
  readonly detail: string;
}

export type Verdict =
  | { readonly legal: true }
  | { readonly legal: false; readonly refusal: Refusal };

/** GX-3 / S-2 / I-1: the persisted game IS this row. */
export interface GameRow {
  readonly packRef: PackRef;
  readonly seed: string;
  readonly seats: readonly Seat[];
  readonly moves: readonly Intent[];
}

/** The one root (S2 M1). Ids live ON the state (GX-6). */
export type State = JsonObject;

/** I-2 (registered, benign): genesis = deterministic f(pack, seats, seed); empty log = genesis. */
export type Genesis = (
  packRef: PackRef,
  seats: readonly Seat[],
  seed: string
) => State;
