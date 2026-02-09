import { ai, z } from '../../lib/ai.js';
import { searchMoviesAndTVTool } from '../../tools/search-movies-tv-tool.js';

/**
 * Search Movies and TV Shows Flow
 * Deterministic flow that searches for movies and TV shows using TMDB API.
 * This flow does NOT use an LLM - it simply calls the searchMoviesAndTVTool
 * and returns the raw results for UI consumption.
 */
export const searchMoviesAndTV = ai.defineFlow(
  {
    name: 'searchMoviesAndTV',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
    }),
    outputSchema: z.array(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        name: z.string().optional(),
        media_type: z.enum(['movie', 'tv']),
        release_date: z.string().optional(),
        poster_path: z.string().nullable().optional(),
      })
    ),
  },
  async (input) => {
    // Call the search tool directly and return results
    // No LLM processing - this is a deterministic, data-only flow
    const results = await searchMoviesAndTVTool(input);
    return results;
  }
);
