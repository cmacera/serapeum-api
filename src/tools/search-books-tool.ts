import { ai, z } from '../lib/ai.js';
import { MAX_RESULTS_PER_SOURCE } from '../lib/constants.js';
import axios from 'axios';
import type {
  GoogleBooksSearchResponse,
  BookSearchResult,
  IndustryIdentifier,
} from '../lib/google-books-types.js';
import { BookSearchResultSchema } from '../schemas/book-schemas.js';

/**
 * Helper function to extract ISBN from industry identifiers
 * Prefers ISBN-13 over ISBN-10
 */
function extractISBN(identifiers?: IndustryIdentifier[]): string | undefined {
  if (!identifiers || identifiers.length === 0) return undefined;

  // Prefer ISBN_13
  const isbn13 = identifiers.find((id) => id.type === 'ISBN_13');
  if (isbn13) return isbn13.identifier;

  // Fallback to ISBN_10
  const isbn10 = identifiers.find((id) => id.type === 'ISBN_10');
  return isbn10?.identifier;
}

/**
 * Genkit Tool: Search for books using Google Books API
 */
export const searchBooksTool = ai.defineTool(
  {
    name: 'searchBooksTool',
    description:
      'Search for books using the Google Books API. Returns detailed book information including title, authors, publisher, ISBN, description, and cover images.',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      language: z
        .string()
        .regex(/^[a-z]{2}$/, 'Language must be a 2-letter ISO 639-1 code (lowercase)')
        .optional()
        .default('en'),
    }),
    outputSchema: z.array(BookSearchResultSchema),
  },
  async (input) => {
    const apiKey = process.env['GOOGLE_BOOKS_API_KEY'];

    if (!apiKey) {
      throw new Error('GOOGLE_BOOKS_API_KEY environment variable is not configured');
    }

    try {
      const response = await axios.get<GoogleBooksSearchResponse>(
        'https://www.googleapis.com/books/v1/volumes',
        {
          params: {
            q: `intitle:${input.query}`,
            key: apiKey,
            maxResults: MAX_RESULTS_PER_SOURCE,
            printType: 'books', // Exclude magazines
            orderBy: 'relevance',
            langRestrict: input.language,
          },
          headers: {
            Accept: 'application/json',
          },
        }
      );

      // Transform API response to clean format
      const results: BookSearchResult[] =
        response.data.items
          ?.map((item) => ({
            id: item.id,
            title: item.volumeInfo.title,
            authors: item.volumeInfo.authors,
            publisher: item.volumeInfo.publisher,
            publishedDate: item.volumeInfo.publishedDate,
            description: item.volumeInfo.description,
            isbn: extractISBN(item.volumeInfo.industryIdentifiers),
            pageCount: item.volumeInfo.pageCount,
            categories: item.volumeInfo.categories,
            imageLinks: item.volumeInfo.imageLinks
              ? {
                  thumbnail: item.volumeInfo.imageLinks.thumbnail,
                  smallThumbnail: item.volumeInfo.imageLinks.smallThumbnail,
                }
              : undefined,
            language: item.volumeInfo.language,
            previewLink: item.volumeInfo.previewLink,
            averageRating: item.volumeInfo.averageRating,
            printType: item.volumeInfo.printType,
            maturityRating: item.volumeInfo.maturityRating,
          }))
          .filter((r) => r.imageLinks?.thumbnail && r.description && r.authors?.length) || [];

      return results;
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // API returned an error response
          const status = error.response.status;
          if (status === 401 || status === 403) {
            throw new Error('Google Books API authentication failed. Please check your API key.');
          } else if (status === 429) {
            throw new Error('Google Books API rate limit exceeded. Please try again later.');
          } else {
            throw new Error(`Google Books API error (${status}): ${error.response.statusText}`);
          }
        } else if (error.request) {
          // Request was made but no response received
          throw new Error(
            'Network error: Unable to reach Google Books API. Please check your internet connection.'
          );
        }
      }

      // Re-throw other errors
      throw error;
    }
  }
);
