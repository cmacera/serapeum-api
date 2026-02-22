import { ai, z } from '../../lib/ai.js';
import { searchGamesTool, GameSearchResultSchema } from '../../tools/search-games-tool.js';

export const SearchGamesOutputSchema = z.array(GameSearchResultSchema);

/**
 * SearchGames Flow
 * This flow does NOT use an LLM - it simply calls the searchGamesTool
 * and returns the raw results for UI consumption.
 */
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
    return await searchGamesTool(input);
  }
);
