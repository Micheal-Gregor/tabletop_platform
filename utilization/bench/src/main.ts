/**
 * THE PLAYTEST BENCH — W-ENV Option A (owner-ruled): local-first browser adapter.
 * The core is FIXED: this file composes public surfaces + the named MINIMAL fixture (W-ENV record) — LockstepController
 * (S-2), project/renderTable (S-6 reads), emit (S-6 intents), the Placeholder Skin
 * (D-1: frames before assets). Both universes bind through this ONE path (ODG-p2).
 * A production HALT is a surrender to the human: banner + row export, never repair.
 */
import type { EngineCore, GameRow, PackRef, RuleRegistry as RegistryT } from '@tabletop/engine';
import { LockstepController, RuleRegistry, rebuild } from '@tabletop/engine';
import {
  bindPlaceholder,
  displayClock,
  emit,
  KIND_CONTRACTS,
  project,
  renderTable,
} from '@tabletop/presentation';
import { BOTY_PACK, BOTY_REF, botyGenesis, botyGcContract, botyJob, botyRecession, botySubcontract, wireBoty } from '../../../packs/boty/src/index.js';
import { MIN_REF, MIN_SEATS, minimalGenesis, wireMinimal } from '../../../packages/engine/tests/f5-fixture.js';
import { autosave, clearAutosave, exportEnvelope, importEnvelope, loadAutosave, PersistHalt } from './persist.js';

type Universe = 'MINIMAL' | 'BOTY';

interface Table {
  readonly universe: Universe;
  readonly ref: PackRef;
  readonly controller: LockstepController;
  readonly genesis: typeof minimalGenesis;
  readonly wire: (c: EngineCore) => void;
  viewSeat: string;
}

const CLIENT = 'bench-local'; // PC-4 at this target: ONE local client holds every seat
const bound = bindPlaceholder([...KIND_CONTRACTS['Card']!, ...KIND_CONTRACTS['Die']!, ...KIND_CONTRACTS['Piece']!, ...KIND_CONTRACTS['Surface']!]);

function makeWire(universe: Universe): { ref: PackRef; genesis: typeof minimalGenesis; wire: (c: EngineCore) => void; seats: readonly string[] } {
  if (universe === 'BOTY') {
    const wire = (c: EngineCore) => wireBoty(new RuleRegistry() as RegistryT)(c);
    return { ref: BOTY_REF, genesis: botyGenesis, wire, seats: BOTY_PACK.seats.map((s) => s.id) };
  }
  const wire = (c: EngineCore) => wireMinimal(new RuleRegistry() as RegistryT)(c);
  return { ref: MIN_REF, genesis: minimalGenesis, wire, seats: MIN_SEATS.map((s) => s.id) };
}

function freshTable(universe: Universe, seed: string): Table {
  const { ref, genesis, wire, seats } = makeWire(universe);
  const controller = LockstepController.host(ref, seats.map((id) => ({ id })), seed, genesis, wire);
  for (const s of seats) controller.join(CLIENT, s); // the host holds every seat (K7-proven path)
  return { universe, ref, controller, genesis, wire, viewSeat: seats[0]! };
}

function resumeTable(universe: Universe, row: GameRow): Table {
  const { ref, genesis, wire } = makeWire(universe);
  const controller = LockstepController.resume(row, ref, genesis, wire); // SUP-1 legs enforced
  for (const s of row.seats) controller.join(CLIENT, s.id);
  return { universe, ref, controller, genesis, wire, viewSeat: row.seats[0]!.id };
}

// ── the app ──
let table: Table | null = null;
const $ = (id: string): HTMLElement => document.getElementById(id)!;

function halt(e: unknown): void {
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  $('halt').textContent = `⛔ HALT — ${msg}`;
  ($('halt') as HTMLElement).style.display = 'block';
}

function status(msg: string): void {
  $('status').textContent = msg;
}

function render(): void {
  if (!table) return;
  // the ONE S-6 read path: project() over a row-rebuilt core — the bench never touches state raw
  const view = project(stateOf(table), table.viewSeat);
  $('board').innerHTML = renderTable(view, bound);
  const clock = displayClock(view);
  status(`${table.universe} · round ${clock.round} · ${clock.activeSeat} to act · ${clock.status} · viewing as ${table.viewSeat}`);
  // autosave every logged move (PC-1): the row IS the save
  autosave(localStorage, table.controller.row(), table.controller.stateHash());
  const opts = view.windows.filter((w) => w.status === 'open' && w.options);
  $('windows').innerHTML = opts
    .map((w) => (w.options ?? []).map((o, i) => `<button data-win="${w.id}" data-opt="${i}">${w.kind}: ${o}</button>`).join(''))
    .join('');
}

// The controller exposes no raw state by design; the bench reads through a projection of
// a REPLAYED core when needed. For rendering we rebuild from the row (log-as-truth) —
// cheap at bench scale and keeps this adapter honest: the row is the ONLY thing we hold.
function stateOf(t: Table) {
  return rebuild(t.controller.row(), t.genesis, t.wire).getState();
}

function submitVerb(verb: string, args: Record<string, unknown> = {}): void {
  if (!table) return;
  try {
    const view = project(stateOf(table), table.viewSeat);
    const active = view.seats[view.turn.seatIdx]!.id;
    const intent = emit(verb, active, args); // S-6: verbs → intents, nothing else
    const res = table.controller.submit(CLIENT, intent as never); // JSON-safe by the R-23 deep-clone door
    if ('refused' in res) {
      status(`refused [${(res as { rule: string }).rule}]: ${(res as { detail: string }).detail}`);
      return; // a refusal is not a halt — the game breathes, the state never moved
    }
    render();
  } catch (e) {
    // A DOMAIN REFUSAL is not an incident — the game breathes, the state never moved.
    // Only an UNKNOWN failure is a halt (surrendered, exportable, never repaired).
    if (e instanceof Error && /Refusal|Breach|Violation/.test(e.name)) {
      status(`refused: ${e.message}`);
    } else {
      halt(e);
    }
  }
}

function boot(): void {
  $('halt').style.display = 'none';
  try {
    const saved = loadAutosave(localStorage); // PersistHalt on corrupt (SC-4)
    if (saved) {
      const universe = saved.row.packRef.id === 'boty' ? 'BOTY' : 'MINIMAL';
      table = resumeTable(universe, saved.row);
      // PC-9 hash-lineage: the resumed replay MUST reproduce the stored hash
      if (table.controller.stateHash() !== saved.finalHash) {
        table = null;
        throw new PersistHalt(`hash lineage broken: replay ${'≠'} stored — the save is flagged, not loaded`);
      }
      status(`resumed ${universe} from autosave (replay verified)`);
    } else {
      table = freshTable('BOTY', 'maple-hollow');
    }
    render();
  } catch (e) {
    halt(e);
  }
}

function wireUi(): void {
  $('new-boty').onclick = () => { clearAutosave(localStorage); table = freshTable('BOTY', 'maple-hollow'); $('halt').style.display = 'none'; render(); };
  $('new-minimal').onclick = () => { clearAutosave(localStorage); table = freshTable('MINIMAL', 'sigma-7'); $('halt').style.display = 'none'; render(); };
  $('upkeep').onclick = () => submitVerb('upkeep', ($('overhead') as HTMLInputElement).value ? { overhead: Number(($('overhead') as HTMLInputElement).value) } : {});
  $('draw').onclick = () => {
    if (!table) return;
    const view = project(stateOf(table), table.viewSeat);
    submitVerb('draw', { deck: view.seats[view.turn.seatIdx]!.id });
  };
  $('end-turn').onclick = () => submitVerb('end-turn');
  $('reckon').onclick = () => submitVerb('reckon');
  $('spawn-job').onclick = () => submitVerb('spawn-venture', { spec: table?.universe === 'BOTY' ? botyJob() : { id: 'J1', initiator: 'A', portions: [{ party: 'A', task: 'α', work: 1 }], deadline: 2, payoffs: [{ to: 'A', amount: 4 }] } });
  $('spawn-gc').onclick = () => submitVerb('spawn-venture', { spec: botyGcContract() });
  $('route-gc').onclick = () => submitVerb('route-venture', botySubcontract().routeArgs as never);
  $('recession').onclick = () => submitVerb('attach-effect', { tfx: botyRecession() });
  $('assign').onclick = () => submitVerb('assign-crew', { crew: ($('crew') as HTMLInputElement).value, venture: ($('venture') as HTMLInputElement).value, portion: Number(($('portion') as HTMLInputElement).value) });
  $('work').onclick = () => submitVerb('work', { crew: ($('crew') as HTMLInputElement).value });
  $('windows').onclick = (ev) => {
    const b = ev.target as HTMLElement;
    if (b.dataset['win']) submitVerb('decide', { window: b.dataset['win'], option: Number(b.dataset['opt']) });
  };
  $('seat').onchange = () => { if (table) { table.viewSeat = ($('seat') as HTMLSelectElement).value || table.viewSeat; render(); } };
  $('export').onclick = () => {
    if (!table) return;
    const blob = new Blob([exportEnvelope(table.controller.row(), table.controller.stateHash())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tabletop-${table.universe.toLowerCase()}-row.json`;
    a.click();
  };
  ($('import') as HTMLInputElement).onchange = async (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const env = importEnvelope(await f.text());
      const universe: Universe = env.row.packRef.id === 'boty' ? 'BOTY' : 'MINIMAL';
      const t = resumeTable(universe, env.row);
      if (t.controller.stateHash() !== env.finalHash) throw new PersistHalt('imported row hash lineage broken — refused whole');
      table = t;
      $('halt').style.display = 'none';
      render();
    } catch (e) {
      halt(e);
    }
  };
}

// expose a tiny drill surface for the K8 target harness (W-OBS): read-only + boot
(window as unknown as Record<string, unknown>)['__BENCH__'] = {
  boot,
  rowHash: () => table?.controller.stateHash() ?? null,
  moveCount: () => table?.controller.row().moves.length ?? null,
  submitVerb,
};

wireUi();
boot();
