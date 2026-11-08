/**
 * library/wire — the F5 intent set + THE WEAVE (I-29 lands here): turn:end = pass +
 * on-round-wrap dispatch + TFX tick + slot resets + venture lapse. Turn-disciplined.
 * Traces: S-1 · I-29/I-33..I-39. K7-F5 D1 (DF5-1/I-37): with the library wired the
 * weave OWNS the pass — 'turn:pass' is superseded on the record (kernel door).
 */
import type { Intent, JsonObject, State } from '../kernel/types.js';
import type { EngineCore } from '../kernel/core.js';
import { onTurnRule as onTurn } from '../kernel/discipline.js';
import { EffectEngine } from '../play/effects.js';
import { hookHk5BeforeSeatAdvance, openGatedWindows } from '../play/windows.js';
import { passSeat, turnRow } from '../play/turn.js';
import type { RuleRegistry } from '../rules/registry.js';
import { resetSlots } from '../rules/slots.js';
import type { SlotDecl } from '../rules/contributions.js';
import { post, transfer, ledgerLoaded } from './ledger.js';
import { spawnVenture, routeVenture, lapseExpired, debtsOf, setDebts } from './ventures.js';
import type { VentureSpec } from './ventures.js';
import { assignCrew, workCrew, hireCrew, buyEquipment, drawFromPool, releaseCrew, sellEquipment, attachGear, detachGear, playHandCard } from './outfit.js';
import { attachTimedFx } from './timedfx.js';
import type { TimedFx } from './timedfx.js';
import { tickTimedEffects } from './timedfx.js';
import { reckon } from './closing.js';

function declMap(registry: RuleRegistry): ReadonlyMap<string, readonly SlotDecl[]> {
  return new Map(registry.list().map((c) => [c.id, c.declaredSlots]));
}

// ── K7-F5 D2 (DF5-2): the F5 intent DOORS validate like HK-4 — a brick value (non-finite
// charge, unknown seat, malformed debt) is refused at the Guard, typed and unlogged,
// never committed to state. Mirrors the pack/contribution door discipline. ──
const seatIds = (state: State): readonly string[] =>
  ((state['seats'] as readonly { id: string }[]) ?? []).map((s) => s.id);
// K7-F5 r2 NEW-1: a door that PERSISTS a caller object refuses UNKNOWN KEYS — an
// unvalidated field (e.g. sneak: NaN) would ride the stored row into state and break
// hashability (GX-3). Refusal-not-repair: refuse, never silently strip.
const unknownKeys = (raw: object, allowed: readonly string[]): string | null => {
  const extra = Object.keys(raw).filter((k) => !allowed.includes(k));
  return extra.length > 0 ? `unknown field(s) ${extra.map((k) => `"${k}"`).join(', ')} — refused, not stripped` : null;
};
const finiteNonNeg = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const finitePos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const posInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1;
const isSeat = (v: unknown, state: State): boolean => typeof v === 'string' && seatIds(state).includes(v);

// ── The door shapes as TABLES of named field rules. A shape names its allowed keys and the
// refusal for a non-object; its rules run in order and the FIRST refusal wins (same order,
// same words as the door has always had). A rule answers null (holds) or its refusal. ──
type Fields = Readonly<Record<string, unknown>>;
type FieldRule = (fields: Fields, state: State) => string | null;
interface Shape {
  readonly name: string;
  readonly notObject: string;
  readonly keys: readonly string[];
  readonly rules: readonly FieldRule[];
}

const needText = (owner: string, field: string): FieldRule => (f) =>
  typeof f[field] === 'string' && (f[field] as string).length > 0 ? null : `${owner}.${field} must be a non-empty string`;
const needSeat = (owner: string, field: string): FieldRule => (f, state) =>
  isSeat(f[field], state) ? null : `${owner}.${field} unknown seat "${String(f[field])}"`;
const maySeat = (owner: string, field: string): FieldRule => (f, state) =>
  f[field] === undefined || isSeat(f[field], state) ? null : `${owner}.${field} unknown seat "${String(f[field])}"`;
const needPosInt = (owner: string, field: string, noun: string): FieldRule => (f) =>
  posInt(f[field]) ? null : `${owner}.${field} must be a positive integer${noun}, got ${String(f[field])}`;
const needPositive = (owner: string, field: string): FieldRule => (f) =>
  finitePos(f[field]) ? null : `${owner}.${field} must be finite and positive, got ${String(f[field])}`;
const needNonNeg = (owner: string, field: string): FieldRule => (f) =>
  finiteNonNeg(f[field]) ? null : `${owner}.${field} must be a finite non-negative number, got ${String(f[field])}`;
const needString = (owner: string, field: string): FieldRule => (f) =>
  typeof f[field] === 'string' ? null : `${owner}.${field} must be a string`;
const needScope: FieldRule = (f, state) =>
  f['scope'] === 'table' || isSeat(f['scope'], state) ? null : `tfx.scope must be 'table' or a seat id, got "${String(f['scope'])}"`;
const needList = (field: string, minLength: number, refusal: string, item: Shape): FieldRule => (f, state) => {
  const list = f[field];
  return !Array.isArray(list) || list.length < minLength ? refusal : firstRefusal(list, item, state);
};

function checkShape(value: unknown, shape: Shape, state: State): string | null {
  if (typeof value !== 'object' || value === null) return shape.notObject;
  const extra = unknownKeys(value, shape.keys);
  if (extra) return `${shape.name}: ${extra}`;
  for (const rule of shape.rules) {
    const refusal = rule(value as Fields, state);
    if (refusal !== null) return refusal;
  }
  return null;
}

function firstRefusal(items: readonly unknown[], shape: Shape, state: State): string | null {
  for (const item of items) {
    const refusal = checkShape(item, shape, state);
    if (refusal !== null) return refusal;
  }
  return null;
}

const PORTION_SHAPE: Shape = {
  name: 'portion',
  notObject: 'portion must be an object',
  keys: ['party', 'task', 'work'],
  rules: [needText('portion', 'task'), needPosInt('portion', 'work', ''), maySeat('portion', 'party')],
};
const PAYOFF_SHAPE: Shape = {
  name: 'payoff',
  notObject: 'payoff must be an object',
  keys: ['to', 'amount'],
  rules: [needSeat('payoff', 'to'), needPositive('payoff', 'amount')],
};
const SPEC_SHAPE: Shape = {
  name: 'spec',
  notObject: 'spec required',
  keys: ['id', 'initiator', 'portions', 'deadline', 'payoffs'],
  rules: [
    needText('spec', 'id'),
    needSeat('spec', 'initiator'),
    needList('portions', 1, 'spec.portions must carry at least one portion', PORTION_SHAPE),
    needPosInt('spec', 'deadline', ' round'),
    needList('payoffs', 0, 'spec.payoffs must be an array', PAYOFF_SHAPE),
  ],
};
const DEBT_SHAPE: Shape = {
  name: 'debt',
  notObject: 'debt must be an object',
  keys: ['debtor', 'creditor', 'amount', 'due'],
  rules: [needSeat('debt', 'debtor'), needSeat('debt', 'creditor'), needPositive('debt', 'amount'), needPosInt('debt', 'due', ' round')],
};
const TFX_SHAPE: Shape = {
  name: 'tfx',
  notObject: 'tfx required',
  keys: ['id', 'scope', 'charge', 'remaining', 'source'],
  rules: [needText('tfx', 'id'), needScope, needNonNeg('tfx', 'charge'), needPosInt('tfx', 'remaining', ''), needString('tfx', 'source')],
};

const verdictOf = (refusal: string | null): true | string => refusal ?? true;

function checkSpecShape(state: State, raw: unknown): true | string {
  return verdictOf(checkShape(raw, SPEC_SHAPE, state));
}

function checkDebtsShape(state: State, raw: unknown): true | string {
  if (!Array.isArray(raw)) return 'debts[] required';
  return verdictOf(firstRefusal(raw, DEBT_SHAPE, state));
}

function checkTfxShape(state: State, raw: unknown): true | string {
  return verdictOf(checkShape(raw, TFX_SHAPE, state));
}

// ── upkeep — overhead as an ARGUMENT (I-35, AX-3); settles debts due this round (GX-25).
// K7-F5 D5 (DF5-5/I-39): where the Ledger is NOT loaded, both legs fall back to
// EffectEngine (exactly as tickTimedEffects and reckon do) — never a silent skip. ──
type Debt = ReturnType<typeof debtsOf>[number];

function checkUpkeepArgs(_state: State, intent: Intent): true | string {
  const overhead = intent.args['overhead'];
  return overhead === undefined || finiteNonNeg(overhead)
    ? true
    : `overhead must be a finite non-negative number, got ${String(overhead)}`;
}

function chargeOverhead(state: JsonObject, seat: string, overhead: number): JsonObject {
  return ledgerLoaded(state)
    ? post(state, [{ account: seat, delta: -overhead }, { account: 'bank', delta: overhead }], `wages:${seat}`)
    : EffectEngine.apply(state, { fx: 'levy', scope: seat, amount: overhead }, { windowDepth: 0 });
}

function settleDebt(state: JsonObject, d: Debt): JsonObject {
  return ledgerLoaded(state)
    ? transfer(state, d.debtor, d.creditor, d.amount, `settle:${d.debtor}→${d.creditor}`)
    : EffectEngine.apply(
        EffectEngine.apply(state, { fx: 'levy', scope: d.debtor, amount: d.amount }, { windowDepth: 0 }),
        { fx: 'pay', to: d.creditor, amount: d.amount },
        { windowDepth: 0 }
      );
}

function applyUpkeep(state: State, intent: Intent): JsonObject {
  let next: JsonObject = state as JsonObject;
  const overhead = intent.args['overhead'] as number | undefined;
  if (overhead !== undefined && overhead > 0) next = chargeOverhead(next, intent.seat, overhead);
  const round = turnRow(next).round;
  const isDue = (d: Debt): boolean => d.debtor === intent.seat && d.due <= round;
  const due = debtsOf(next).filter(isDue);
  for (const d of due) next = settleDebt(next, d);
  if (due.length > 0) next = setDebts(next, debtsOf(next).filter((d) => !isDue(d)) as never);
  return next;
}

function wireUpkeep(core: EngineCore): void {
  core.registerIntent('upkeep', { args: checkUpkeepArgs, rules: [onTurn] }, applyUpkeep);
}

// ── venture:spawn · venture:route — the venture doors (I-34, I-36). ──
function checkRouteArgs(state: State, intent: Intent): true | string {
  if (typeof intent.args['venture'] !== 'string') return 'venture (string) required';
  if (typeof intent.args['to'] !== 'string' || !seatIds(state).includes(intent.args['to'] as string)) {
    return `route target unknown seat "${String(intent.args['to'])}"`;
  }
  return checkDebtsShape(state, intent.args['debts']);
}

function wireVentureIntents(core: EngineCore): void {
  core.registerIntent(
    'venture:spawn',
    { args: (s, i) => checkSpecShape(s, i.args['spec']), rules: [onTurn] },
    (state, intent) => spawnVenture(state, intent.args['spec'] as unknown as VentureSpec)
  );

  core.registerIntent(
    'venture:route',
    { args: checkRouteArgs, rules: [onTurn] },
    (state, intent) =>
      routeVenture(state, intent.args['venture'] as string, intent.args['to'] as string, intent.args['debts'] as never)
  );
}

// ── crew:assign · crew:work · crew:hire · crew:release. ──
// A16 POOLS (I-137): hire · buy — module-native intents (the venture:spawn door);
// cost > 0 levies through EffectEngine (R-24), cost 0 posts nothing (GBC-63).
function levyCost(seat: string, bought: { next: JsonObject; cost: number }): JsonObject {
  const { next, cost } = bought;
  return cost > 0 ? EffectEngine.apply(next as never, { fx: 'levy', scope: seat, amount: cost }, { windowDepth: 0 }) : next;
}

function wireCrewIntents(core: EngineCore): void {
  core.registerIntent(
    'crew:assign',
    {
      args: (_s, i) =>
        typeof i.args['crew'] === 'string' && typeof i.args['venture'] === 'string' && Number.isInteger(i.args['portion'])
          ? true
          : 'crew/venture/portion required',
      rules: [onTurn],
    },
    (state, intent) => assignCrew(state, intent.args['crew'] as string, intent.args['venture'] as string, intent.args['portion'] as number)
  );

  core.registerIntent(
    'crew:work',
    { args: (_s, i) => (typeof i.args['crew'] === 'string' ? true : 'crew required'), rules: [onTurn] },
    (state, intent) => workCrew(state, intent.args['crew'] as string)
  );

  core.registerIntent(
    'crew:hire',
    { args: () => true, rules: [onTurn] },
    (state, intent) => levyCost(intent.seat, hireCrew(state, intent.seat))
  );

  core.registerIntent(
    'crew:release',
    { args: (_s, i) => (typeof i.args['crew'] === 'string' ? true : 'crew required'), rules: [onTurn] },
    (state, intent) => releaseCrew(state, intent.seat, String(intent.args['crew'])) as never, // I-157: to the pool BOTTOM; no levy (economics deferred)
  );
}

// ── outfit:sell · hand:play · crew:attach · crew:detach · outfit:buy. ──
function wireOutfitIntents(core: EngineCore): void {
  core.registerIntent(
    'outfit:sell',
    { args: (_s, i) => (typeof i.args['ref'] === 'string' ? true : 'ref required'), rules: [onTurn] },
    (state, intent) => sellEquipment(state, intent.seat, String(intent.args['ref'])) as never, // I-157: to the pool BOTTOM
  );

  core.registerIntent(
    'hand:play',
    { args: (_s, i) => (typeof i.args['card'] === 'string' ? true : 'card required'), rules: [onTurn] },
    (state, intent) => playHandCard(state, intent.seat, String(intent.args['card'])) as never, // C-1d (I-171): hand → revealed → the pool's bottom · NO LEVY, deliberate (economics deferred — I-138/I-140; K7-V minor closed)
  );

  core.registerIntent(
    'crew:attach',
    { args: (_s, i) => (typeof i.args['crew'] === 'string' && typeof i.args['ref'] === 'string' ? true : 'crew + ref required'), rules: [onTurn] },
    (state, intent) => attachGear(state, intent.seat, String(intent.args['crew']), String(intent.args['ref'])) as never, // G-C2 (I-170): the equipment-under socket · NO LEVY, deliberate (I-138/I-140)
  );

  core.registerIntent(
    'crew:detach',
    { args: (_s, i) => (typeof i.args['crew'] === 'string' ? true : 'crew required'), rules: [onTurn] },
    (state, intent) => detachGear(state, intent.seat, String(intent.args['crew'])) as never, // G-C2 (I-170): back to the rack · NO LEVY, deliberate (I-138/I-140)
  );

  core.registerIntent(
    'outfit:buy',
    { args: () => true, rules: [onTurn] },
    (state, intent) => levyCost(intent.seat, buyEquipment(state, intent.seat))
  );
}

// ── pool:draw — O-3 (I-139): the card pools' draw door — bbb · networking → the seat's
// discard (the family presents it in-play). GX-30 on empty; onTurn holds the door. ──
function wirePoolDraw(core: EngineCore): void {
  core.registerIntent(
    'pool:draw',
    { args: (_s, i) => (i.args['pool'] === 'bbb' || i.args['pool'] === 'networking' ? true : "pool must be 'bbb' | 'networking'"), rules: [onTurn] },
    (state, intent) => drawFromPool(state, intent.seat, intent.args['pool'] as 'bbb' | 'networking')
  );
}

// ── tfx:attach — the timed-effect door. ──
function wireTfxAttach(core: EngineCore): void {
  core.registerIntent(
    'tfx:attach',
    { args: (s, i) => checkTfxShape(s, i.args['tfx']), rules: [onTurn] },
    (state, intent) => attachTimedFx(state, intent.args['tfx'] as unknown as TimedFx)
  );
}

// ── turn:end — THE WEAVE (I-29): both-check advance, then at a wrap: on-round-wrap
// through the F4 bus → TFX tick → venture lapse → per-round resets. Per-turn resets always. ──
function weaveApplier(registry: RuleRegistry): (state: State) => JsonObject {
  return (state) => {
    hookHk5BeforeSeatAdvance(state);
    const before = turnRow(state).round;
    let next: JsonObject = passSeat(state);
    const after = turnRow(next as State);
    if (after.round > before) {
      next = registry.dispatch(next as State, 'on-round-wrap', { hook: 'on-round-wrap', round: before }, { windowDepth: 0 });
      next = tickTimedEffects(next as State);
      next = lapseExpired(next as State, after.round);
      next = resetSlots(next as State, 'per-round', declMap(registry));
    }
    return resetSlots(next as State, 'per-turn', declMap(registry));
  };
}

function wireTurnEnd(core: EngineCore, registry: RuleRegistry): void {
  core.registerIntent(
    'turn:end',
    {
      args: () => true,
      rules: [
        onTurn,
        (state: State, _i: Intent) =>
          openGatedWindows(state).length === 0
            ? true
            : ({ rule: 'GX-8/R-6', detail: `open gated window blocks advance: ${openGatedWindows(state).map((w) => w.id).join(', ')}` } as const),
      ],
    },
    weaveApplier(registry)
  );
}

// ── closing:reckon — the Closing Round's reckoning. ──
function wireClosing(core: EngineCore): void {
  core.registerIntent(
    'closing:reckon',
    { args: () => true, rules: [onTurn] },
    (state) => reckon(state)
  );
}

// K7-F5 D1 (DF5-1/I-37): with the library wired, THE WEAVE OWNS THE PASS. A raw
// 'turn:pass' would wrap the round with no TFX tick, no lapse, no on-round-wrap
// dispatch, no resets — a legal logged intent falsifying GX-29. Supersede it on the
// record: the Guard rule refuses (typed, unlogged); the applier throw is defense in
// depth on the divergence-injection path.
function wireWeaveSupersession(core: EngineCore): void {
  core.supersedeIntent(
    'turn:pass',
    'I-37 / K7-F5 D1: the weave owns the pass once the library is wired (GX-29)',
    {
      args: () => true,
      rules: [
        () =>
          ({
            rule: 'I-37/GX-29',
            detail: "superseded by the weave: submit 'turn:end' — a raw pass would bypass TFX tick, venture lapse, on-round-wrap dispatch, and slot resets",
          }) as const,
      ],
    },
    () => {
      throw new Error("turn:pass superseded by the weave (I-37) — the rule leg refuses first; reaching this applier is itself a defect");
    }
  );
}

export function wireLibrary(core: EngineCore, registry: RuleRegistry): void {
  wireUpkeep(core);
  wireVentureIntents(core);
  wireCrewIntents(core);
  wireOutfitIntents(core);
  wirePoolDraw(core);
  wireTfxAttach(core);
  wireTurnEnd(core, registry);
  wireClosing(core);
  wireWeaveSupersession(core);
}
