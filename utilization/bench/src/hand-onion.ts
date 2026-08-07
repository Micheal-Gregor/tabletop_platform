/**
 * THE HAND ONION (H-4, I-241 — the owner: 'if it zooms in close then it should switch
 * to the onion and scrollbar view of the hand, which is exited by clicking outside the
 * card area or zooming back out'): a DOM overlay — the hand's cards left to right with
 * a horizontal scrollbar. Opened by the camera's hand-zoom hook (crossing the hand's
 * wall on wheel-in); closed by a click outside the cards or a wheel-out. Presentation
 * only — no state, no verbs; the cards show the same identity the fan stamps
 * (setFace([id, 'networking']) — the fan's own face law). Distinct from onion.ts,
 * which is the DRAW theater's reading board for a single drawn card.
 */
import { trace } from './ui-trace.js';

let el: HTMLDivElement | null = null;

export const handOnionOpen = (): boolean => el !== null;

export function closeHandOnion(): void {
  if (!el) return;
  el.remove();
  el = null;
  trace('view', 'HAND ONION closed');
}

export function openHandOnion(cards: readonly string[]): void {
  if (el) return;
  const div = document.createElement('div');
  div.id = 'hand-onion';
  div.style.cssText = 'position:fixed;inset:0;z-index:40;background:rgba(20,18,14,0.55);display:flex;align-items:center;';
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:18px;overflow-x:auto;padding:28px 40px;width:100%;';
  if (!cards.length) {
    const note = document.createElement('div');
    note.style.cssText = 'margin:0 auto;color:#f3ecda;font:16px system-ui;';
    note.textContent = 'no cards in hand';
    row.appendChild(note);
  }
  for (const id of cards) {
    const c = document.createElement('div');
    c.style.cssText = 'flex:0 0 auto;width:210px;height:290px;background:#fbfaf7;border:2px solid #444;border-radius:8px;padding:14px;font:14px system-ui;color:#222;display:flex;flex-direction:column;gap:8px;';
    const title = document.createElement('strong');
    title.style.fontSize = '16px';
    title.textContent = id;
    const kind = document.createElement('em');
    kind.style.color = '#666';
    kind.textContent = 'networking';
    c.append(title, kind);
    row.appendChild(c);
  }
  div.appendChild(row);
  div.addEventListener('pointerup', (ev) => { if (ev.target === div) closeHandOnion(); }); // a click OUTSIDE the card area exits
  div.addEventListener('wheel', (ev) => { ev.preventDefault(); ev.stopPropagation(); if (ev.deltaY > 0) closeHandOnion(); }, { passive: false }); // wheel-out exits; the stage wheel never hears it
  document.body.appendChild(div);
  el = div;
  trace('view', `HAND ONION open (${cards.length} cards)`);
}
