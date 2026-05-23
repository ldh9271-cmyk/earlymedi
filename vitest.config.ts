import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      exclude: ['**/node_modules/**', '**/.next/**', '**/tests/**', '**/drizzle/migrations/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // server-only is a Next.js marker — stub it in unit tests so server modules can be imported.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
