import 'dotenv/config';

import { createApp } from '../src/app.js';

const allowedOrigins = process.env['CORS_ORIGINS'];
if (process.env['NODE_ENV'] === 'production' && !allowedOrigins) {
  console.error('🛑 Fatal Error: CORS_ORIGINS environment variable is required in production.');
  process.exit(1);
}

const corsOrigins: string[] | string = allowedOrigins
  ? allowedOrigins.split(',').map((o) => o.trim())
  : '*';

export default createApp(corsOrigins);
