/**
 * rules/wire — the guarded pump intent (S-1, I-29): drains recorded relation emissions
 * through the registry on the player's turn. Full engine-path weave lands at F5.
 */
import type { Intent, State } from '../kernel/types.js';
import type { EngineCore } from '../kernel/core.js';
import type { RuleRegistry } from './registry.js';
import { pumpRelationEvents } from './hookbus.js';

function onTurn(state: State, intent: Intent): true | { rule: string; detail: string } {
  const turn = state['turn'] as { seatIdx: number } | undefined;
  const rows = state['seats'] as readonly { id: string }[] | undefined;
  const active = rows?.[turn?.seatIdx ?? -1]?.id;
  return active === intent.seat ? true : { rule: 'M5/turn-order (I-24)', detail: `not seat "${intent.seat}"'s turn` };
}

export function wireRules(core: EngineCore, registry: RuleRegistry): void {
  core.registerIntent(
    'rules:pump',
    { args: () => true, rules: [onTurn] },
    (state) => pumpRelationEvents(state, registry, { windowDepth: 0 })
  );
}
