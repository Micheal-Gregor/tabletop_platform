import { describe, it } from 'vitest';
import { TransportRefusal } from '../../packages/engine/src/transport/transport-refusal.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for TransportRefusal (MOD-27, packages/engine/src/transport/transport-refusal.ts).
// Declared inputs: rule, detail. Public members read: rule, name, message, stack. The shared
// refusal checks vary each input in turn and read every member. No environment, clock, globals
// or network is touched.

interface TransportRefusalInputs {
  readonly rule: string;
  readonly detail: string;
}

const BASE: TransportRefusalInputs = {
  rule: 'GX-32',
  detail: 'unknown seat "z"',
};

const SPEC: RefusalSpec<TransportRefusalInputs> = {
  type: TransportRefusal,
  typeName: 'TransportRefusal',
  build: ({ rule, detail }) => new TransportRefusal(rule, detail),
  base: BASE,
  variants: {
    rule: { ...BASE, rule: 'GX-31/SUP-1' },
    detail: { ...BASE, detail: 'packRef HASH mismatch — divergence, refused whole' },
  },
  messageOf: ({ rule, detail }) => `Transport refused [${rule}]: ${detail}`,
  fieldsOf: ({ rule }) => ({ rule }),
};

describe('TransportRefusal isolation (rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
