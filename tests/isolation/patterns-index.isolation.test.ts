import { describe, it } from 'vitest';
import { PatternRefusal } from '../../packages/patterns/src/index.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for PatternRefusal (MOD-28, packages/patterns/src/index.ts).
// Declared inputs: preset, detail. Public members read: preset, name, message, stack. The
// shared refusal checks vary each input in turn and read every member. No environment, clock,
// globals or network is touched.

interface PatternRefusalInputs {
  readonly preset: string;
  readonly detail: string;
}

const BASE: PatternRefusalInputs = {
  preset: 'vnt:job',
  detail: 'id must be a non-empty string',
};

const SPEC: RefusalSpec<PatternRefusalInputs> = {
  type: PatternRefusal,
  typeName: 'PatternRefusal',
  build: ({ preset, detail }) => new PatternRefusal(preset, detail),
  base: BASE,
  variants: {
    preset: { ...BASE, preset: 'iwn:court' },
    detail: { ...BASE, detail: 'at least one option (undecidable window)' },
  },
  messageOf: ({ preset, detail }) => `Pattern refused [GX-33] "${preset}": ${detail}`,
  fieldsOf: ({ preset }) => ({ preset }),
};

describe('PatternRefusal isolation (preset, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
