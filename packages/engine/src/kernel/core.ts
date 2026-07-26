/**
 * kernel/core — the ONLY mutation path (seam S-1): submit → Guard → apply → log.
 * Traces: S3 S-1 · HK-1 · HK-2 · GX-1..GX-4. Refusal tests: R-1, R-9, R-10.
 *
 * Appliers are PURE (state in → new state out) and INTERNAL: F2+ modules register them
 * through core; nothing outside this file applies a mutation. The exposed state is
 * deep-frozen (R-10's structural half — see statetree.ts).
 */

import type {
  Genesis,
  GameRow,
  Intent,
  JsonObject,
  PackRef,
  Refusal,
  Seat,
  State,
  Verdict,
} from './types.js';
import { freezeDeep, hashState } from './statetree.js';
import { Guard } from './guard.js';
import { IntentLog, DivergenceError } from './intentlog.js';
import { RNGStreams } from './rng.js';

export class HookViolation extends Error {
  constructor(readonly hook: 'HK-1' | 'HK-2', detail: string) {
    super(`${hook} violated: ${detail}`);
    this.name = 'HookViolation';
  }
}

/** Applier context: streams only — human inputs arrive in intent.args (GX-5). */
export interface ApplyContext {
  readonly rng: RNGStreams;
}

export type Applier = (state: State, intent: Intent, ctx: ApplyContext) => JsonObject;

export type SubmitResult =
  | { readonly ok: true; readonly state: State }
  | Refusal;

/**
 * HK-1 — before any mutation: Guard verdict LEGAL → block otherwise.
 * A distinct, named hook (not just an if-branch) so divergence-injection can prove it:
 * a lying/malformed verdict object is caught HERE, on the real orchestrated path.
 */
export function hookHk1BeforeMutation(verdict: Verdict): void {
  if (verdict == null || typeof verdict !== 'object' || verdict.legal !== true) {
    throw new HookViolation('HK-1', 'mutation attempted without a LEGAL guard verdict');
  }
}

/** HK-2 — before log append: the apply must have SUCCEEDED (produced a next state). */
export function hookHk2BeforeLogAppend(nextState: State | null | undefined): void {
  if (nextState == null || typeof nextState !== 'object') {
    throw new HookViolation('HK-2', 'log append attempted without a succeeded apply');
  }
}

export class EngineCore {
  private readonly guard: Guard;
  private readonly appliers = new Map<string, Applier>();
  private readonly log = new IntentLog();
  private readonly rng: RNGStreams;
  private state: State;

  constructor(
    private readonly packRef: PackRef,
    private readonly seats: readonly Seat[],
    private readonly seed: string,
    genesis: Genesis,
    guard?: Guard
  ) {
    this.guard = guard ?? new Guard();
    this.rng = new RNGStreams(seed);
    this.state = freezeDeep(genesis(packRef, seats, seed));
  }

  /** Registration surface for F2+ modules — guard spec and applier arrive together. */
  registerIntent(
    type: string,
    spec: Parameters<Guard['register']>[1],
    applier: Applier
  ): void {
    this.guard.register(type, spec);
    if (this.appliers.has(type)) {
      throw new Error(`core: applier for "${type}" already registered — supersede, never respec`);
    }
    this.appliers.set(type, applier);
  }

  getState(): State {
    return this.state; // deep-frozen (R-10)
  }

  getStateHash(): string {
    return hashState(this.state);
  }

  getLogLength(): number {
    return this.log.length;
  }

  toRow(): GameRow {
    return this.log.toRow(this.packRef, this.seed, this.seats);
  }

  /** THE guarded intent path (S-1). Every mutation in the platform flows through here. */
  submit(intent: Intent): SubmitResult {
    // K7 defect 2 (GX-3/GX-4): sever aliasing at the door — the engine works with, and
    // logs, its OWN frozen copy; the caller's object can never tamper the row post-hoc.
    const sealed = freezeDeep(
      structuredClone(intent) as unknown as JsonObject
    ) as unknown as Intent;

    const verdict = this.guard.check(this.state, sealed, this.seats);
    if (verdict != null && verdict.legal === false) {
      if (verdict.refusal == null) {
        // obs-1 closure (external audit EA-2): a refusing verdict without a refusal
        // payload is an engine defect — throw, never return undefined outside SubmitResult.
        throw new HookViolation('HK-1', 'refusing verdict carried no refusal payload');
      }
      // GX-2: typed refusal; state untouched; NOTHING logged (R-1).
      return verdict.refusal;
    }
    // HK-1: the mutation gate, on the real path — blocks ANYTHING that is not exactly
    // {legal: true}, including a lying/malformed verdict (K7 defect 1: falsifiable here).
    hookHk1BeforeMutation(verdict);

    const applier = this.appliers.get(sealed.type);
    if (!applier) {
      // A LEGAL verdict with no applier is an engine defect, not a player error —
      // refuse loudly rather than repair (GX-2 discipline applied to ourselves).
      throw new HookViolation('HK-1', `legal verdict for "${sealed.type}" but no applier registered`);
    }

    const next = freezeDeep(applier(this.state, sealed, { rng: this.rng }));
    hookHk2BeforeLogAppend(next); // HK-2: append only after a succeeded apply.
    this.state = next;
    this.log.append(sealed);
    return { ok: true, state: this.state };
  }
}

/**
 * GX-4 / R-9 — rebuild from the row: byte-deterministic, all-or-nothing.
 * Any refusal mid-replay = divergence → DivergenceError; no partial state escapes.
 * `wire` re-registers the same intents/appliers a live engine had (pack-supplied in F2).
 */
export function rebuild(
  row: GameRow,
  genesis: Genesis,
  wire: (core: EngineCore) => void
): EngineCore {
  const core = new EngineCore(row.packRef, row.seats, row.seed, genesis);
  wire(core);
  for (let i = 0; i < row.moves.length; i++) {
    const move = row.moves[i];
    if (!move) throw new DivergenceError(i, 'missing move in row');
    let result: SubmitResult;
    try {
      result = core.submit(move);
    } catch (e) {
      // K7-F3 defect 5 (I-25): a tampered/illegal replayed move ALWAYS surfaces as
      // DivergenceError at rebuild — domain refusals thrown by appliers included.
      if (e instanceof DivergenceError) throw e;
      throw new DivergenceError(i, `applier refusal during replay: ${(e as Error).message}`);
    }
    if ('refused' in result) {
      throw new DivergenceError(i, `${result.code} — ${result.detail}`);
    }
  }
  return core;
}
