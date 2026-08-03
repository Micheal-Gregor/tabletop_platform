/**
 * REGISTRY (K-A, I-77) — THE SINGLE COMPOSITION POINT. The `COMPONENTS` array is the
 * only place object composition happens; adding object N+1 is ONE line here (plus its
 * adapter module). The order `[die, table, ledger, seats, box]` PRESERVES today's
 * consumeClick/onPick precedence (registry order only breaks impossible ties, since the
 * registered roots are disjoint subtrees — one owner per raycast intersection).
 */
import type { Component } from '../component.js';
import { die } from './die.js';
import { table } from './table.js';
import { ledgerComponent } from './ledger.js';
import { seats } from './seats.js';
import { box } from './box.js';

export const COMPONENTS: readonly Component[] = [die, table, ledgerComponent, seats, box];
