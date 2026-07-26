/**
 * MR3 ContributionLoader — validation NAMES defects (R-15 / HK-4 MR3 side) + the
 * bounded-meta static leg (R-16) + UniqueDef (RE-7: is-a in the catalog, has-a here).
 * Traces: S3 F4·MR3 ← S2 MR3. Axioms: GX-20, GX-21 (static), I-30.
 */
import type { JsonObject, JsonValue } from '../kernel/types.js';
import type { EffectDescriptor } from '../play/effects.js';
import { EFX_GOVERNED, HOOK_POINTS_V1 } from './vocabularies.js';
import { RELATION_TYPES } from '../ontology/relations.js';

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
/** K7-F4 D5: reserved names would key the prototype chain — refused at validation. */
const RESERVED = ['__proto__', 'constructor', 'prototype'];

/**
 * K7-F4 D1 closure: RECURSIVE effect-shape validation — the same brick classes the F2
 * pack door refuses (zero-option windows, nested open_window, nested unknown fx,
 * out-of-range auto) are refused at the CONTRIBUTION door too. Seat/deck refs stay
 * pack-context (I-30); STRUCTURE is validated here.
 */
function checkEffectShape(d: EffectDescriptor, where: string, defects: string[]): void {
  if (d === null || typeof d !== 'object' || typeof (d as { fx?: unknown }).fx !== 'string') {
    defects.push(`${where}: effect must be an object with a string "fx", got ${JSON.stringify(d)}`); // EXT3-A
    return;
  }
  if (!EFX_GOVERNED.members.includes(d.fx)) {
    defects.push(`${where}: fx ∉ EFX: "${d.fx}"`);
    return;
  }
  for (const [k, v] of Object.entries(d)) {
    if (typeof v === 'number' && !Number.isFinite(v)) defects.push(`${where} · ${d.fx}: arg "${k}" non-finite`);
  }
  if (d.fx === 'open_window') {
    if (d['gated'] !== undefined) defects.push(`${where} · open_window: "gated" is engine-reserved (I-19)`);
    const options = d['options'];
    if (!Array.isArray(options)) {
      defects.push(`${where} · open_window: "options" must be an array`);
      return;
    }
    if (options.length < 1) defects.push(`${where} · open_window: zero options — no path to decision (GX-8)`);
    const auto = d['auto'] ?? 0;
    if (!Number.isInteger(auto) || (auto as number) < 0 || (auto as number) >= Math.max(options.length, 1)) {
      defects.push(`${where} · open_window: "auto" index ${JSON.stringify(d['auto'])} out of range`);
    }
    options.forEach((opt, i) => {
      const o = opt as { label?: unknown; fx?: unknown };
      if (typeof o?.label !== 'string') defects.push(`${where} · open_window option ${i}: "label" must be a string`);
      if (o?.fx !== undefined && !Array.isArray(o.fx)) {
        defects.push(`${where} · open_window option ${i}: "fx" must be an array`);
        return;
      }
      for (const inner of (o?.fx as EffectDescriptor[] | undefined) ?? []) {
        if (inner?.fx === 'open_window') {
          defects.push(`${where} · open_window option ${i}: contains open_window — statically dead under the depth-1 law`);
          continue;
        }
        checkEffectShape(inner, `${where} · open_window option ${i}`, defects);
      }
    });
  }
}

function conditionPaths(c: Condition): string[] {
  if ('terms' in c) return c.terms.flatMap(conditionPaths);
  if (c.op === 'always') return [];
  return [c.path];
}

/** K7-F4 D7: malformed condition shapes are NAMED defects, never raw crashes. */
function validConditionShape(c: Condition, defects: string[]): boolean {
  if (c === null || typeof c !== 'object' || typeof (c as { op?: unknown }).op !== 'string') {
    defects.push('condition must be an object with a string "op"');
    return false;
  }
  if (c.op === 'always') return true;
  if (c.op === 'and' || c.op === 'or') {
    if (!Array.isArray((c as { terms?: unknown }).terms)) {
      defects.push(`condition ${c.op}: "terms" must be an array`);
      return false;
    }
    return (c as { terms: readonly Condition[] }).terms.every((t) => validConditionShape(t, defects));
  }
  if (['eq', 'ne', 'gte', 'lte'].includes(c.op)) {
    if (typeof (c as { path?: unknown }).path !== 'string') {
      defects.push(`condition ${c.op}: "path" must be a string`);
      return false;
    }
    return true;
  }
  defects.push(`condition op "${(c as { op: string }).op}" unknown`);
  return false;
}

/** GX-20/GX-21 static — refusal NAMES every defect (HK-4 MR3-side validation). */
export function validateContribution(c: RuleContribution): void {
  const defects: string[] = [];
  if (!c.id) defects.push('missing contribution id');
  if (RESERVED.includes(c.id)) defects.push(`contribution id "${c.id}" is reserved (prototype-chain key)`);
  const hasKind = typeof c.bearer?.kind === 'string';
  const hasRel = typeof c.bearer?.relationType === 'string';
  if (hasKind === hasRel) defects.push('bearer must be EXACTLY one of kind | relationType');
  if (hasRel && !RELATION_TYPES.includes(c.bearer.relationType as (typeof RELATION_TYPES)[number])) {
    defects.push(`bearer.relationType "${c.bearer.relationType}" is not one of the five relations (EXT3-D — a dead rule is a defect)`);
  }
  if (c.vocabVersions?.efx !== EFX_GOVERNED.version) {
    defects.push(`unknown EFX version "${c.vocabVersions?.efx}" (supported: ${EFX_GOVERNED.version})`);
  }
  if (c.vocabVersions?.hooks !== HOOK_POINTS_V1.version) {
    defects.push(`unknown HookPoints version "${c.vocabVersions?.hooks}" (supported: ${HOOK_POINTS_V1.version})`);
  }
  if (!HOOK_POINTS_V1.members.includes(c.trigger)) {
    defects.push(`trigger "${c.trigger}" ∉ HookPoints v1.0`);
  }
  if (c.effects !== undefined && !Array.isArray(c.effects)) {
    defects.push('"effects" must be an array'); // K7-F4 D7: shapes NAMED, never raw TypeErrors
  } else {
    for (const d of c.effects ?? []) checkEffectShape(d, `effect`, defects); // K7-F4 D1: recursive
  }
  if (c.declaredSlots !== undefined && !Array.isArray(c.declaredSlots)) {
    defects.push('"declaredSlots" must be an array');
  }
  const slotNames = new Set((Array.isArray(c.declaredSlots) ? c.declaredSlots : []).map((s) => s.name));
  for (const s of Array.isArray(c.declaredSlots) ? c.declaredSlots : []) {
    if (!RESETS.includes(s.reset)) defects.push(`slot "${s.name}": unknown reset class "${s.reset}"`);
    if (RESERVED.includes(s.name)) defects.push(`slot "${s.name}" is reserved (prototype-chain key)`);
  }
  for (const w of c.slotWrites ?? []) {
    if (!slotNames.has(w.slot)) defects.push(`slotWrite targets undeclared slot "${w.slot}" (R-18 at load)`);
  }
  // K7-F4 D7: condition SHAPE named before path analysis
  const shapeOk = validConditionShape(c.condition ?? { op: 'always' }, defects);
  // GX-21 static: condition paths ⊆ event.* ∪ slots.<declared>
  for (const p of shapeOk ? conditionPaths(c.condition ?? { op: 'always' }) : []) {
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
  for (const c of u.contributions ?? []) {
    if (c === null || typeof c !== 'object') {
      defects.push(`contribution element must be an object, got ${JSON.stringify(c)} (3B residual)`);
    }
  }
  if (defects.length > 0) throw new ContributionRefusal(u.id || '<unnamed>', 'RE-7', defects.join(' · '));
  const ids = (u.contributions ?? []).map((c) => c.id);
  if (new Set(ids).size !== ids.length) defects.push('duplicate contribution ids in UniqueDef (EXT3-C — register-parity)');
  if (defects.length > 0) throw new ContributionRefusal(u.id || '<unnamed>', 'RE-7', defects.join(' · '));
  for (const c of u.contributions ?? []) validateContribution(c);
}
