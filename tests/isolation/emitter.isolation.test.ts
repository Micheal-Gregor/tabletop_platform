import { describe, it } from 'vitest';
import { EmissionRefusal } from '../../packages/presentation/src/emitter.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for EmissionRefusal (MOD-31, packages/presentation/src/emitter.ts).
// Declared input: detail. Public members read: name, message, stack (the rule GX-37/R-23 is
// fixed in the message, not a field). The shared refusal checks vary the input and read every
// member. No environment, clock, globals or network is touched.

interface EmissionRefusalInputs {
  readonly detail: string;
}

const BASE: EmissionRefusalInputs = {
  detail: 'unknown verb "shuffle" — the map is closed',
};

const SPEC: RefusalSpec<EmissionRefusalInputs> = {
  type: EmissionRefusal,
  typeName: 'EmissionRefusal',
  build: ({ detail }) => new EmissionRefusal(detail),
  base: BASE,
  variants: {
    detail: { detail: 'seat required' },
  },
  messageOf: ({ detail }) => `Emission refused [GX-37/R-23]: ${detail}`,
  fieldsOf: () => ({}),
};

describe('EmissionRefusal isolation (detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
