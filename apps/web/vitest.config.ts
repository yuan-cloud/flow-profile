import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@flow-profile/core': fileURLToPath(
        new URL('../../packages/core/src/index.ts', import.meta.url),
      ),
      '@flow-profile/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
      '@flow-profile/ai': fileURLToPath(new URL('../../packages/ai/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/index.ts', '**/*.d.ts', 'src/vite-env.d.ts'],
      thresholds: {
        'src/composables/**/*.ts': {
          lines: 80,
          branches: 65,
          functions: 90,
          statements: 80,
        },
        'src/stores/**/*.ts': {
          lines: 75,
          branches: 50,
          functions: 75,
          statements: 75,
        },
      },
    },
  },
});
