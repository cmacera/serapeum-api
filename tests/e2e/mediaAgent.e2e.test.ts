import * as dotenv from 'dotenv';
import { describe, it, expect, vi } from 'vitest';

// Load environment variables immediately to allow local RUN_E2E=true in .env
dotenv.config();

/**
 * E2E tests for mediaAgent.
 * These tests are EXCLUDED from the default CI run in vitest.config.ts.
 * To run them locally, ensure RUN_E2E=true is in your .env or run:
 * RUN_E2E=true npm run test:e2e
 */
const SHOULD_RUN = process.env['RUN_E2E'] === 'true';

if (SHOULD_RUN) {
  // Unmock Genkit AI to use real models
  vi.unmock('../../src/lib/ai');
}

describe('mediaAgent E2E', () => {
  if (!SHOULD_RUN) {
    it.skip('skipping e2e tests (RUN_E2E is not set to true)', () => {});
    return;
  }

  it('should research and fetch items for a vague query in Spanish', async () => {
    // Dynamic import to ensure the unmocked AI is used
    const { mediaAgent } = await import('../../src/flows/agent/mediaAgent.js');

    const result = await mediaAgent({
      prompt: 'dime sobre series de zombies populares',
      language: 'es',
    });

    // Basic structural assertions
    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.summary.trim().length).toBeGreaterThan(0);
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);

    // Verify first item structure
    const firstItem = result.items[0];
    expect(firstItem?.id).toBeDefined();
    expect(firstItem?.title).toBeDefined();
    expect(firstItem?.type).toBeDefined();
  }, 60000); // Higher timeout (60s) for real LLM/Search orchestration
});
