import { describe, it } from 'vitest';
import { ProjectionBreach } from '../../packages/presentation/src/projector.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for ProjectionBreach (MOD-33, packages/presentation/src/projector.ts).
// Declared input: detail. Public members read: name, message, stack (the rule GX-35/R-19 is
// fixed in the message, not a field). The shared refusal checks vary the input and read every
// member. No environment, clock, globals or network is touched.

interface ProjectionBreachInputs {
  readonly detail: string;
}

const BASE: ProjectionBreachInputs = {
  detail: 'render read outside SeatProjector — pass the PROJECTED view, never raw state',
};

const SPEC: RefusalSpec<ProjectionBreachInputs> = {
  type: ProjectionBreach,
  typeName: 'ProjectionBreach',
  build: ({ detail }) => new ProjectionBreach(detail),
  base: BASE,
  variants: {
    detail: { detail: 'unknown seat "GHOST"' },
  },
  messageOf: ({ detail }) => `Projection breach [GX-35/R-19]: ${detail}`,
  fieldsOf: () => ({}),
};

describe('ProjectionBreach isolation (detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
