/**
 * M2 Guard — central legality; two-level check; typed refusal; refusal-not-repair.
 * Traces: S3 F1·M2 ← S2 M2 · seam S-1. Axioms: GX-1, GX-2. Refusal tests: R-1.
 * Level 1 (structural): known intent type, known seat, args validate.
 * Level 2 (rule): every registered rule-level check for the type must pass.
 * The Guard NEVER mutates and NEVER repairs — it answers, exactly once, legal or not.
 */

import type { Intent, Refusal, Seat, State, Verdict } from './types.js';

export type ArgsCheck = (state: State, intent: Intent) => true | string;
export type RuleCheck = (state: State, intent: Intent) => true | { rule: string; detail: string };

export interface IntentSpec {
  /** Structural argument validation; return true or a defect description (→ MALFORMED_ARGS). */
  readonly args: ArgsCheck;
  /** Rule-level legality checks, evaluated in registration order (→ RULE_REFUSED). */
  readonly rules: readonly RuleCheck[];
}

function refusal(code: Refusal['code'], rule: string, detail: string): Verdict {
  return { legal: false, refusal: { refused: true, code, rule, detail } };
}

export class Guard {
  private readonly specs = new Map<string, IntentSpec>();

  register(type: string, spec: IntentSpec): void {
    if (this.specs.has(type)) {
      // Admitted surface is respecified only by supersession, never in place (R-14 discipline,
      // applied to the kernel's own registry).
      throw new Error(`Guard: intent type "${type}" already registered — supersede, never respec`);
    }
    this.specs.set(type, spec);
  }

  /**
   * The central verdict (S-1). Pure: no mutation on any path.
   * Seat legality is checked against the ROW's authoritative seats (I-7) — never against
   * a state-schema convention. The kernel stays pack-agnostic; appliers cannot mint seats.
   */
  check(state: State, intent: Intent, seats: readonly Seat[]): Verdict {
    const spec = this.specs.get(intent.type);
    if (!spec) {
      return refusal('ILLEGAL_TYPE', 'GX-2/R-1', `unknown intent type "${intent.type}"`);
    }
    if (!seats.some((s) => s.id === intent.seat)) {
      return refusal('UNKNOWN_SEAT', 'GX-2/R-1/I-7', `unknown seat "${intent.seat}"`);
    }
    const argsVerdict = spec.args(state, intent);
    if (argsVerdict !== true) {
      return refusal('MALFORMED_ARGS', 'GX-2/R-1', argsVerdict);
    }
    for (const rule of spec.rules) {
      const v = rule(state, intent);
      if (v !== true) {
        return refusal('RULE_REFUSED', v.rule, v.detail);
      }
    }
    return { legal: true };
  }
}
