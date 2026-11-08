import { describe, it } from 'vitest';
import { ClosingRefusal } from '../../packages/engine/src/library/closing.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for ClosingRefusal (MOD-26, packages/engine/src/library/closing.ts).
// Declared input: detail. Public members read: name, message, stack (the class adds no field of
// its own). The shared refusal checks vary the input and read every member. No environment,
// clock, globals or network is touched.

interface ClosingRefusalInputs {
  readonly detail: string;
}

const BASE: ClosingRefusalInputs = {
  detail: "reckon requires status 'closing', got 'running' — the end-trigger owns entry",
};

const SPEC: RefusalSpec<ClosingRefusalInputs> = {
  type: ClosingRefusal,
  typeName: 'ClosingRefusal',
  build: ({ detail }) => new ClosingRefusal(detail),
  base: BASE,
  variants: {
    detail: { detail: "reckon requires status 'closing', got 'ended' — the end-trigger owns entry" },
  },
  messageOf: ({ detail }) => `Closing refused [GX-30]: ${detail}`,
  fieldsOf: () => ({}),
};

describe('ClosingRefusal isolation (detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
