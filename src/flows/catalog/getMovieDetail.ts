import { ai, z } from '../../lib/ai.js';
import { getMovieDetailTool } from '../../tools/get-media-detail-tool.js';
import { MovieDetailSchema } from '../../schemas/media-detail-schemas.js';

/**
 * GetMovieDetail Flow
 * Non-LLM flow that fetches full movie details from TMDB,
 * including cast, trailers, and watch providers.
 */
export const getMovieDetail = ai.defineFlow(
  {
    name: 'getMovieDetail',
    inputSchema: z.object({
      id: z.number().int().positive(),
      language: z.string().optional().default('en'),
      region: z.string().optional().default('US'),
    }),
    outputSchema: MovieDetailSchema,
  },
  async (input) => {
    return await getMovieDetailTool(input);
  }
);
