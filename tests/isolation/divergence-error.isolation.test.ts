import { describe, it } from 'vitest';
import { DivergenceError } from '../../packages/engine/src/kernel/divergence-error.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for DivergenceError (MOD-03, packages/engine/src/kernel/divergence-error.ts).
// Declared inputs: index, refusalDetail. Public members read: index, refusalDetail, name, message,
// stack. The shared refusal checks vary each input in turn and read every member. No environment,
// clock, globals or network is touched.

interface DivergenceInputs {
  readonly index: number;
  readonly refusalDetail: string;
}

const BASE: DivergenceInputs = {
  index: 4,
  refusalDetail: 'missing move in row',
};

const SPEC: RefusalSpec<DivergenceInputs> = {
  type: DivergenceError,
  typeName: 'DivergenceError',
  build: ({ index, refusalDetail }) => new DivergenceError(index, refusalDetail),
  base: BASE,
  variants: {
    index: { ...BASE, index: 9 },
    refusalDetail: { ...BASE, refusalDetail: 'applier refusal during replay' },
  },
  messageOf: ({ index, refusalDetail }) =>
    `Replay divergence at move ${index}: ${refusalDetail} — full rebuild refused (GX-4/R-9); never patch`,
  fieldsOf: ({ index, refusalDetail }) => ({ index, refusalDetail }),
};

describe('DivergenceError isolation (index, refusalDetail)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
