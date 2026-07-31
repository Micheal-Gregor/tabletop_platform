/**
 * MP1 ContractRenderer + MP2 JoinRenderer + MP7 BookletRenderer — SVG-string realization
 * (ODG-p1 completed: headless model, pure functions SeatView → SVG documents; I-47).
 * Traces: S3 F6 · GX-36 (tokens only) · GX-39 (a11y floor: every element labeled) ·
 * RulesetView total exposure. Renderers read ONLY the projected view + the bound skin.
 */
import type { RulesetViewModel } from '@tabletop/engine';
import type { SeatView } from './projector.js';
import { hookHk10BeforeRenderRead } from './projector.js';
import type { BoundSkin } from './skin.js';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Per-kind presentation contracts — TOKENS a kind's rendering requires (GX-36). */
export const KIND_CONTRACTS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  Card: Object.freeze(['card.face', 'card.back', 'sound.card-flip']),
  Piece: Object.freeze(['piece.body', 'sound.piece-tap']),
  Die: Object.freeze(['die.face', 'sound.die-throw']),
  Surface: Object.freeze(['surface.bg']),
});

/** MP1 — render one component of a kind: bound token values only, labeled (a11y). */
export function renderComponent(kind: string, props: { readonly id: string; readonly label: string; readonly value?: string }, bound: BoundSkin): string {
  const faceToken = kind === 'Card' ? 'card.face' : kind === 'Piece' ? 'piece.body' : kind === 'Die' ? 'die.face' : 'surface.bg';
  const face = bound.tokens[faceToken] ?? `[${faceToken}]`;
  const value = props.value !== undefined ? `<text class="value" x="8" y="40">${esc(props.value)}</text>` : '';
  return `<g data-kind="${esc(kind)}" data-id="${esc(props.id)}"><title>${esc(props.label)}</title><rect width="72" height="100" rx="6"/><text x="8" y="20">${esc(face)}</text>${value}</g>`;
}

/** MP2 — render a relation JOIN (per relation type; the join is the visual grammar). */
export function renderJoin(relationType: string, label: string, childSvg: string): string {
  return `<g data-join="${esc(relationType)}"><title>${esc(label)}</title>${childSvg}</g>`;
}

/** MP7 — the booklet: the F4 RulesetView rendered IN FULL (total exposure carried). */
export function renderBooklet(view: RulesetViewModel): string {
  const rows = (view as unknown as { contributions: readonly { id: string; trigger: string }[] }).contributions
    .map((c, i) => `<g data-rule="${esc(c.id)}"><title>rule ${esc(c.id)}</title><text x="8" y="${20 + i * 16}">${esc(c.id)} · ${esc(c.trigger)}</text></g>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" data-page="booklet"><title>rules booklet</title>${rows}</svg>`;
}

/** The table scene: seats panel + decks + windows, all through the PROJECTED view. */
export function renderTable(view: SeatView, bound: BoundSkin): string {
  hookHk10BeforeRenderRead(view); // R-19's live door on the real render path
  const seats = view.seats
    .map((s, i) => `<g data-seat="${esc(s.id)}"><title>${esc(s.id)}: cash ${s.cash}, favor ${s.favor}</title><text x="8" y="${20 + i * 16}">${esc(s.id)} · ${s.cash}</text></g>`)
    .join('');
  const decks = Object.entries(view.decks)
    .map(([ref, d], i) => `<g data-deck="${esc(ref)}"><title>deck ${esc(ref)}: ${d.drawCount} cards</title><text x="200" y="${20 + i * 16}">${esc(ref)}:${d.drawCount}</text></g>`)
    .join('');
  const windows = view.windows
    .filter((w) => w.status === 'open')
    .map((w) => `<g data-window="${esc(w.id)}"><title>${esc(w.kind)} window, decider ${esc(w.decider)}</title><text x="8" y="120">${esc(w.kind)}${w.options ? `: ${w.options.map(esc).join(' | ')}` : ' (awaiting decider)'}</text></g>`)
    .join('');
  const back = bound.tokens['card.back'] ?? '[card.back]';
  return `<svg xmlns="http://www.w3.org/2000/svg" data-seat-view="${esc(view.seat)}"><title>table, seen from ${esc(view.seat)}</title><g data-skin="${bound.placeholder ? 'placeholder' : 'bound'}"><title>skin</title><text x="300" y="20">${esc(back)}</text></g>${seats}${decks}${windows}</svg>`;
}

/** GX-39 — the a11y floor: every <g> carries a <title>. Returns the UNLABELED count. */
export function a11yAudit(svg: string): number {
  const groups = svg.match(/<g\b[^>]*>/g) ?? [];
  const titled = svg.match(/<g\b[^>]*><title>/g) ?? [];
  return groups.length - titled.length;
}
