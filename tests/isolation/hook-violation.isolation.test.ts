import { describe, it } from 'vitest';
import { HookViolation } from '../../packages/engine/src/kernel/hook-violation.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for HookViolation (MOD-02, packages/engine/src/kernel/hook-violation.ts).
// Declared inputs: hook, detail. Public members read: hook, name, message, stack. The shared
// refusal checks vary each input in turn and read every member. No environment, clock, globals
// or network is touched.

interface HookViolationInputs {
  readonly hook: 'HK-1' | 'HK-2';
  readonly detail: string;
}

const BASE: HookViolationInputs = {
  hook: 'HK-1',
  detail: 'mutation attempted without a LEGAL guard verdict',
};

const SPEC: RefusalSpec<HookViolationInputs> = {
  type: HookViolation,
  typeName: 'HookViolation',
  build: ({ hook, detail }) => new HookViolation(hook, detail),
  base: BASE,
  variants: {
    hook: { ...BASE, hook: 'HK-2' },
    detail: { ...BASE, detail: 'log append attempted without a succeeded apply' },
  },
  messageOf: ({ hook, detail }) => `${hook} violated: ${detail}`,
  fieldsOf: ({ hook }) => ({ hook }),
};

describe('HookViolation isolation (hook, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
