import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      GEMINI_MODEL: 'gemini-2.5-flash',
      OLLAMA_MODEL: 'llama3',
      AI_PROVIDER: 'google',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/*-types.ts',
      ],
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
    setupFiles: ['./tests/setup-media-agent.ts'],
    pool: 'threads',
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
