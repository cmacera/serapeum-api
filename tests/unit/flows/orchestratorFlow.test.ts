import { describe, it, expect, vi, beforeEach } from 'vitest';
// @ts-ignore
import { orchestratorFlow } from '@/flows/agent/orchestratorFlow';

// Mock the AI library
vi.mock('@/lib/ai', () => {
  // Helper for recursive mock schema
  const mockSchema = {
    parse: (data: any) => data,
    describe: () => mockSchema,
    optional: () => mockSchema,
    nullable: () => mockSchema,
    passthrough: () => mockSchema,
    or: () => mockSchema,
    and: () => mockSchema,
  };

  return {
    ai: {
      defineFlow: (config: any, fn: any) => fn,
      definePrompt: (config: any, prompt: string) => {
        // Return a function that mimics calling the prompt
        return vi.fn();
      },
    },
    z: {
      object: () => mockSchema,
      string: () => mockSchema,
      number: () => mockSchema,
      boolean: () => mockSchema,
      enum: () => mockSchema,
      union: () => mockSchema,
      array: () => mockSchema,
      unknown: () => mockSchema,
      record: () => mockSchema,
      any: () => mockSchema,
      infer: {} as any,
    },
    activeModel: 'mock-model',
  };
});

// Mock catalog flows
vi.mock('@/flows/catalog/searchAll', () => ({
  searchAll: vi.fn().mockResolvedValue({ movies: [], books: [], games: [] }),
  SearchAllOutputSchema: {},
}));
vi.mock('@/flows/catalog/searchMedia', () => ({
  searchMedia: vi.fn().mockResolvedValue([]),
  SearchMediaOutputSchema: {},
}));
vi.mock('@/flows/catalog/searchGames', () => ({
  searchGames: vi.fn().mockResolvedValue([]),
  SearchGamesOutputSchema: {},
}));
vi.mock('@/flows/catalog/searchBooks', () => ({
  searchBooks: vi.fn().mockResolvedValue([]),
  SearchBooksOutputSchema: {},
}));

// Mock tools
vi.mock('@/tools/search-tavily-tool', () => ({
  searchTavilyTool: vi.fn().mockResolvedValue([]),
}));

// Mock prompts
vi.mock('@/prompts/routerPrompt', () => ({
  routerPrompt: vi.fn(),
}));
vi.mock('@/prompts/extractorPrompt', () => ({
  extractorPrompt: vi.fn(),
}));
vi.mock('@/prompts/synthesizerPrompt', () => ({
  synthesizerPrompt: vi.fn(),
}));

// Import mocked prompts to set implementation
import { routerPrompt } from '@/prompts/routerPrompt';
import { extractorPrompt } from '@/prompts/extractorPrompt';
import { synthesizerPrompt } from '@/prompts/synthesizerPrompt';
import { searchAll } from '@/flows/catalog/searchAll';
import { searchTavilyTool } from '@/tools/search-tavily-tool';
import { searchMedia } from '@/flows/catalog/searchMedia';

describe('orchestratorFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route to Path A (Specific Entity) for a movie', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'MOVIE_TV',
        extractedQuery: 'Inception',
      },
    });

    await orchestratorFlow('Tell me about Inception');

    expect(searchMedia).toHaveBeenCalledWith({ query: 'Inception', language: 'en' });
  });

  it('should route to Path B (General Discovery) and perform enrichment', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'GENERAL_DISCOVERY',
        category: 'ALL',
        extractedQuery: 'best sci-fi movies',
      },
    });

    (searchTavilyTool as any).mockResolvedValue([
      { content: 'Context about Dune' },
      { content: 'Context about Interstellar' },
    ]);

    (extractorPrompt as any).mockResolvedValue({
      output: {
        titles: ['Dune', 'Interstellar'],
      },
    });

    (searchAll as any).mockResolvedValue({
      movies: [{ title: 'Dune', id: '1' }],
      books: [],
      games: [],
    });

    (synthesizerPrompt as any).mockResolvedValue({
      text: 'Here are some great sci-fi movies.',
    });

    const result = await orchestratorFlow('Best sci-fi movies');

    expect(searchTavilyTool).toHaveBeenCalled();
    expect(extractorPrompt).toHaveBeenCalled();
    expect(searchAll).toHaveBeenCalledTimes(2); // One for each extracted title
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toHaveProperty('text', 'Here are some great sci-fi movies.');
  });

  it('should handle OUT_OF_SCOPE queries', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'OUT_OF_SCOPE',
        refusalReason: 'I only know about media.',
      },
    });

    const result = await orchestratorFlow('Weather in London');
    expect(result).toBe('I only know about media.');
  });

  it('should handle queries where no titles are extracted (fallback to web context)', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'GENERAL_DISCOVERY',
        category: 'ALL',
        extractedQuery: 'weird abstract query',
      },
    });

    (searchTavilyTool as any).mockResolvedValue([
      { content: 'Some abstract context without specific titles.' },
    ]);

    (extractorPrompt as any).mockResolvedValue({
      output: {
        titles: [],
      },
    });

    (synthesizerPrompt as any).mockResolvedValue({
      text: 'Based on the web search, here is some info.',
    });

    const result = await orchestratorFlow('weird abstract query');

    expect(searchTavilyTool).toHaveBeenCalled();
    expect(extractorPrompt).toHaveBeenCalled();
    expect(searchAll).not.toHaveBeenCalled();
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toHaveProperty('text', 'Based on the web search, here is some info.');
  });

  // Test for Error Handling in Path A
  it('should handle errors in Path A (Specific Entity)', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'MOVIE_TV',
        extractedQuery: 'Inception',
      },
    });

    (searchMedia as any).mockRejectedValue(new Error('KB Error'));

    const result = await orchestratorFlow('Inception');

    expect(searchMedia).toHaveBeenCalled();
    expect(result).toHaveProperty('error', 'Failed to retrieve specific entity details.');
    expect(result).toHaveProperty('details', 'KB Error');
  });

  // Test for Error Handling in Path B (Tavily)
  it('should handle errors in Path B (Tavily search failure)', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'GENERAL_DISCOVERY',
        category: 'ALL',
        extractedQuery: 'best movies',
      },
    });

    (searchTavilyTool as any).mockRejectedValue(new Error('Tavily Down'));

    // Even if Tavily fails, we continue with empty context
    (extractorPrompt as any).mockResolvedValue({ output: { titles: [] } });
    (synthesizerPrompt as any).mockResolvedValue({ text: 'Recovered.' });

    const result = await orchestratorFlow('best movies');

    expect(searchTavilyTool).toHaveBeenCalled();
    // Should fallback to empty context and continue
    expect(extractorPrompt).toHaveBeenCalled();
    expect(result).toHaveProperty('text', 'Recovered.');
  });
});
