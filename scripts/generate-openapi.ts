/**
 * OpenAPI Spec Generator
 *
 * Generates docs/openapi.yaml from the Zod schemas defined in each Genkit flow.
 * Run with: npm run generate:openapi
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
import * as yaml from 'yaml';
import {
  MediaSearchResultSchema,
  BookSearchResultSchema,
  GameSearchResultSchema,
  SearchErrorSchema as SearchErrorSchemaBase,
  CastMemberSchema,
  VideoSchema,
  WatchProviderSchema,
  WatchProviderRegionSchema,
  SeasonSummarySchema,
  MovieDetailSchema,
  TvDetailSchema,
} from '@serapeum/shared-schemas';

// Extend Zod with OpenAPI support (must be called before any .openapi() calls)
extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// Schemas — imported from src/schemas/ (single source of truth)
// ---------------------------------------------------------------------------

const BookSchema = BookSearchResultSchema.openapi('Book');
const MediaSchema = MediaSearchResultSchema.openapi('Media');
const GameSchema = GameSearchResultSchema.openapi('Game');
const SearchErrorSchema = SearchErrorSchemaBase.openapi('SearchError');

const CastMemberOpenApi = CastMemberSchema.openapi('CastMember');
const VideoOpenApi = VideoSchema.openapi('Video');
const WatchProviderOpenApi = WatchProviderSchema.openapi('WatchProvider');
const WatchProviderRegionOpenApi = WatchProviderRegionSchema.openapi('WatchProviderRegion');
const SeasonSummaryOpenApi = SeasonSummarySchema.openapi('SeasonSummary');
const MovieDetailOpenApi = MovieDetailSchema.openapi('MovieDetail');
const TvDetailOpenApi = TvDetailSchema.openapi('TvDetail');

// SearchAllResponseSchema is intentionally kept local: it must reference the
// annotated schemas above (MediaSchema, BookSchema, etc.) so the generator
// emits $ref pointers rather than inlining the sub-schemas in the YAML.
const SearchAllResponseSchema = z
  .object({
    media: z.array(MediaSchema),
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
// Shared input schemas
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

const MediaDetailInputSchema = z
  .object({
    id: z
      .number()
      .int()
      .positive()
      .openapi({ description: 'TMDB movie or TV show ID', example: 550 }),
    language: z
      .string()
      .optional()
      .openapi({ description: 'BCP-47 language tag (e.g. en, es-ES)', example: 'en' }),
    region: z.string().optional().openapi({
      description:
        'ISO 3166-1 country code to filter watch providers (e.g. US, ES, MX). Defaults to US if not provided.',
      example: 'ES',
    }),
  })
  .openapi('MediaDetailInput');

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
registry.register('CastMember', CastMemberOpenApi);
registry.register('Video', VideoOpenApi);
registry.register('WatchProvider', WatchProviderOpenApi);
registry.register('WatchProviderRegion', WatchProviderRegionOpenApi);
registry.register('SeasonSummary', SeasonSummaryOpenApi);
registry.register('MovieDetail', MovieDetailOpenApi);
registry.register('TvDetail', TvDetailOpenApi);
registry.register('MediaDetailInput', MediaDetailInputSchema);

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

registry.registerPath({
  method: 'post',
  path: '/searchBooks',
  summary: 'Search for books',
  description: 'Searches the Google Books API and returns a list of matching books.',
  tags: ['Catalog'],
  security: [{ bearerAuth: [] }],
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
    400: {
      description: 'Invalid request body',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized — missing or invalid bearer token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/searchMedia',
  summary: 'Search for movies and TV shows',
  description: 'Searches the TMDB API and returns a list of matching movies and TV shows.',
  tags: ['Catalog'],
  security: [{ bearerAuth: [] }],
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
    400: {
      description: 'Invalid request body',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized — missing or invalid bearer token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/searchGames',
  summary: 'Search for video games',
  description: 'Searches the IGDB API and returns a list of matching video games.',
  tags: ['Catalog'],
  security: [{ bearerAuth: [] }],
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
    400: {
      description: 'Invalid request body',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized — missing or invalid bearer token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
  security: [{ bearerAuth: [] }],
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
    400: {
      description: 'Invalid request body',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized — missing or invalid bearer token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
  security: [{ bearerAuth: [] }],
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
    400: {
      description: 'Invalid request body',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized — missing or invalid bearer token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/getMovieDetail',
  summary: 'Get movie details',
  description:
    'Returns full details for a movie: cast, trailers, watch providers, and extended metadata.',
  tags: ['Catalog'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: MediaDetailInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Full movie detail',
      content: { 'application/json': { schema: MovieDetailOpenApi } },
    },
    400: {
      description: 'Invalid request body',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized — missing or invalid bearer token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Movie not found in TMDB',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Too many requests — TMDB rate limit exceeded',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/getTvDetail',
  summary: 'Get TV show details',
  description:
    'Returns full details for a TV show: cast, trailers, seasons, watch providers, and extended metadata.',
  tags: ['Catalog'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: MediaDetailInputSchema } },
    },
  },
  responses: {
    200: {
      description: 'Full TV show detail',
      content: { 'application/json': { schema: TvDetailOpenApi } },
    },
    400: {
      description: 'Invalid request body',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized — missing or invalid bearer token',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'TV show not found in TMDB',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Too many requests — TMDB rate limit exceeded',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    500: {
      description: 'Internal server error',
      content: { 'application/json': { schema: ErrorResponseSchema } },
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
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
    { url: 'https://api.serapeum.app', description: 'Production' },
  ],
});

const yamlString = yaml.stringify(document);

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../docs/openapi.yaml');

mkdirSync(resolve(__dirname, '../docs'), { recursive: true });
writeFileSync(outputPath, yamlString, 'utf-8');

console.log(`✅ OpenAPI spec written to: ${outputPath}`);
