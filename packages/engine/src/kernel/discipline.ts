/** Shared turn-order rule (K7-F4 D10: one copy, three consumers — packloader, ontology, rules). */
import type { Intent, State } from './types.js';

export function onTurnRule(state: State, intent: Intent): true | { rule: string; detail: string } {
  const turn = state['turn'] as { seatIdx: number } | undefined;
  const rows = state['seats'] as readonly { id: string }[] | undefined;
  const active = rows?.[turn?.seatIdx ?? -1]?.id;
  return active === intent.seat
    ? true
    : { rule: 'M5/turn-order', detail: `not seat "${intent.seat}"'s turn` };
}
