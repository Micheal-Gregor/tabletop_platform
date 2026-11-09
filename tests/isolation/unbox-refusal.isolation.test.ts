import { describe, it } from 'vitest';
import { UnboxRefusal } from '../../packages/presentation/src/unbox-refusal.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for UnboxRefusal (MOD-33, packages/presentation/src/unbox-refusal.ts).
// Declared input: detail. Public members read: name, message, stack (the rule GX-35 is fixed in
// the message, not a field). The shared refusal checks vary the input and read every member.
// No environment, clock, globals or network is touched.

interface UnboxRefusalInputs {
  readonly detail: string;
}

const BASE: UnboxRefusalInputs = {
  detail: 'seat "B" may not unbox "A"\'s cards — not yours',
};

const SPEC: RefusalSpec<UnboxRefusalInputs> = {
  type: UnboxRefusal,
  typeName: 'UnboxRefusal',
  build: ({ detail }) => new UnboxRefusal(detail),
  base: BASE,
  variants: {
    detail: { detail: 'nothing to reveal' },
  },
  messageOf: ({ detail }) => `Unbox refused [GX-35]: ${detail}`,
  fieldsOf: () => ({}),
};

describe('UnboxRefusal isolation (detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
