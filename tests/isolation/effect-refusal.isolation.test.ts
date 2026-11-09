import { describe, it } from 'vitest';
import { EffectRefusal } from '../../packages/engine/src/play/effect-refusal.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for EffectRefusal (MOD-09, packages/engine/src/play/effect-refusal.ts).
// Declared inputs: descriptor, rule, detail. Public members read: descriptor, rule, name,
// message, stack. The shared refusal checks vary each input in turn and read every member.
// No environment, clock, globals or network is touched.

interface EffectRefusalInputs {
  readonly descriptor: string;
  readonly rule: string;
  readonly detail: string;
}

const BASE: EffectRefusalInputs = {
  descriptor: 'summon_dragon',
  rule: 'GX-7/R-3/HK-9',
  detail: 'unknown descriptor — halt, never skip',
};

const SPEC: RefusalSpec<EffectRefusalInputs> = {
  type: EffectRefusal,
  typeName: 'EffectRefusal',
  build: ({ descriptor, rule, detail }) => new EffectRefusal(descriptor, rule, detail),
  base: BASE,
  variants: {
    descriptor: { ...BASE, descriptor: 'open_window' },
    rule: { ...BASE, rule: 'GX-11/R-17' },
    detail: { ...BASE, detail: 'open_window from inside a window application' },
  },
  messageOf: ({ descriptor, rule, detail }) => `Effect refused [${rule}] descriptor "${descriptor}": ${detail}`,
  fieldsOf: ({ descriptor, rule }) => ({ descriptor, rule }),
};

describe('EffectRefusal isolation (descriptor, rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
