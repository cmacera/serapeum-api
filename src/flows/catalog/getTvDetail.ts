import { ai, z } from '../../lib/ai.js';
import { getTvDetailTool } from '../../tools/get-media-detail-tool.js';
import { TvDetailSchema } from '../../schemas/media-detail-schemas.js';

/**
 * GetTvDetail Flow
 * Non-LLM flow that fetches full TV show details from TMDB,
 * including cast, trailers, seasons, and watch providers.
 */
export const getTvDetail = ai.defineFlow(
  {
    name: 'getTvDetail',
    inputSchema: z.object({
      id: z.number().int().positive(),
      language: z.string().optional().default('en'),
      region: z.string().optional().default('US'),
    }),
    outputSchema: TvDetailSchema,
  },
  async (input) => {
    return await getTvDetailTool(input);
  }
);
