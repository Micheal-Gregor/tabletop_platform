import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['packages/*/tests/**/*.test.ts', 'packs/*/tests/**/*.test.ts', 'utilization/bench/tests/**/*.test.ts', 'tests/**/*.test.ts'] /* L-4 (I-131): the bench's pure planners join the suite; R1 (I-261): the OS-12 isolation tests live in tests/isolation/ */ } });
