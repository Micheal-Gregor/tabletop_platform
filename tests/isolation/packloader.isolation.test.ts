import { describe, it } from 'vitest';
import { PackLoadRefusal } from '../../packages/engine/src/play/packloader.js';
import { REFUSAL_CHECKS, type RefusalSpec } from './refusal-checks.js';

// OS-12 isolation test for PackLoadRefusal (MOD-08, packages/engine/src/play/packloader.ts).
// Declared input: defects. Public members read: defects, name, message, stack. The shared
// refusal checks vary the input and read every member. No environment, clock, globals or
// network is touched.

interface PackLoadRefusalInputs {
  readonly defects: readonly string[];
}

const BASE: PackLoadRefusalInputs = {
  defects: ['missing pack id', 'pack declares no seats'],
};

const SPEC: RefusalSpec<PackLoadRefusalInputs> = {
  type: PackLoadRefusal,
  typeName: 'PackLoadRefusal',
  build: ({ defects }) => new PackLoadRefusal(defects),
  base: BASE,
  variants: {
    defects: { defects: ['card "dragon" carries fx ∉ EFX: "summon_dragon"'] },
  },
  messageOf: ({ defects }) => `Pack refused [GX-10/R-2/HK-4] — defects: ${defects.join(' · ')}`,
  fieldsOf: ({ defects }) => ({ defects }),
};

describe('PackLoadRefusal isolation (defects)', () => {
  it.each(REFUSAL_CHECKS)('%s', (_sentence, check) => {
    check(SPEC);
  });
});
