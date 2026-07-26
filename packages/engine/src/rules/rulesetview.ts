/**
 * MR6 RulesetView — TOTAL exposure: every vocabulary member and registered contribution,
 * derived on demand, never stored (GX-6). Consumed by MP7 BookletRenderer at F6 (RE-12).
 * Traces: S3 F4·MR6 ← S2 MR6.
 */
import type { RuleRegistry } from './registry.js';
import { VOCABULARIES } from './vocabularies.js';

export interface RulesetViewModel {
  readonly vocabularies: readonly { name: string; version: string; members: readonly string[] }[];
  readonly contributions: readonly {
    id: string;
    bearer: string;
    trigger: string;
    condition: unknown;
    effects: readonly unknown[];
    slotWrites: readonly unknown[];
    effectSummary: readonly string[];
    slots: readonly string[];
  }[];
}

export function renderRuleset(registry: RuleRegistry): RulesetViewModel {
  return {
    vocabularies: VOCABULARIES.map((v) => ({ name: v.name, version: v.version, members: v.members })),
    contributions: registry.list().map((c) => ({
      id: c.id,
      bearer: c.bearer.kind !== undefined ? `kind:${c.bearer.kind}` : `relation:${c.bearer.relationType}`,
      trigger: c.trigger,
      // K7-F4 D11: TOTAL exposure — full descriptors, condition, and slot writes, not summaries
      condition: c.condition,
      effects: c.effects,
      slotWrites: c.slotWrites ?? [],
      effectSummary: c.effects.map((e) => e.fx),
      slots: c.declaredSlots.map((s) => `${s.name} (${s.reset})`),
    })),
  };
}
