import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@flow-profile/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/apps/**', '**/e2e/**', '**/packages/ui/**'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'html'],
      include: ['packages/core/src/**/*.ts', 'packages/ai/src/**/*.ts', 'packages/cli/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts', '**/*.d.ts', '**/doc/generate.ts'],
      thresholds: {
        'packages/core/src/**/*.ts': {
          lines: 80,
          branches: 70,
          functions: 90,
          statements: 80,
        },
        'packages/ai/src/**/*.ts': {
          lines: 80,
          branches: 70,
          functions: 90,
          statements: 80,
        },
      },
    },
    snapshotFormat: {
      printBasicPrototype: false,
    },
  },
});
