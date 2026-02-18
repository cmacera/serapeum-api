/**
 * OpenAPI Spec Generator
 *
 * Generates docs/openapi.yaml from the Zod schemas defined in each Genkit flow.
 * Run with: npm run generate:openapi
 *
 * Schemas are defined inline here (mirroring the flow files) to avoid importing
 * the Genkit/AI initialization code which requires environment variables at load time.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Extend Zod with OpenAPI support (must be called before any schema definitions)
extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// Schemas — mirrored from flow/tool files (kept in sync manually or via tests)
// ---------------------------------------------------------------------------

// Book (mirrors SearchBooksOutputSchema in searchBooks.ts + BookSearchResultSchema in search-books-tool.ts)
const BookSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    publishedDate: z.string().optional(),
    description: z.string().optional(),
    isbn: z.string().optional(),
    pageCount: z.number().optional(),
    categories: z.array(z.string()).optional(),
    imageLinks: z
      .object({
        thumbnail: z.string().optional(),
        smallThumbnail: z.string().optional(),
      })
      .optional(),
    language: z.string().optional(),
    previewLink: z.string().optional(),
  })
  .openapi('Book');

// Media (mirrors SearchMediaOutputSchema in searchMedia.ts + MediaSearchResultSchema in search-media-tool.ts)
const MediaSchema = z
  .object({
    id: z.number(),
    title: z.string().optional(),
    name: z.string().optional(),
    media_type: z.enum(['movie', 'tv']),
    release_date: z.string().optional(),
    poster_path: z.string().nullable().optional(),
    overview: z.string().optional(),
    vote_average: z.number().optional(),
    popularity: z.number().optional(),
  })
  .openapi('Media');

// Game (mirrors SearchGamesOutputSchema in searchGames.ts + GameSearchResultSchema in search-games-tool.ts)
const GameSchema = z
  .object({
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
  })
  .openapi('Game');

// SearchAll (mirrors SearchAllOutputSchema in searchAll.ts)
const SearchErrorSchema = z
  .object({
    source: z.enum(['movies', 'books', 'games']),
    message: z.string(),
  })
  .openapi('SearchError');

const SearchAllResponseSchema = z
  .object({
    movies: z.array(MediaSchema),
    books: z.array(BookSchema),
    games: z.array(GameSchema),
    errors: z.array(SearchErrorSchema).optional(),
  })
  .openapi('SearchAllResponse');

// ---------------------------------------------------------------------------
// Composite / response schemas
// ---------------------------------------------------------------------------

const BooksResponseSchema = z.array(BookSchema).openapi('BooksResponse');
const MediaResponseSchema = z.array(MediaSchema).openapi('MediaResponse');
const GamesResponseSchema = z.array(GameSchema).openapi('GamesResponse');

const GeneralDiscoveryResponseSchema = z
  .object({
    text: z.string().openapi({ description: 'AI-generated summary text' }),
    data: SearchAllResponseSchema,
  })
  .openapi('GeneralDiscoveryResponse');

const ErrorResponseSchema = z
  .object({
    error: z.string(),
    details: z.string().optional(),
  })
  .openapi('ErrorResponse');

// Orchestrator response: union of all possible outputs
const OrchestratorResponseSchema = z
  .union([
    z.string().openapi({ description: 'Plain text response (out-of-scope or fallback)' }),
    GeneralDiscoveryResponseSchema,
    BooksResponseSchema,
    MediaResponseSchema,
    GamesResponseSchema,
    ErrorResponseSchema,
  ])
  .openapi('OrchestratorResponse');

// ---------------------------------------------------------------------------
// Shared input schema
// ---------------------------------------------------------------------------

const CatalogSearchInputSchema = z
  .object({
    query: z.string().min(1).openapi({ description: 'Search query string', example: 'Dune' }),
    language: z
      .string()
      .optional()
      .openapi({ description: 'BCP-47 language tag (e.g. en, es-ES)', example: 'en' }),
  })
  .openapi('CatalogSearchInput');

const OrchestratorInputSchema = z.string().min(1).openapi({
  description: 'Natural language query for the AI orchestrator',
  example: 'Best sci-fi movies of 2024',
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const registry = new OpenAPIRegistry();

registry.register('Book', BookSchema);
registry.register('Media', MediaSchema);
registry.register('Game', GameSchema);
registry.register('SearchError', SearchErrorSchema);
registry.register('SearchAllResponse', SearchAllResponseSchema);
registry.register('BooksResponse', BooksResponseSchema);
registry.register('MediaResponse', MediaResponseSchema);
registry.register('GamesResponse', GamesResponseSchema);
registry.register('GeneralDiscoveryResponse', GeneralDiscoveryResponseSchema);
registry.register('ErrorResponse', ErrorResponseSchema);
registry.register('OrchestratorResponse', OrchestratorResponseSchema);
registry.register('CatalogSearchInput', CatalogSearchInputSchema);

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'post',
  path: '/searchBooks',
  summary: 'Search for books',
  description: 'Searches the Google Books API and returns a list of matching books.',
  tags: ['Catalog'],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CatalogSearchInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'List of matching books',
      content: { 'application/json': { schema: BooksResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/searchMedia',
  summary: 'Search for movies and TV shows',
  description: 'Searches the TMDB API and returns a list of matching movies and TV shows.',
  tags: ['Catalog'],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CatalogSearchInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'List of matching movies and TV shows',
      content: { 'application/json': { schema: MediaResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/searchGames',
  summary: 'Search for video games',
  description: 'Searches the IGDB API and returns a list of matching video games.',
  tags: ['Catalog'],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CatalogSearchInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'List of matching video games',
      content: { 'application/json': { schema: GamesResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/searchAll',
  summary: 'Search across all media types',
  description:
    'Searches books, movies/TV shows, and games in parallel and returns aggregated results.',
  tags: ['Catalog'],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: CatalogSearchInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Aggregated results from all media sources',
      content: { 'application/json': { schema: SearchAllResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/orchestratorFlow',
  summary: 'AI orchestrator',
  description:
    'Routes a natural language query through the AI orchestrator. Returns structured catalog data, a synthesized text+data response, or a plain text reply depending on the query intent.',
  tags: ['Agent'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': { schema: OrchestratorInputSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Orchestrator response (varies by query intent)',
      content: { 'application/json': { schema: OrchestratorResponseSchema } },
    },
  },
});

// ---------------------------------------------------------------------------
// Generate and write the spec
// ---------------------------------------------------------------------------

const generator = new OpenApiGeneratorV31(registry.definitions);

const document = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Serapeum API',
    version: '1.0.0',
    description:
      'AI-powered media discovery API. Search for books, movies, TV shows, and video games, or use the orchestrator for natural language queries.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
});

const yaml = await import('yaml');
const yamlString = yaml.stringify(document);

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../docs/openapi.yaml');

mkdirSync(resolve(__dirname, '../docs'), { recursive: true });
writeFileSync(outputPath, yamlString, 'utf-8');

console.log(`✅ OpenAPI spec written to: ${outputPath}`);
