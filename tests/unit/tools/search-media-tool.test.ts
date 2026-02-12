import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { searchMediaTool } from '../../../src/tools/search-media-tool.js';
import type { TMDBSearchResponse } from '../../../src/lib/tmdb-types.js';

describe('searchMediaTool', () => {
  const TMDB_API_URL = 'https://api.themoviedb.org';
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    // Set up environment variable
    process.env.TMDB_API_KEY = mockApiKey;

    // Clean all HTTP mocks before each test
    nock.cleanAll();
  });

  afterEach(() => {
    // Restore environment
    delete process.env.TMDB_API_KEY;
  });

  describe('Successful searches', () => {
    it('should return movies for a valid movie query', async () => {
      const mockResponse: TMDBSearchResponse = {
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [
          {
            id: 550,
            media_type: 'movie',
            title: 'Fight Club',
            release_date: '1999-10-15',
            poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
            overview:
              'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
            vote_average: 8.4,
            popularity: 61.416,
          },
        ],
      };

      nock(TMDB_API_URL).get('/3/search/multi').query(true).reply(200, mockResponse);

      const result = await searchMediaTool({ query: 'Fight Club' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 550,
        title: 'Fight Club',
        name: undefined,
        media_type: 'movie',
        release_date: '1999-10-15',
        poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        overview:
          'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
        vote_average: 8.4,
        popularity: 61.416,
      });
    });

    it('should return TV shows for a valid TV query', async () => {
      const mockResponse: TMDBSearchResponse = {
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [
          {
            id: 1396,
            media_type: 'tv',
            name: 'Breaking Bad',
            first_air_date: '2008-01-20',
            poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
            overview:
              'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.',
            vote_average: 8.9,
            popularity: 451.914,
          },
        ],
      };

      nock(TMDB_API_URL).get('/3/search/multi').query(true).reply(200, mockResponse);

      const result = await searchMediaTool({ query: 'Breaking Bad' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1396,
        title: undefined,
        name: 'Breaking Bad',
        media_type: 'tv',
        release_date: '2008-01-20',
        poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        overview:
          'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.',
        vote_average: 8.9,
        popularity: 451.914,
      });
    });

    it('should return mixed results (movies and TV shows)', async () => {
      const mockResponse: TMDBSearchResponse = {
        page: 1,
        total_pages: 1,
        total_results: 2,
        results: [
          {
            id: 550,
            media_type: 'movie',
            title: 'The Matrix',
            release_date: '1999-03-31',
            poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
            overview: 'A computer hacker learns about the true nature of reality.',
            vote_average: 8.2,
            popularity: 75.123,
          },
          {
            id: 1396,
            media_type: 'tv',
            name: 'The Matrix',
            first_air_date: '1993-03-31',
            poster_path: '/matrix-tv.jpg',
            overview: 'A TV show about the matrix.',
            vote_average: 7.5,
            popularity: 25.456,
          },
        ],
      };

      nock(TMDB_API_URL).get('/3/search/multi').query(true).reply(200, mockResponse);

      const result = await searchMediaTool({ query: 'Matrix' });

      expect(result).toHaveLength(2);
      expect(result[0].media_type).toBe('movie');
      expect(result[1].media_type).toBe('tv');
    });

    it('should handle empty results', async () => {
      const mockResponse: TMDBSearchResponse = {
        page: 1,
        total_pages: 0,
        total_results: 0,
        results: [],
      };

      nock(TMDB_API_URL).get('/3/search/multi').query(true).reply(200, mockResponse);

      const result = await searchMediaTool({ query: 'NonexistentMovie12345' });

      expect(result).toEqual([]);
    });

    it('should filter out person results', async () => {
      const mockResponse: TMDBSearchResponse = {
        page: 1,
        total_pages: 1,
        total_results: 3,
        results: [
          {
            id: 550,
            media_type: 'movie',
            title: 'Fight Club',
            release_date: '1999-10-15',
            poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
            overview: 'Movie about fight club',
            vote_average: 8.4,
            popularity: 61.416,
          },
          {
            id: 287,
            media_type: 'person',
            // Person results should be filtered out
          },
          {
            id: 1396,
            media_type: 'tv',
            name: 'Breaking Bad',
            first_air_date: '2008-01-20',
            poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
            overview: 'TV show about chemistry',
            vote_average: 8.9,
            popularity: 451.914,
          },
        ],
      };

      nock(TMDB_API_URL).get('/3/search/multi').query(true).reply(200, mockResponse);

      const result = await searchMediaTool({ query: 'test' });

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.media_type === 'movie' || r.media_type === 'tv')).toBe(true);
    });

    it('should send include_adult=false and required params in the request', async () => {
      let capturedQuery: Record<string, unknown> = {};

      const mockResponse: TMDBSearchResponse = {
        page: 1,
        total_pages: 0,
        total_results: 0,
        results: [],
      };

      nock(TMDB_API_URL)
        .get('/3/search/multi')
        .query((q: Record<string, unknown>) => {
          capturedQuery = q;
          return true;
        })
        .reply(200, mockResponse);

      await searchMediaTool({ query: 'test', language: 'es-ES' });

      expect(capturedQuery).toMatchObject({
        api_key: mockApiKey,
        query: 'test',
        language: 'es-ES',
        include_adult: 'false',
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error when API key is missing', async () => {
      delete process.env.TMDB_API_KEY;

      await expect(searchMediaTool({ query: 'test' })).rejects.toThrow(
        'TMDB_API_KEY environment variable is not configured'
      );
    });

    it('should handle 401 authentication errors', async () => {
      nock(TMDB_API_URL)
        .get('/3/search/multi')
        .query(true)
        .reply(401, { status_message: 'Invalid API key', status_code: 7 });

      await expect(searchMediaTool({ query: 'test' })).rejects.toThrow(
        'TMDB API authentication failed. Please check your API key.'
      );
    });

    it('should handle 429 rate limit errors', async () => {
      nock(TMDB_API_URL)
        .get('/3/search/multi')
        .query(true)
        .reply(429, { status_message: 'Rate limit exceeded', status_code: 25 });

      await expect(searchMediaTool({ query: 'test' })).rejects.toThrow(
        'TMDB API rate limit exceeded. Please try again later.'
      );
    });

    it('should handle network failures', async () => {
      nock(TMDB_API_URL).get('/3/search/multi').query(true).replyWithError('Network error');

      await expect(searchMediaTool({ query: 'test' })).rejects.toThrow(
        'Network error: Unable to reach TMDB API. Please check your internet connection.'
      );
    });
  });
});
