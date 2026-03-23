import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orchestratorFlow } from '@/flows/agent/orchestratorFlow.js';
import { levenshteinSimilarity, findBestMatch } from '@/flows/agent/findBestMatch.js';

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
    default: () => mockSchema,
  };

  return {
    ai: {
      defineFlow: (_config: any, fn: any) => fn,
      defineSchema: vi.fn(),
      prompt: vi.fn().mockReturnValue(vi.fn()),
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
      literal: () => mockSchema,
      discriminatedUnion: () => mockSchema,
      infer: {} as any,
    },
    activeModel: 'mock-model',
  };
});

// Mock catalog flows
vi.mock('@/flows/catalog/searchAll', () => ({
  searchAll: vi.fn().mockResolvedValue({ media: [], books: [], games: [] }),
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
vi.mock('@/flows/catalog/getMovieDetail', () => ({
  getMovieDetail: vi.fn().mockResolvedValue({}),
}));
vi.mock('@/flows/catalog/getTvDetail', () => ({
  getTvDetail: vi.fn().mockResolvedValue({}),
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
import { routerPrompt } from '@/prompts/routerPrompt.js';
import { extractorPrompt } from '@/prompts/extractorPrompt.js';
import { synthesizerPrompt } from '@/prompts/synthesizerPrompt.js';
import { searchAll } from '@/flows/catalog/searchAll.js';
import { searchTavilyTool } from '@/tools/search-tavily-tool.js';
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

    (searchAll as any).mockResolvedValue({
      media: [{ title: 'Inception', id: 1, media_type: 'movie' }],
      books: [],
      games: [],
    });

    (synthesizerPrompt as any).mockResolvedValue({
      text: 'Mocked synthesizer response for Inception.',
    });

    const result = await orchestratorFlow({ query: 'Tell me about Inception', language: 'en' });

    expect(searchAll).toHaveBeenCalledWith({ query: 'Inception', language: 'en' });
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toHaveProperty('kind', 'search_results');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('data');
  });

  it('should exclude the featured item from data arrays in Path A', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'MOVIE_TV',
        extractedQuery: 'Inception',
      },
    });

    (searchAll as any).mockResolvedValue({
      media: [
        { title: 'Inception', id: 1, media_type: 'movie', popularity: 100 },
        { title: 'Interstellar', id: 2, media_type: 'movie', popularity: 80 },
      ],
      books: [],
      games: [],
    });

    (synthesizerPrompt as any).mockResolvedValue({ text: 'Inception is a classic.' });

    const result = await orchestratorFlow({ query: 'Tell me about Inception', language: 'en' });

    expect(result).toHaveProperty('kind', 'search_results');
    const data = (result as any).data;
    expect(data.featured).toBeDefined();
    // The featured item (Inception, id=1) must not appear in data.media
    expect(data.media.every((item: any) => item.id !== data.featured.item.id)).toBe(true);
  });

  it('should propagate explicit language to calls', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'OUT_OF_SCOPE',
      },
    });

    await orchestratorFlow({ query: 'Hola', language: 'es' });

    expect(routerPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'es' }),
      expect.objectContaining({ model: expect.any(String) })
    );
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
      media: [{ title: 'Dune', id: '1' }],
      books: [],
      games: [],
    });

    (synthesizerPrompt as any).mockResolvedValue({
      text: 'Here are some great sci-fi movies.',
    });

    const result = await orchestratorFlow({ query: 'best sci-fi movies', language: 'en' });

    expect(routerPrompt).toHaveBeenCalled();
    expect(searchTavilyTool).toHaveBeenCalled();
    expect(extractorPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'best sci-fi movies', context: expect.any(String) }),
      expect.any(Object)
    );
    expect(searchAll).toHaveBeenCalledTimes(2); // One for each extracted title
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toHaveProperty('kind', 'discovery');
    expect(result).toHaveProperty('message', 'Here are some great sci-fi movies.');
  });

  it('should handle OUT_OF_SCOPE queries', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'OUT_OF_SCOPE',
        refusalReason: 'I only know about media.',
      },
    });

    const result = await orchestratorFlow({ query: 'query', language: 'en' });
    expect(result).toHaveProperty('kind', 'refusal');
    expect(result).toHaveProperty('message', 'I only know about media.');
  });

  it('should return error object if Router fails', async () => {
    (routerPrompt as any).mockResolvedValue({ output: null });

    const result = await orchestratorFlow({ query: 'Broken query', language: 'en' });
    expect(result).toHaveProperty('kind', 'error');
    expect(result).toHaveProperty('error', 'Router failure');
  });

  it('should return error object if Extractor fails', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'GENERAL_DISCOVERY',
        category: 'ALL',
        extractedQuery: 'query',
      },
    });
    (searchTavilyTool as any).mockResolvedValue([{ content: 'context' }]);
    (extractorPrompt as any).mockRejectedValue(new Error('Extractor Error'));

    const result = await orchestratorFlow({ query: 'query', language: 'en' });
    expect(result).toHaveProperty('kind', 'error');
    expect(result).toHaveProperty('error', 'Failed to process search results');
    expect(result).toHaveProperty('details', 'Extractor Error');
  });

  it('should return partial results if Synthesizer fails', async () => {
    (routerPrompt as any).mockResolvedValue({
      output: {
        intent: 'GENERAL_DISCOVERY',
        category: 'ALL',
        extractedQuery: 'query',
      },
    });
    (searchTavilyTool as any).mockResolvedValue([{ content: 'context' }]);
    (extractorPrompt as any).mockResolvedValue({ output: { titles: ['Movie A'] } });
    (searchAll as any).mockResolvedValue({ media: [{ title: 'Movie A' }], books: [], games: [] });
    (synthesizerPrompt as any).mockRejectedValue(new Error('Synth Error'));

    const result = await orchestratorFlow({ query: 'query', language: 'en' });

    // Should return the enriched data but with a fallback text
    expect(result).toHaveProperty('kind', 'discovery');
    expect(result).toHaveProperty('data');
    expect((result as any).data.media).toHaveLength(1);
    expect((result as any).message).toContain("couldn't generate a summary");
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

    const result = await orchestratorFlow({ query: 'weird abstract query', language: 'en' });

    expect(searchTavilyTool).toHaveBeenCalled();
    expect(extractorPrompt).toHaveBeenCalled();
    expect(searchAll).not.toHaveBeenCalled();
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toHaveProperty('kind', 'discovery');
    expect(result).toHaveProperty('message', 'Based on the web search, here is some info.');
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

    (searchAll as any).mockRejectedValue(new Error('KB Error'));

    const result = await orchestratorFlow({ query: 'Inception', language: 'en' });

    expect(searchAll).toHaveBeenCalled();
    expect(result).toHaveProperty('kind', 'error');
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

    const result = await orchestratorFlow({ query: 'best movies', language: 'en' });

    expect(searchTavilyTool).toHaveBeenCalled();
    // Should fallback to empty context and continue
    expect(extractorPrompt).toHaveBeenCalled();
    expect(result).toHaveProperty('message', 'Recovered.');
  });
});

// ---------------------------------------------------------------------------
// levenshteinSimilarity
// ---------------------------------------------------------------------------
describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinSimilarity('batman', 'batman')).toBe(1);
  });

  it('returns 0 when either string is empty', () => {
    expect(levenshteinSimilarity('', 'batman')).toBe(0);
    expect(levenshteinSimilarity('batman', '')).toBe(0);
  });

  it('returns high similarity for a single typo', () => {
    // "inceptoin" vs "inception" — 1 transposition
    const sim = levenshteinSimilarity('inceptoin', 'inception');
    expect(sim).toBeGreaterThan(0.7);
  });

  it('returns low similarity for very different strings', () => {
    const sim = levenshteinSimilarity('batman', 'avengers');
    expect(sim).toBeLessThan(0.4);
  });

  it('is symmetric', () => {
    const ab = levenshteinSimilarity('inception', 'inceptoin');
    const ba = levenshteinSimilarity('inceptoin', 'inception');
    expect(ab).toBeCloseTo(ba);
  });
});

// ---------------------------------------------------------------------------
// findBestMatch — helpers
// ---------------------------------------------------------------------------
const media = (title: string, popularity = 0) => ({
  id: 1,
  title,
  media_type: 'movie' as const,
  popularity,
});

const game = (name: string, aggregated_rating = 0) => ({
  id: 1,
  name,
  aggregated_rating,
});

const book = (title: string, averageRating = 0) => ({
  id: 'b1',
  title,
  averageRating,
});

const empty = { media: [], books: [], games: [] };

// ---------------------------------------------------------------------------
// findBestMatch — exact and partial matches
// ---------------------------------------------------------------------------
describe('findBestMatch — exact and partial matches', () => {
  it('returns undefined when results are empty', () => {
    expect(findBestMatch('batman', 'ALL', empty)).toBeUndefined();
  });

  it('returns undefined when query is empty', () => {
    const results = { media: [media('Batman')], books: [], games: [] };
    expect(findBestMatch('', 'ALL', results)).toBeUndefined();
  });

  it('features an exact-match result', () => {
    const results = { media: [media('batman')], books: [], games: [] };
    const featured = findBestMatch('batman', 'ALL', results);
    expect(featured).toBeDefined();
    expect(featured?.type).toBe('media');
  });

  it('features a partial-match result (query is substring of title)', () => {
    const results = { media: [media('Batman Begins')], books: [], games: [] };
    const featured = findBestMatch('batman', 'ALL', results);
    expect(featured).toBeDefined();
    expect(featured?.type).toBe('media');
  });

  it('returns undefined when no result meets the minimum similarity threshold', () => {
    const results = { media: [media('Avengers')], books: [], games: [] };
    expect(findBestMatch('batman', 'ALL', results)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findBestMatch — fuzzy matching
// ---------------------------------------------------------------------------
describe('findBestMatch — fuzzy matching', () => {
  it('features the correct result despite a typo in the query', () => {
    // "Inceptoin" has only 1 transposition from "Inception" — should still match
    const results = { media: [media('Inception', 50)], books: [], games: [] };
    const featured = findBestMatch('Inceptoin', 'ALL', results);
    expect(featured).toBeDefined();
    expect(featured?.type).toBe('media');
  });

  it('does not feature a result when similarity is below the threshold', () => {
    // "batman" vs "Avengers Endgame" — very low similarity
    const results = { media: [media('Avengers Endgame')], books: [], games: [] };
    expect(findBestMatch('batman', 'ALL', results)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findBestMatch — category boost
// ---------------------------------------------------------------------------
describe('findBestMatch — category boost', () => {
  it('prefers media over books when category is MOVIE_TV', () => {
    const results = { media: [media('Dune')], books: [book('Dune')], games: [] };
    const featured = findBestMatch('Dune', 'MOVIE_TV', results);
    expect(featured?.type).toBe('media');
  });

  it('prefers books over media when category is BOOK', () => {
    const results = { media: [media('Dune')], books: [book('Dune')], games: [] };
    const featured = findBestMatch('Dune', 'BOOK', results);
    expect(featured?.type).toBe('book');
  });

  it('prefers games over media when category is GAME', () => {
    const results = { media: [media('Halo')], books: [], games: [game('Halo')] };
    const featured = findBestMatch('Halo', 'GAME', results);
    expect(featured?.type).toBe('game');
  });
});

// ---------------------------------------------------------------------------
// findBestMatch — popularity bonus as tiebreaker
// ---------------------------------------------------------------------------
describe('findBestMatch — popularity bonus tiebreaker', () => {
  it('prefers the more popular media item when text scores tie', () => {
    // Both titles contain "batman" — same text score tier.
    // Batman Begins (popularity 14) should win over the unknown film (popularity 0.07).
    const results = {
      media: [media('Batman (unknown)', 0.07), media('Batman Begins', 14)],
      books: [],
      games: [],
    };
    const featured = findBestMatch('batman', 'ALL', results);
    expect(featured).toBeDefined();
    expect((featured?.item as { title?: string })?.title).toBe('Batman Begins');
  });

  it('prefers the higher-rated game when text scores tie', () => {
    const results = {
      media: [],
      books: [],
      games: [game('Halo (clone)', 72), game('Halo', 95)],
    };
    const featured = findBestMatch('halo', 'ALL', results);
    expect((featured?.item as { name?: string })?.name).toBe('Halo');
  });

  it('does not let popularity override a better text match', () => {
    // "batman" is exact; "batman begins" is partial. Exact wins even with lower popularity.
    const results = {
      media: [media('batman begins', 1000), media('batman', 1)],
      books: [],
      games: [],
    };
    const featured = findBestMatch('batman', 'ALL', results);
    expect((featured?.item as { title?: string })?.title).toBe('batman');
  });
});
