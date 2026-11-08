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
  registerRelationForm(core);
  registerRelationDissolve(core);
  registerSurfaceAdd(core);
  registerComponentPlace(core);
  registerSurfaceCompose(core);
}

function registerRelationForm(core: EngineCore): void {
  core.registerIntent('relation:form', { args: relationFormArgs, rules: [onTurn] }, applyRelationForm);
}

function relationFormArgs(_state: State, intent: Intent): true | string {
  const args = intent.args;
  return typeof args['type'] === 'string' && typeof args['from'] === 'string' && typeof args['to'] === 'string'
    ? true
    : 'type/from/to (strings) required';
}

function applyRelationForm(state: State, intent: Intent): JsonObject {
  const args = intent.args;
  return formRelation(state, {
    type: args['type'] as string,
    from: args['from'] as string,
    to: args['to'] as string,
    ...(args['sourcePath'] !== undefined ? { sourcePath: args['sourcePath'] as string } : {}),
    ...(args['mode'] !== undefined ? { mode: args['mode'] as string } : {}),
  });
}

function registerRelationDissolve(core: EngineCore): void {
  core.registerIntent('relation:dissolve', { args: relationDissolveArgs, rules: [onTurn] }, applyRelationDissolve);
}

function relationDissolveArgs(_state: State, intent: Intent): true | string {
  return typeof intent.args['relation'] === 'string' ? true : 'relation id required';
}

function applyRelationDissolve(state: State, intent: Intent): JsonObject {
  return dissolveRelation(state, intent.args['relation'] as string);
}

function registerSurfaceAdd(core: EngineCore): void {
  core.registerIntent('surface:add', { args: surfaceAddArgs, rules: [onTurn] }, applySurfaceAdd);
}

function surfaceAddArgs(_state: State, intent: Intent): true | string {
  const args = intent.args;
  return typeof args['surface'] === 'string' && typeof args['topology'] === 'string'
    ? true
    : 'surface/topology required';
}

function applySurfaceAdd(state: State, intent: Intent): JsonObject {
  return addSurface(state, intent.args['surface'] as string, intent.args['topology'] as string);
}

function registerComponentPlace(core: EngineCore): void {
  core.registerIntent('component:place', { args: componentPlaceArgs, rules: [onTurn] }, applyComponentPlace);
}

function componentPlaceArgs(_state: State, intent: Intent): true | string {
  const args = intent.args;
  return typeof args['component'] === 'string' && typeof args['surface'] === 'string' &&
    typeof args['position'] === 'object' && args['position'] !== null
    ? true
    : 'component/surface/position required';
}

function applyComponentPlace(state: State, intent: Intent): JsonObject {
  const args = intent.args;
  return placeComponent(state, args['component'] as string, args['surface'] as string, args['position'] as JsonObject);
}

function registerSurfaceCompose(core: EngineCore): void {
  core.registerIntent('surface:compose', { args: surfaceComposeArgs, rules: [onTurn] }, applySurfaceCompose);
}

function surfaceComposeArgs(_state: State, intent: Intent): true | string {
  const args = intent.args;
  return typeof args['surface'] === 'string' && Array.isArray(args['components']) && typeof args['topology'] === 'string'
    ? true
    : 'surface/components[]/topology required';
}

function applySurfaceCompose(state: State, intent: Intent): JsonObject {
  const args = intent.args;
  return composeSurface(
    state,
    args['surface'] as string,
    args['components'] as string[],
    args['topology'] as string
  ) as JsonObject;
}
