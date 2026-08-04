/**
 * REGISTRY (K-A, I-77) — THE SINGLE COMPOSITION POINT. The `COMPONENTS` array is the
 * only place object composition happens; adding object N+1 is ONE line here (plus its
 * adapter module). Q-3 (I-93) order: `[die, table, seats, seat-play, ledger, box]` —
 * seats BUILD before seat-play and the ledger (their geometry derives from the live
 * board bboxes); dispatch stays behavior-neutral (disjoint tag domains — one owner per
 * raycast intersection; the K-A D1 build-reorder precedent).
 */
import type { Component } from '../component.js';
import { die } from './die.js';
import { table } from './table.js';
import { ledgerComponent } from './ledger.js';
import { seats } from './seats.js';
import { seatPlay } from './seat-play.js';
import { box } from './box.js';
import { windowsPrompt } from './windows-prompt.js';
import { medal } from './medal.js';

// A8 (I-129): windows-prompt builds AFTER table; onion-layer since I-130. L-3 (I-130):
// the medal builds AFTER table (its pose derives from the live medal region). Both
// dispatch disjointly (winId/optIdx · medal tags — the K-A D1 law).
export const COMPONENTS: readonly Component[] = [die, table, seats, seatPlay, ledgerComponent, box, windowsPrompt, medal];
