import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { getMovieDetailTool, getTvDetailTool } from '../../../src/tools/get-media-detail-tool.js';
import type { TMDBMovieDetailResponse, TMDBTvDetailResponse } from '../../../src/lib/tmdb-types.js';

const TMDB_API_URL = 'https://api.themoviedb.org';
const mockApiKey = 'test-api-key';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeCastMember = (i: number) => ({
  id: 1000 + i,
  name: `Actor ${i}`,
  character: `Character ${i}`,
  profile_path: `/profile${i}.jpg`,
  order: i,
});

const mockMovieDetail: TMDBMovieDetailResponse = {
  id: 550,
  title: 'Fight Club',
  original_title: 'Fight Club',
  overview: 'An insomniac office worker forms a fight club.',
  tagline: 'Mischief. Mayhem. Soap.',
  status: 'Released',
  release_date: '1999-10-15',
  runtime: 139,
  budget: 63000000,
  revenue: 100853753,
  poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  backdrop_path: '/backdrop.jpg',
  vote_average: 8.4,
  vote_count: 27000,
  popularity: 61.416,
  original_language: 'en',
  genres: [
    { id: 18, name: 'Drama' },
    { id: 53, name: 'Thriller' },
  ],
  credits: {
    cast: Array.from({ length: 15 }, (_, i) => makeCastMember(i)),
  },
  videos: {
    results: [
      {
        id: 'v1',
        key: 'abc123',
        name: 'Official Trailer',
        site: 'YouTube',
        type: 'Trailer',
        official: true,
        published_at: '1999-09-01T00:00:00.000Z',
      },
      {
        id: 'v2',
        key: 'def456',
        name: 'Unofficial Trailer',
        site: 'YouTube',
        type: 'Trailer',
        official: false,
        published_at: '1999-08-01T00:00:00.000Z',
      },
      {
        id: 'v3',
        key: 'ghi789',
        name: 'Behind the Scenes',
        site: 'YouTube',
        type: 'Behind the Scenes',
        official: true,
        published_at: '1999-10-01T00:00:00.000Z',
      },
      {
        id: 'v4',
        key: 'jkl000',
        name: 'Vimeo Trailer',
        site: 'Vimeo',
        type: 'Trailer',
        official: true,
        published_at: '1999-09-15T00:00:00.000Z',
      },
    ],
  },
  'watch/providers': {
    results: {
      US: {
        link: 'https://www.themoviedb.org/movie/550/watch?locale=US',
        flatrate: [
          {
            logo_path: '/netflix.jpg',
            provider_id: 8,
            provider_name: 'Netflix',
            display_priority: 1,
          },
        ],
      },
      GB: {
        link: 'https://www.themoviedb.org/movie/550/watch?locale=GB',
        rent: [
          {
            logo_path: '/amazon.jpg',
            provider_id: 10,
            provider_name: 'Amazon Video',
            display_priority: 2,
          },
        ],
      },
    },
  },
  release_dates: {
    results: [
      {
        iso_3166_1: 'US',
        release_dates: [{ certification: 'R', type: 3, release_date: '1999-10-15T00:00:00.000Z' }],
      },
      {
        iso_3166_1: 'GB',
        release_dates: [{ certification: '18', type: 3, release_date: '1999-11-12T00:00:00.000Z' }],
      },
    ],
  },
};

const mockTvDetail: TMDBTvDetailResponse = {
  id: 1396,
  name: 'Breaking Bad',
  original_name: 'Breaking Bad',
  overview: 'A chemistry teacher turns to manufacturing methamphetamine.',
  tagline: 'I am the danger.',
  status: 'Ended',
  first_air_date: '2008-01-20',
  last_air_date: '2013-09-29',
  number_of_seasons: 5,
  number_of_episodes: 62,
  episode_run_time: [45, 47],
  poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  backdrop_path: '/backdrop-bb.jpg',
  vote_average: 8.9,
  vote_count: 12000,
  popularity: 451.914,
  original_language: 'en',
  genres: [
    { id: 18, name: 'Drama' },
    { id: 80, name: 'Crime' },
  ],
  networks: [{ id: 174, name: 'AMC', logo_path: '/amc.jpg', origin_country: 'US' }],
  created_by: [{ id: 66633, name: 'Vince Gilligan', profile_path: '/vg.jpg' }],
  seasons: [
    {
      id: 3572,
      name: 'Season 1',
      season_number: 1,
      episode_count: 7,
      air_date: '2008-01-20',
      poster_path: '/s1.jpg',
    },
    {
      id: 3573,
      name: 'Season 2',
      season_number: 2,
      episode_count: 13,
      air_date: '2009-03-08',
      poster_path: '/s2.jpg',
    },
  ],
  credits: {
    cast: Array.from({ length: 12 }, (_, i) => makeCastMember(i)),
  },
  videos: {
    results: [
      {
        id: 'tv1',
        key: 'xyz789',
        name: 'Official Trailer',
        site: 'YouTube',
        type: 'Trailer',
        official: true,
        published_at: '2008-01-01T00:00:00.000Z',
      },
    ],
  },
  'watch/providers': {
    results: {
      US: {
        link: 'https://www.themoviedb.org/tv/1396/watch?locale=US',
        flatrate: [
          {
            logo_path: '/netflix.jpg',
            provider_id: 8,
            provider_name: 'Netflix',
            display_priority: 1,
          },
        ],
      },
    },
  },
  content_ratings: {
    results: [
      { iso_3166_1: 'US', rating: 'TV-MA' },
      { iso_3166_1: 'GB', rating: '18' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getMovieDetailTool', () => {
  beforeEach(() => {
    process.env['TMDB_API_KEY'] = mockApiKey;
    nock.cleanAll();
  });

  afterEach(() => {
    delete process.env['TMDB_API_KEY'];
  });

  describe('Successful fetch', () => {
    it('should return full movie detail for a valid id', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en' });

      expect(result.id).toBe(550);
      expect(result.media_type).toBe('movie');
      expect(result.title).toBe('Fight Club');
      expect(result.runtime).toBe(139);
      expect(result.budget).toBe(63000000);
      expect(result.revenue).toBe(100853753);
      expect(result.status).toBe('Released');
      expect(result.genres).toEqual(['Drama', 'Thriller']);
    });

    it('should slice cast to top 10 members', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en' });

      expect(result.cast).toHaveLength(10);
      expect(result.cast?.[0]).toEqual({
        id: 1000,
        name: 'Actor 0',
        character: 'Character 0',
        profile_path: '/profile0.jpg',
      });
    });

    it('should filter trailers to YouTube Trailer type only', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en' });

      // v3 (Behind the Scenes) and v4 (Vimeo) should be excluded
      expect(result.trailers).toHaveLength(2);
      expect(result.trailers?.every((t) => t.site === 'YouTube')).toBe(true);
      expect(result.trailers?.every((t) => t.type === 'Trailer')).toBe(true);
    });

    it('should sort official trailers before unofficial ones', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en' });

      expect(result.trailers?.[0]?.official).toBe(true);
      expect(result.trailers?.[1]?.official).toBe(false);
    });

    it('should return empty trailers array when no YouTube Trailers exist', async () => {
      const noTrailers = {
        ...mockMovieDetail,
        videos: { results: [{ ...mockMovieDetail.videos.results[2]! }] }, // only Behind the Scenes
      };

      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, noTrailers);

      const result = await getMovieDetailTool({ id: 550, language: 'en' });

      expect(result.trailers).toHaveLength(0);
    });

    it('should default to US watch providers when no region is specified', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en' });

      expect(Object.keys(result.watch_providers ?? {})).toEqual(['US']);
      expect(result.watch_providers?.['US']?.flatrate?.[0]?.provider_name).toBe('Netflix');
    });

    it('should return only the requested region when region is specified', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en', region: 'GB' });

      expect(Object.keys(result.watch_providers ?? {})).toEqual(['GB']);
    });

    it('should return empty object when requested region has no providers', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en', region: 'MX' });

      expect(result.watch_providers).toEqual({});
    });

    it('should pass language param to TMDB', async () => {
      let capturedQuery: Record<string, unknown> = {};

      nock(TMDB_API_URL)
        .get('/3/movie/550')
        .query((q: Record<string, unknown>) => {
          capturedQuery = q;
          return true;
        })
        .reply(200, mockMovieDetail);

      await getMovieDetailTool({ id: 550, language: 'es-ES' });

      expect(capturedQuery).toMatchObject({
        api_key: mockApiKey,
        language: 'es-ES',
        append_to_response: 'credits,videos,watch/providers,release_dates',
      });
    });

    it('should return certification for the default region (US)', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en' });

      expect(result.certification).toBe('R');
    });

    it('should return certification for an explicit region', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en', region: 'GB' });

      expect(result.certification).toBe('18');
    });

    it('should fall back to US certification when region has no entry', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, mockMovieDetail);

      const result = await getMovieDetailTool({ id: 550, language: 'en', region: 'MX' });

      expect(result.certification).toBe('R');
    });

    it('should return null certification when release_dates is absent', async () => {
      const noReleaseDates = { ...mockMovieDetail, release_dates: undefined };
      nock(TMDB_API_URL).get('/3/movie/550').query(true).reply(200, noReleaseDates);

      const result = await getMovieDetailTool({ id: 550, language: 'en' });

      expect(result.certification).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should throw error when API key is missing', async () => {
      delete process.env['TMDB_API_KEY'];

      await expect(getMovieDetailTool({ id: 550, language: 'en' })).rejects.toThrow(
        'TMDB_API_KEY environment variable is not configured'
      );
    });

    it('should handle 401 authentication errors', async () => {
      nock(TMDB_API_URL)
        .get('/3/movie/550')
        .query(true)
        .reply(401, { status_message: 'Invalid API key', status_code: 7 });

      await expect(getMovieDetailTool({ id: 550, language: 'en' })).rejects.toThrow(
        'TMDB API authentication failed. Please check your API key.'
      );
    });

    it('should handle 404 not found', async () => {
      nock(TMDB_API_URL)
        .get('/3/movie/9999999')
        .query(true)
        .reply(404, { status_message: 'The resource you requested could not be found.' });

      await expect(getMovieDetailTool({ id: 9999999, language: 'en' })).rejects.toThrow(
        'TMDB: resource not found.'
      );
    });

    it('should handle 429 rate limit errors', async () => {
      nock(TMDB_API_URL)
        .get('/3/movie/550')
        .query(true)
        .times(3)
        .reply(429, { status_message: 'Rate limit exceeded', status_code: 25 });

      await expect(getMovieDetailTool({ id: 550, language: 'en' })).rejects.toThrow(
        'TMDB API rate limit exceeded. Please try again later.'
      );
    });

    it('should handle network failures', async () => {
      nock(TMDB_API_URL).get('/3/movie/550').query(true).replyWithError('Network error');

      await expect(getMovieDetailTool({ id: 550, language: 'en' })).rejects.toThrow(
        'Network error: Unable to reach TMDB API. Please check your internet connection.'
      );
    });
  });
});

describe('getTvDetailTool', () => {
  beforeEach(() => {
    process.env['TMDB_API_KEY'] = mockApiKey;
    nock.cleanAll();
  });

  afterEach(() => {
    delete process.env['TMDB_API_KEY'];
  });

  describe('Successful fetch', () => {
    it('should return full TV detail for a valid id', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en' });

      expect(result.id).toBe(1396);
      expect(result.media_type).toBe('tv');
      expect(result.name).toBe('Breaking Bad');
      expect(result.seasons_count).toBe(5);
      expect(result.episodes_count).toBe(62);
      expect(result.status).toBe('Ended');
      expect(result.genres).toEqual(['Drama', 'Crime']);
    });

    it('should include seasons with correct fields', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en' });

      expect(result.seasons).toHaveLength(2);
      expect(result.seasons?.[0]).toEqual({
        season_number: 1,
        name: 'Season 1',
        episode_count: 7,
        air_date: '2008-01-20',
        poster_path: '/s1.jpg',
      });
    });

    it('should include networks and creators', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en' });

      expect(result.networks).toHaveLength(1);
      expect(result.networks?.[0]?.name).toBe('AMC');
      expect(result.creators).toHaveLength(1);
      expect(result.creators?.[0]?.name).toBe('Vince Gilligan');
    });

    it('should slice cast to top 10 members', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en' });

      expect(result.cast).toHaveLength(10);
    });

    it('should filter trailers to YouTube Trailer type only', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en' });

      expect(result.trailers).toHaveLength(1);
      expect(result.trailers?.[0]?.key).toBe('xyz789');
    });

    it('should include watch providers', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en' });

      expect(result.watch_providers).toHaveProperty('US');
      expect(result.watch_providers?.['US']?.flatrate?.[0]?.provider_name).toBe('Netflix');
    });

    it('should return certification for the default region (US)', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en' });

      expect(result.certification).toBe('TV-MA');
    });

    it('should return certification for an explicit non-US region', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en', region: 'GB' });

      expect(result.certification).toBe('18');
    });

    it('should fall back to US certification when region has no entry', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, mockTvDetail);

      const result = await getTvDetailTool({ id: 1396, language: 'en', region: 'MX' });

      expect(result.certification).toBe('TV-MA');
    });

    it('should return null certification when content_ratings is absent', async () => {
      const noContentRatings = { ...mockTvDetail, content_ratings: undefined };
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).reply(200, noContentRatings);

      const result = await getTvDetailTool({ id: 1396, language: 'en' });

      expect(result.certification).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should throw error when API key is missing', async () => {
      delete process.env['TMDB_API_KEY'];

      await expect(getTvDetailTool({ id: 1396, language: 'en' })).rejects.toThrow(
        'TMDB_API_KEY environment variable is not configured'
      );
    });

    it('should handle 401 authentication errors', async () => {
      nock(TMDB_API_URL)
        .get('/3/tv/1396')
        .query(true)
        .reply(401, { status_message: 'Invalid API key', status_code: 7 });

      await expect(getTvDetailTool({ id: 1396, language: 'en' })).rejects.toThrow(
        'TMDB API authentication failed. Please check your API key.'
      );
    });

    it('should handle 404 not found', async () => {
      nock(TMDB_API_URL)
        .get('/3/tv/9999999')
        .query(true)
        .reply(404, { status_message: 'The resource you requested could not be found.' });

      await expect(getTvDetailTool({ id: 9999999, language: 'en' })).rejects.toThrow(
        'TMDB: resource not found.'
      );
    });

    it('should handle 429 rate limit errors', async () => {
      nock(TMDB_API_URL)
        .get('/3/tv/1396')
        .query(true)
        .times(3)
        .reply(429, { status_message: 'Rate limit exceeded', status_code: 25 });

      await expect(getTvDetailTool({ id: 1396, language: 'en' })).rejects.toThrow(
        'TMDB API rate limit exceeded. Please try again later.'
      );
    });

    it('should handle network failures', async () => {
      nock(TMDB_API_URL).get('/3/tv/1396').query(true).replyWithError('Network error');

      await expect(getTvDetailTool({ id: 1396, language: 'en' })).rejects.toThrow(
        'Network error: Unable to reach TMDB API. Please check your internet connection.'
      );
    });
  });
});
