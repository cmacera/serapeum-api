import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orchestratorFlow } from '../src/flows/agent/orchestratorFlow.js';
import { ai } from '../src/lib/ai.js';
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

  it('should route to searchMedia when intent is SPECIFIC_ENTITY and category is MOVIE_TV', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'MOVIE_TV',
        extractedQuery: 'Inception',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const searchResult = [{ title: 'Inception', id: 1, media_type: 'movie' }];
    vi.mocked(searchMedia).mockResolvedValue(
      searchResult as unknown as Awaited<ReturnType<typeof searchMedia>>
    );

    const result = await orchestratorFlow({ query: 'Movie Inception', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Movie Inception', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchAll).not.toHaveBeenCalled();
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toEqual({
      kind: 'search_results',
      message: expect.any(String),
      data: searchResult,
    });
  });

  it('should route to searchGames when intent is SPECIFIC_ENTITY and category is GAME', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'GAME',
        extractedQuery: 'Elden Ring',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const searchResult = [{ name: 'Elden Ring', id: 123 }];
    vi.mocked(searchGames).mockResolvedValue(
      searchResult as unknown as Awaited<ReturnType<typeof searchGames>>
    );

    const result = await orchestratorFlow({ query: 'Game Elden Ring', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Game Elden Ring', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchGames).toHaveBeenCalledWith({ query: 'Elden Ring', language: 'en' });
    expect(searchAll).not.toHaveBeenCalled();
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toEqual({
      kind: 'search_results',
      message: expect.any(String),
      data: searchResult,
    });
  });

  it('should route to searchBooks when intent is SPECIFIC_ENTITY and category is BOOK', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'BOOK',
        extractedQuery: 'Dune',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const searchResult = [{ title: 'Dune', id: '1' }];
    vi.mocked(searchBooks).mockResolvedValue(
      searchResult as unknown as Awaited<ReturnType<typeof searchBooks>>
    );

    const result = await orchestratorFlow({ query: 'Book Dune', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Book Dune', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchBooks).toHaveBeenCalledWith({ query: 'Dune', language: 'en' });
    expect(searchAll).not.toHaveBeenCalled();
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toEqual({
      kind: 'search_results',
      message: expect.any(String),
      data: searchResult,
    });
  });

  it('should route to searchAll when intent is SPECIFIC_ENTITY and category is ALL', async () => {
    vi.mocked(routerPrompt).mockResolvedValue({
      output: {
        intent: 'SPECIFIC_ENTITY',
        category: 'ALL',
        extractedQuery: 'The Witcher',
      },
    } as Awaited<ReturnType<typeof routerPrompt>>);

    const searchResult = { games: [], movies: [], books: [] };
    vi.mocked(searchAll).mockResolvedValue(
      searchResult as unknown as Awaited<ReturnType<typeof searchAll>>
    );

    vi.mocked(synthesizerPrompt).mockResolvedValue({
      text: 'Here are results for Inception.',
    } as any);

    const result = await orchestratorFlow({ query: 'Quantum Mechanics', language: 'en' });

    expect(routerPrompt).toHaveBeenCalledWith(
      { query: 'Quantum Mechanics', language: 'en' },
      expect.objectContaining({ model: expect.any(String) })
    );
    expect(searchAll).toHaveBeenCalledWith({ query: 'The Witcher', language: 'en' });
    expect(synthesizerPrompt).toHaveBeenCalled();
    expect(result).toEqual({
      kind: 'search_results',
      message: expect.any(String),
      data: searchResult,
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
      movies: [{ title: 'Dune Part 2', id: 456, media_type: 'movie' }],
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
    expect(searchTavilyTool).toHaveBeenCalledWith({ query: 'best sci-fi movies', maxResults: 5 });
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
        movies: mediaResult,
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
        movies: [],
        books: [],
        games: gameResult,
      },
    });
  });
});
