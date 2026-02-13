import { describe, it, expect, vi } from 'vitest';
import * as dotenv from 'dotenv';

// Unmock the AI library to allow real API calls
vi.unmock('../../src/lib/ai');

// Load environment variables for real API calls
dotenv.config();

describe('mediaAgent E2E', () => {
  // Increase timeout for real LLM and tool calls
  it('should research and fetch items for a vague query in Spanish', async () => {
    // Dynamic import to ensure env vars are loaded BEFORE genkit initializes
    const { mediaAgent } = await import('../../src/flows/agent/mediaAgent.js');

    const result = await mediaAgent({
      prompt: 'Juegos parecidos a Fallout',
      language: 'es',
    });

    // Verify structure
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);

    // Verify content (basic check)
    // Summary should be in Spanish (contains common Spanish words)
    const spanishIndicators = [
      'juego',
      'historia',
      'mundo',
      'post-apocalíptico',
      'serie',
      'título',
    ];
    const summaryLower = result.summary.toLowerCase();
    const hasSpanish = spanishIndicators.some((word) => summaryLower.includes(word));
    expect(hasSpanish).toBe(true);

    // Verify items have correct schema
    const firstItem = result.items[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('type');

    // Should find games
    const hasGames = result.items.some((item) => item.type === 'game');
    expect(hasGames).toBe(true);
  }, 60000); // 60s timeout
});
