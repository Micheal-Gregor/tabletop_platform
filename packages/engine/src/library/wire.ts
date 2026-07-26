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
import { assignCrew, workCrew } from './outfit.js';
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

function checkSpecShape(state: State, raw: unknown): true | string {
  if (typeof raw !== 'object' || raw === null) return 'spec required';
  const spec = raw as Partial<VentureSpec>;
  const extraSpec = unknownKeys(spec, ['id', 'initiator', 'portions', 'deadline', 'payoffs']);
  if (extraSpec) return `spec: ${extraSpec}`;
  if (typeof spec.id !== 'string' || spec.id.length === 0) return 'spec.id must be a non-empty string';
  const seats = seatIds(state);
  if (typeof spec.initiator !== 'string' || !seats.includes(spec.initiator)) return `spec.initiator unknown seat "${String(spec.initiator)}"`;
  if (!Array.isArray(spec.portions) || spec.portions.length < 1) return 'spec.portions must carry at least one portion';
  for (const p of spec.portions) {
    if (typeof p !== 'object' || p === null) return 'portion must be an object';
    const extraP = unknownKeys(p, ['party', 'task', 'work']);
    if (extraP) return `portion: ${extraP}`;
    if (typeof p.task !== 'string' || p.task.length === 0) return 'portion.task must be a non-empty string';
    if (!posInt(p.work)) return `portion.work must be a positive integer, got ${String(p.work)}`;
    if (p.party !== undefined && (typeof p.party !== 'string' || !seats.includes(p.party))) return `portion.party unknown seat "${String(p.party)}"`;
  }
  if (!posInt(spec.deadline)) return `spec.deadline must be a positive integer round, got ${String(spec.deadline)}`;
  if (!Array.isArray(spec.payoffs)) return 'spec.payoffs must be an array';
  for (const pay of spec.payoffs) {
    if (typeof pay !== 'object' || pay === null) return 'payoff must be an object';
    const extraPay = unknownKeys(pay, ['to', 'amount']);
    if (extraPay) return `payoff: ${extraPay}`;
    if (typeof pay.to !== 'string' || !seats.includes(pay.to)) return `payoff.to unknown seat "${String(pay.to)}"`;
    if (!finitePos(pay.amount)) return `payoff.amount must be finite and positive, got ${String(pay.amount)}`;
  }
  return true;
}

function checkDebtsShape(state: State, raw: unknown): true | string {
  if (!Array.isArray(raw)) return 'debts[] required';
  const seats = seatIds(state);
  for (const d of raw) {
    if (typeof d !== 'object' || d === null) return 'debt must be an object';
    const extraD = unknownKeys(d, ['debtor', 'creditor', 'amount', 'due']);
    if (extraD) return `debt: ${extraD}`;
    const debt = d as { debtor?: unknown; creditor?: unknown; amount?: unknown; due?: unknown };
    if (typeof debt.debtor !== 'string' || !seats.includes(debt.debtor)) return `debt.debtor unknown seat "${String(debt.debtor)}"`;
    if (typeof debt.creditor !== 'string' || !seats.includes(debt.creditor)) return `debt.creditor unknown seat "${String(debt.creditor)}"`;
    if (!finitePos(debt.amount)) return `debt.amount must be finite and positive, got ${String(debt.amount)}`;
    if (!posInt(debt.due)) return `debt.due must be a positive integer round, got ${String(debt.due)}`;
  }
  return true;
}

function checkTfxShape(state: State, raw: unknown): true | string {
  if (typeof raw !== 'object' || raw === null) return 'tfx required';
  const tfx = raw as Partial<TimedFx>;
  const extraT = unknownKeys(tfx, ['id', 'scope', 'charge', 'remaining', 'source']);
  if (extraT) return `tfx: ${extraT}`;
  if (typeof tfx.id !== 'string' || tfx.id.length === 0) return 'tfx.id must be a non-empty string';
  if (typeof tfx.scope !== 'string' || (tfx.scope !== 'table' && !seatIds(state).includes(tfx.scope))) {
    return `tfx.scope must be 'table' or a seat id, got "${String(tfx.scope)}"`;
  }
  if (!finiteNonNeg(tfx.charge)) return `tfx.charge must be a finite non-negative number, got ${String(tfx.charge)}`;
  if (!posInt(tfx.remaining)) return `tfx.remaining must be a positive integer, got ${String(tfx.remaining)}`;
  if (typeof tfx.source !== 'string') return 'tfx.source must be a string';
  return true;
}

export function wireLibrary(core: EngineCore, registry: RuleRegistry): void {
  // upkeep — overhead as an ARGUMENT (I-35, AX-3); settles debts due this round (GX-25).
  // K7-F5 D5 (DF5-5/I-39): where the Ledger is NOT loaded, both legs fall back to
  // EffectEngine (exactly as tickTimedEffects and reckon do) — never a silent skip.
  core.registerIntent(
    'upkeep',
    {
      args: (_s, i) =>
        i.args['overhead'] === undefined || finiteNonNeg(i.args['overhead'])
          ? true
          : `overhead must be a finite non-negative number, got ${String(i.args['overhead'])}`,
      rules: [onTurn],
    },
    (state, intent) => {
      let next: JsonObject = state as JsonObject;
      const overhead = intent.args['overhead'] as number | undefined;
      if (overhead !== undefined && overhead > 0) {
        next = ledgerLoaded(next)
          ? post(next, [{ account: intent.seat, delta: -overhead }, { account: 'bank', delta: overhead }], `wages:${intent.seat}`)
          : EffectEngine.apply(next, { fx: 'levy', scope: intent.seat, amount: overhead }, { windowDepth: 0 });
      }
      const round = (turnRow(next).round);
      const due = debtsOf(next).filter((d) => d.debtor === intent.seat && d.due <= round);
      for (const d of due) {
        next = ledgerLoaded(next)
          ? transfer(next, d.debtor, d.creditor, d.amount, `settle:${d.debtor}→${d.creditor}`)
          : EffectEngine.apply(
              EffectEngine.apply(next, { fx: 'levy', scope: d.debtor, amount: d.amount }, { windowDepth: 0 }),
              { fx: 'pay', to: d.creditor, amount: d.amount },
              { windowDepth: 0 }
            );
      }
      if (due.length > 0) {
        next = setDebts(next, debtsOf(next).filter((d) => !(d.debtor === intent.seat && d.due <= round)) as never);
      }
      return next;
    }
  );

  core.registerIntent(
    'venture:spawn',
    { args: (s, i) => checkSpecShape(s, i.args['spec']), rules: [onTurn] },
    (state, intent) => spawnVenture(state, intent.args['spec'] as unknown as VentureSpec)
  );

  core.registerIntent(
    'venture:route',
    {
      args: (s, i) => {
        if (typeof i.args['venture'] !== 'string') return 'venture (string) required';
        if (typeof i.args['to'] !== 'string' || !seatIds(s).includes(i.args['to'] as string)) {
          return `route target unknown seat "${String(i.args['to'])}"`;
        }
        return checkDebtsShape(s, i.args['debts']);
      },
      rules: [onTurn],
    },
    (state, intent) =>
      routeVenture(state, intent.args['venture'] as string, intent.args['to'] as string, intent.args['debts'] as never)
  );

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
    'tfx:attach',
    { args: (s, i) => checkTfxShape(s, i.args['tfx']), rules: [onTurn] },
    (state, intent) => attachTimedFx(state, intent.args['tfx'] as unknown as TimedFx)
  );

  // turn:end — THE WEAVE (I-29): both-check advance, then at a wrap: on-round-wrap
  // through the F4 bus → TFX tick → venture lapse → per-round resets. Per-turn resets always.
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
    (state) => {
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
    }
  );

  core.registerIntent(
    'closing:reckon',
    { args: () => true, rules: [onTurn] },
    (state) => reckon(state)
  );

  // K7-F5 D1 (DF5-1/I-37): with the library wired, THE WEAVE OWNS THE PASS. A raw
  // 'turn:pass' would wrap the round with no TFX tick, no lapse, no on-round-wrap
  // dispatch, no resets — a legal logged intent falsifying GX-29. Supersede it on the
  // record: the Guard rule refuses (typed, unlogged); the applier throw is defense in
  // depth on the divergence-injection path.
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
