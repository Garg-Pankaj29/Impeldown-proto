// Vitest config — server workspace
// Follows docs/architecture.md
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
    },
  },
});
