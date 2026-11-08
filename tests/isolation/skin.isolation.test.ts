import { describe, it } from 'vitest';
import { SkinRefusal } from '../../packages/presentation/src/skin.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for SkinRefusal (MOD-32, packages/presentation/src/skin.ts).
// Declared inputs: rule, detail. Public members read: rule, name, message, stack. The shared
// refusal checks vary each input in turn and read every member. No environment, clock,
// globals or network is touched.

interface SkinRefusalInputs {
  readonly rule: string;
  readonly detail: string;
}

const BASE: SkinRefusalInputs = {
  rule: 'R-21',
  detail: 'missing tokens: card.face, sound.card-flip',
};

const SPEC: RefusalSpec<SkinRefusalInputs> = {
  type: SkinRefusal,
  typeName: 'SkinRefusal',
  build: ({ rule, detail }) => new SkinRefusal(rule, detail),
  base: BASE,
  variants: {
    rule: { ...BASE, rule: 'R-22' },
    detail: { ...BASE, detail: 'a raw value is not a token: #ff0000' },
  },
  messageOf: ({ rule, detail }) => `Skin refused [${rule}]: ${detail}`,
  fieldsOf: ({ rule }) => ({ rule }),
};

describe('SkinRefusal isolation (rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
