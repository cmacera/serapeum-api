import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * Global Genkit instance configuration.
 * Plugins: GoogleAI
 */
export const ai = genkit({
    plugins: [googleAI()],
});

// Export Zod for convenience in flows
export { z };
