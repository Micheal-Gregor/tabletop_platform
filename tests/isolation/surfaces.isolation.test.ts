import { describe, it } from 'vitest';
import { SurfaceRefusal } from '../../packages/engine/src/ontology/surfaces.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for SurfaceRefusal (MOD-13, packages/engine/src/ontology/surfaces.ts).
// Declared inputs: surface, rule, detail. Public members read: surface, rule, name, message,
// stack. The shared refusal checks vary each input in turn and read every member. No
// environment, clock, globals or network is touched.

interface SurfaceRefusalInputs {
  readonly surface: string;
  readonly rule: string;
  readonly detail: string;
}

const BASE: SurfaceRefusalInputs = {
  surface: 'board',
  rule: 'GX-17',
  detail: 'grid positions are integer {x, y}',
};

const SPEC: RefusalSpec<SurfaceRefusalInputs> = {
  type: SurfaceRefusal,
  typeName: 'SurfaceRefusal',
  build: ({ surface, rule, detail }) => new SurfaceRefusal(surface, rule, detail),
  base: BASE,
  variants: {
    surface: { ...BASE, surface: 'track-7' },
    rule: { ...BASE, rule: 'GX-18' },
    detail: { ...BASE, detail: 'composition needs at least two components side-by-side' },
  },
  messageOf: ({ surface, rule, detail }) => `Surface refused [${rule}] "${surface}": ${detail}`,
  fieldsOf: ({ surface, rule }) => ({ surface, rule }),
};

describe('SurfaceRefusal isolation (surface, rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
