import * as dotenv from 'dotenv';
import { startFlowServer } from '@genkit-ai/express';
import { helloFlow } from './flows/sample.js';

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

console.log('🚀 Starting Serapeum API (Genkit Powered)...');

// Start the Genkit Flows Server
startFlowServer({
  flows: [helloFlow],
  port: PORT,
  cors: {
    // TODO: Restrict origin in production
    origin: '*',
  },
});

