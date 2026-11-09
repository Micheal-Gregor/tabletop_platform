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
  if (!isFxObject(d)) {
    defects.push(`${where}: effect must be an object with a string "fx", got ${JSON.stringify(d)}`); // EXT3-A
    return;
  }
  if (!EFX_GOVERNED.members.includes(d.fx)) {
    defects.push(`${where}: fx ∉ EFX: "${d.fx}"`);
    return;
  }
  checkFiniteArgs(d, where, defects);
  if (d.fx === 'open_window') checkWindowEffect(d, where, defects);
}

/** An object carrying a string "fx" — the one shape every descriptor must have before it is read further. */
function isFxObject(d: unknown): boolean {
  return d !== null && typeof d === 'object' && typeof (d as { fx?: unknown }).fx === 'string';
}

/** Every numeric argument of a known effect is finite. */
function checkFiniteArgs(d: EffectDescriptor, where: string, defects: string[]): void {
  for (const [k, v] of Object.entries(d)) {
    if (typeof v === 'number' && !Number.isFinite(v)) defects.push(`${where} · ${d.fx}: arg "${k}" non-finite`);
  }
}

/** An open_window effect: not gated by content, options an array with a decision path, auto in range, each option sound. */
function checkWindowEffect(d: EffectDescriptor, where: string, defects: string[]): void {
  if (d['gated'] !== undefined) defects.push(`${where} · open_window: "gated" is engine-reserved (I-19)`);
  const options = d['options'];
  if (!Array.isArray(options)) {
    defects.push(`${where} · open_window: "options" must be an array`);
    return;
  }
  if (options.length < 1) defects.push(`${where} · open_window: zero options — no path to decision (GX-8)`);
  checkWindowAuto(d, options.length, where, defects);
  options.forEach((opt, i) => checkWindowOption(opt, `${where} · open_window option ${i}`, defects));
}

/** The auto index is an integer inside the option list (a zero-option window is named separately). */
function checkWindowAuto(d: EffectDescriptor, optionCount: number, where: string, defects: string[]): void {
  const auto = d['auto'] ?? 0;
  if (!Number.isInteger(auto) || (auto as number) < 0 || (auto as number) >= Math.max(optionCount, 1)) {
    defects.push(`${where} · open_window: "auto" index ${JSON.stringify(d['auto'])} out of range`);
  }
}

/** One window option: a string label and an array of inner effects, each sound in turn. */
function checkWindowOption(opt: unknown, at: string, defects: string[]): void {
  const o = opt as { label?: unknown; fx?: unknown };
  if (typeof o?.label !== 'string') defects.push(`${at}: "label" must be a string`);
  if (o?.fx !== undefined && !Array.isArray(o.fx)) {
    defects.push(`${at}: "fx" must be an array`);
    return;
  }
  for (const inner of (o?.fx as EffectDescriptor[] | undefined) ?? []) checkOptionEffect(inner, at, defects);
}

/** An effect inside a window option: a nested open_window is statically dead (depth-1 law); any other is checked whole. */
function checkOptionEffect(inner: EffectDescriptor, at: string, defects: string[]): void {
  if (inner?.fx === 'open_window') {
    defects.push(`${at}: contains open_window — statically dead under the depth-1 law`);
    return;
  }
  checkEffectShape(inner, at, defects);
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

/**
 * GX-20/GX-21 static — refusal NAMES every defect (HK-4 MR3-side validation).
 *
 * One named check per part of the contribution, each appending its own defects; they run in
 * the order the contribution is read: id, bearer, versions, trigger, effects, declared slots,
 * slot writes, condition. Every defect is gathered before the one refusal is thrown.
 */
export function validateContribution(c: RuleContribution): void {
  const defects: string[] = [];
  checkContributionId(c, defects);
  checkBearer(c, defects);
  checkVocabVersions(c, defects);
  checkTrigger(c, defects);
  checkEffects(c, defects);
  const slotNames = declaredSlotNames(c);
  checkDeclaredSlots(c, defects);
  checkSlotWrites(c, slotNames, defects);
  checkCondition(c, slotNames, defects);
  refuseIfDefects(c.id, 'GX-20/R-15/R-16/HK-4', defects);
}

/** The one refusal for a gathered list: none when nothing was found, else every defect named, in order. */
function refuseIfDefects(id: string, rule: string, defects: readonly string[]): void {
  if (defects.length > 0) throw new ContributionRefusal(id || '<unnamed>', rule, defects.join(' · '));
}

function checkContributionId(c: RuleContribution, defects: string[]): void {
  if (!c.id) defects.push('missing contribution id');
  if (RESERVED.includes(c.id)) defects.push(`contribution id "${c.id}" is reserved (prototype-chain key)`);
}

/** The bearer is EXACTLY one of kind | relationType, and a relation bearer names one of the five relations. */
function checkBearer(c: RuleContribution, defects: string[]): void {
  const hasKind = typeof c.bearer?.kind === 'string';
  const hasRel = typeof c.bearer?.relationType === 'string';
  if (hasKind === hasRel) defects.push('bearer must be EXACTLY one of kind | relationType');
  if (hasRel && !RELATION_TYPES.includes(c.bearer.relationType as (typeof RELATION_TYPES)[number])) {
    defects.push(`bearer.relationType "${c.bearer.relationType}" is not one of the five relations (EXT3-D — a dead rule is a defect)`);
  }
}

/** Both vocabulary versions the contribution names are the ones this loader knows — EFX first, then HookPoints. */
function checkVocabVersions(c: RuleContribution, defects: string[]): void {
  if (c.vocabVersions?.efx !== EFX_GOVERNED.version) {
    defects.push(`unknown EFX version "${c.vocabVersions?.efx}" (supported: ${EFX_GOVERNED.version})`);
  }
  if (c.vocabVersions?.hooks !== HOOK_POINTS_V1.version) {
    defects.push(`unknown HookPoints version "${c.vocabVersions?.hooks}" (supported: ${HOOK_POINTS_V1.version})`);
  }
}

function checkTrigger(c: RuleContribution, defects: string[]): void {
  if (!HOOK_POINTS_V1.members.includes(c.trigger)) {
    defects.push(`trigger "${c.trigger}" ∉ HookPoints v1.0`);
  }
}

/** The effects are an array, each one inside EFX and sound in shape (recursive). */
function checkEffects(c: RuleContribution, defects: string[]): void {
  if (c.effects !== undefined && !Array.isArray(c.effects)) {
    defects.push('"effects" must be an array'); // K7-F4 D7: shapes NAMED, never raw TypeErrors
    return;
  }
  for (const d of c.effects ?? []) checkEffectShape(d, `effect`, defects); // K7-F4 D1: recursive
}

/** The slots the contribution declares — an array, or nothing when it is not one (its own check names that). */
function declaredSlotList(c: RuleContribution): readonly SlotDecl[] {
  return Array.isArray(c.declaredSlots) ? c.declaredSlots : [];
}

function declaredSlotNames(c: RuleContribution): ReadonlySet<string> {
  return new Set(declaredSlotList(c).map((s) => s.name));
}

/** The declared slots are an array, each with a known reset policy and a name that is not a prototype-chain key. */
function checkDeclaredSlots(c: RuleContribution, defects: string[]): void {
  if (c.declaredSlots !== undefined && !Array.isArray(c.declaredSlots)) {
    defects.push('"declaredSlots" must be an array');
  }
  for (const s of declaredSlotList(c)) {
    if (!RESETS.includes(s.reset)) defects.push(`slot "${s.name}": unknown reset class "${s.reset}"`);
    if (RESERVED.includes(s.name)) defects.push(`slot "${s.name}" is reserved (prototype-chain key)`);
  }
}

/** Every slot write targets a declared slot (R-18 at load). */
function checkSlotWrites(c: RuleContribution, slotNames: ReadonlySet<string>, defects: string[]): void {
  for (const w of c.slotWrites ?? []) {
    if (!slotNames.has(w.slot)) defects.push(`slotWrite targets undeclared slot "${w.slot}" (R-18 at load)`);
  }
}

/** The condition's SHAPE is named first (K7-F4 D7); only a sound shape has its paths read (GX-21 static). */
function checkCondition(c: RuleContribution, slotNames: ReadonlySet<string>, defects: string[]): void {
  const condition: Condition = c.condition ?? { op: 'always' };
  if (!validConditionShape(condition, defects)) return;
  for (const p of conditionPaths(condition)) {
    if (!pathIsBounded(p, slotNames)) defects.push(`condition path "${p}" reaches beyond event.*/declared slots (R-16 bounded meta)`);
  }
}

/** GX-21 static: a condition path stays inside event.* ∪ slots.<declared>. */
function pathIsBounded(path: string, slotNames: ReadonlySet<string>): boolean {
  const [head, second] = path.split('.');
  return head === 'event' || (head === 'slots' && second !== undefined && slotNames.has(second));
}

/** UniqueDef — catalog artifact (RE-7): COMPOSES its kind; never a code subclass. */
export interface UniqueDef {
  readonly id: string;
  readonly kindRef: string;
  readonly params: JsonObject;
  readonly art?: string;
  readonly contributions: readonly RuleContribution[];
}

/**
 * A UniqueDef is refused in three stages, each stage naming every defect it finds: its own
 * fields (id, kindRef, each contribution an object), then the duplicate contribution ids,
 * then each contribution through validateContribution.
 */
export function validateUniqueDef(u: UniqueDef, kindExists: (name: string) => boolean): void {
  const fieldDefects: string[] = [];
  checkUniqueDefId(u, fieldDefects);
  checkKindRef(u, kindExists, fieldDefects);
  checkContributionElements(u, fieldDefects);
  refuseIfDefects(u.id, 'RE-7', fieldDefects);
  const idDefects: string[] = [];
  checkDuplicateContributionIds(u, idDefects);
  refuseIfDefects(u.id, 'RE-7', idDefects);
  for (const c of u.contributions ?? []) validateContribution(c);
}

function checkUniqueDefId(u: UniqueDef, defects: string[]): void {
  if (!u.id) defects.push('missing UniqueDef id');
}

/** The kind the UniqueDef composes is an admitted one (the caller says which kinds exist). */
function checkKindRef(u: UniqueDef, kindExists: (name: string) => boolean, defects: string[]): void {
  if (!kindExists(u.kindRef)) defects.push(`kindRef "${u.kindRef}" is not an admitted kind`);
}

function checkContributionElements(u: UniqueDef, defects: string[]): void {
  for (const c of u.contributions ?? []) {
    if (c === null || typeof c !== 'object') {
      defects.push(`contribution element must be an object, got ${JSON.stringify(c)} (3B residual)`);
    }
  }
}

function checkDuplicateContributionIds(u: UniqueDef, defects: string[]): void {
  const ids = (u.contributions ?? []).map((c) => c.id);
  if (new Set(ids).size !== ids.length) defects.push('duplicate contribution ids in UniqueDef (EXT3-C — register-parity)');
}
