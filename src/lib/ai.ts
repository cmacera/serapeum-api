import { genkit, z } from 'genkit';
// @ts-ignore
import { googleAI } from '@genkit-ai/google-genai';
// @ts-ignore
import { openAI } from 'genkitx-openai';

const provider = process.env['AI_PROVIDER'];
console.log(
  `[AI Setup] Initializing with provider: '${provider || 'undefined (defaulting to google)'}'`
);

/**
 * Selects and configures the Genkit plugins based on the provider.
 */
const getPlugins = (providerName?: string) => {
  switch (providerName) {
    case 'groq':
      const groqModelName = process.env['GROQ_MODEL'];
      if (!groqModelName) throw new Error('GROQ_MODEL is required for Groq provider');
      return [
        openAI({
          apiKey: process.env['GROQ_API_KEY'],
          baseURL: 'https://api.groq.com/openai/v1',
          models: [
            {
              name: groqModelName,
              info: {
                label: `Groq - ${groqModelName}`,
                supports: { multiturn: true, tools: true, media: false, output: ['text', 'json'] },
                versions: [],
              },
              configSchema: z.object({}).passthrough(),
            },
          ],
        }),
      ];
    case 'local':
      const localModelName = process.env['LOCAL_MODEL'];
      if (!localModelName) throw new Error('LOCAL_MODEL is required for Local provider');
      return [
        openAI({
          apiKey: 'no-key-required',
          baseURL: process.env['LOCAL_URL'],
          models: [
            {
              name: localModelName,
              info: {
                label: `Local - ${localModelName}`,
                supports: { multiturn: true, tools: true, media: false, output: ['text', 'json'] },
                versions: [],
              },
              configSchema: z.object({}).passthrough(),
            },
          ],
        }),
      ];
    case 'google':
    default:
      return [googleAI()];
  }
};

/**
 * Global Genkit instance configuration.
 * Dynamically selects provider based on AI_PROVIDER env var.
 */
export const ai = genkit({
  plugins: getPlugins(provider),
});

/**
 * Active model configuration.
 * Exports the model to be used by flows based on the active provider.
 */
export const activeModel = (() => {
  switch (provider) {
    case 'groq':
      if (!process.env['GROQ_MODEL']) {
        throw new Error('GROQ_MODEL environment variable is missing');
      }
      return `openai/${process.env['GROQ_MODEL']}`;
    case 'local':
      if (!process.env['LOCAL_MODEL']) {
        throw new Error('LOCAL_MODEL environment variable is missing');
      }
      return `openai/${process.env['LOCAL_MODEL']}`;
    case 'google':
    default:
      return 'googleai/gemini-2.5-flash';
  }
})();

// Export Zod for convenience in flows
export { z };
