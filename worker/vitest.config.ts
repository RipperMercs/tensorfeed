import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Pure-logic tests only. No Cloudflare Workers runtime needed.
    // Tests stub KVNamespace via in-memory Map fakes; see routing.test.ts.
  },
});
