import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orchestratorFlow } from '../src/flows/agent/orchestratorFlow.js';
import { searchAll } from '../src/flows/catalog/searchAll.js';
import { searchMedia } from '../src/flows/catalog/searchMedia.js';
import { searchGames } from '../src/flows/catalog/searchGames.js';
import { searchBooks } from '../src/flows/catalog/searchBooks.js';
import { searchTavilyTool } from '../src/tools/search-tavily-tool.js';
import { routerPrompt } from '../src/prompts/routerPrompt.js';
import { extractorPrompt } from '../src/prompts/extractorPrompt.js';
import { synthesizerPrompt } from '../src/prompts/synthesizerPrompt.js';

// Mock dependencies
vi.mock('../src/lib/ai.js', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/ai.js')>('../src/lib/ai.js');
  return {
    ...actual,
    ai: {
      ...actual.ai,
      generate: vi.fn(),
      defineFlow: actual.ai.defineFlow,
      definePrompt: vi.fn(),
      defineTool: actual.ai.defineTool,
    },
  };
});

vi.mock('../src/flows/catalog/searchMedia.js', async () => {
  const actual = await vi.importActual<typeof import('../src/flows/catalog/searchMedia.js')>(
    '../src/flows/catalog/searchMedia.js'
  );
  return {
    ...actual,
    searchMedia: vi.fn(),
  };
});

vi.mock('../src/flows/catalog/searchGames.js', async () => {
  const actual = await vi.importActual<typeof import('../src/flows/catalog/searchGames.js')>(
    '../src/flows/catalog/searchGames.js'
  );
  return {
    ...actual,
    searchGames: vi.fn(),
  };
});

vi.mock('../src/flows/catalog/searchBooks.js', async () => {
  const actual = await vi.importActual<typeof import('../src/flows/catalog/searchBooks.js')>(
    '../src/flows/catalog/searchBooks.js'
  );
  return {
    ...actual,
    searchBooks: vi.fn(),
  };
});

vi.mock('../src/flows/catalog/searchAll.js', async () => {
  const actual = await vi.importActual<typeof import('../src/flows/catalog/searchAll.js')>(
    '../src/flows/catalog/searchAll.js'
  );
  return {
    ...actual,
    searchAll: vi.fn(),
  };
});

vi.mock('../src/tools/search-tavily-tool.js', () => ({
  searchTavilyTool: vi.fn(),
}));

// Mock the prompt modules themselves
vi.mock('../src/prompts/routerPrompt.js', () => ({
  routerPrompt: vi.fn(),
}));

vi.mock('../src/prompts/extractorPrompt.js', () => ({
  extractorPrompt: vi.fn(),
}));

vi.mock('../src/prompts/synthesizerPrompt.js', () => ({
  synthesizerPrompt: vi.fn(),
}));

describe('orchestratorFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(orchestratorFlow).toBeDefined();
  });

  it('should enrich search results and feature a media item when intent is SPECIFIC_ENTITY and category is MOVIE_TV', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'MOVIE_TV',
        extractedQuery: 'Inception',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const enrichResult = {
      media: [{ title: 'Inception', id: 1, media_type: 'movie' as const }],
      games: [],
      books: [],
    };
    vi.mocked(searchAll).mockResolvedValue(
      enrichResult as unknown as Awaited<ReturnType<typeof searchAll>>
    );

    vi.mocked(synthesizerPrompt).mockResolvedValue({
      text: 'Mocked synthesizer response for Inception.',
    } as Awaited<ReturnType<typeof synthesizerPrompt>>);

    const result = await orchestratorFlow({ query: 'Movie Inception', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Movie Inception', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchAll).toHaveBeenCalledWith({ query: 'Inception', language: 'en' });
    expect(result).toEqual({
      kind: 'search_results',
      message: 'Mocked synthesizer response for Inception.',
      data: {
        featured: { type: 'media', item: { title: 'Inception', id: 1, media_type: 'movie' } },
        media: enrichResult.media,
        books: [],
        games: [],
      },
    });
  });

  it('should enrich search results and feature a game when intent is SPECIFIC_ENTITY and category is GAME', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'GAME',
        extractedQuery: 'Elden Ring',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const enrichResult = {
      media: [],
      games: [{ name: 'Elden Ring', id: 123 }],
      books: [],
    };
    vi.mocked(searchAll).mockResolvedValue(
      enrichResult as unknown as Awaited<ReturnType<typeof searchAll>>
    );

    vi.mocked(synthesizerPrompt).mockResolvedValue({
      text: 'Mocked synthesizer response for Elden Ring.',
    } as Awaited<ReturnType<typeof synthesizerPrompt>>);

    const result = await orchestratorFlow({ query: 'Game Elden Ring', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Game Elden Ring', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchAll).toHaveBeenCalledWith({ query: 'Elden Ring', language: 'en' });
    expect(result).toEqual({
      kind: 'search_results',
      message: 'Mocked synthesizer response for Elden Ring.',
      data: {
        featured: { type: 'game', item: { name: 'Elden Ring', id: 123 } },
        media: [],
        games: enrichResult.games,
        books: [],
      },
    });
  });

  it('should enrich search results and feature a book when intent is SPECIFIC_ENTITY and category is BOOK', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'BOOK',
        extractedQuery: 'Dune',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const enrichResult = {
      media: [{ title: 'Dune movie', id: 2, media_type: 'movie' as const }],
      games: [],
      books: [{ title: 'Dune', id: '1' }],
    };
    vi.mocked(searchAll).mockResolvedValue(
      enrichResult as unknown as Awaited<ReturnType<typeof searchAll>>
    );

    vi.mocked(synthesizerPrompt).mockResolvedValue({
      text: 'Mocked synthesizer response for Dune.',
    } as Awaited<ReturnType<typeof synthesizerPrompt>>);

    const result = await orchestratorFlow({ query: 'Book Dune', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Book Dune', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchAll).toHaveBeenCalledWith({ query: 'Dune', language: 'en' });
    expect(result).toEqual({
      kind: 'search_results',
      message: 'Mocked synthesizer response for Dune.',
      data: {
        featured: { type: 'book', item: { title: 'Dune', id: '1' } },
        media: enrichResult.media,
        games: [],
        books: enrichResult.books,
      },
    });
  });

  it('should enrich search results and pick best feature when intent is SPECIFIC_ENTITY and category is ALL', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'ALL',
        extractedQuery: 'The Witcher',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const enrichResult = {
      games: [{ name: 'The Witcher 3', id: 10 }],
      media: [{ title: 'The Witcher', id: 20, media_type: 'tv' }], // Exact match wins
      books: [],
    };
    vi.mocked(searchAll).mockResolvedValue(
      enrichResult as unknown as Awaited<ReturnType<typeof searchAll>>
    );

    vi.mocked(synthesizerPrompt).mockResolvedValue({
      text: 'Mocked synthesizer response for The Witcher.',
    } as Awaited<ReturnType<typeof synthesizerPrompt>>);

    const result = await orchestratorFlow({ query: 'Info about The Witcher', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Info about The Witcher', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchAll).toHaveBeenCalledWith({ query: 'The Witcher', language: 'en' });
    expect(synthesizerPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        originalQuery: 'The Witcher',
        language: 'en',
        webContext: '',
        apiDetails: expect.any(String),
      }),
      expect.any(Object)
    );

    expect(result).toEqual({
      kind: 'search_results',
      message: 'Mocked synthesizer response for The Witcher.',
      data: {
        featured: { type: 'media', item: enrichResult.media[0] },
        games: enrichResult.games,
        media: enrichResult.media,
        books: [],
      },
    });
  });

  it('should handle OUT_OF_SCOPE intent', async () => {
    // Mock Router Response
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'OUT_OF_SCOPE',
        refusalReason: 'I cannot help with pasta.',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const result = await orchestratorFlow({ query: 'How to cook pasta', language: 'en' });
    expect(result).toEqual({
      kind: 'refusal',
      message: 'I cannot help with pasta.',
    });
    expect(routerPrompt).toHaveBeenCalledTimes(1);
    expect(searchAll).not.toHaveBeenCalled();
  });

  it('should handle GENERAL_DISCOVERY intent', async () => {
    // 1. Router
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'GENERAL_DISCOVERY',
        category: 'ALL',
        extractedQuery: 'best sci-fi movies',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    // 2. Tavily Tool
    vi.mocked(searchTavilyTool).mockResolvedValue([
      { title: 'Dune Part 2', content: 'Epic movie', url: '...' },
    ] as Awaited<ReturnType<typeof searchTavilyTool>>);

    // 3. Extractor
    vi.mocked(extractorPrompt).mockResolvedValue({
      output: {
        titles: ['Dune Part 2'],
      },
    } as Awaited<ReturnType<typeof extractorPrompt>>);

    // 4. searchAll for enrichment
    const enrichmentData = {
      media: [{ title: 'Dune Part 2', id: 456, media_type: 'movie' }],
      games: [],
      books: [],
    };

    vi.mocked(searchAll).mockResolvedValue(
      enrichmentData as unknown as Awaited<ReturnType<typeof searchAll>>
    );

    // 5. Synthesizer
    vi.mocked(synthesizerPrompt).mockResolvedValue({
      text: 'Here are the best sci-fi movies: Dune Part 2...',
    } as any);

    const result = await orchestratorFlow({ query: 'Best sci-fi movies 2023', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Best sci-fi movies 2023', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchTavilyTool).toHaveBeenCalledWith({
      query: 'best sci-fi movies',
      maxResults: 5,
      language: 'en',
    });
    expect(extractorPrompt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchAll).toHaveBeenCalledWith({ query: 'Dune Part 2', language: 'en' });
    expect(synthesizerPrompt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ model: expect.any(String) })
    );

    expect(result).toEqual({
      kind: 'discovery',
      message: 'Here are the best sci-fi movies: Dune Part 2...',
      data: enrichmentData,
    });
  });

  it('should use searchMedia for GENERAL_DISCOVERY when category is MOVIE_TV', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'GENERAL_DISCOVERY',
        category: 'MOVIE_TV',
        extractedQuery: 'horror movies',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    vi.mocked(searchTavilyTool).mockResolvedValue([
      { title: 'Smile 2', content: '...', url: '...', score: 0.95 },
    ]);
    vi.mocked(extractorPrompt).mockResolvedValue({ output: { titles: ['Smile 2'] } } as any);

    // Mock searchMedia specifically
    const mediaResult = [{ title: 'Smile 2', id: 666, media_type: 'movie' }];
    vi.mocked(searchMedia).mockResolvedValue(mediaResult as any);

    vi.mocked(synthesizerPrompt).mockResolvedValue({ text: 'Smile 2 is a scary movie.' } as any);

    const result = await orchestratorFlow({ query: 'Best horror movies', language: 'en' });

    expect(searchMedia).toHaveBeenCalledWith({ query: 'Smile 2', language: 'en' });
    expect(searchGames).not.toHaveBeenCalled();
    expect(searchBooks).not.toHaveBeenCalled();
    expect(searchAll).not.toHaveBeenCalled();

    expect(result).toEqual({
      kind: 'discovery',
      message: 'Smile 2 is a scary movie.',
      data: {
        media: mediaResult,
        books: [],
        games: [],
      },
    });
  });

  it('should use searchGames for GENERAL_DISCOVERY when category is GAME', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'GENERAL_DISCOVERY',
        category: 'GAME',
        extractedQuery: 'RPG games',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    vi.mocked(searchTavilyTool).mockResolvedValue([
      { title: "Baldur's Gate 3", content: '...', url: '...', score: 0.99 },
    ]);
    vi.mocked(extractorPrompt).mockResolvedValue({
      output: { titles: ["Baldur's Gate 3"] },
    } as any);

    const gameResult = [{ name: "Baldur's Gate 3", id: 999 }];
    vi.mocked(searchGames).mockResolvedValue(gameResult as any);

    vi.mocked(synthesizerPrompt).mockResolvedValue({ text: 'BG3 is great.' } as any);

    const result = await orchestratorFlow({ query: 'Best RPGs', language: 'en' });

    expect(searchGames).toHaveBeenCalledWith({ query: "Baldur's Gate 3", language: 'en' });
    expect(searchMedia).not.toHaveBeenCalled();
    expect(searchBooks).not.toHaveBeenCalled();

    expect(result).toEqual({
      kind: 'discovery',
      message: 'BG3 is great.',
      data: {
        media: [],
        books: [],
        games: gameResult,
      },
    });
  });

  it('should return an error object when routerPrompt fails (resolves to null)', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({ output: null } as any);

    const result = await orchestratorFlow({ query: 'test router failure', language: 'en' });

    expect(result).toEqual({
      kind: 'error',
      error: expect.any(String),
      details: expect.any(String),
    });
  });

  it('should return search_results with fallback message when synthesizerPrompt throws an error', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'MOVIE_TV',
        extractedQuery: 'Inception',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const enrichResult = {
      media: [{ title: 'Inception', id: 1, media_type: 'movie' as const }],
      books: [],
      games: [],
    };
    vi.mocked(searchAll).mockResolvedValue(enrichResult as any);

    vi.mocked(synthesizerPrompt).mockRejectedValue(new Error('Synthesizer failed'));

    const result = await orchestratorFlow({ query: 'Movie Inception', language: 'en' });

    expect(result).toEqual({
      kind: 'search_results',
      message: expect.any(String),
      data: {
        featured: { type: 'media', item: { title: 'Inception', id: 1, media_type: 'movie' } },
        media: enrichResult.media,
        books: [],
        games: [],
      },
    });
  });
});
