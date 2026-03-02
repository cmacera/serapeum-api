import { ai, z } from '../lib/ai.js';
import axios from 'axios';
import type {
  TMDBMovieDetailResponse,
  TMDBTvDetailResponse,
  TMDBWatchProviderRegion,
} from '../lib/tmdb-types.js';
import { MovieDetailSchema, TvDetailSchema } from '../schemas/media-detail-schemas.js';

const TMDB_BASE = 'https://api.themoviedb.org';
const CAST_LIMIT = 10;
const DEFAULT_REGION = 'US';

function filterWatchProviders(
  results: Record<string, TMDBWatchProviderRegion> | undefined,
  region: string | undefined
): Record<string, TMDBWatchProviderRegion> | undefined {
  if (!results) return undefined;
  const target = region ?? DEFAULT_REGION;
  const entry = results[target];
  return entry !== undefined ? { [target]: entry } : {};
}

function handleTmdbError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error('TMDB API authentication failed. Please check your API key.');
      } else if (status === 404) {
        throw new Error('TMDB: resource not found.');
      } else if (status === 429) {
        throw new Error('TMDB API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`TMDB API error (${status}): ${error.response.statusText}`);
      }
    } else if (error.request) {
      throw new Error(
        'Network error: Unable to reach TMDB API. Please check your internet connection.'
      );
    }
  }
  throw error;
}

const detailInputSchema = {
  id: z.number().int().positive(),
  language: z.string().optional().default('en'),
  region: z
    .string()
    .optional()
    .default('US')
    .describe('ISO 3166-1 country code (e.g. US, ES, MX). Filters watch providers to this region.'),
};

export const getMovieDetailTool = ai.defineTool(
  {
    name: 'getMovieDetailTool',
    description:
      'Fetch full details for a movie from TMDB, including cast, trailers, and watch providers.',
    inputSchema: z.object(detailInputSchema),
    outputSchema: MovieDetailSchema,
  },
  async (input) => {
    const apiKey = process.env['TMDB_API_KEY'];
    if (!apiKey) {
      throw new Error('TMDB_API_KEY environment variable is not configured');
    }

    try {
      const response = await axios.get<TMDBMovieDetailResponse>(
        `${TMDB_BASE}/3/movie/${input.id}`,
        {
          params: {
            api_key: apiKey,
            language: input.language,
            append_to_response: 'credits,videos,watch/providers',
          },
          headers: { Accept: 'application/json' },
        }
      );

      const d = response.data;

      return {
        id: d.id,
        media_type: 'movie' as const,
        title: d.title,
        original_title: d.original_title,
        overview: d.overview,
        tagline: d.tagline,
        release_date: d.release_date,
        status: d.status,
        runtime: d.runtime,
        budget: d.budget,
        revenue: d.revenue,
        vote_average: d.vote_average,
        vote_count: d.vote_count,
        popularity: d.popularity,
        poster_path: d.poster_path,
        backdrop_path: d.backdrop_path,
        genres: d.genres.map((g) => g.name),
        original_language: d.original_language,
        cast: d.credits.cast.slice(0, CAST_LIMIT).map((c) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path,
        })),
        trailers: d.videos.results
          .filter((v) => v.site === 'YouTube' && v.type === 'Trailer')
          .sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0))
          .map((v) => ({
            id: v.id,
            key: v.key,
            name: v.name,
            site: v.site,
            type: v.type,
            official: v.official,
            published_at: v.published_at,
          })),
        watch_providers: filterWatchProviders(d['watch/providers']?.results, input.region),
      };
    } catch (error) {
      handleTmdbError(error);
    }
  }
);

export const getTvDetailTool = ai.defineTool(
  {
    name: 'getTvDetailTool',
    description:
      'Fetch full details for a TV show from TMDB, including cast, trailers, seasons, and watch providers.',
    inputSchema: z.object(detailInputSchema),
    outputSchema: TvDetailSchema,
  },
  async (input) => {
    const apiKey = process.env['TMDB_API_KEY'];
    if (!apiKey) {
      throw new Error('TMDB_API_KEY environment variable is not configured');
    }

    try {
      const response = await axios.get<TMDBTvDetailResponse>(`${TMDB_BASE}/3/tv/${input.id}`, {
        params: {
          api_key: apiKey,
          language: input.language,
          append_to_response: 'credits,videos,watch/providers',
        },
        headers: { Accept: 'application/json' },
      });

      const d = response.data;

      return {
        id: d.id,
        media_type: 'tv' as const,
        name: d.name,
        original_name: d.original_name,
        overview: d.overview,
        tagline: d.tagline,
        first_air_date: d.first_air_date,
        last_air_date: d.last_air_date,
        status: d.status,
        seasons_count: d.number_of_seasons,
        episodes_count: d.number_of_episodes,
        episode_run_time: d.episode_run_time,
        vote_average: d.vote_average,
        vote_count: d.vote_count,
        popularity: d.popularity,
        poster_path: d.poster_path,
        backdrop_path: d.backdrop_path,
        genres: d.genres.map((g) => g.name),
        original_language: d.original_language,
        seasons: d.seasons.map((s) => ({
          season_number: s.season_number,
          name: s.name,
          episode_count: s.episode_count,
          air_date: s.air_date,
          poster_path: s.poster_path,
        })),
        networks: d.networks.map((n) => ({
          id: n.id,
          name: n.name,
          logo_path: n.logo_path,
          origin_country: n.origin_country,
        })),
        creators: d.created_by.map((c) => ({
          id: c.id,
          name: c.name,
          profile_path: c.profile_path,
        })),
        cast: d.credits.cast.slice(0, CAST_LIMIT).map((c) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path,
        })),
        trailers: d.videos.results
          .filter((v) => v.site === 'YouTube' && v.type === 'Trailer')
          .sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0))
          .map((v) => ({
            id: v.id,
            key: v.key,
            name: v.name,
            site: v.site,
            type: v.type,
            official: v.official,
            published_at: v.published_at,
          })),
        watch_providers: filterWatchProviders(d['watch/providers']?.results, input.region),
      };
    } catch (error) {
      handleTmdbError(error);
    }
  }
);
