import { describe, it } from 'vitest';
import { RelationRefusal } from '../../packages/engine/src/ontology/relations.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for RelationRefusal (MOD-12, packages/engine/src/ontology/relations.ts).
// Declared inputs: relation, rule, detail. Public members read: relation, rule, name, message,
// stack. The shared refusal checks vary each input in turn and read every member. No
// environment, clock, globals or network is touched.

interface RelationRefusalInputs {
  readonly relation: string;
  readonly rule: string;
  readonly detail: string;
}

const BASE: RelationRefusalInputs = {
  relation: 'Placement',
  rule: 'GX-15/R-13',
  detail: 'unknown relation type — no formation predicate',
};

const SPEC: RefusalSpec<RelationRefusalInputs> = {
  type: RelationRefusal,
  typeName: 'RelationRefusal',
  build: ({ relation, rule, detail }) => new RelationRefusal(relation, rule, detail),
  base: BASE,
  variants: {
    relation: { ...BASE, relation: 'Representation' },
    rule: { ...BASE, rule: 'GX-16/R-12' },
    detail: { ...BASE, detail: 'a Representation is a read-only view — it never owns' },
  },
  messageOf: ({ relation, rule, detail }) => `Relation refused [${rule}] ${relation}: ${detail}`,
  fieldsOf: ({ relation, rule }) => ({ relation, rule }),
};

describe('RelationRefusal isolation (relation, rule, detail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
