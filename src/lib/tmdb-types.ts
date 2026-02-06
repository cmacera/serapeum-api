/**
 * TMDB API Type Definitions
 * Minimal types for the /search/multi endpoint
 */

export type TMDBMediaType = 'movie' | 'tv' | 'person';

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

/**
 * Clean media result format for our API
 * Contains only essential fields for UI consumption
 */
export interface CleanMediaResult {
  id: number;
  title?: string; // For movies
  name?: string; // For TV shows
  media_type: 'movie' | 'tv';
  release_date?: string;
  poster_path?: string | null;
}
