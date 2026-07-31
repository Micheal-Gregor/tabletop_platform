/**
 * BENCH v5 — THE V1 EXTRACTION LIVE. The four BOTY children (I-51) on the table:
 * the shop boards are `boty:shop-board` (v1's proven anatomy — art banner, building
 * tier, tradespeople rack, equipment, jobs, AR/AP, actions), the table is
 * `boty:town-table` (standings + table log), the round interstitial is
 * `boty:round-card` and the drawn card pops as `boty:fortune-card` — MODALS ARE
 * CARDS (I-51a), dismissed by touching them. Chrome (header · alert banner ·
 * footer nav) is bench furniture (I-51d). Skin stays off (D-1); the v1 grammar is
 * recorded in packs/boty/skin-token-candidates.md, not painted.
 * Bench tier: composes CERTIFIED surfaces only — layout contracts position
 * everything, project() is the sole read (S-6), emit() the sole verb path, the
 * controller the sole write. No new law.
 */
import type { EngineCore, RuleRegistry as RegistryT } from '@tabletop/engine';
import { LockstepController, RuleRegistry, rebuild } from '@tabletop/engine';
import type { Camera, LayoutDef, SeatView, World } from '@tabletop/presentation';
import {
  CARD_BACK_PARENT, CARD_PARENT,
  beginFlourish, cameraViewBox, emit, extendLayout, focusPresets, project, renderLayout, shadow, TABLE_TILT,
} from '@tabletop/presentation';
import {
  BOTY_PACK, BOTY_REF, botyGenesis, botyGcContract, botyJob, botyRecession, botySubcontract, wireBoty,
  FORTUNE_CARD, ROUND_CARD, SHOP_BOARD, TOWN_TABLE,
} from '../../../packs/boty/src/index.js';
import { autosave, clearAutosave, exportEnvelope, importEnvelope, loadAutosave, PersistHalt } from './persist.js';

const CLIENT = 'bench-local';
const WORLD: World = { w: 1600, h: 1000 };
const SEATS = BOTY_PACK.seats.map((s) => s.id);
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

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
/** Modal-as-card (I-51a): what's popped is a CARD CHILD + its content fill, nothing else. */
type Popped = { layout: LayoutDef; label: string; content: Record<string, string> } | null;

const wire = () => (c: EngineCore) => wireBoty(new RuleRegistry() as RegistryT)(c);
let table: Table | null = null;
let selectedCrew: string | null = null;
let popped: Popped = null;
let lastRound: number | null = null;
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

function act(verb: string, args: Record<string, unknown> = {}, flourishId?: string): boolean {
  if (!table) return false;
  try {
    const view = project(stateOf(table), table.viewSeat);
    const active = view.seats[view.turn.seatIdx]!.id;
    const res = table.controller.submit(CLIENT, emit(verb, active, args) as never);
    if ('refused' in res) {
      status(`refused [${(res as { rule: string }).rule}]: ${(res as { detail: string }).detail}`);
      return false;
    }
    if (flourishId) {
      const inst = beginFlourish(flourishId, 'ok', flourishId === 'card-flip' ? '♪ card flip' : '♪');
      caption(inst.captions[0]!.text);
    }
    draw();
    return true;
  } catch (e) {
    if (e instanceof Error && /Refusal|Breach|Violation/.test(e.name)) status(`refused: ${e.message}`);
    else halt(e);
    return false;
  }
}

// ── scene composition on the layout skeleton ──
const rg = (layout: LayoutDef, id: string) => layout.regions.find((r) => r.id === id)!;
const at = (x: number, y: number, s: number, inner: string): string => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

function miniCard(x: number, y: number, s: number, layout: LayoutDef, label: string, content: Record<string, string>, clickAttr = ''): string {
  return `<g ${clickAttr} transform="translate(${x} ${y}) scale(${s})">${renderLayout(layout, label, content)}</g>`;
}

const seasonOf = (round: number): string => SEASONS[(round - 1) % SEASONS.length]!;

function tableGroup(view: SeatView): string {
  const T = 6.2; // table scale: unit space → world
  const deckR = rg(TOWN_TABLE, 'deck');
  const discR = rg(TOWN_TABLE, 'discard');
  const winR = rg(TOWN_TABLE, 'windows');
  const activeSeat = view.seats[view.turn.seatIdx]!.id;
  const deckCount = view.decks[activeSeat]?.drawCount ?? 0;
  // THE DECK — a clickable stack that ALWAYS shows its count (v1: "59 left")
  const deck = `<g data-act="draw" class="hot"><title>${esc(activeSeat)}'s deck — ${deckCount} left. Click to draw.</title>${shadow(deckR.x * T + 40, deckR.y * T + 130, 46)}${[2, 1, 0].map((i) => at(deckR.x * T + i * 3, deckR.y * T - i * 3, 0.75, renderLayout(CARD_BACK_PARENT, `deck (${deckCount} left)`, { emblem: `${deckCount} left` }))).join('')}<text x="${deckR.x * T + 6}" y="${deckR.y * T + 96}" class="head">${deckCount} left</text></g>`;
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
  const playG = rg(TOWN_TABLE, 'global-play');
  const ventures = view.ventures.map((vv, vi) => {
    const vx = playG.x * T + vi * 190;
    const vy = playG.y * T;
    const slots = Array.from({ length: vv.portions }, (_, pi) =>
      `<g data-venture="${esc(vv.id)}" data-portion="${pi}" class="hot"><title>${esc(vv.id)} portion ${pi} — click with a crew selected to assign</title><rect x="${vx + 8 + pi * 22}" y="${vy + 78}" width="18" height="14" class="slot"/></g>`).join('');
    return `<g><title>${esc(vv.id)} — ${esc(vv.status)}, ${vv.portions} portion(s)</title>${at(vx, vy, 0.72, renderLayout(JOB_CARD, `${vv.id} · ${vv.status}`, { title: `${vv.id} · ${vv.status}`, deadline: '', payout: '' }))}${slots}</g>`;
  }).join('');
  // STANDINGS — v1's "The table" panel: ranked rows, active row marked (boty:town-table add)
  const stR = rg(TOWN_TABLE, 'standings');
  const ranked = [...view.seats].sort((a, b) => b.cash - a.cash);
  const crewState = stateOf(table!)['crew'] as readonly { id: string; outfit: string; assignedTo?: unknown }[];
  const standings = `<g><title>the table — standings</title><rect x="${stR.x * T}" y="${stR.y * T}" width="${stR.w * T}" height="${stR.h * T}" rx="8" class="panel"/><text x="${stR.x * T + 10}" y="${stR.y * T + 20}" class="head">THE TABLE</text>${ranked.map((s, ri) => {
    const isActive = s.id === activeSeat;
    const crewN = crewState.filter((c) => c.outfit === s.id).length;
    const jobsN = crewState.filter((c) => c.outfit === s.id && c.assignedTo !== undefined).length;
    const ry = stR.y * T + 30 + ri * 42;
    return `<g data-focus="seat-${SEATS.indexOf(s.id)}" class="hot"><title>${esc(s.id)} — $${s.cash}, ${crewN} crew, ${jobsN} working. Click to focus their shop.</title><rect x="${stR.x * T + 8}" y="${ry}" width="${stR.w * T - 16}" height="36" rx="6" class="${isActive ? 'row-active' : 'row'}"/><text x="${stR.x * T + 16}" y="${ry + 15}" class="row-name">${esc(s.id)}${isActive ? ' ★' : ''}</text><text x="${stR.x * T + stR.w * T - 24}" y="${ry + 15}" text-anchor="end" class="cash">$${s.cash}</text><text x="${stR.x * T + 16}" y="${ry + 30}" class="sub">${crewN} crew · ${jobsN} working · ♥${s.favor}</text></g>`;
  }).join('')}</g>`;
  // TABLE LOG — the last moves, newest last (boty:town-table add)
  const lgR = rg(TOWN_TABLE, 'log');
  const moves = table!.controller.row().moves;
  const tail = moves.slice(-5);
  const log = `<g><title>table log — last ${tail.length} of ${moves.length} moves</title><rect x="${lgR.x * T}" y="${lgR.y * T}" width="${lgR.w * T}" height="${lgR.h * T}" rx="8" class="panel"/><text x="${lgR.x * T + 10}" y="${lgR.y * T + 20}" class="head">TABLE LOG</text>${tail.map((m, mi) =>
    `<text x="${lgR.x * T + 10}" y="${lgR.y * T + 38 + mi * 16}" class="sub">${esc(m.seat)} · ${esc(m.type)}</text>`).join('')}</g>`;
  return `<g transform="translate(240 130) ${TABLE_TILT}"><g><title>the shared table</title><rect x="-30" y="-20" width="1120" height="700" rx="40" class="felt"/></g>${deck}${discard}${prompts}${ventures}${standings}${log}</g>`;
}

function boardGroup(view: SeatView, seat: string, i: number): string {
  const B = 3.1;
  const x = 90 + i * 480;
  const y = 640;
  const s = view.seats.find((v) => v.id === seat)!;
  const active = view.seats[view.turn.seatIdx]!.id === seat;
  const state = stateOf(table!);
  const crewR = rg(SHOP_BOARD, 'crew');
  const handR = rg(SHOP_BOARD, 'hand');
  const arR = rg(SHOP_BOARD, 'ar');
  const apR = rg(SHOP_BOARD, 'ap');
  const actR = rg(SHOP_BOARD, 'actions');
  // crew tokens — the TRADESPEOPLE rack: click to select; click again (assigned) to WORK
  const crewState = state['crew'] as readonly { id: string; outfit: string; assignedTo?: { venture: string } }[];
  const mine = crewState.filter((c) => c.outfit === seat);
  const crew = mine.map((c, ci) => {
    const sel = selectedCrew === c.id;
    const busy = c.assignedTo !== undefined;
    return `<g data-crew="${esc(c.id)}" class="hot"><title>${esc(c.id)}${busy ? ` — working ${esc(c.assignedTo!.venture)} (click to WORK)` : sel ? ' — selected (click a portion to assign)' : ' — click to select'}</title><circle cx="${crewR.x + 8 + ci * 14}" cy="${crewR.y + 14}" r="6" class="${busy ? 'tok-busy' : sel ? 'tok-sel' : 'tok'}"/></g>`;
  }).join('');
  // AR / AP — v1's twin panels, filled from the shared truth
  const recv = (state['receivables'] as readonly { holder: string; amount: number }[] ?? []).filter((r) => r.holder === seat);
  const owed = (state['debts'] as readonly { debtor: string; creditor: string; amount: number }[] ?? []).filter((d) => d.debtor === seat);
  const sum = (xs: readonly { amount: number }[]) => xs.reduce((a, b) => a + b.amount, 0);
  const arTxt = `<text x="${arR.x + 2}" y="${arR.y + 7.5}" class="fine">${recv.length ? `${recv.length} · $${sum(recv)}` : 'none'}</text>`;
  const apTxt = `<text x="${apR.x + 2}" y="${apR.y + 7.5}" class="fine">${owed.length ? `${owed.length} · $${sum(owed)}` : 'none'}</text>`;
  // ACTIONS — v1's board-foot strip: End turn lives ON the active board
  const actions = active
    ? `<g data-act="end-turn" class="hot"><title>End turn — ${esc(seat)}</title><rect x="${actR.x + 1}" y="${actR.y + 1}" width="${actR.w - 2}" height="${actR.h - 2}" rx="2" class="act-strip"/><text x="${actR.x + 4}" y="${actR.y + 6.5}" class="fine">End turn ▶</text></g>`
    : '';
  const jobsN = mine.filter((c) => c.assignedTo !== undefined).length;
  const handTop = view.decks[seat]?.discardTop;
  const hand = handTop ? at(handR.x + 2, handR.y + 1, 0.3, renderLayout(CARD_PARENT, `${seat}'s last draw: ${handTop}`, { title: handTop })) : '';
  const inner = renderLayout(SHOP_BOARD, `${seat}'s shop${active ? ' — TO ACT' : ''}`, {
    'art-banner': `${seat}'s shop`,
    identity: `${seat}${active ? ' ★' : ''} · trade`,
    counters: `$${s.cash} · ♥${s.favor}`,
    'building-tier': `shop · tier 1 · ${mine.length} crew cap`,
    'jobs-list': jobsN ? `${jobsN} job(s) crewed` : 'no jobs in queue',
    ar: 'AR — owed to you',
    ap: 'AP — you owe',
    actions: active ? '' : '—',
  });
  return `<g data-focus="seat-${i}" transform="translate(${x} ${y}) scale(${B})"><g class="${active ? 'active-board' : ''}">${inner}</g>${crew}${arTxt}${apTxt}${actions}${hand}</g>`;
}

/** Modal-as-card (I-51a): the popped child renders in its own fixed frame, like v1. */
function drawPopped(): void {
  if (!popped) { $('overlay').style.display = 'none'; return; }
  $('overlay').style.display = 'flex';
  $('popped').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="340" height="460">
  <style>.frame{fill:#fbfaf7;stroke:#444;stroke-width:1.2}.region{fill:#fff;stroke:#bbb;stroke-dasharray:3 2}.region-label{font:4.6px system-ui;fill:#555}</style>
  ${renderLayout(popped.layout, popped.label, popped.content)}</svg>`;
}

function popRound(round: number): void {
  popped = {
    layout: ROUND_CARD,
    label: `Round ${round} · ${seasonOf(round)}`,
    content: {
      title: `Round ${round} · ${seasonOf(round)}`,
      text: 'Maple Hollow lore',
      callout: `${SEATS[0]} leads off this round.`,
      action: 'Next ▶ (click to continue)',
    },
  };
}

function draw(): void {
  if (!table) return;
  const view = project(stateOf(table), table.viewSeat);
  const active = view.seats[view.turn.seatIdx]!.id;
  // ROUND INTERSTITIAL — v1's proven rhythm: the round announces itself as a CARD
  if (lastRound !== null && view.turn.round !== lastRound && view.turn.status === 'playing') popRound(view.turn.round);
  lastRound = view.turn.round;
  const scene = tableGroup(view) + SEATS.map((s, i) => boardGroup(view, s, i)).join('');
  $('stage').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cameraViewBox(camera, WORLD)}" width="1240" height="720">
  <title>BOTY — the table</title>
  <style>.frame{fill:#fbfaf7;stroke:#444;stroke-width:1.2}.region{fill:#fff;stroke:#bbb;stroke-dasharray:3 2}.region-label{font:7px system-ui;fill:#777}.felt{fill:#eef3ee;stroke:#9ab29a}.shadow{fill:rgba(0,0,0,.15)}.hot{cursor:pointer}.prompt{fill:#fff8e6;stroke:#c90}.opt{fill:#fff;stroke:#888}.dim{font:8px system-ui;fill:#999}.ghost{fill:none;stroke:#ccc;stroke-dasharray:4 3}.tok{fill:#dde6f5;stroke:#456}.tok-sel{fill:#ffd76e;stroke:#a70}.tok-busy{fill:#c9e6c9;stroke:#472}.slot{fill:#fff;stroke:#888}.panel{fill:#fff;stroke:#999}.head{font:11px system-ui;fill:#333;font-weight:600}.row{fill:#fafafa;stroke:#ddd}.row-active{fill:#fff8e0;stroke:#a70;stroke-width:1.6}.row-name{font:10px system-ui;fill:#222;font-weight:600}.cash{font:10px system-ui;fill:#8a6d00;font-weight:700}.sub{font:8px system-ui;fill:#888}.fine{font:3.4px system-ui;fill:#555}.act-strip{fill:#eaf5ea;stroke:#472}.active-board .frame{stroke:#a70;stroke-width:2.4}text{font:9px system-ui}</style>
  ${scene}</svg>`;
  // CHROME (bench furniture, I-51d): header · alert banner · footer already in the page
  $('hdr-place').textContent = 'Maple Hollow';
  $('hdr-round').textContent = `${seasonOf(view.turn.round)} · round ${view.turn.round} / ${(BOTY_PACK as unknown as { maxRounds?: number }).maxRounds ?? '—'}`;
  $('hdr-turn').textContent = `▶ ${active}'s turn`;
  const banner = $('banner');
  if (view.results) {
    banner.textContent = `🏁 FINAL — ${(view.results as { ranking: { seat: string; cash: number }[] }).ranking.map((r) => `${r.seat}: $${r.cash}`).join(' · ')} — champion ${(view.results as { champion: string }).champion}`;
    banner.className = 'banner on';
  } else if (active === table.viewSeat) {
    banner.textContent = `🎯 Your turn, ${active} — make your move!`;
    banner.className = 'banner on';
  } else {
    banner.textContent = `waiting on ${active}…`;
    banner.className = 'banner';
  }
  status(`round ${view.turn.round} · ${active} to act · ${view.turn.status} · viewing as ${table.viewSeat}${selectedCrew ? ` · selected ${selectedCrew}` : ''}`);
  autosave(localStorage, table.controller.row(), table.controller.stateHash());
  ($('reckon') as HTMLButtonElement).disabled = view.turn.status !== 'closing';
  drawPopped();
}

function hit(ev: Event): void {
  let el = ev.target as HTMLElement | null;
  while (el && el !== $('stage')) {
    const d = (el as HTMLElement).dataset ?? {};
    if (d['act'] === 'draw') {
      if (!table) return;
      const before = project(stateOf(table), table.viewSeat);
      const activeId = before.seats[before.turn.seatIdx]!.id;
      if (act('draw', { deck: activeId }, 'card-flip')) {
        // THE DRAWN CARD pops as the fortune child — v1's card-drawn moment (I-51a)
        const after = project(stateOf(table), table.viewSeat);
        const drawn = after.decks[activeId]?.discardTop;
        if (drawn) {
          popped = {
            layout: FORTUNE_CARD,
            label: `drawn: ${drawn}`,
            content: { title: drawn, subtitle: 'Fortune', text: 'the card takes effect through the engine', payout: '' },
          };
          drawPopped();
        }
      }
      return;
    }
    if (d['act'] === 'end-turn') { act('end-turn'); return; }
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
    const view = project(stateOf(table), table.viewSeat);
    lastRound = view.turn.round;
    if (view.turn.status === 'playing') popRound(view.turn.round); // v1 opens ON a round card
    draw();
  } catch (e) { halt(e); }
}

function fresh(): Table {
  clearAutosave(localStorage);
  const controller = LockstepController.host(BOTY_REF, BOTY_PACK.seats, 'maple-hollow', botyGenesis, wire());
  for (const s of SEATS) controller.join(CLIENT, s);
  selectedCrew = null;
  popped = null;
  lastRound = null;
  return { controller, viewSeat: SEATS[0]! };
}

function wireUi(): void {
  $('stage').addEventListener('click', hit);
  $('stage').addEventListener('wheel', (ev) => {
    ev.preventDefault();
    camera = { ...camera, zoom: Math.max(1, Math.min(6, camera.zoom * ((ev as WheelEvent).deltaY < 0 ? 1.15 : 0.87))) };
    draw();
  });
  $('overlay').addEventListener('click', () => { popped = null; drawPopped(); });
  $('cam-bar').innerHTML = Object.keys(presets).map((k) => `<button data-cam="${k}">${k}</button>`).join('');
  $('cam-bar').onclick = (ev) => { const k = (ev.target as HTMLElement).dataset['cam']; if (k) { camera = presets[k]!; draw(); } };
  $('new-game').onclick = () => { table = fresh(); $('halt').style.display = 'none'; const v = project(stateOf(table!), table!.viewSeat); lastRound = v.turn.round; popRound(v.turn.round); draw(); };
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
  poppedLayout: () => popped?.layout.id ?? null,
  dismiss: () => { popped = null; drawPopped(); },
};
wireUi();
boot();

// the children's shadowing stays queryable, always (I-50/I-51)
console.info('v1-extraction shadowing', {
  job: JOB_CARD.shadowed, fortune: FORTUNE_CARD.shadowed, round: ROUND_CARD.shadowed,
  shop: SHOP_BOARD.shadowed, table: TOWN_TABLE.shadowed,
});
