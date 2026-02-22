import { ai, z } from '../../lib/ai.js';
import { searchMediaTool, MediaSearchResultSchema } from '../../tools/search-media-tool.js';

export const SearchMediaOutputSchema = z.array(MediaSearchResultSchema);

/**
 * SearchMedia Flow
 * This flow does NOT use an LLM - it simply calls the searchMediaTool
 * and returns the raw results for UI consumption.
 */
export const searchMedia = ai.defineFlow(
  {
    name: 'searchMedia',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      language: z.string().optional().default('en'),
    }),
    outputSchema: SearchMediaOutputSchema,
  },
  async (input) => {
    return await searchMediaTool(input);
  }
);
