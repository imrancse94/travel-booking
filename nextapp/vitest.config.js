import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Component tests run under Vitest rather than through Next's build, so the
// `@/*` alias from jsconfig.json has to be repeated here for Vite to resolve it.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.jsx',
    // API/integration tests (src/tests/api/**) opt into a Node environment via
    // a `// @vitest-environment node` docblock; they hit a real Postgres
    // (mirrors .github/workflows/ci.yml's `test` job) rather than mocking the
    // DB layer. Point them at a dedicated test database so they never touch
    // the dev DB an engineer might have running locally.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://booking_user:booking_password@localhost:5432/booking_test',
      DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX || '25',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret',
      EMAIL_PROVIDER: 'console',
      PAYMENT_GATEWAY: 'mock',
    },
  },
});
