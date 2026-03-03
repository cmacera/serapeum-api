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
  age_ratings: z.array(z.object({ category: z.number(), rating: z.number() })).optional(),
  similar_games: z.array(z.object({ id: z.number(), name: z.string() })).optional(),
});

export type GameSearchResult = z.infer<typeof GameSearchResultSchema>;
