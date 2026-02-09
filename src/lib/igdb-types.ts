/**
 * TypeScript type definitions for IGDB API
 * Based on IGDB API v4 documentation: https://api-docs.igdb.com/
 */

/**
 * Raw IGDB API response for a game
 */
export interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  aggregated_rating?: number;
  first_release_date?: number; // Unix timestamp
  cover?: {
    id: number;
    image_id: string;
  };
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  involved_companies?: Array<{
    id: number;
    company: {
      id: number;
      name: string;
    };
    developer: boolean;
    publisher: boolean;
  }>;
  game_type?: number; // 0=Main, 1=DLC, 2=Expansion, 3=Bundle, 8=Remake, 9=Remaster, 10=Expanded
}

/**
 * Clean game search result for tool output
 * Aligns with BookSearchResult and MediaSearchResult naming convention
 */
export interface GameSearchResult {
  id: number;
  name: string;
  summary?: string;
  rating?: number;
  aggregated_rating?: number;
  released?: string; // ISO date string
  cover_url?: string;
  platforms?: string[];
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  game_type?: number; // Expose game type to client
}

/**
 * Convert IGDB Unix timestamp to ISO date string
 */
export function formatReleaseDate(timestamp?: number): string | undefined {
  if (timestamp === undefined || timestamp === null) return undefined;
  return new Date(timestamp * 1000).toISOString().split('T')[0];
}

/**
 * Build IGDB cover image URL from image_id
 * Uses 'cover_big' size (264x352px)
 */
export function buildCoverUrl(imageId?: string): string | undefined {
  if (!imageId) return undefined;
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

/**
 * Transform raw IGDB game data to clean GameSearchResult
 */
export function transformGame(game: IGDBGame): GameSearchResult {
  const developers =
    game.involved_companies?.filter((ic) => ic.developer).map((ic) => ic.company.name) || [];

  const publishers =
    game.involved_companies?.filter((ic) => ic.publisher).map((ic) => ic.company.name) || [];

  return {
    id: game.id,
    name: game.name,
    summary: game.summary,
    rating: game.rating,
    aggregated_rating: game.aggregated_rating,
    released: formatReleaseDate(game.first_release_date),
    cover_url: buildCoverUrl(game.cover?.image_id),
    platforms: game.platforms?.map((p) => p.name),
    genres: game.genres?.map((g) => g.name),
    developers: developers.length > 0 ? developers : undefined,
    publishers: publishers.length > 0 ? publishers : undefined,
    game_type: game.game_type,
  };
}
