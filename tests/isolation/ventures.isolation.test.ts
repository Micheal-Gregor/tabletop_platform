import { describe, it } from 'vitest';
import { VentureRefusal } from '../../packages/engine/src/library/ventures.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for VentureRefusal (MOD-22, packages/engine/src/library/ventures.ts).
// Declared inputs: venture, rule, detail. Public members read: venture, rule, name, message,
// stack. The shared refusal checks vary each input in turn and read every member. No
// environment, clock, globals or network is touched.

interface VentureRefusalInputs {
  readonly venture: string;
  readonly rule: string;
  readonly detail: string;
}

const BASE: VentureRefusalInputs = {
  venture: 'v-roof',
  rule: 'GX-26',
  detail: 'missing or duplicate venture id',
};

const SPEC: RefusalSpec<VentureRefusalInputs> = {
  type: VentureRefusal,
  typeName: 'VentureRefusal',
  build: ({ venture, rule, detail }) => new VentureRefusal(venture, rule, detail),
  base: BASE,
  variants: {
    venture: { ...BASE, venture: 'v-fence' },
    rule: { ...BASE, rule: 'GX-28/CRW' },
    detail: { ...BASE, detail: 'a venture carries at least one portion' },
  },
  messageOf: ({ venture, rule, detail }) => `Venture refused [${rule}] "${venture}": ${detail}`,
  fieldsOf: ({ venture, rule }) => ({ venture, rule }),
};

describe('VentureRefusal isolation (venture, rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
