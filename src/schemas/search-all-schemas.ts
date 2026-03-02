import { z } from 'zod';

export const SearchErrorSchema = z.object({
  source: z.enum(['media', 'books', 'games']),
  message: z.string(),
});
