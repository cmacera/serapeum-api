import { ai, z } from '../lib/ai.js';
import axios from 'axios';
import type { TMDBSearchResponse, MediaSearchResult } from '../lib/tmdb-types.js';

/**
 * Genkit Tool: Search for movies and TV shows using TMDB API
 * Uses the /search/multi endpoint to search both media types at once
 */
export const MediaSearchResultSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  media_type: z.enum(['movie', 'tv']),
  release_date: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  overview: z.string().optional(),
  vote_average: z.number().optional(),
  popularity: z.number().optional(),
});

export const searchMediaTool = ai.defineTool(
  {
    name: 'searchMediaTool',
    description:
      'Search for movies and TV shows using The Movie Database (TMDB) API. Returns clean, structured data for UI consumption.',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
    }),
    outputSchema: z.array(MediaSearchResultSchema),
  },
  async (input) => {
    const apiKey = process.env['TMDB_API_KEY'];

    if (!apiKey) {
      throw new Error('TMDB_API_KEY environment variable is not configured');
    }

    try {
      const response = await axios.get<TMDBSearchResponse>(
        'https://api.themoviedb.org/3/search/multi',
        {
          params: {
            api_key: apiKey,
            query: input.query,
          },
          headers: {
            Accept: 'application/json',
          },
        }
      );

      // Filter to only include movies and TV shows (exclude 'person')
      // and transform to clean format
      const results: MediaSearchResult[] = response.data.results
        .filter((result) => result.media_type === 'movie' || result.media_type === 'tv')
        .map((result) => ({
          id: result.id,
          title: result.title,
          name: result.name,
          media_type: result.media_type as 'movie' | 'tv',
          release_date: result.release_date || result.first_air_date,
          poster_path: result.poster_path,
          overview: result.overview,
          vote_average: result.vote_average,
          popularity: result.popularity,
        }));

      return results;
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // API returned an error response
          const status = error.response.status;
          if (status === 401) {
            throw new Error('TMDB API authentication failed. Please check your API key.');
          } else if (status === 429) {
            throw new Error('TMDB API rate limit exceeded. Please try again later.');
          } else {
            throw new Error(`TMDB API error (${status}): ${error.response.statusText}`);
          }
        } else if (error.request) {
          // Request was made but no response received
          throw new Error(
            'Network error: Unable to reach TMDB API. Please check your internet connection.'
          );
        }
      }

      // Re-throw other errors
      throw error;
    }
  }
);
