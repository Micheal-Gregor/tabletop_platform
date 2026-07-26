/**
 * ontology/wire — guarded intents for ontology operations (seam S-1): HK-7/HK-8 on the
 * REAL path through core.submit. Consumed by packs/F5; tests prove falsifiability here.
 */

import type { Intent, JsonObject, State } from '../kernel/types.js';
import type { EngineCore } from '../kernel/core.js';
import { formRelation, dissolveRelation } from './relations.js';
import { placeComponent, addSurface, composeSurface } from './surfaces.js';

/** I-24: ontology intents are PLAYER intents under turn discipline (shared rule — D10). */
import { onTurnRule as onTurn } from '../kernel/discipline.js';

export function wireOntology(core: EngineCore): void {
  core.registerIntent(
    'relation:form',
    {
      args: (_s, i) =>
        typeof i.args['type'] === 'string' && typeof i.args['from'] === 'string' && typeof i.args['to'] === 'string'
          ? true
          : 'type/from/to (strings) required',
      rules: [onTurn],
    },
    (state, intent) =>
      formRelation(state, {
        type: intent.args['type'] as string,
        from: intent.args['from'] as string,
        to: intent.args['to'] as string,
        ...(intent.args['sourcePath'] !== undefined ? { sourcePath: intent.args['sourcePath'] as string } : {}),
        ...(intent.args['mode'] !== undefined ? { mode: intent.args['mode'] as string } : {}),
      })
  );

  core.registerIntent(
    'relation:dissolve',
    { args: (_s, i) => (typeof i.args['relation'] === 'string' ? true : 'relation id required'), rules: [onTurn] },
    (state, intent) => dissolveRelation(state, intent.args['relation'] as string)
  );

  core.registerIntent(
    'surface:add',
    {
      args: (_s, i) =>
        typeof i.args['surface'] === 'string' && typeof i.args['topology'] === 'string'
          ? true
          : 'surface/topology required',
      rules: [onTurn],
    },
    (state, intent) => addSurface(state, intent.args['surface'] as string, intent.args['topology'] as string)
  );

  core.registerIntent(
    'component:place',
    {
      args: (_s, i) =>
        typeof i.args['component'] === 'string' && typeof i.args['surface'] === 'string' &&
        typeof i.args['position'] === 'object' && i.args['position'] !== null
          ? true
          : 'component/surface/position required',
      rules: [onTurn],
    },
    (state, intent) =>
      placeComponent(state, intent.args['component'] as string, intent.args['surface'] as string, intent.args['position'] as JsonObject)
  );

  core.registerIntent(
    'surface:compose',
    {
      args: (_s, i) =>
        typeof i.args['surface'] === 'string' && Array.isArray(i.args['components']) && typeof i.args['topology'] === 'string'
          ? true
          : 'surface/components[]/topology required',
      rules: [onTurn],
    },
    (state: State, intent: Intent) =>
      composeSurface(
        state,
        intent.args['surface'] as string,
        intent.args['components'] as string[],
        intent.args['topology'] as string
      ) as JsonObject
  );
}
