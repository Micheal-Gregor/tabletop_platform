import { describe, it } from 'vitest';
import { LayoutRefusal } from '../../packages/presentation/src/layout.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for LayoutRefusal (MOD-30, packages/presentation/src/layout.ts).
// Declared inputs: layout, detail. Public members read: layout, name, message, stack. The shared
// refusal checks vary each input in turn and read every member. No environment, clock, globals
// or network is touched.

interface LayoutRefusalInputs {
  readonly layout: string;
  readonly detail: string;
}

const BASE: LayoutRefusalInputs = {
  layout: 'template:card',
  detail: 'region "art" escapes the unit space (0..100)',
};

const SPEC: RefusalSpec<LayoutRefusalInputs> = {
  type: LayoutRefusal,
  typeName: 'LayoutRefusal',
  build: ({ layout, detail }) => new LayoutRefusal(layout, detail),
  base: BASE,
  variants: {
    layout: { ...BASE, layout: 'camera' },
    detail: { ...BASE, detail: 'a shape needs at least three points' },
  },
  messageOf: ({ layout, detail }) => `Layout refused [I-50] "${layout}": ${detail}`,
  fieldsOf: ({ layout }) => ({ layout }),
};

describe('LayoutRefusal isolation (layout, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
