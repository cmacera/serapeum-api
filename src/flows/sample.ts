import { ai, z } from '../lib/ai.js';

/**
 * A simple flow to verify that Genkit is working correctly.
 * Input: string (name)
 * Output: string (greeting)
 */
export const helloFlow = ai.defineFlow(
  {
    name: 'helloFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (name: string) => {
    return `Hello, ${name}! Genkit Flows Server is running.`;
  }
);
