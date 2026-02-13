import { ai, z } from '../../lib/ai.js';
import { searchTavilyTool, TavilySearchResultSchema } from '../../tools/search-tavily-tool.js';

/**
 * Web Search Flow
 * Deterministic flow that performs a web search using Tavily API via searchTavilyTool.
 * Allows testing the tool via Genkit UI.
 */
export const searchWeb = ai.defineFlow(
  {
    name: 'searchWeb',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      searchDepth: z.enum(['basic', 'advanced']).optional().default('basic'),
    }),
    outputSchema: z.array(TavilySearchResultSchema),
  },
  async (input) => {
    const results = await searchTavilyTool({
      query: input.query,
      searchDepth: input.searchDepth,
    });
    return results;
  }
);
