import { describe, it, expect, vi } from 'vitest';
// @ts-ignore
import { mediaAgent } from '@/flows/agent/mediaAgent';

// Mock the AI library to avoid actual LLM calls and dependencies
vi.mock('@/lib/ai', () => ({
  ai: {
    // defineFlow typically wraps the function, here we just return it to execute directly or wrapped
    defineFlow: (_config: any, fn: any) => fn,
    generate: vi.fn().mockImplementation(async ({ prompt }) => {
      let resultText = 'Mocked Result';
      if (prompt.includes('Inception')) resultText = 'Mocked TMDB Result';
      else if (prompt.includes('Harry Potter')) resultText = 'Mocked Book Result';
      else if (prompt.includes('Elden Ring')) resultText = 'Mocked Game Result';

      return {
        output: {
          summary: resultText,
          items: [
            {
              id: '1',
              title: 'Mocked Item',
              type: 'movie',
              posterUrl: 'http://example.com/poster.jpg',
              releaseDate: '2023-01-01',
            },
          ],
        },
      };
    }),
  },
  z: {
    object: (schema: any) => schema,
    string: () => {
      const mock: any = {
        describe: () => mock,
        optional: () => mock,
      };
      return mock;
    },
    enum: () => {
      const mock: any = {
        describe: () => mock,
        optional: () => mock,
        default: () => mock,
      };
      return mock;
    },
    coerce: {
      string: () => {
        const mock: any = {
          describe: () => mock,
        };
        return mock;
      },
    },
    array: () => {
      const mock: any = {
        describe: () => mock,
      };
      return mock;
    },
    any: () => {
      const mock: any = {
        optional: () => mock,
        describe: () => mock,
      };
      return mock;
    },
    unknown: () => ({ optional: () => ({}) }),
  },
  activeModel: 'mock-model',
}));

// Mock tools to avoid importing their dependencies
vi.mock('@/tools/search-media-tool', () => ({ searchMediaTool: {} }));
vi.mock('@/tools/search-books-tool', () => ({ searchBooksTool: {} }));
vi.mock('@/tools/search-games-tool', () => ({ searchGamesTool: {} }));
vi.mock('@/tools/search-tavily-tool', () => ({ searchTavilyTool: {} }));

describe('mediaAgent Flow', () => {
  it('should process movie queries', async () => {
    const result = await mediaAgent({ prompt: 'Inception movie' });
    expect(result.summary).toContain('Mocked TMDB Result');
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should process book queries', async () => {
    const result = await mediaAgent({ prompt: 'Harry Potter book' });
    expect(result.summary).toContain('Mocked Book Result');
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should process game queries', async () => {
    const result = await mediaAgent({ prompt: 'Elden Ring game' });
    expect(result.summary).toContain('Mocked Game Result');
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should fall back to web search/general query', async () => {
    const result = await mediaAgent({ prompt: 'General query' });
    expect(result.summary).toBeDefined();
    expect(result.items).toBeDefined();
  });
});
