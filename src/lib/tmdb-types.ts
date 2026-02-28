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
