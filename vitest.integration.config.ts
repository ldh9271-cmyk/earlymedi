import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * 통합 테스트 — .env.local 의 DATABASE_URL 에 실제로 붙는다 (운영 DB 일 수
 * 있으니 테스트는 만든 행을 반드시 지운다). 기본 `npm test` 에는 포함되지
 * 않고 명시적으로만 돈다:
 *
 *   npx vitest run --config vitest.integration.config.ts
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
