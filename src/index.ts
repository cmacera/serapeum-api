import 'dotenv/config';

import { createApp } from './app.js';

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

  const origins = allowedOrigins.split(',').map((o) => o.trim());
  return origins.length === 1 ? origins[0] || '*' : origins;
};

const PORT = parsePort(process.env['PORT'], 3000);
const corsOrigins = getCorsOrigins();

console.log('🚀 Starting Serapeum API (Genkit Powered)...');

const app = createApp(corsOrigins);
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
