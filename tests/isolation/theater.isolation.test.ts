import { describe, it } from 'vitest';
import { TheaterRefusal } from '../../packages/presentation/src/theater.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for TheaterRefusal (MOD-34, packages/presentation/src/theater.ts).
// Declared input: detail. Public members read: name, message, stack (the rule GX-38 is fixed in
// the message, not a field). The shared refusal checks vary the input and read every member. No
// environment, clock, globals or network is touched.

interface TheaterRefusalInputs {
  readonly detail: string;
}

const BASE: TheaterRefusalInputs = {
  detail: 'unknown flourish "card-spin" — the library is data, extend it there',
};

const SPEC: RefusalSpec<TheaterRefusalInputs> = {
  type: TheaterRefusal,
  typeName: 'TheaterRefusal',
  build: ({ detail }) => new TheaterRefusal(detail),
  base: BASE,
  variants: {
    detail: { detail: 'unknown flourish "die-spin" — the library is data, extend it there' },
  },
  messageOf: ({ detail }) => `Theater refused [GX-38]: ${detail}`,
  fieldsOf: () => ({}),
};

describe('TheaterRefusal isolation (detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
