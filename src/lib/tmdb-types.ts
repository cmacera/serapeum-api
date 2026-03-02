/**
 * TMDB API Type Definitions
 * Minimal types for the /search/multi endpoint
 */

export type TMDBMediaType = 'movie' | 'tv' | 'person';

/**
 * TMDB genre ID to name mapping (stable list from TMDB API)
 * https://developer.themoviedb.org/reference/genre-movie-list
 */
export const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV genres
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

/**
 * Individual search result from TMDB API
 */
export interface TMDBSearchResult {
  id: number;
  media_type: TMDBMediaType;
  // Movie fields
  title?: string;
  release_date?: string;
  // TV Show fields
  name?: string;
  first_air_date?: string;
  // Common fields
  poster_path?: string | null;
  overview?: string;
  popularity?: number;
  vote_average?: number;
  // New enriched fields
  backdrop_path?: string | null;
  genre_ids?: number[];
  original_language?: string;
}

/**
 * TMDB API search response wrapper
 */
export interface TMDBSearchResponse {
  page: number;
  results: TMDBSearchResult[];
  total_pages: number;
  total_results: number;
}

// ---------------------------------------------------------------------------
// Detail endpoint types (/3/movie/{id} and /3/tv/{id})
// ---------------------------------------------------------------------------

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TMDBWatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface TMDBWatchProviderRegion {
  link: string;
  flatrate?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
}

export interface TMDBCredits {
  cast: TMDBCastMember[];
}

export interface TMDBVideos {
  results: TMDBVideo[];
}

export interface TMDBWatchProviders {
  results: Record<string, TMDBWatchProviderRegion>;
}

export interface TMDBSeasonSummary {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBNetwork {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDBCreator {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface TMDBMovieDetailResponse {
  id: number;
  title: string;
  original_title: string;
  overview: string | null;
  tagline: string | null;
  status: string;
  release_date: string | null;
  runtime: number | null;
  budget: number;
  revenue: number;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  genres: TMDBGenre[];
  credits: TMDBCredits;
  videos: TMDBVideos;
  'watch/providers': TMDBWatchProviders;
}

export interface TMDBTvDetailResponse {
  id: number;
  name: string;
  original_name: string;
  overview: string | null;
  tagline: string | null;
  status: string;
  first_air_date: string | null;
  last_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  genres: TMDBGenre[];
  networks: TMDBNetwork[];
  created_by: TMDBCreator[];
  seasons: TMDBSeasonSummary[];
  credits: TMDBCredits;
  videos: TMDBVideos;
  'watch/providers': TMDBWatchProviders;
}

/**
 * Media search result for tool output
 * Contains fields available from TMDB /search/multi endpoint
 */
export interface MediaSearchResult {
  id: number;
  title?: string; // For movies
  name?: string; // For TV shows
  media_type: 'movie' | 'tv';
  release_date?: string; // Movie release or TV first air date
  poster_path?: string | null; // Poster image path
  overview?: string; // Description/synopsis
  vote_average?: number; // Rating (0-10)
  popularity?: number; // Popularity score for sorting
  backdrop_path?: string | null; // Backdrop image path
  genre_ids?: number[]; // Raw genre IDs for client-side localization
  genres?: string[]; // Genre names in English (mapped from genre_ids)
  original_language?: string; // Original language code (e.g. "en", "es")
}
