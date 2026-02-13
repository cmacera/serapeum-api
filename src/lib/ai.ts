import { genkit, z } from 'genkit';
// @ts-ignore
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Global Genkit instance configuration.
 * Plugins: GoogleAI
 */
export const ai = genkit({
  plugins: [googleAI()],
});

// Export Zod for convenience in flows
export { z };
