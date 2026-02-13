import { describe, it, expect, vi } from 'vitest';
// @ts-ignore
import { mediaAgent } from '@/flows/agent/mediaAgent';

// Mock googleai plugin exports

// Mock the AI library to avoid actual LLM calls and dependencies
vi.mock('@/lib/ai', () => ({
  ai: {
    // defineFlow typically wraps the function, here we just return it to execute directly or wrapped
    defineFlow: (config: any, fn: any) => fn,
    generate: vi.fn().mockImplementation(async ({ prompt }) => {
      if (prompt.includes('Inception'))
        return { text: 'Mocked TMDB Result', output: 'Mocked TMDB Result' };
      if (prompt.includes('Harry Potter'))
        return { text: 'Mocked Book Result', output: 'Mocked Book Result' };
      if (prompt.includes('Elden Ring'))
        return { text: 'Mocked Game Result', output: 'Mocked Game Result' };
      return { text: 'Mocked Web Search Result', output: 'Mocked Web Search Result' };
    }),
  },
  z: {
    object: (schema: any) => schema,
    string: () => ({ describe: () => ({}) }),
    any: () => ({ optional: () => ({ describe: () => ({}) }) }),
    unknown: () => ({ optional: () => ({}) }),
  },
}));

// Mock tools to avoid importing their dependencies
vi.mock('@/tools/search-media-tool', () => ({ searchMediaTool: {} }));
vi.mock('@/tools/search-books-tool', () => ({ searchBooksTool: {} }));
vi.mock('@/tools/search-games-tool', () => ({ searchGamesTool: {} }));
vi.mock('@/tools/search-tavily-tool', () => ({ searchTavilyTool: {} }));

describe('mediaAgent Flow', () => {
  it('should process movie queries', async () => {
    const result = await mediaAgent({ prompt: 'Inception movie' });
    expect(result.text).toContain('Mocked TMDB Result');
    expect(result.output).toBeDefined();
  });

  it('should process book queries', async () => {
    const result = await mediaAgent({ prompt: 'Harry Potter book' });
    expect(result.text).toContain('Mocked Book Result');
    expect(result.output).toBeDefined();
  });

  it('should process game queries', async () => {
    const result = await mediaAgent({ prompt: 'Elden Ring game' });
    expect(result.text).toContain('Mocked Game Result');
    expect(result.output).toBeDefined();
  });

  it('should fall back to web search/general query', async () => {
    const result = await mediaAgent({ prompt: 'General query' });
    expect(result.text).toContain('Mocked Web Search Result');
  });
});
