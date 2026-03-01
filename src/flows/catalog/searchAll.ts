import { ai, z } from '../../lib/ai.js';
import { searchMediaTool, MediaSearchResultSchema } from '../../tools/search-media-tool.js';
import { searchBooksTool, BookSearchResultSchema } from '../../tools/search-books-tool.js';
import { searchGamesTool, GameSearchResultSchema } from '../../tools/search-games-tool.js';

const SearchErrorSchema = z.object({
  source: z.enum(['media', 'books', 'games']),
  message: z.string(),
});

export const SearchAllOutputSchema = z.object({
  featured: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('media'), item: MediaSearchResultSchema }),
      z.object({ type: z.literal('book'), item: BookSearchResultSchema }),
      z.object({ type: z.literal('game'), item: GameSearchResultSchema }),
    ])
    .optional(),
  media: z.array(MediaSearchResultSchema),
  books: z.array(BookSearchResultSchema),
  games: z.array(GameSearchResultSchema),
  errors: z.array(SearchErrorSchema).optional(),
});

export const searchAll = ai.defineFlow(
  {
    name: 'searchAll',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
      language: z.string().optional().default('en'),
    }),
    outputSchema: SearchAllOutputSchema,
  },
  async (input) => {
    // Execute all searches in parallel using Promise.allSettled
    const results = await Promise.allSettled([
      searchMediaTool(input),
      searchBooksTool(input),
      searchGamesTool(input),
    ]);

    // results[0] -> movies (Promise<MediaSearchResult[]>)
    // results[1] -> books (Promise<BookSearchResult[]>)
    // results[2] -> games (Promise<GameSearchResult[]>)

    const movieResult = results[0];
    const bookResult = results[1];
    const gameResult = results[2];

    const media = movieResult.status === 'fulfilled' ? movieResult.value : [];
    const books = bookResult.status === 'fulfilled' ? bookResult.value : [];
    const games = gameResult.status === 'fulfilled' ? gameResult.value : [];

    const errors: Array<{ source: 'media' | 'books' | 'games'; message: string }> = [];

    if (movieResult.status === 'rejected') {
      console.error('SearchMedia failed:', movieResult.reason);
      errors.push({
        source: 'media',
        message:
          movieResult.reason instanceof Error
            ? movieResult.reason.message
            : String(movieResult.reason),
      });
    }
    if (bookResult.status === 'rejected') {
      console.error('SearchBooks failed:', bookResult.reason);
      errors.push({
        source: 'books',
        message:
          bookResult.reason instanceof Error
            ? bookResult.reason.message
            : String(bookResult.reason),
      });
    }
    if (gameResult.status === 'rejected') {
      console.error('SearchGames failed:', gameResult.reason);
      errors.push({
        source: 'games',
        message:
          gameResult.reason instanceof Error
            ? gameResult.reason.message
            : String(gameResult.reason),
      });
    }

    return {
      media,
      books,
      games,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
);
