import { ai, z } from '../../lib/ai.js';
import { searchBooksTool } from '../../tools/search-books-tool.js';

/**
 * Search Books Flow
 * Deterministic flow that searches for books using Google Books API.
 * This flow does NOT use an LLM - it simply calls the searchBooksTool
 * and returns the raw results for UI consumption.
 */
export const SearchBooksOutputSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    publishedDate: z.string().optional(),
    description: z.string().optional(),
    isbn: z.string().optional(),
    pageCount: z.number().optional(),
    categories: z.array(z.string()).optional(),
    imageLinks: z
      .object({
        thumbnail: z.string().optional(),
        smallThumbnail: z.string().optional(),
      })
      .optional(),
    language: z.string().optional(),
    previewLink: z.string().optional(),
  })
);

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
    // Call the search tool directly and return results
    // No LLM processing - this is a deterministic, data-only flow
    const results = await searchBooksTool({
      query: input.query,
      language: input.language,
    });
    return results;
  }
);
