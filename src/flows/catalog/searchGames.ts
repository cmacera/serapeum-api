import { ai, z } from '../../lib/ai.js';
import { fetchGameResults } from '../../tools/search-games-tool.js';
import { PaginatedGameResultSchema } from '../../schemas/game-schemas.js';

export const SearchGamesOutputSchema = PaginatedGameResultSchema;

/**
 * SearchGames Flow
 * This flow does NOT use an LLM - it calls the IGDB API directly with
 * pagination support. Returns a paginated result for infinite-scroll clients.
 *
 * Note: IGDB does not return a total result count, so the response includes
 * `hasMore` but no `total` field.
 */
export const searchGames = ai.defineFlow(
  {
    name: 'searchGames',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      // Note: IGDB API does not support language filtering — accepted for API consistency
      language: z.string().optional().default('en'),
      page: z.number().int().positive().optional().default(1),
    }),
    outputSchema: SearchGamesOutputSchema,
  },
  async (input) => {
    return await fetchGameResults(input);
  }
);
