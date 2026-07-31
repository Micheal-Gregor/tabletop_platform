/**
 * M17 PatternLibrary — the preset catalog (ODG-3 RESOLVED: Option 3, owner-ruled
 * 2026-07-30, registered I-41). A preset is DATA: each catalog entry pairs a THIN
 * BUILDER (emit-data-only — no engine call, no state touch) with its defaults and its
 * BOTY-inventory doc reference. Fragment behavior, exercised through the ENGINE's
 * doors, is what V-4 pins (VK-8).
 *
 * The catalog (BOTY inventory §2/§5 · stage-2b §6):
 *   6 VNT  — project · civic · routed · incident · expansion · job (PRJ/CVC/RTD/INC/EXP/Job)
 *   3 RTM  — subcontract-debt · commission-now · deferred-referral ("three routing models
 *            for a job that isn't your trade", inventory §5.2)
 *   9 IWN  — threat · court · damages · settle · poach · mayor · referral · routing ·
 *            estate (the nine pending* queues, inventory §2)
 *   2 TFX  — modifier (outfit scope) · global (table scope) (MOD/GLB → TFX(scope))
 *   CLOSING defaults — trailing-first · AR force-collect · AP SURVIVES ("outrunning
 *            vendors is legitimate", inventory §3)
 *
 * Tier law (GX-34): patterns imports the ENGINE (downward) for types and the sealed EFX
 * name-set ONLY; it never imports presentation or content.
 */
import { EFX_V1_1_1 } from '@tabletop/engine';

export class PatternRefusal extends Error {
  constructor(readonly preset: string, detail: string) {
    super(`Pattern refused [GX-33] "${preset}": ${detail}`);
    this.name = 'PatternRefusal';
  }
}

const posInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1;
const finitePos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

// ── VNT family: builders emit VentureSpec-shaped DATA (the engine's venture:spawn door
// re-validates; builders refuse early so a bad pack never even builds). ──

export interface VntParams {
  readonly id: string;
  readonly initiator: string;
  readonly deadline: number;
}

export interface VntFragment {
  readonly id: string;
  readonly initiator: string;
  readonly portions: readonly { readonly party?: string; readonly task: string; readonly work: number }[];
  readonly deadline: number;
  readonly payoffs: readonly { readonly to: string; readonly amount: number }[];
}

function vnt(preset: string, p: VntParams, portions: VntFragment['portions'], payoffs: VntFragment['payoffs']): VntFragment {
  if (!nonEmpty(p.id)) throw new PatternRefusal(preset, 'id must be a non-empty string');
  if (!nonEmpty(p.initiator)) throw new PatternRefusal(preset, 'initiator must be a non-empty string');
  if (!posInt(p.deadline)) throw new PatternRefusal(preset, `deadline must be a positive integer, got ${String(p.deadline)}`);
  if (portions.length < 1) throw new PatternRefusal(preset, 'at least one portion');
  for (const portion of portions) {
    if (!nonEmpty(portion.task)) throw new PatternRefusal(preset, 'portion.task must be a non-empty string');
    if (!posInt(portion.work)) throw new PatternRefusal(preset, `portion.work must be a positive integer, got ${String(portion.work)}`);
  }
  for (const pay of payoffs) {
    if (!nonEmpty(pay.to)) throw new PatternRefusal(preset, 'payoff.to must be a non-empty string');
    if (!finitePos(pay.amount)) throw new PatternRefusal(preset, `payoff.amount must be finite positive, got ${String(pay.amount)}`);
  }
  return { id: p.id, initiator: p.initiator, portions, deadline: p.deadline, payoffs };
}

/** RC-A′ degenerate: single portion, self-assigned (BOTY Job). */
export function buildJob(p: VntParams & { readonly task: string; readonly work?: number; readonly amount: number }): VntFragment {
  return vnt('vnt:job', p, [{ party: p.initiator, task: p.task, work: p.work ?? 1 }], [{ to: p.initiator, amount: p.amount }]);
}

/** Phased marquee contract (BOTY Project): sequential phases, capital payoff. */
export function buildProject(p: VntParams & { readonly phases: readonly { readonly task: string; readonly work: number; readonly party?: string }[]; readonly amount: number }): VntFragment {
  if (!Array.isArray(p.phases) || p.phases.length < 2) throw new PatternRefusal('vnt:project', 'a project carries at least two phases');
  return vnt('vnt:project', p, p.phases.map((ph) => ({ ...(ph.party !== undefined ? { party: ph.party } : {}), task: ph.task, work: ph.work })), [{ to: p.initiator, amount: p.amount }]);
}

/** Town-wide (BOTY Civic): one portion PER SEAT, each seat paid on completion. */
export function buildCivic(p: VntParams & { readonly seatIds: readonly string[]; readonly task: string; readonly work?: number; readonly amountPerSeat: number }): VntFragment {
  if (!Array.isArray(p.seatIds) || p.seatIds.length < 1) throw new PatternRefusal('vnt:civic', 'seatIds required');
  return vnt(
    'vnt:civic', p,
    p.seatIds.map((s) => ({ party: s, task: p.task, work: p.work ?? 1 })),
    p.seatIds.map((s) => ({ to: s, amount: p.amountPerSeat }))
  );
}

/** 3-trade GC contract (BOTY Routed): exactly three UNASSIGNED portions — routing needed. */
export function buildRouted(p: VntParams & { readonly tasks: readonly [string, string, string]; readonly work?: number; readonly amount: number }): VntFragment {
  if (!Array.isArray(p.tasks) || p.tasks.length !== 3) throw new PatternRefusal('vnt:routed', 'exactly three trade tasks');
  return vnt('vnt:routed', p, p.tasks.map((t) => ({ task: t, work: p.work ?? 1 })), [{ to: p.initiator, amount: p.amount }]);
}

/** Light civic (BOTY Incident): one portion, short fuse, small payoff. */
export function buildIncident(p: VntParams & { readonly task: string; readonly amount: number }): VntFragment {
  return vnt('vnt:incident', p, [{ party: p.initiator, task: p.task, work: 1 }], [{ to: p.initiator, amount: p.amount }]);
}

/** Deferred capital project (BOTY Expansion): long deadline, heavier work, capital payoff. */
export function buildExpansion(p: VntParams & { readonly task: string; readonly work: number; readonly amount: number }): VntFragment {
  return vnt('vnt:expansion', p, [{ party: p.initiator, task: p.task, work: p.work }], [{ to: p.initiator, amount: p.amount }]);
}

// ── RTM family: routing-model configs — DATA consumed by content to compose the logged
// venture:route intent (+ any upfront transfer as EFX pay data). No new intent, no new
// vocabulary (I-43): the engine path stays venture:route + EFX. ──

export type RoutingModel = 'subcontract-debt' | 'commission-now' | 'deferred-referral';
export const ROUTING_MODELS: readonly RoutingModel[] = Object.freeze(['subcontract-debt', 'commission-now', 'deferred-referral']);

export interface RoutingFragment {
  readonly model: RoutingModel;
  /** venture:route intent args, verbatim (I-36: the decision as ARGUMENTS). */
  readonly routeArgs: { readonly venture: string; readonly to: string; readonly debts: readonly { readonly debtor: string; readonly creditor: string; readonly amount: number; readonly due: number }[] };
  /** commission-now only: an immediate EFX pay descriptor (applied by content THROUGH the engine). */
  readonly upfront?: { readonly fx: 'pay'; readonly to: string; readonly from: string; readonly amount: number };
  /** whether the decision passes through a gated window first (I-36/I-38). */
  readonly windowed: boolean;
}

export function buildRouting(
  model: RoutingModel,
  p: { readonly venture: string; readonly from: string; readonly to: string; readonly amount?: number; readonly due?: number }
): RoutingFragment {
  if (!ROUTING_MODELS.includes(model)) throw new PatternRefusal('rtm', `unknown routing model "${String(model)}"`);
  if (!nonEmpty(p.venture) || !nonEmpty(p.from) || !nonEmpty(p.to)) throw new PatternRefusal(`rtm:${model}`, 'venture/from/to required');
  if (model === 'subcontract-debt') {
    if (!finitePos(p.amount) || !posInt(p.due)) throw new PatternRefusal('rtm:subcontract-debt', 'amount (finite positive) and due (positive integer) required');
    return { model, routeArgs: { venture: p.venture, to: p.to, debts: [{ debtor: p.from, creditor: p.to, amount: p.amount, due: p.due }] }, windowed: true };
  }
  if (model === 'commission-now') {
    if (!finitePos(p.amount)) throw new PatternRefusal('rtm:commission-now', 'amount (finite positive) required');
    return { model, routeArgs: { venture: p.venture, to: p.to, debts: [] }, upfront: { fx: 'pay', to: p.to, from: p.from, amount: p.amount }, windowed: false };
  }
  return { model, routeArgs: { venture: p.venture, to: p.to, debts: [] }, windowed: true };
}

// ── IWN family: the nine interaction-window kinds — open_window descriptor DATA.
// Default options are empty-fx (I-36: the window records the choice; effectuation is a
// subsequent logged intent). Option fx, when supplied, must stay ⊆ EFX (GX-33). ──

export const IWN_KINDS = Object.freeze([
  'threat', 'court', 'damages', 'settle', 'poach', 'mayor', 'referral', 'routing', 'estate',
] as const);
export type IwnKind = (typeof IWN_KINDS)[number];

export interface WindowFragment {
  readonly fx: 'open_window';
  readonly kind: IwnKind;
  readonly decider: string;
  readonly options: readonly { readonly label: string; readonly fx: readonly { readonly fx: string }[] }[];
  readonly auto: number;
}

const EFX_NAMES: readonly string[] = EFX_V1_1_1 as readonly string[]; // the sealed name list

export function buildWindow(
  kind: IwnKind,
  p: { readonly decider: string; readonly options?: readonly { readonly label: string; readonly fx: readonly { readonly fx: string }[] }[]; readonly auto?: number }
): WindowFragment {
  if (!IWN_KINDS.includes(kind)) throw new PatternRefusal('iwn', `unknown window kind "${String(kind)}" — the nine are ${IWN_KINDS.join('/')}`);
  if (!nonEmpty(p.decider)) throw new PatternRefusal(`iwn:${kind}`, 'decider required');
  const options = p.options ?? [{ label: 'accept', fx: [] }, { label: 'decline', fx: [] }];
  if (options.length < 1) throw new PatternRefusal(`iwn:${kind}`, 'at least one option (undecidable window)');
  for (const o of options) {
    for (const eff of o.fx) {
      if (!EFX_NAMES.includes(eff.fx)) throw new PatternRefusal(`iwn:${kind}`, `option fx "${String(eff.fx)}" ∉ EFX v1.1.1 — presets never extend the vocabulary`);
      if (eff.fx === 'open_window') throw new PatternRefusal(`iwn:${kind}`, 'nested open_window is statically dead (depth-1 law)');
    }
  }
  const auto = p.auto ?? 0;
  if (!Number.isInteger(auto) || auto < 0 || auto >= options.length) throw new PatternRefusal(`iwn:${kind}`, `auto ${String(auto)} out of range`);
  return { fx: 'open_window', kind, decider: p.decider, options, auto };
}

// ── TFX family: MOD/GLB → TimedFx row DATA (scope is the whole difference). ──

export interface TfxFragment {
  readonly id: string;
  readonly scope: string;
  readonly charge: number;
  readonly remaining: number;
  readonly source: string;
}

function checkTfx(preset: string, id: string, charge: number, rounds: number, source: string): void {
  if (!nonEmpty(id)) throw new PatternRefusal(preset, 'id required');
  if (typeof charge !== 'number' || !Number.isFinite(charge) || charge < 0) throw new PatternRefusal(preset, `charge must be finite non-negative, got ${String(charge)}`);
  if (!posInt(rounds)) throw new PatternRefusal(preset, `rounds must be a positive integer, got ${String(rounds)}`);
  if (!nonEmpty(source)) throw new PatternRefusal(preset, 'source required');
}

/** BOTY Modifier (insurance/marketing/accountant/…): outfit-scoped standing effect. */
export function buildModifier(p: { readonly id: string; readonly outfit: string; readonly charge: number; readonly rounds: number; readonly source: string }): TfxFragment {
  checkTfx('tfx:modifier', p.id, p.charge, p.rounds, p.source);
  if (!nonEmpty(p.outfit)) throw new PatternRefusal('tfx:modifier', 'outfit required');
  return { id: p.id, scope: p.outfit, charge: p.charge, remaining: p.rounds, source: p.source };
}

/** BOTY GlobalEffect (levy/boom/recession/union): table-scoped standing effect. */
export function buildGlobal(p: { readonly id: string; readonly charge: number; readonly rounds: number; readonly source: string }): TfxFragment {
  checkTfx('tfx:global', p.id, p.charge, p.rounds, p.source);
  return { id: p.id, scope: 'table', charge: p.charge, remaining: p.rounds, source: p.source };
}

// ── Closing/settlement defaults (data; M15 reckon implements the first two; AP-survives
// is the F5 status quo — reckon never touches debts; inventory: "outrunning vendors is
// legitimate; borrowed money can't win" — the LEDGER still shows it). ──

export const CLOSING_DEFAULTS = Object.freeze({
  order: 'trailing-first',
  receivables: 'force-collect',
  payablesSurvive: true,
  doc: 'BOTY inventory §3 closeBooks · stage-2b S10 · GX-30',
} as const);

// ── THE CATALOG (GX-33): id → {family, doc, build}. Counts are law: 6/3/9/2 + closing. ──

export interface CatalogEntry {
  readonly family: 'VNT' | 'RTM' | 'IWN' | 'TFX' | 'CLOSING';
  readonly doc: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly build: (...args: any[]) => unknown;
}

export const CATALOG: Readonly<Record<string, CatalogEntry>> = Object.freeze({
  'vnt:project': { family: 'VNT', doc: 'inventory §2 Project (PRJ) — phased marquee contract', build: buildProject },
  'vnt:civic': { family: 'VNT', doc: 'inventory §2 Civic (CVC) — town-wide, one portion per seat', build: buildCivic },
  'vnt:routed': { family: 'VNT', doc: 'inventory §2 Routed (RTD) — 3-trade GC contract', build: buildRouted },
  'vnt:incident': { family: 'VNT', doc: 'inventory §2 Incident (INC) — light civic', build: buildIncident },
  'vnt:expansion': { family: 'VNT', doc: 'inventory §2 Expansion (EXP) — deferred capital project', build: buildExpansion },
  'vnt:job': { family: 'VNT', doc: 'inventory §2 Job / stage-2b RC-A′ single-portion degenerate', build: buildJob },
  'rtm:subcontract-debt': { family: 'RTM', doc: 'inventory §5.2 subcontract-with-AP', build: (p: Parameters<typeof buildRouting>[1]) => buildRouting('subcontract-debt', p) },
  'rtm:commission-now': { family: 'RTM', doc: 'inventory §5.2 immediate-commission referral', build: (p: Parameters<typeof buildRouting>[1]) => buildRouting('commission-now', p) },
  'rtm:deferred-referral': { family: 'RTM', doc: 'inventory §5.2 deferred pendingReferral', build: (p: Parameters<typeof buildRouting>[1]) => buildRouting('deferred-referral', p) },
  'iwn:threat': { family: 'IWN', doc: 'inventory §2 pendingThreat', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('threat', p) },
  'iwn:court': { family: 'IWN', doc: 'inventory §2 pendingCourt', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('court', p) },
  'iwn:damages': { family: 'IWN', doc: 'inventory §2 pendingDamages', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('damages', p) },
  'iwn:settle': { family: 'IWN', doc: 'inventory §2 pendingSettle', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('settle', p) },
  'iwn:poach': { family: 'IWN', doc: 'inventory §2 pendingPoach', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('poach', p) },
  'iwn:mayor': { family: 'IWN', doc: 'inventory §2 pendingMayor', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('mayor', p) },
  'iwn:referral': { family: 'IWN', doc: 'inventory §2 pendingReferral', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('referral', p) },
  'iwn:routing': { family: 'IWN', doc: 'inventory §2 pendingRouting / stage-2b S2', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('routing', p) },
  'iwn:estate': { family: 'IWN', doc: 'inventory §2 estate claims', build: (p: Parameters<typeof buildWindow>[1]) => buildWindow('estate', p) },
  'tfx:modifier': { family: 'TFX', doc: 'inventory §2 Modifier (MOD) — outfit-scoped standing service', build: buildModifier },
  'tfx:global': { family: 'TFX', doc: 'inventory §2 GlobalEffect (GLB) — table-scoped', build: buildGlobal },
  'closing:defaults': { family: 'CLOSING', doc: CLOSING_DEFAULTS.doc, build: () => CLOSING_DEFAULTS },
});
