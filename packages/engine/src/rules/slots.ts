/**
 * MR4 StateSlotManager — declared rule-state slots, four reset classes.
 * Traces: S3 F4·MR4 ← S2 MR4. Axiom: GX-22. Refusal: R-18.
 */
import type { JsonObject, JsonValue, State } from '../kernel/types.js';
import type { SlotDecl } from './contributions.js';
import { ContributionRefusal } from './contributions.js';

type SlotBank = Readonly<Record<string, Readonly<Record<string, JsonValue>>>>;

export function readSlot(state: State, contribId: string, slot: string): JsonValue | undefined {
  const bank = (state['ruleSlots'] as SlotBank) ?? {};
  return bank[contribId]?.[slot];
}

/** R-18 — a write to an undeclared slot refuses; declared writes land on state.ruleSlots. */
export function writeSlot(
  state: State,
  contribId: string,
  slot: string,
  value: JsonValue,
  declared: readonly SlotDecl[]
): JsonObject {
  if (!declared.some((d) => d.name === slot)) {
    throw new ContributionRefusal(contribId, 'GX-22/R-18', `write to undeclared slot "${slot}" — refused`);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new ContributionRefusal(contribId, 'GX-22/I-5′', `non-finite slot value refused at write`);
  }
  const bank = (state['ruleSlots'] as SlotBank) ?? {};
  return {
    ...state,
    ruleSlots: { ...bank, [contribId]: { ...(bank[contribId] ?? {}), [slot]: value } },
  } as JsonObject;
}

/** Reset exactly one class across all contributions (per-turn / per-round / per-game). */
export function resetSlots(
  state: State,
  resetClass: 'per-turn' | 'per-round' | 'per-game',
  declarations: ReadonlyMap<string, readonly SlotDecl[]>
): JsonObject {
  const bank = (state['ruleSlots'] as SlotBank) ?? {};
  const next: Record<string, Record<string, JsonValue>> = {};
  for (const [contribId, slots] of Object.entries(bank)) {
    const decls = declarations.get(contribId) ?? [];
    const kept: Record<string, JsonValue> = {};
    for (const [name, value] of Object.entries(slots)) {
      const decl = decls.find((d) => d.name === name);
      if (decl && decl.reset !== resetClass) kept[name] = value;
    }
    next[contribId] = kept;
  }
  return { ...state, ruleSlots: next } as JsonObject;
}
