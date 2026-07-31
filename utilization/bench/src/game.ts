/**
 * BENCH v4 — THE SPATIAL GAME. BOTY played by touching the table: click the deck to
 * draw (card-flip flourish + self-removing ♪ caption, D-1/D-2), click a crew token
 * then a portion slot to assign, click an assigned crew to work, click a prompt card
 * to decide, pan the 2.5D camera between the table and the shops.
 * Bench tier: composes CERTIFIED surfaces only — layout contracts position everything,
 * project() is the sole read (S-6), emit() the sole verb path, the controller the sole
 * write. No new law; the layout skeleton is geometry, the engine is truth.
 */
import type { EngineCore, RuleRegistry as RegistryT } from '@tabletop/engine';
import { LockstepController, RuleRegistry, rebuild } from '@tabletop/engine';
import type { Camera, LayoutDef, SeatView, World } from '@tabletop/presentation';
import {
  BOARD_PARENT, CARD_BACK_PARENT, CARD_PARENT, TABLE_PARENT,
  beginFlourish, cameraViewBox, emit, extendLayout, focusPresets, project, renderLayout, shadow, TABLE_TILT,
} from '@tabletop/presentation';
import { BOTY_PACK, BOTY_REF, botyGenesis, botyGcContract, botyJob, botyRecession, botySubcontract, wireBoty } from '../../../packs/boty/src/index.js';
import { autosave, clearAutosave, exportEnvelope, importEnvelope, loadAutosave, PersistHalt } from './persist.js';

const CLIENT = 'bench-local';
const WORLD: World = { w: 1600, h: 1000 };
const SEATS = BOTY_PACK.seats.map((s) => s.id);

/** The BOTY job-card child (the certified extension door, live in the game). */
const JOB_CARD: LayoutDef = extendLayout(CARD_PARENT, {
  id: 'boty:job-card',
  override: [{ id: 'art', role: 'art', x: 6, y: 16, w: 60, h: 38 }],
  add: [{ id: 'deadline', role: 'deadline-badge', x: 70, y: 16, w: 24, h: 16 }, { id: 'payout', role: 'payout-strip', x: 70, y: 36, w: 24, h: 18 }],
  suppress: ['modifiers'],
});

interface Table {
  controller: LockstepController;
  viewSeat: string;
}
const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry() as RegistryT)(c);
let table: Table | null = null;
let selectedCrew: string | null = null;
const presets = focusPresets(SEATS.length, WORLD);
let camera: Camera = presets['overview']!;

const $ = (id: string): HTMLElement => document.getElementById(id)!;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function stateOf(t: Table) {
  return rebuild(t.controller.row(), botyGenesis, wire()).getState();
}

function halt(e: unknown): void {
  $('halt').textContent = `⛔ HALT — ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`;
  $('halt').style.display = 'block';
}
function status(msg: string): void { $('status').textContent = msg; }

/** D-1/D-2 realized: the flourish's ♪ caption appears, then SELF-REMOVES. */
function caption(text: string): void {
  const el = document.createElement('div');
  el.className = 'caption';
  el.textContent = text;
  $('captions').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function act(verb: string, args: Record<string, unknown> = {}, flourishId?: string): void {
  if (!table) return;
  try {
    const view = project(stateOf(table), table.viewSeat);
    const active = view.seats[view.turn.seatIdx]!.id;
    const res = table.controller.submit(CLIENT, emit(verb, active, args) as never);
    if ('refused' in res) {
      status(`refused [${(res as { rule: string }).rule}]: ${(res as { detail: string }).detail}`);
      return;
    }
    if (flourishId) {
      const inst = beginFlourish(flourishId, 'ok', flourishId === 'card-flip' ? '♪ card flip' : '♪');
      caption(inst.captions[0]!.text);
    }
    draw();
  } catch (e) {
    if (e instanceof Error && /Refusal|Breach|Violation/.test(e.name)) status(`refused: ${e.message}`);
    else halt(e);
  }
}

// ── scene composition on the layout skeleton ──
const rg = (layout: LayoutDef, id: string) => layout.regions.find((r) => r.id === id)!;
const at = (x: number, y: number, s: number, inner: string): string => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

function miniCard(x: number, y: number, s: number, layout: LayoutDef, label: string, content: Record<string, string>, clickAttr = ''): string {
  return `<g ${clickAttr} transform="translate(${x} ${y}) scale(${s})">${renderLayout(layout, label, content)}</g>`;
}

function tableGroup(view: SeatView): string {
  const T = 6.2; // table scale: unit space → world
  const deckR = rg(TABLE_PARENT, 'deck');
  const discR = rg(TABLE_PARENT, 'discard');
  const winR = rg(TABLE_PARENT, 'windows');
  const activeSeat = view.seats[view.turn.seatIdx]!.id;
  const deckCount = view.decks[activeSeat]?.drawCount ?? 0;
  // THE DECK — a clickable stack (click = draw for the active seat)
  const deck = `<g data-act="draw" class="hot"><title>${esc(activeSeat)}'s deck — ${deckCount} cards. Click to draw.</title>${shadow(deckR.x * T + 40, deckR.y * T + 130, 46)}${[2, 1, 0].map((i) => at(deckR.x * T + i * 3, deckR.y * T - i * 3, 0.75, renderLayout(CARD_BACK_PARENT, `deck (${deckCount})`, { emblem: `×${deckCount}` }))).join('')}</g>`;
  // the discard — last card played, face up
  const topId = view.decks[activeSeat]?.discardTop;
  const discard = topId
    ? miniCard(discR.x * T, discR.y * T, 0.75, JOB_CARD, `discard top: ${topId}`, { title: topId, deadline: '', payout: '' })
    : `<g><title>discard — empty</title><rect x="${discR.x * T}" y="${discR.y * T}" width="72" height="100" rx="6" class="ghost"/></g>`;
  // PROMPT CARDS — open windows as physical decisions
  const prompts = view.windows.filter((w) => w.status === 'open').map((w, i) => {
    const opts = w.options
      ? w.options.map((o, oi) => `<g data-win="${esc(w.id)}" data-opt="${oi}" class="hot"><title>decide: ${esc(o)}</title><rect x="4" y="${34 + oi * 26}" width="92" height="22" rx="4" class="opt"/><text x="10" y="${49 + oi * 26}">${esc(o)}</text></g>`).join('')
      : `<text x="8" y="46" class="dim">awaiting ${esc(w.decider)}…</text>`;
    return at(winR.x * T + i * 30, winR.y * T, 1.9, `<g><title>${esc(w.kind)} window — decider ${esc(w.decider)}</title><rect width="100" height="100" rx="6" class="prompt"/><text x="8" y="20">${esc(w.kind)}</text>${opts}</g>`);
  }).join('');
  // VENTURES — shared truth, laid out in the global play zone as job cards w/ portion slots
  const playG = rg(TABLE_PARENT, 'global-play');
  const ventures = view.ventures.map((vv, vi) => {
    const vx = playG.x * T + vi * 190;
    const vy = playG.y * T;
    const slots = Array.from({ length: vv.portions }, (_, pi) =>
      `<g data-venture="${esc(vv.id)}" data-portion="${pi}" class="hot"><title>${esc(vv.id)} portion ${pi} — click with a crew selected to assign</title><rect x="${vx + 8 + pi * 22}" y="${vy + 78}" width="18" height="14" class="slot"/></g>`).join('');
    return `<g><title>${esc(vv.id)} — ${esc(vv.status)}, ${vv.portions} portion(s)</title>${at(vx, vy, 0.72, renderLayout(JOB_CARD, `${vv.id} · ${vv.status}`, { title: `${vv.id} · ${vv.status}`, deadline: '', payout: '' }))}${slots}</g>`;
  }).join('');
  return `<g transform="translate(240 130) ${TABLE_TILT}"><g><title>the shared table</title><rect x="-30" y="-20" width="1120" height="700" rx="40" class="felt"/></g>${deck}${discard}${prompts}${ventures}</g>`;
}

function boardGroup(view: SeatView, seat: string, i: number): string {
  const B = 3.1;
  const x = 90 + i * 480;
  const y = 660;
  const s = view.seats.find((v) => v.id === seat)!;
  const active = view.seats[view.turn.seatIdx]!.id === seat;
  const crewR = rg(BOARD_PARENT, 'crew');
  const handR = rg(BOARD_PARENT, 'hand');
  // crew tokens — click to select; click again (selected) to WORK
  const crewState = stateOf(table!)['crew'] as readonly { id: string; outfit: string; assignedTo?: { venture: string } }[];
  const crew = crewState.filter((c) => c.outfit === seat).map((c, ci) => {
    const sel = selectedCrew === c.id;
    const busy = c.assignedTo !== undefined;
    return `<g data-crew="${esc(c.id)}" class="hot"><title>${esc(c.id)}${busy ? ` — working ${esc(c.assignedTo!.venture)} (click to WORK)` : sel ? ' — selected (click a portion to assign)' : ' — click to select'}</title><circle cx="${crewR.x + 8 + ci * 14}" cy="${crewR.y + 14}" r="6" class="${busy ? 'tok-busy' : sel ? 'tok-sel' : 'tok'}"/></g>`;
  }).join('');
  const ventures = ''; // ventures live on the TABLE's global-play zone (shared truth)
  const handTop = view.decks[seat]?.discardTop;
  const hand = handTop ? at(handR.x + 4, handR.y + 2, 0.26, renderLayout(CARD_PARENT, `${seat}'s last draw: ${handTop}`, { title: handTop })) : '';
  const inner = renderLayout(BOARD_PARENT, `${seat}'s shop${active ? ' — TO ACT' : ''}`, { identity: `${seat}${active ? ' ◀' : ''}`, counters: `$${s.cash} · ♥${s.favor}` });
  return `<g data-focus="seat-${i}" transform="translate(${x} ${y}) scale(${B})"><g class="${active ? 'active-board' : ''}">${inner}</g>${crew}${ventures}${hand}</g>`;
}

function draw(): void {
  if (!table) return;
  const view = project(stateOf(table), table.viewSeat);
  const scene = tableGroup(view) + SEATS.map((s, i) => boardGroup(view, s, i)).join('');
  $('stage').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cameraViewBox(camera, WORLD)}" width="1240" height="760">
  <title>BOTY — the table</title>
  <style>.frame{fill:#fbfaf7;stroke:#444;stroke-width:1.2}.region{fill:#fff;stroke:#bbb;stroke-dasharray:3 2}.region-label{font:7px system-ui;fill:#777}.felt{fill:#eef3ee;stroke:#9ab29a}.shadow{fill:rgba(0,0,0,.15)}.hot{cursor:pointer}.prompt{fill:#fff8e6;stroke:#c90}.opt{fill:#fff;stroke:#888}.dim{font:8px system-ui;fill:#999}.ghost{fill:none;stroke:#ccc;stroke-dasharray:4 3}.tok{fill:#dde6f5;stroke:#456}.tok-sel{fill:#ffd76e;stroke:#a70}.tok-busy{fill:#c9e6c9;stroke:#472}.slot{fill:#fff;stroke:#888}.vlabel{font:6px system-ui;fill:#345}.active-board .frame{stroke:#a70;stroke-width:2.4}text{font:9px system-ui}</style>
  ${scene}</svg>`;
  const active = view.seats[view.turn.seatIdx]!.id;
  status(`round ${view.turn.round} · ${active} to act · ${view.turn.status} · viewing as ${table.viewSeat}${selectedCrew ? ` · selected ${selectedCrew}` : ''}`);
  autosave(localStorage, table.controller.row(), table.controller.stateHash());
  ($('reckon') as HTMLButtonElement).disabled = view.turn.status !== 'closing';
  if (view.results) status(`FINAL — ${(view.results as { ranking: { seat: string; cash: number }[] }).ranking.map((r) => `${r.seat}: ${r.cash}`).join(' · ')} — champion ${(view.results as { champion: string }).champion}`);
}

function hit(ev: Event): void {
  let el = ev.target as HTMLElement | null;
  while (el && el !== $('stage')) {
    const d = (el as HTMLElement).dataset ?? {};
    if (d['act'] === 'draw') {
      if (!table) return;
      const view = project(stateOf(table), table.viewSeat);
      act('draw', { deck: view.seats[view.turn.seatIdx]!.id }, 'card-flip');
      return;
    }
    if (d['win']) { act('decide', { window: d['win'], option: Number(d['opt']) }); return; }
    if (d['crew']) {
      const crewState = stateOf(table!)['crew'] as readonly { id: string; assignedTo?: unknown }[];
      const c = crewState.find((x) => x.id === d['crew']);
      if (c?.assignedTo) { act('work', { crew: d['crew'] }); selectedCrew = null; }
      else { selectedCrew = selectedCrew === d['crew'] ? null : d['crew']!; draw(); }
      return;
    }
    if (d['venture'] && selectedCrew) {
      act('assign-crew', { crew: selectedCrew, venture: d['venture'], portion: Number(d['portion']) });
      selectedCrew = null;
      return;
    }
    if (d['focus']) { camera = presets[d['focus']!] ?? camera; draw(); return; }
    el = el.parentElement;
  }
}

function boot(): void {
  $('halt').style.display = 'none';
  try {
    const saved = loadAutosave(localStorage);
    if (saved && saved.row.packRef.id === 'boty') {
      const controller = LockstepController.resume(saved.row, BOTY_REF, botyGenesis, wire());
      for (const s of saved.row.seats) controller.join(CLIENT, s.id);
      if (controller.stateHash() !== saved.finalHash) throw new PersistHalt('hash lineage broken — the save is flagged, not loaded');
      table = { controller, viewSeat: saved.row.seats[0]!.id };
    } else {
      table = fresh();
    }
    draw();
  } catch (e) { halt(e); }
}

function fresh(): Table {
  clearAutosave(localStorage);
  const controller = LockstepController.host(BOTY_REF, BOTY_PACK.seats, 'maple-hollow', botyGenesis, wire());
  for (const s of SEATS) controller.join(CLIENT, s);
  selectedCrew = null;
  return { controller, viewSeat: SEATS[0]! };
}

function wireUi(): void {
  $('stage').addEventListener('click', hit);
  $('stage').addEventListener('wheel', (ev) => {
    ev.preventDefault();
    camera = { ...camera, zoom: Math.max(1, Math.min(6, camera.zoom * ((ev as WheelEvent).deltaY < 0 ? 1.15 : 0.87))) };
    draw();
  });
  $('cam-bar').innerHTML = Object.keys(presets).map((k) => `<button data-cam="${k}">${k}</button>`).join('');
  $('cam-bar').onclick = (ev) => { const k = (ev.target as HTMLElement).dataset['cam']; if (k) { camera = presets[k]!; draw(); } };
  $('new-game').onclick = () => { table = fresh(); $('halt').style.display = 'none'; draw(); };
  $('upkeep').onclick = () => act('upkeep', ($('overhead') as HTMLInputElement).value ? { overhead: Number(($('overhead') as HTMLInputElement).value) } : {});
  $('spawn-job').onclick = () => act('spawn-venture', { spec: botyJob() });
  $('spawn-gc').onclick = () => act('spawn-venture', { spec: botyGcContract() });
  $('route-gc').onclick = () => act('route-venture', botySubcontract().routeArgs as never);
  $('recession').onclick = () => act('attach-effect', { tfx: botyRecession() });
  $('end-turn').onclick = () => act('end-turn');
  $('reckon').onclick = () => act('reckon');
  $('export').onclick = () => {
    if (!table) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportEnvelope(table.controller.row(), table.controller.stateHash())], { type: 'application/json' }));
    a.download = 'boty-row.json';
    a.click();
  };
  ($('import') as HTMLInputElement).onchange = async (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    try {
      const env = importEnvelope(await f.text());
      const controller = LockstepController.resume(env.row, BOTY_REF, botyGenesis, wire());
      for (const s of env.row.seats) controller.join(CLIENT, s.id);
      if (controller.stateHash() !== env.finalHash) throw new PersistHalt('imported row hash lineage broken — refused whole');
      table = { controller, viewSeat: env.row.seats[0]!.id };
      $('halt').style.display = 'none';
      draw();
    } catch (e) { halt(e); }
  };
  $('seat').onchange = () => { if (table) { table.viewSeat = ($('seat') as HTMLSelectElement).value; draw(); } };
}

(window as unknown as Record<string, unknown>)['__GAME__'] = {
  rowHash: () => table?.controller.stateHash() ?? null,
  moveCount: () => table?.controller.row().moves.length ?? null,
};
wireUi();
boot();

// the child layout's shadowing stays queryable, always (I-50)
console.info('boty:job-card shadowing', JOB_CARD.shadowed);
