import { ai, z } from '../../lib/ai.js';
import { fetchMediaResults } from '../../tools/search-media-tool.js';
import { PaginatedMediaResultSchema } from '../../schemas/media-schemas.js';

export const SearchMediaOutputSchema = PaginatedMediaResultSchema;

/**
 * SearchMedia Flow
 * This flow does NOT use an LLM - it calls the TMDB API directly with
 * pagination support. Returns a paginated result for infinite-scroll clients.
 */
export const searchMedia = ai.defineFlow(
  {
    name: 'searchMedia',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      language: z.string().optional().default('en'),
      page: z.number().int().positive().max(500).optional().default(1),
    }),
    outputSchema: SearchMediaOutputSchema,
  },
  async (input) => {
    return await fetchMediaResults(input);
  }
);
