import * as dotenv from 'dotenv';
import { startFlowServer } from '@genkit-ai/express';
import { helloFlow } from './flows/sample.js';
import { searchMoviesAndTV } from './flows/catalog/searchMoviesAndTV.js';
import { searchBooks } from './flows/catalog/searchBooks.js';
import { searchGames } from './flows/catalog/searchGames.js';

// Load environment variables
dotenv.config();

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value || '', 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    if (value !== undefined) {
      console.warn(`⚠️ Invalid PORT "${value}". using fallback: ${fallback}`);
    }
    return fallback;
  }
  return parsed;
};

const PORT = parsePort(process.env['PORT'], 3000);

const getCorsOrigins = (): string[] | string => {
  const allowedOrigins = process.env['CORS_ORIGINS'];
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (isProduction && !allowedOrigins) {
    console.error('🛑 Fatal Error: CORS_ORIGINS environment variable is required in production.');
    process.exit(1);
  }

  if (!allowedOrigins) {
    console.warn('⚠️ Warning: CORS_ORIGINS not set. Defaulting to "*" for development.');
    return '*';
  }

  // Support comma-separated list of origins
  const origins = allowedOrigins.split(',').map((o) => o.trim());
  return origins.length === 1 ? origins[0] || '*' : origins;
};

const corsOrigins = getCorsOrigins();

console.log('🚀 Starting Serapeum API (Genkit Powered)...');

// Start the Genkit Flows Server
startFlowServer({
  flows: [helloFlow, searchMoviesAndTV, searchBooks, searchGames],
  port: PORT,
  cors: {
    origin: corsOrigins,
  },
});
