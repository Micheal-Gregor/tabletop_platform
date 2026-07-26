/**
 * rules/wire — the guarded pump intent (S-1, I-29): drains recorded relation emissions
 * through the registry on the player's turn. Full engine-path weave lands at F5.
 */
import type { EngineCore } from '../kernel/core.js';
import type { RuleRegistry } from './registry.js';
import { pumpRelationEvents } from './hookbus.js';
import { onTurnRule as onTurn } from '../kernel/discipline.js';

export function wireRules(core: EngineCore, registry: RuleRegistry): void {
  core.registerIntent(
    'rules:pump',
    { args: () => true, rules: [onTurn] },
    (state) => pumpRelationEvents(state, registry, { windowDepth: 0 })
  );
}
