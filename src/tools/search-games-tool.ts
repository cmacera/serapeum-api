import { ai, z } from '../lib/ai.js';
import { getAccessToken, clearTokenCache } from '../lib/igdb-auth.js';
import type { IGDBGame, GameSearchResult } from '../lib/igdb-types.js';
import { transformGame } from '../lib/igdb-types.js';

/**
 * Genkit Tool: Search for video games using IGDB API
 * Uses Apicalypse query language for searching
 */
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
});

export const searchGamesTool = ai.defineTool(
  {
    name: 'searchGamesTool',
    description:
      'Search for video games using the IGDB (Internet Game Database) API. Returns detailed game information including title, platforms, genres, developers, and ratings.',
    inputSchema: z.object({
      query: z.string().min(1, 'Search query cannot be empty'),
    }),
    outputSchema: z.array(GameSearchResultSchema),
  },
  async (input) => {
    const clientId = process.env['IGDB_CLIENT_ID'];

    if (!clientId) {
      throw new Error('IGDB_CLIENT_ID environment variable is not configured');
    }

    try {
      // Get OAuth access token
      const accessToken = await getAccessToken();

      // Sanitize query to prevent Apicalypse injection
      const sanitizedQuery = input.query.replace(/"/g, '\\"');

      // Build Apicalypse query
      // Expand nested fields to get names instead of IDs
      const apicalypseQuery = `
        search "${sanitizedQuery}";
        fields name,game_type,summary,rating,aggregated_rating,first_release_date,cover.image_id,platforms.name,genres.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher;
        where game_type = (0, 1, 2, 8, 9, 10);
        limit 10;
      `.trim();

      // Make request to IGDB API
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'text/plain',
        },
        body: apicalypseQuery,
      });

      if (!response.ok) {
        // Handle token expiry (401) - token should auto-refresh on next call
        if (response.status === 401) {
          clearTokenCache();
          throw new Error('IGDB authentication failed. Access token may have expired.');
        }

        // Handle rate limiting (429)
        if (response.status === 429) {
          throw new Error('IGDB API rate limit exceeded. Please try again later.');
        }

        const errorText = await response.text();
        throw new Error(`IGDB API request failed: ${response.status} ${errorText}`);
      }

      const games = (await response.json()) as IGDBGame[];

      // Transform raw IGDB data to clean GameSearchResult format
      const results: GameSearchResult[] = games.map(transformGame);

      return results;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to search games: ${error.message}`);
      }
      throw new Error('Failed to search games with unknown error');
    }
  }
);
