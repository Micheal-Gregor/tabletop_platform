import { describe, it } from 'vitest';
import { LedgerRefusal } from '../../packages/engine/src/library/ledger.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for LedgerRefusal (MOD-24, packages/engine/src/library/ledger.ts).
// Declared inputs: rule, detail. Public members read: rule, name, message, stack. The shared
// refusal checks vary each input in turn and read every member. No environment, clock, globals
// or network is touched.

interface LedgerRefusalInputs {
  readonly rule: string;
  readonly detail: string;
}

const BASE: LedgerRefusalInputs = {
  rule: 'GX-25/R-5',
  detail: 'unbalanced post (sum 3) — "tribute"',
};

const SPEC: RefusalSpec<LedgerRefusalInputs> = {
  type: LedgerRefusal,
  typeName: 'LedgerRefusal',
  build: ({ rule, detail }) => new LedgerRefusal(rule, detail),
  base: BASE,
  variants: {
    rule: { ...BASE, rule: 'GX-25' },
    detail: { ...BASE, detail: 'empty post' },
  },
  messageOf: ({ rule, detail }) => `Ledger refused [${rule}]: ${detail}`,
  fieldsOf: ({ rule }) => ({ rule }),
};

describe('LedgerRefusal isolation (rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
