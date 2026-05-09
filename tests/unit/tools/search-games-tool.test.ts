import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { searchGamesTool, fetchGameResults } from '../../../src/tools/search-games-tool.js';
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
          screenshots: [{ id: 10, image_id: 'sc_abc' }],
          videos: [{ id: 20, video_id: 'yt123' }],
          themes: [{ id: 1, name: 'Action' }],
          game_modes: [{ id: 1, name: 'Single player' }],
          age_ratings: [
            { id: 1, organization: { name: 'ESRB' }, rating_category: { rating: 'T' } },
            { id: 2, organization: { name: 'PEGI' }, rating_category: { rating: 18 } },
          ],
          similar_games: [{ id: 99, name: 'Cyberpunk 2077' }],
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
        screenshots: ['https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc_abc.jpg'],
        videos: ['yt123'],
        themes: ['Action'],
        game_modes: ['Single player'],
        age_ratings: [
          { organization: 'ESRB', rating: 'T' },
          { organization: 'PEGI', rating: '18' },
        ],
        similar_games: [{ id: 99, name: 'Cyberpunk 2077' }],
      });
    });

    it('should handle results with missing optional fields', async () => {
      const mockResponse: IGDBGame[] = [
        {
          id: 2,
          name: 'Minimal Game',
          summary: 'A minimal game.',
          cover: { id: 5, image_id: 'co_minimal' },
        },
      ];

      nock(IGDB_API_URL).post('/v4/games').reply(200, mockResponse);

      const result = await searchGamesTool({ query: 'Minimal', language: 'en' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 2,
        name: 'Minimal Game',
        summary: 'A minimal game.',
        rating: undefined,
        aggregated_rating: undefined,
        released: undefined,
        cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co_minimal.jpg',
        platforms: undefined,
        genres: undefined,
        developers: undefined,
        publishers: undefined,
        game_type: undefined,
        screenshots: undefined,
        videos: undefined,
        themes: undefined,
        game_modes: undefined,
        age_ratings: undefined,
        similar_games: undefined,
      });
    });

    it('should filter out games missing cover or summary', async () => {
      const mockResponse: IGDBGame[] = [
        {
          id: 1,
          name: 'Complete Game',
          summary: 'Has both cover and summary.',
          cover: { id: 10, image_id: 'co_complete' },
        },
        {
          id: 2,
          name: 'No Cover',
          summary: 'Has summary but no cover.',
        },
        {
          id: 3,
          name: 'No Summary',
          cover: { id: 11, image_id: 'co_nosummary' },
        },
        {
          id: 4,
          name: 'Missing Both',
        },
      ];

      nock(IGDB_API_URL).post('/v4/games').reply(200, mockResponse);

      const result = await searchGamesTool({ query: 'test', language: 'en' });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(1);
    });

    it('should filter out age_ratings with missing category or rating', async () => {
      const mockResponse: IGDBGame[] = [
        {
          id: 3,
          name: 'Partial Ratings Game',
          summary: 'A game with partial age ratings.',
          cover: { id: 20, image_id: 'co_partial' },
          age_ratings: [
            { id: 1, organization: { name: 'ESRB' }, rating_category: { rating: 'T' } }, // valid — string rating
            { id: 2, organization: { name: 'PEGI' }, rating_category: { rating: 18 } }, // valid — numeric rating (exercises String() coercion)
            { id: 3, organization: undefined, rating_category: { rating: '16' } }, // invalid — missing organization
            { id: 4, organization: { name: 'USK' }, rating_category: undefined }, // invalid — missing rating_category
          ],
        },
      ];

      nock(IGDB_API_URL).post('/v4/games').reply(200, mockResponse);

      const result = await searchGamesTool({ query: 'Partial Ratings', language: 'en' });

      expect(result[0]?.age_ratings).toEqual([
        { organization: 'ESRB', rating: 'T' },
        { organization: 'PEGI', rating: '18' },
      ]);
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
      nock(IGDB_API_URL).post('/v4/games').times(3).reply(429);

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
        fields name,game_type,summary,rating,aggregated_rating,first_release_date,cover.image_id,platforms.name,genres.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,screenshots.image_id,videos.video_id,themes.name,game_modes.name,age_ratings.organization.name,age_ratings.rating_category.rating,similar_games.id,similar_games.name;
        where game_type = (0, 1, 2, 8, 9, 10) & version_parent = null;
        limit 11;
        offset 0;
            `.trim();

      // Normalize whitespace for comparison to avoid fragility
      const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
      expect(normalize(capturedBody)).toBe(normalize(expectedQuery));
    });

    it('should accept language parameter without affecting Apicalypse query', async () => {
      const query = 'The Witcher 3';
      let capturedBody = '';

      nock(IGDB_API_URL)
        .post('/v4/games', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, []);

      await searchGamesTool({ query, language: 'es' });

      // IGDB search does not support language filtering directly in the query.
      // This parameter is accepted for API consistency with other search tools.
      expect(capturedBody).toContain('search "The Witcher 3";');
    });

    it('should omit language-specific IGDB logic when not provided', async () => {
      const query = 'The Witcher 3';
      let capturedBody = '';

      nock(IGDB_API_URL)
        .post('/v4/games', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, []);

      await searchGamesTool({ query } as any);

      expect(capturedBody).toContain('search "The Witcher 3";');
    });

    it('should sanitize search query to prevent injection', async () => {
      const query = 'Game "Inject" \\ Test\r\nNext';
      let capturedBody = '';

      nock(IGDB_API_URL)
        .post('/v4/games', (body) => {
          capturedBody = body;
          return true;
        })
        .reply(200, []);

      await searchGamesTool({ query, language: 'en' });

      // Quotes escaped: \"
      expect(capturedBody).toContain('\\"Inject\\"');
      // Backslash escaped: \\
      expect(capturedBody).toContain('\\\\');
      // CR and LF each replaced with space — "Test\r\nNext" becomes "Test  Next"
      expect(capturedBody).toContain('Test  Next');
    });

    it('should correctly map different game_types (up to tool limit)', async () => {
      // The tool slices to MAX_RESULTS_PER_SOURCE (5), so test with 5 games.
      // Full coverage of all 6 game_types is in the fetchGameResults describe block below.
      const mockGames: IGDBGame[] = [
        { id: 1, name: 'Main Game', game_type: 0, summary: 'S', cover: { id: 1, image_id: 'c1' } },
        { id: 2, name: 'DLC', game_type: 1, summary: 'S', cover: { id: 2, image_id: 'c2' } },
        { id: 3, name: 'Expansion', game_type: 2, summary: 'S', cover: { id: 3, image_id: 'c3' } },
        { id: 4, name: 'Remake', game_type: 8, summary: 'S', cover: { id: 4, image_id: 'c4' } },
        { id: 5, name: 'Remaster', game_type: 9, summary: 'S', cover: { id: 5, image_id: 'c5' } },
      ];

      nock(IGDB_API_URL).post('/v4/games').reply(200, mockGames);

      const results = await searchGamesTool({ query: 'Types Test', language: 'en' });

      expect(results).toHaveLength(5);
      expect(results.find((g) => g.id === 1)?.game_type).toBe(0);
      expect(results.find((g) => g.id === 2)?.game_type).toBe(1);
      expect(results.find((g) => g.id === 3)?.game_type).toBe(2);
      expect(results.find((g) => g.id === 4)?.game_type).toBe(8);
      expect(results.find((g) => g.id === 5)?.game_type).toBe(9);
    });
  });
});

describe('fetchGameResults', () => {
  const IGDB_API_URL = 'https://api.igdb.com';
  const mockClientId = 'test-client-id';
  const mockAccessToken = 'test-access-token';

  beforeEach(() => {
    process.env['IGDB_CLIENT_ID'] = mockClientId;
    vi.spyOn(igdbAuth, 'getAccessToken').mockResolvedValue(mockAccessToken);
    nock.cleanAll();
  });

  afterEach(() => {
    delete process.env['IGDB_CLIENT_ID'];
    vi.restoreAllMocks();
  });

  const makeGame = (id: number): IGDBGame => ({
    id,
    name: `Game ${id}`,
    summary: 'A summary.',
    cover: { id, image_id: `co${id}` },
  });

  it('page 1 sends offset=0 in Apicalypse query', async () => {
    let capturedBody = '';

    nock(IGDB_API_URL)
      .post('/v4/games', (body) => {
        capturedBody = body;
        return true;
      })
      .reply(200, []);

    await fetchGameResults({ query: 'test', language: 'en', page: 1 });

    expect(capturedBody).toContain('offset 0;');
  });

  it('page 3 sends offset=20 in Apicalypse query', async () => {
    let capturedBody = '';

    nock(IGDB_API_URL)
      .post('/v4/games', (body) => {
        capturedBody = body;
        return true;
      })
      .reply(200, []);

    await fetchGameResults({ query: 'test', language: 'en', page: 3 });

    expect(capturedBody).toContain('offset 20;');
  });

  it('hasMore is true when IGDB returns a full page (raw count = CATALOG_PAGE_SIZE + 1)', async () => {
    // Return 11 raw games (sentinel = CATALOG_PAGE_SIZE + 1), all pass quality filter
    const rawGames = Array.from({ length: 11 }, (_, i) => makeGame(i + 1));

    nock(IGDB_API_URL).post('/v4/games').reply(200, rawGames);

    const result = await fetchGameResults({ query: 'test', language: 'en', page: 1 });

    expect(result.hasMore).toBe(true);
    // Sentinel row must be stripped — only CATALOG_PAGE_SIZE results returned
    expect(result.results).toHaveLength(10);
  });

  it('hasMore is false when IGDB returns fewer than a full page', async () => {
    const rawGames = Array.from({ length: 4 }, (_, i) => makeGame(i + 1));

    nock(IGDB_API_URL).post('/v4/games').reply(200, rawGames);

    const result = await fetchGameResults({ query: 'test', language: 'en', page: 1 });

    expect(result.hasMore).toBe(false);
  });

  it('hasMore uses raw count before quality filter', async () => {
    // 11 raw games (sentinel page) but only 1 passes quality gate (has cover + summary)
    const rawGames: IGDBGame[] = [
      makeGame(1), // passes: has cover + summary
      ...Array.from({ length: 10 }, (_, i) => ({ id: i + 2, name: `Game ${i + 2}` })), // no cover/summary
    ];

    nock(IGDB_API_URL).post('/v4/games').reply(200, rawGames);

    const result = await fetchGameResults({ query: 'test', language: 'en', page: 1 });

    // Quality filter reduces results to 1, but hasMore is based on rawGames.length > CATALOG_PAGE_SIZE
    expect(result.results).toHaveLength(1);
    expect(result.hasMore).toBe(true);
  });

  it('returns paginated wrapper with no total field', async () => {
    nock(IGDB_API_URL)
      .post('/v4/games')
      .reply(200, [makeGame(1)]);

    const result = await fetchGameResults({ query: 'test', language: 'en', page: 1 });

    expect(result).toMatchObject({ page: 1, hasMore: expect.any(Boolean) });
    expect('total' in result).toBe(false);
    expect(Array.isArray(result.results)).toBe(true);
  });

  it('correctly maps all 6 valid game_types', async () => {
    const mockGames: IGDBGame[] = [
      { id: 1, name: 'Main Game', game_type: 0, summary: 'S', cover: { id: 1, image_id: 'c1' } },
      { id: 2, name: 'DLC', game_type: 1, summary: 'S', cover: { id: 2, image_id: 'c2' } },
      { id: 3, name: 'Expansion', game_type: 2, summary: 'S', cover: { id: 3, image_id: 'c3' } },
      { id: 4, name: 'Remake', game_type: 8, summary: 'S', cover: { id: 4, image_id: 'c4' } },
      { id: 5, name: 'Remaster', game_type: 9, summary: 'S', cover: { id: 5, image_id: 'c5' } },
      { id: 6, name: 'Expanded', game_type: 10, summary: 'S', cover: { id: 6, image_id: 'c6' } },
    ];

    nock(IGDB_API_URL).post('/v4/games').reply(200, mockGames);

    const { results } = await fetchGameResults({ query: 'Types Test', language: 'en', page: 1 });

    expect(results).toHaveLength(6);
    expect(results.find((g) => g.id === 1)?.game_type).toBe(0);
    expect(results.find((g) => g.id === 2)?.game_type).toBe(1);
    expect(results.find((g) => g.id === 3)?.game_type).toBe(2);
    expect(results.find((g) => g.id === 4)?.game_type).toBe(8);
    expect(results.find((g) => g.id === 5)?.game_type).toBe(9);
    expect(results.find((g) => g.id === 6)?.game_type).toBe(10);
  });
});
