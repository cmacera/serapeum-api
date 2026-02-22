import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAll } from '../../../src/flows/catalog/searchAll.js';
import { searchMediaTool } from '../../../src/tools/search-media-tool.js';
import { searchBooksTool } from '../../../src/tools/search-books-tool.js';
import { searchGamesTool } from '../../../src/tools/search-games-tool.js';

// Mock the tools
vi.mock('../../../src/tools/search-media-tool.js');
vi.mock('../../../src/tools/search-books-tool.js');
vi.mock('../../../src/tools/search-games-tool.js');

describe('searchAll Flow', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should aggregate results from all tools on success', async () => {
    // Mock successful responses
    const mockMovies = [{ id: 1, title: 'Movie', media_type: 'movie' }];
    const mockBooks = [{ id: 'b1', title: 'Book' }];
    const mockGames = [{ id: 100, name: 'Game' }];

    vi.mocked(searchMediaTool).mockResolvedValue(mockMovies as any);
    vi.mocked(searchBooksTool).mockResolvedValue(mockBooks as any);
    vi.mocked(searchGamesTool).mockResolvedValue(mockGames as any);

    const result = await searchAll({ query: 'test', language: 'en' });

    expect(result).toEqual({
      media: mockMovies,
      books: mockBooks,
      games: mockGames,
      errors: undefined,
    });

    expect(searchMediaTool).toHaveBeenCalledWith({ query: 'test', language: 'en' });
    expect(searchBooksTool).toHaveBeenCalledWith({ query: 'test', language: 'en' });
    expect(searchGamesTool).toHaveBeenCalledWith({ query: 'test', language: 'en' });
  });

  it('should handle partial failures gracefully', async () => {
    // Mock movies failing, others succeeding
    const mockBooks = [{ id: 'b1', title: 'Book' }];
    const mockGames = [{ id: 100, name: 'Game' }];

    vi.mocked(searchMediaTool).mockRejectedValue(new Error('TMDB Error'));
    vi.mocked(searchBooksTool).mockResolvedValue(mockBooks as any);
    vi.mocked(searchGamesTool).mockResolvedValue(mockGames as any);

    const result = await searchAll({ query: 'test', language: 'en' });

    expect(result).toEqual({
      media: [],
      books: mockBooks,
      games: mockGames,
      errors: [{ source: 'media', message: 'TMDB Error' }],
    });
  });

  it('should handle all tools failing', async () => {
    vi.mocked(searchMediaTool).mockRejectedValue(new Error('TMDB Error'));
    vi.mocked(searchBooksTool).mockRejectedValue(new Error('Google Books Error'));
    vi.mocked(searchGamesTool).mockRejectedValue(new Error('IGDB Error'));

    const result = await searchAll({ query: 'test', language: 'en' });

    expect(result).toEqual({
      media: [],
      books: [],
      games: [],
      errors: [
        { source: 'media', message: 'TMDB Error' },
        { source: 'books', message: 'Google Books Error' },
        { source: 'games', message: 'IGDB Error' },
      ],
    });
  });

  it('should handle empty results from all tools', async () => {
    vi.mocked(searchMediaTool).mockResolvedValue([]);
    vi.mocked(searchBooksTool).mockResolvedValue([]);
    vi.mocked(searchGamesTool).mockResolvedValue([]);

    const result = await searchAll({ query: 'test', language: 'en' });

    expect(result).toEqual({
      media: [],
      books: [],
      games: [],
      errors: undefined,
    });
  });
});
