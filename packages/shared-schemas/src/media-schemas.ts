import { z } from 'zod';

export const MediaSearchResultSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  media_type: z.enum(['movie', 'tv']),
  release_date: z.string().optional(),
  poster_path: z.string().nullable().optional(),
  overview: z.string().optional(),
  vote_average: z.number().optional(),
  popularity: z.number().optional(),
  backdrop_path: z.string().nullable().optional(),
  genre_ids: z.array(z.number()).optional(),
  genres: z.array(z.string()).optional(),
  original_language: z.string().optional(),
});

export type MediaSearchResult = z.infer<typeof MediaSearchResultSchema>;
