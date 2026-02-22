import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { searchGamesTool } from '../../../src/tools/search-games-tool.js';
import * as igdbAuth from '../../../src/lib/igdb-auth.js';
import type { IGDBGame } from '../../../src/lib/igdb-types.js';

describe('searchGamesTool', () => {
  const IGDB_API_URL = 'https://api.igdb.com';
  const mockClientId = 'test-client-id';
  const mockAccessToken = 'test-access-token';

  beforeEach(() => {
    // Set up environment variable
    process.env['IGDB_CLIENT_ID'] = mockClientId;

    // Mock getAccessToken to avoid actual auth calls
    vi.spyOn(igdbAuth, 'getAccessToken').mockResolvedValue(mockAccessToken);

    // Clean all HTTP mocks before each test
    nock.cleanAll();
  });

  afterEach(() => {
    // Restore environment
    delete process.env['IGDB_CLIENT_ID'];
    vi.restoreAllMocks();
  });

  describe('Successful searches', () => {
    it('should return games for a valid query', async () => {
      const mockResponse: IGDBGame[] = [
        {
          id: 1,
          name: 'The Witcher 3: Wild Hunt',
          summary: 'An open world RPG.',
          rating: 95.5,
          aggregated_rating: 92.0,
          first_release_date: 1431993600,
          cover: { id: 100, image_id: 'co1wyy' },
          platforms: [
            { id: 6, name: 'PC' },
            { id: 48, name: 'PS4' },
          ],
          genres: [{ id: 12, name: 'RPG' }],
          involved_companies: [
            { id: 1, company: { id: 1, name: 'CD Projekt RED' }, developer: true, publisher: true },
          ],
          game_type: 0, // Main Game
        },
      ];

      nock(IGDB_API_URL).post('/v4/games').reply(200, mockResponse);

      const result = await searchGamesTool({ query: 'The Witcher 3', language: 'en' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        name: 'The Witcher 3: Wild Hunt',
        summary: 'An open world RPG.',
        rating: 95.5,
        aggregated_rating: 92.0,
        released: '2015-05-19',
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
        platforms: ['PC', 'PS4'],
        genres: ['RPG'],
        developers: ['CD Projekt RED'],
        publishers: ['CD Projekt RED'],
        game_type: 0,
      });
    });

    it('should handle results with missing optional fields', async () => {
      const mockResponse: IGDBGame[] = [
        {
          id: 2,
          name: 'Minimal Game',
        },
      ];

      nock(IGDB_API_URL).post('/v4/games').reply(200, mockResponse);

      const result = await searchGamesTool({ query: 'Minimal', language: 'en' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 2,
        name: 'Minimal Game',
        summary: undefined,
        rating: undefined,
        aggregated_rating: undefined,
        released: undefined,
        cover_url: undefined,
        platforms: undefined,
        genres: undefined,
        developers: undefined,
        publishers: undefined,
        game_type: undefined,
      });
    });
  });

  describe('Error handling', () => {
    it('should throw an error if IGDB_CLIENT_ID is missing', async () => {
      delete process.env['IGDB_CLIENT_ID'];

      await expect(searchGamesTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'IGDB_CLIENT_ID environment variable is not configured'
      );
    });

    it('should handle authentication failure (401)', async () => {
      nock(IGDB_API_URL).post('/v4/games').reply(401);

      await expect(searchGamesTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'IGDB authentication failed. Access token may have expired.'
      );
    });

    it('should handle rate limiting (429)', async () => {
      nock(IGDB_API_URL).post('/v4/games').reply(429);

      await expect(searchGamesTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'IGDB API rate limit exceeded. Please try again later.'
      );
    });

    it('should handle general API errors', async () => {
      nock(IGDB_API_URL).post('/v4/games').reply(500, 'Internal Server Error');

      await expect(searchGamesTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'IGDB API request failed: 500 Internal Server Error'
      );
    });

    it('should propagate auth errors', async () => {
      vi.spyOn(igdbAuth, 'getAccessToken').mockRejectedValue(new Error('Auth failed'));

      await expect(searchGamesTool({ query: 'test', language: 'en' })).rejects.toThrow(
        'Failed to search games: Auth failed'
      );
    });
  });

  describe('Internal Logic Verification', () => {
    it('should construct the correct Apicalypse query', async () => {
      const query = 'The Witcher 3';
      // We need to capture the body to verify it exactly
      let capturedBody = '';

      nock(IGDB_API_URL)
        .post('/v4/games', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, []);

      await searchGamesTool({ query, language: 'en' });

      const expectedQuery = `
        search "${query}";
        fields name,game_type,summary,rating,aggregated_rating,first_release_date,cover.image_id,platforms.name,genres.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
        where game_type = (0, 1, 2, 8, 9, 10);
        limit 10;
            `.trim();

      // Normalize whitespace for comparison to avoid fragility
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
      expect(normalize(capturedBody)).toBe(normalize(expectedQuery));
    });

    it('should sanitize search query to prevent injection', async () => {
      const query = 'Game "Inject" Test';
      let capturedBody = '';

      nock(IGDB_API_URL)
        .post('/v4/games', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, []);

      await searchGamesTool({ query, language: 'en' });

      // Expect the quote to be escaped: "Game \"Inject\" Test"
      // In the body string it looks like: search "Game \"Inject\" Test";
      expect(capturedBody).toContain('search "Game \\"Inject\\" Test";');
    });

    it('should correctly map different game_types', async () => {
      const mockGames: IGDBGame[] = [
        { id: 1, name: 'Main Game', game_type: 0 },
        { id: 2, name: 'DLC', game_type: 1 },
        { id: 3, name: 'Expansion', game_type: 2 },
        { id: 4, name: 'Remake', game_type: 8 },
        { id: 5, name: 'Remaster', game_type: 9 },
        { id: 6, name: 'Expanded', game_type: 10 },
      ];

      nock(IGDB_API_URL).post('/v4/games').reply(200, mockGames);

      const results = await searchGamesTool({ query: 'Types Test', language: 'en' });

      expect(results).toHaveLength(6);
      expect(results.find((g) => g.id === 1)?.game_type).toBe(0);
      expect(results.find((g) => g.id === 2)?.game_type).toBe(1);
      expect(results.find((g) => g.id === 3)?.game_type).toBe(2);
      expect(results.find((g) => g.id === 4)?.game_type).toBe(8);
      expect(results.find((g) => g.id === 5)?.game_type).toBe(9);
      expect(results.find((g) => g.id === 6)?.game_type).toBe(10);
    });
  });
});
