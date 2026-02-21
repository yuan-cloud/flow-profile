import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'happy-dom',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 85,
        statements: 80,
      },
    },
  },
});
