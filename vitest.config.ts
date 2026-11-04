import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/**/*.spec.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Rules tests share one emulator instance across a whole file (see
    // tests/rules/setup.ts) — running files in parallel workers risks
    // clobbering each other's project state.
    fileParallelism: false,
  },
});
