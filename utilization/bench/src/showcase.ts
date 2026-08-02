/**
 * THE TEMPLATE SHOWCASE — the parent visual vocabulary, executable (owner's ask):
 * the tabletop with its shared zones mid-table, player boards attached at the edges,
 * a deck OF parent cards, a fanned hand, tokens with shadows on the 2.5D plane —
 * plus the first CHILDREN rendered beside their parents (BOTY job card · the
 * five-sided shop) to show extension working. Camera presets pan the scene.
 */
import {
  BOARD_PARENT,
  CARD_BACK_PARENT,
  CARD_PARENT,
  TABLE_PARENT,
  cameraViewBox,
  extendLayout,
  focusPresets,
  renderLayout,
  shadow,
  TABLE_TILT,
} from '@tabletop/presentation';
import type { Camera, World } from '@tabletop/presentation';
// ONE definition per child id (GBC-60; K7-parity closure): the showcase exhibits the
// PACK's promoted job-card — never a bench-local twin under the same id.
import { JOB_CARD as jobCard } from '../../../packs/boty/src/index.js';

const WORLD: World = { w: 1600, h: 1000 };
const SEATS = ['moe', 'pete', 'edie'];

// ── the five-sided child, built THROUGH the extension door (I-50) ──
const pentagonShop = extendLayout(BOARD_PARENT, {
  id: 'boty:pentagon-shop',
  shape: [[50, 0], [100, 38], [82, 100], [18, 100], [0, 38]],
});

const place = (x: number, y: number, s: number, inner: string): string =>
  `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

function deckStack(x: number, y: number): string {
  const backs = [2, 1, 0]
    .map((i) => place(x + i * 2, y - i * 2, 0.9, renderLayout(CARD_BACK_PARENT, `deck card ${i + 1} (face down)`)))
    .join('');
  return `<g data-object="deck"><title>the deck — a stack of parent cards</title>${shadow(x + 48, y + 100, 55)}${backs}</g>`;
}

function hand(x: number, y: number): string {
  const cards = [-14, 0, 14]
    .map((deg, i) =>
      `<g transform="translate(${x + i * 55} ${y + Math.abs(deg)}) rotate(${deg} 50 100)">${renderLayout(CARD_PARENT, `hand card ${i + 1} (faces YOU)`, { title: `card ${i + 1}` })}</g>`
    )
    .join('');
  return `<g data-object="hand"><title>the hand — fanned toward its owner</title>${cards}</g>`;
}

function scene(): string {
  // the shared table, tilted onto the 2.5D plane
  const table = `<g transform="translate(300 180) ${TABLE_TILT}">${place(0, 0, 6.2, renderLayout(TABLE_PARENT, 'the tabletop (shared)', { deck: 'deck', discard: 'discard', dice: 'dice ⚂', windows: 'prompts', 'global-play': 'global play' }))}</g>`;
  // player boards attached at the edges (bottom = seats)
  const boards = SEATS.map((s, i) =>
    place(150 + i * 470, 700, 2.6, renderLayout(i === 0 ? pentagonShop : BOARD_PARENT, `${s}'s board${i === 0 ? ' (five-sided CHILD)' : ' (parent)'}`, { identity: s, counters: 'cash · favor' }))
  ).join('');
  // objects ON the table plane
  const objects = `<g transform="translate(330 210) ${TABLE_TILT}">${deckStack(60, 260)}${place(230, 250, 0.95, renderLayout(CARD_PARENT, 'discard top (face up)', { title: 'last play' }))}</g>`;
  // the parent-vs-child exhibit (the owner's "see the relationships" ask)
  const exhibit =
    `<g data-object="exhibit"><title>parent vs child — the extension door, visible</title>` +
    place(1180, 130, 1.5, renderLayout(CARD_PARENT, 'PARENT card frame')) +
    place(1370, 130, 1.5, renderLayout(jobCard, 'CHILD: boty job card', { title: 'Brake Job', deadline: 'due r2', payout: 'pays 4' })) +
    `<text x="1180" y="120" class="h">parent → child (overridden: ${jobCard.shadowed.overridden.join(',')} · added: ${jobCard.shadowed.added.join(',')} · suppressed: ${jobCard.shadowed.suppressed.join(',')})</text></g>`;
  return table + objects + boards + hand(660, 620) + exhibit;
}

// ── the camera ──
const presets = focusPresets(SEATS.length, WORLD);
let camera: Camera = presets['overview']!;

function draw(): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cameraViewBox(camera, WORLD)}" width="1200" height="740">
  <title>the template showcase — parent vocabulary + first children</title>
  <style>.frame{fill:#fbfaf7;stroke:#444;stroke-width:1.2}.region{fill:#fff;stroke:#999;stroke-dasharray:3 2}.region-label{font:7px system-ui;fill:#555}.shadow{fill:rgba(0,0,0,.18)}.h{font:15px system-ui;fill:#333}</style>
  ${scene()}</svg>`;
  document.getElementById('stage')!.innerHTML = svg;
  document.getElementById('cam')!.textContent = `camera: ${Object.entries(presets).find(([, c]) => c === camera)?.[0] ?? 'custom'}`;
}

function wire(): void {
  const bar = document.getElementById('presets')!;
  bar.innerHTML = Object.keys(presets).map((k) => `<button data-cam="${k}">${k}</button>`).join('');
  bar.onclick = (ev) => {
    const k = (ev.target as HTMLElement).dataset['cam'];
    if (k) { camera = presets[k]!; draw(); }
  };
  document.getElementById('stage')!.onwheel = (ev) => {
    ev.preventDefault();
    camera = { ...camera, zoom: Math.max(1, Math.min(6, camera.zoom * (ev.deltaY < 0 ? 1.15 : 0.87))) };
    draw();
  };
}

(window as unknown as Record<string, unknown>)['__SHOWCASE__'] = { scene, presets: Object.keys(presets) };
wire();
draw();
