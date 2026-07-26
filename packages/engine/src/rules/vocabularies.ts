/**
 * GovernedVocabulary «interface» — the shared growth contract over EFX / HookPoints /
 * VerbSets (S-7): closed · versioned · growth ONLY through ExtensionContract cycles.
 * Traces: S3 F4 ← S2 GovernedVocabulary. Axiom: GX-23. Member names for HookPoints are
 * I-28 (record gives counts: 7 turn + 6 lifecycle + on-form/on-dissolve × 5 = 23).
 */
import { EFX_V1_1_1 } from '../play/effects.js';
import { RELATION_TYPES } from '../ontology/relations.js';

export interface GovernedVocabulary {
  readonly name: string;
  readonly version: string;
  readonly members: readonly string[];
}

const TURN_HOOKS = [
  'on-round-start', 'on-turn-start', 'on-draw-phase', 'on-resolution-phase',
  'on-maintenance-phase', 'on-cleanup-phase', 'on-round-wrap',
] as const;
const LIFECYCLE_HOOKS = [
  'on-card-drawn', 'on-window-opened', 'on-window-resolved',
  'on-component-placed', 'on-surface-composed', 'on-game-closing',
] as const;
const RELATION_HOOKS = RELATION_TYPES.flatMap((t) => [`on-form:${t}`, `on-dissolve:${t}`]);

export const HOOK_POINTS_V1: GovernedVocabulary = Object.freeze({
  name: 'HookPoints',
  version: '1.0',
  members: Object.freeze([...TURN_HOOKS, ...LIFECYCLE_HOOKS, ...RELATION_HOOKS]),
});

export const VERB_SETS_V1: GovernedVocabulary = Object.freeze({
  name: 'VerbSets',
  version: '1.0',
  members: Object.freeze(['roll', 'spin', 'flip', 'snap', 'slide', 'drag', 'tap']),
});

export const EFX_GOVERNED: GovernedVocabulary = Object.freeze({
  name: 'EFX',
  version: '1.1.1',
  members: EFX_V1_1_1,
});

export const VOCABULARIES: readonly GovernedVocabulary[] = Object.freeze([
  EFX_GOVERNED, HOOK_POINTS_V1, VERB_SETS_V1,
]);
