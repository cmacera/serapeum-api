import { z } from 'zod';

export const GameSearchResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  summary: z.string().optional(),
  rating: z.number().optional(),
  aggregated_rating: z.number().optional(),
  released: z.string().optional(),
  cover_url: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  developers: z.array(z.string()).optional(),
  publishers: z.array(z.string()).optional(),
  game_type: z.number().optional(),
  screenshots: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  game_modes: z.array(z.string()).optional(),
  age_ratings: z.array(z.object({ organization: z.string(), rating: z.string() })).optional(),
  similar_games: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
});

export type GameSearchResult = z.infer<typeof GameSearchResultSchema>;

// No `total` field — IGDB does not return a result count
export const PaginatedGameResultSchema = z.object({
  results: z.array(GameSearchResultSchema),
  page: z.number().int().positive(),
  hasMore: z.boolean(),
});

export type PaginatedGameResult = z.infer<typeof PaginatedGameResultSchema>;
