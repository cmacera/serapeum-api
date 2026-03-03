import { z } from 'zod';
import { MediaSearchResultSchema } from './media-schemas.js';
import { BookSearchResultSchema } from './book-schemas.js';
import { GameSearchResultSchema } from './game-schemas.js';

export const SearchErrorSchema = z.object({
  source: z.enum(['media', 'books', 'games']),
  message: z.string(),
});

export const SearchAllOutputSchema = z.object({
  // Populated by the orchestrator via findBestMatch — never set by searchAll itself.
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

export type SearchError = z.infer<typeof SearchErrorSchema>;
export type SearchAllOutput = z.infer<typeof SearchAllOutputSchema>;
