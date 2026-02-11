import { ai, z } from '../../lib/ai.js';
import { searchMediaTool } from '../../tools/search-media-tool.js';

/**
 * Search Movies and TV Shows Flow
 * Deterministic flow that searches for movies and TV shows using TMDB API.
 * This flow does NOT use an LLM - it simply calls the searchMediaTool
 * and returns the raw results for UI consumption.
 */
export const searchMedia = ai.defineFlow(
  {
    name: 'searchMedia',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      language: z.string().optional().default('es-ES'),
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
    // Execute the searchMediaTool - no LLM processing required
    const results = await searchMediaTool({
      query: input.query,
      language: input.language,
    });
    return results;
  }
);
