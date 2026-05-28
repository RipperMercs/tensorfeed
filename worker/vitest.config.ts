import { defineConfig } from 'vitest/config';

export default defineConfig({
  css: {
    // Prevent vite from walking up to the root postcss.config.mjs (which
    // requires tailwindcss that is not installed in the worker subtree).
    postcss: { plugins: [] },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Pure-logic tests only. No Cloudflare Workers runtime needed.
    // Tests stub KVNamespace via in-memory Map fakes; see routing.test.ts.
  },
});
