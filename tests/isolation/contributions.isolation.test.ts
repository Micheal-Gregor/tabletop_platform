import { describe, it } from 'vitest';
import { ContributionRefusal } from '../../packages/engine/src/rules/contributions.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for ContributionRefusal (MOD-17, packages/engine/src/rules/contributions.ts).
// Declared inputs: contribution, rule, detail. Public members read: contribution, rule, name,
// message, stack. The shared refusal checks vary each input in turn and read every member. No
// environment, clock, globals or network is touched.

interface ContributionRefusalInputs {
  readonly contribution: string;
  readonly rule: string;
  readonly detail: string;
}

const BASE: ContributionRefusalInputs = {
  contribution: 'c1',
  rule: 'GX-20/R-15/R-16/HK-4',
  detail: 'trigger "on-nothing" ∉ HookPoints v1.0',
};

const SPEC: RefusalSpec<ContributionRefusalInputs> = {
  type: ContributionRefusal,
  typeName: 'ContributionRefusal',
  build: ({ contribution, rule, detail }) => new ContributionRefusal(contribution, rule, detail),
  base: BASE,
  variants: {
    contribution: { ...BASE, contribution: 'c2' },
    rule: { ...BASE, rule: 'RE-7' },
    detail: { ...BASE, detail: 'unknown EFX version "9.9.9" (supported: 1.1.1)' },
  },
  messageOf: ({ contribution, rule, detail }) => `Contribution refused [${rule}] "${contribution}": ${detail}`,
  fieldsOf: ({ contribution, rule }) => ({ contribution, rule }),
};

describe('ContributionRefusal isolation (contribution, rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
