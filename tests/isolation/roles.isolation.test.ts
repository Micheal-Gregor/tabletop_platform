import { describe, it } from 'vitest';
import { RoleRefusal } from '../../packages/engine/src/ontology/roles.js';
import {
  checkConstructed,
  checkFieldsRead,
  checkMessageFollowsEachInput,
  checkNameFixed,
  checkSameInputsSameAnswer,
  checkStackFollowsEachInput,
  checkThrowsTyped,
  checkVariantsDifferInOneInput,
  type RefusalSpec,
} from './refusal-checks.js';

// OS-12 isolation test for RoleRefusal (MOD-11, packages/engine/src/ontology/roles.ts).
// Declared inputs: role, rule, detail. Public members read: role, rule, name, message, stack.
// Each input is varied in turn by the shared refusal checks. No environment, clock, globals or
// network is touched.

interface RoleRefusalInputs {
  readonly role: string;
  readonly rule: string;
  readonly detail: string;
}

const BASE: RoleRefusalInputs = {
  role: 'Navigator',
  rule: 'GX-14/R-11',
  detail: 'unknown role — no platform primitive to bind',
};

const SPEC: RefusalSpec<RoleRefusalInputs> = {
  type: RoleRefusal,
  typeName: 'RoleRefusal',
  build: ({ role, rule, detail }) => new RoleRefusal(role, rule, detail),
  base: BASE,
  variants: {
    role: { ...BASE, role: 'Herald' },
    rule: { ...BASE, rule: 'GX-14/ODG-e1' },
    detail: { ...BASE, detail: 'binding DEFERRED behind the Clock seam — resolve ODG-e1 first' },
  },
  messageOf: ({ role, rule, detail }) => `Role refused [${rule}] "${role}": ${detail}`,
  fieldsOf: ({ role, rule }) => ({ role, rule }),
};

describe('RoleRefusal isolation: the table is sound', () => {
  it('each variant differs from the base in its one input only', () => {
    checkVariantsDifferInOneInput(SPEC);
  });
});

describe('RoleRefusal isolation: construction', () => {
  it('is an Error of its own type with the message its inputs give', () => {
    checkConstructed(SPEC);
  });

  it('the same inputs twice give the same message and name', () => {
    checkSameInputsSameAnswer(SPEC);
  });
});

describe('RoleRefusal isolation: public members', () => {
  it('reads role and rule: each answers from its own input', () => {
    checkFieldsRead(SPEC);
  });

  it('reads name: fixed, invariant to role, rule and detail', () => {
    checkNameFixed(SPEC);
  });

  it('reads message: role, rule and detail each change it', () => {
    checkMessageFollowsEachInput(SPEC);
  });

  it('reads stack: it carries the message, so each input changes it', () => {
    checkStackFollowsEachInput(SPEC);
  });
});

describe('RoleRefusal isolation: thrown as a typed refusal', () => {
  it('is caught by its own type, not as a broken call', () => {
    checkThrowsTyped(SPEC);
  });
});
