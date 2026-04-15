import { ai, z } from '../../lib/ai.js';
import { fetchBookResults } from '../../tools/search-books-tool.js';
import { PaginatedBookResultSchema } from '../../schemas/book-schemas.js';

export const SearchBooksOutputSchema = PaginatedBookResultSchema;

/**
 * SearchBooks Flow
 * This flow does NOT use an LLM - it calls the Google Books API directly with
 * pagination support. Returns a paginated result for infinite-scroll clients.
 */
export const searchBooks = ai.defineFlow(
  {
    name: 'searchBooks',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      language: z.string().optional().default('en'),
      page: z.number().int().positive().optional().default(1),
    }),
    outputSchema: SearchBooksOutputSchema,
  },
  async (input) => {
    return await fetchBookResults(input);
  }
);
