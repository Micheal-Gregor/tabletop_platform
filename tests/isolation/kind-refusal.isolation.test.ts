import { describe, it } from 'vitest';
import { KindRefusal } from '../../packages/engine/src/ontology/kind-refusal.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for KindRefusal (MOD-10, packages/engine/src/ontology/kind-refusal.ts).
// Declared inputs: kind, rule, detail. Public
// members read: kind, rule, name, message, stack. The shared refusal checks vary each input in
// turn and read every member. No environment, clock, globals or network is touched.

interface KindRefusalInputs {
  readonly kind: string;
  readonly rule: string;
  readonly detail: string;
}

const BASE: KindRefusalInputs = {
  kind: 'Standee',
  rule: 'GX-18/R-14',
  detail: 'already admitted — supersede on the record, never respec',
};

const SPEC: RefusalSpec<KindRefusalInputs> = {
  type: KindRefusal,
  typeName: 'KindRefusal',
  build: ({ kind, rule, detail }) => new KindRefusal(kind, rule, detail),
  base: BASE,
  variants: {
    kind: { ...BASE, kind: 'Lantern' },
    rule: { ...BASE, rule: 'GX-13/EX-2/HK-7' },
    detail: { ...BASE, detail: '(c) relations: "Teleport" is not one of the five' },
  },
  messageOf: ({ kind, rule, detail }) => `Kind refused [${rule}] "${kind}": ${detail}`,
  fieldsOf: ({ kind, rule }) => ({ kind, rule }),
};

describe('KindRefusal isolation (kind, rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
