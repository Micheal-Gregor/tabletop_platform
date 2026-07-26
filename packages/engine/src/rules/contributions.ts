/**
 * MR3 ContributionLoader — validation NAMES defects (R-15 / HK-4 MR3 side) + the
 * bounded-meta static leg (R-16) + UniqueDef (RE-7: is-a in the catalog, has-a here).
 * Traces: S3 F4·MR3 ← S2 MR3. Axioms: GX-20, GX-21 (static), I-30.
 */
import type { JsonObject, JsonValue } from '../kernel/types.js';
import type { EffectDescriptor } from '../play/effects.js';
import { EFX_GOVERNED, HOOK_POINTS_V1 } from './vocabularies.js';

export type Condition =
  | { readonly op: 'always' }
  | { readonly op: 'eq' | 'ne' | 'gte' | 'lte'; readonly path: string; readonly value: JsonValue }
  | { readonly op: 'and' | 'or'; readonly terms: readonly Condition[] };

export interface SlotDecl {
  readonly name: string;
  readonly reset: 'never' | 'per-turn' | 'per-round' | 'per-game';
}

export interface SlotWrite {
  readonly slot: string;
  readonly set?: JsonValue;
  readonly increment?: number;
}

export interface RuleContribution {
  readonly id: string;
  /** kind-borne OR relation-borne (V-8: relation-borne activates on formation). */
  readonly bearer: { readonly kind?: string; readonly relationType?: string };
  readonly trigger: string; // ∈ HookPoints v1.0
  readonly condition: Condition;
  readonly effects: readonly EffectDescriptor[]; // fx ⊆ EFX v1.1.1
  readonly declaredSlots: readonly SlotDecl[];
  readonly slotWrites?: readonly SlotWrite[];
  readonly vocabVersions: { readonly efx: string; readonly hooks: string };
}

export class ContributionRefusal extends Error {
  constructor(readonly contribution: string, readonly rule: string, detail: string) {
    super(`Contribution refused [${rule}] "${contribution}": ${detail}`);
    this.name = 'ContributionRefusal';
  }
}

const RESETS = ['never', 'per-turn', 'per-round', 'per-game'];

function conditionPaths(c: Condition): string[] {
  if ('terms' in c) return c.terms.flatMap(conditionPaths);
  if (c.op === 'always') return [];
  return [c.path];
}

/** GX-20/GX-21 static — refusal NAMES every defect (HK-4 MR3-side validation). */
export function validateContribution(c: RuleContribution): void {
  const defects: string[] = [];
  if (!c.id) defects.push('missing contribution id');
  const hasKind = typeof c.bearer?.kind === 'string';
  const hasRel = typeof c.bearer?.relationType === 'string';
  if (hasKind === hasRel) defects.push('bearer must be EXACTLY one of kind | relationType');
  if (c.vocabVersions?.efx !== EFX_GOVERNED.version) {
    defects.push(`unknown EFX version "${c.vocabVersions?.efx}" (supported: ${EFX_GOVERNED.version})`);
  }
  if (c.vocabVersions?.hooks !== HOOK_POINTS_V1.version) {
    defects.push(`unknown HookPoints version "${c.vocabVersions?.hooks}" (supported: ${HOOK_POINTS_V1.version})`);
  }
  if (!HOOK_POINTS_V1.members.includes(c.trigger)) {
    defects.push(`trigger "${c.trigger}" ∉ HookPoints v1.0`);
  }
  for (const d of c.effects ?? []) {
    if (!EFX_GOVERNED.members.includes(d.fx)) defects.push(`effect fx ∉ EFX: "${d.fx}"`);
    for (const [k, v] of Object.entries(d)) {
      if (typeof v === 'number' && !Number.isFinite(v)) defects.push(`effect ${d.fx}: arg "${k}" non-finite`);
    }
  }
  const slotNames = new Set((c.declaredSlots ?? []).map((s) => s.name));
  for (const s of c.declaredSlots ?? []) {
    if (!RESETS.includes(s.reset)) defects.push(`slot "${s.name}": unknown reset class "${s.reset}"`);
  }
  for (const w of c.slotWrites ?? []) {
    if (!slotNames.has(w.slot)) defects.push(`slotWrite targets undeclared slot "${w.slot}" (R-18 at load)`);
  }
  // GX-21 static: condition paths ⊆ event.* ∪ slots.<declared>
  for (const p of conditionPaths(c.condition ?? { op: 'always' })) {
    const [head, second] = p.split('.');
    const ok = head === 'event' || (head === 'slots' && second !== undefined && slotNames.has(second));
    if (!ok) defects.push(`condition path "${p}" reaches beyond event.*/declared slots (R-16 bounded meta)`);
  }
  if (defects.length > 0) throw new ContributionRefusal(c.id || '<unnamed>', 'GX-20/R-15/R-16/HK-4', defects.join(' · '));
}

/** UniqueDef — catalog artifact (RE-7): COMPOSES its kind; never a code subclass. */
export interface UniqueDef {
  readonly id: string;
  readonly kindRef: string;
  readonly params: JsonObject;
  readonly art?: string;
  readonly contributions: readonly RuleContribution[];
}

export function validateUniqueDef(u: UniqueDef, kindExists: (name: string) => boolean): void {
  const defects: string[] = [];
  if (!u.id) defects.push('missing UniqueDef id');
  if (!kindExists(u.kindRef)) defects.push(`kindRef "${u.kindRef}" is not an admitted kind`);
  if (defects.length > 0) throw new ContributionRefusal(u.id || '<unnamed>', 'RE-7', defects.join(' · '));
  for (const c of u.contributions ?? []) validateContribution(c);
}
