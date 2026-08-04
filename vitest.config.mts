import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['packages/*/tests/**/*.test.ts', 'packs/*/tests/**/*.test.ts', 'utilization/bench/tests/**/*.test.ts'] /* L-4 (I-131): the bench's pure planners join the suite */ } });
