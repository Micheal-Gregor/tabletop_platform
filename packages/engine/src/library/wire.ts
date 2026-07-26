/**
 * library/wire — the F5 intent set + THE WEAVE (I-29 lands here): turn:end = pass +
 * on-round-wrap dispatch + TFX tick + slot resets + venture lapse. Turn-disciplined.
 * Traces: S-1 · I-29/I-33..I-36. Kernel 'turn:pass' stays the primitive (I-33).
 */
import type { Intent, JsonObject, State } from '../kernel/types.js';
import type { EngineCore } from '../kernel/core.js';
import { onTurnRule as onTurn } from '../kernel/discipline.js';
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

export function wireLibrary(core: EngineCore, registry: RuleRegistry): void {
  // upkeep — overhead as an ARGUMENT (I-35, AX-3); settles debts due this round (GX-25).
  core.registerIntent(
    'upkeep',
    { args: (_s, i) => (i.args['overhead'] === undefined || typeof i.args['overhead'] === 'number' ? true : 'overhead must be a number'), rules: [onTurn] },
    (state, intent) => {
      let next: JsonObject = state as JsonObject;
      const overhead = intent.args['overhead'] as number | undefined;
      if (overhead !== undefined && overhead > 0) {
        next = post(next, [{ account: intent.seat, delta: -overhead }, { account: 'bank', delta: overhead }], `wages:${intent.seat}`);
      }
      const round = (turnRow(next).round);
      const due = debtsOf(next).filter((d) => d.debtor === intent.seat && d.due <= round);
      for (const d of due) {
        next = ledgerLoaded(next)
          ? transfer(next, d.debtor, d.creditor, d.amount, `settle:${d.debtor}→${d.creditor}`)
          : next;
      }
      if (due.length > 0) {
        next = setDebts(next, debtsOf(next).filter((d) => !(d.debtor === intent.seat && d.due <= round)) as never);
      }
      return next;
    }
  );

  core.registerIntent(
    'venture:spawn',
    { args: (_s, i) => (typeof i.args['spec'] === 'object' && i.args['spec'] !== null ? true : 'spec required'), rules: [onTurn] },
    (state, intent) => spawnVenture(state, intent.args['spec'] as unknown as VentureSpec)
  );

  core.registerIntent(
    'venture:route',
    {
      args: (_s, i) =>
        typeof i.args['venture'] === 'string' && typeof i.args['to'] === 'string' && Array.isArray(i.args['debts'])
          ? true
          : 'venture/to/debts[] required',
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
    { args: (_s, i) => (typeof i.args['tfx'] === 'object' && i.args['tfx'] !== null ? true : 'tfx required'), rules: [onTurn] },
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
}
