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
}
