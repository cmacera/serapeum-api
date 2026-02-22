import { ai, z } from '../../lib/ai.js';
import { searchBooksTool, BookSearchResultSchema } from '../../tools/search-books-tool.js';

export const SearchBooksOutputSchema = z.array(BookSearchResultSchema);

/**
 * SearchBooks Flow
 * This flow does NOT use an LLM - it simply calls the searchBooksTool
 * and returns the raw results for UI consumption.
 */
export const searchBooks = ai.defineFlow(
  {
    name: 'searchBooks',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      language: z.string().optional().default('en'),
    }),
    outputSchema: SearchBooksOutputSchema,
  },
  async (input) => {
    return await searchBooksTool(input);
  }
);
