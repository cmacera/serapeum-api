import { z } from 'zod';

export const CastMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  character: z.string(),
  profile_path: z.string().nullable().optional(),
});

export const VideoSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  site: z.literal('YouTube'),
  type: z.string(),
  official: z.boolean(),
  published_at: z.string(),
});

export const WatchProviderSchema = z.object({
  logo_path: z.string(),
  provider_id: z.number(),
  provider_name: z.string(),
  display_priority: z.number(),
});

export const WatchProviderRegionSchema = z.object({
  link: z.string(),
  flatrate: z.array(WatchProviderSchema).optional(),
  rent: z.array(WatchProviderSchema).optional(),
  buy: z.array(WatchProviderSchema).optional(),
});

export const WatchProvidersByRegionSchema = z.record(z.string(), WatchProviderRegionSchema);

export const SeasonSummarySchema = z.object({
  season_number: z.number(),
  name: z.string(),
  episode_count: z.number(),
  air_date: z.string().nullable().optional(),
  poster_path: z.string().nullable().optional(),
});

export const MovieDetailSchema = z.object({
  id: z.number(),
  media_type: z.literal('movie'),
  title: z.string(),
  original_title: z.string().optional(),
  overview: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  release_date: z.string().nullable().optional(),
  status: z.string().optional(),
  runtime: z.number().nullable().optional(),
  budget: z.number().optional(),
  revenue: z.number().optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
  popularity: z.number().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  genres: z.array(z.string()).optional(),
  original_language: z.string().optional(),
  cast: z.array(CastMemberSchema).max(10).optional(),
  trailers: z.array(VideoSchema).optional(),
  watch_providers: WatchProvidersByRegionSchema.optional(),
  certification: z.string().nullable().optional(),
});

export const TvDetailSchema = z.object({
  id: z.number(),
  media_type: z.literal('tv'),
  name: z.string(),
  original_name: z.string().optional(),
  overview: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  first_air_date: z.string().nullable().optional(),
  last_air_date: z.string().nullable().optional(),
  status: z.string().optional(),
  seasons_count: z.number().optional(),
  episodes_count: z.number().optional(),
  episode_run_time: z.array(z.number()).optional(),
  vote_average: z.number().optional(),
  vote_count: z.number().optional(),
  popularity: z.number().optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  genres: z.array(z.string()).optional(),
  original_language: z.string().optional(),
  seasons: z.array(SeasonSummarySchema).optional(),
  networks: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        logo_path: z.string().nullable().optional(),
        origin_country: z.string().optional(),
      })
    )
    .optional(),
  creators: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        profile_path: z.string().nullable().optional(),
      })
    )
    .optional(),
  cast: z.array(CastMemberSchema).max(10).optional(),
  trailers: z.array(VideoSchema).optional(),
  watch_providers: WatchProvidersByRegionSchema.optional(),
  certification: z.string().nullable().optional(),
});

export type CastMember = z.infer<typeof CastMemberSchema>;
export type Video = z.infer<typeof VideoSchema>;
export type WatchProvider = z.infer<typeof WatchProviderSchema>;
export type WatchProviderRegion = z.infer<typeof WatchProviderRegionSchema>;
export type WatchProvidersByRegion = z.infer<typeof WatchProvidersByRegionSchema>;
export type SeasonSummary = z.infer<typeof SeasonSummarySchema>;
export type MovieDetail = z.infer<typeof MovieDetailSchema>;
export type TvDetail = z.infer<typeof TvDetailSchema>;
