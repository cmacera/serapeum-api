import { ai, z } from '../../lib/ai.js';
import { searchGamesTool } from '../../tools/search-games-tool.js';

/**
 * Search Games Flow
 * Deterministic flow that searches for video games using IGDB API.
 * This flow does NOT use an LLM - it simply calls the searchGamesTool
 * and returns the raw results for UI consumption.
 */
export const SearchGamesOutputSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    summary: z.string().optional(),
    rating: z.number().optional(),
    aggregated_rating: z.number().optional(),
    released: z.string().optional(),
    cover_url: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    genres: z.array(z.string()).optional(),
    developers: z.array(z.string()).optional(),
    publishers: z.array(z.string()).optional(),
    game_type: z.number().optional(),
  })
);

export const searchGames = ai.defineFlow(
  {
    name: 'searchGames',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      language: z.string().optional().default('en'),
    }),
    outputSchema: SearchGamesOutputSchema,
  },
  async (input) => {
    // Call the search tool directly and return results
    // No LLM processing - this is a deterministic, data-only flow
    const results = await searchGamesTool({
      query: input.query,
      language: input.language,
    });
    return results;
  }
);
