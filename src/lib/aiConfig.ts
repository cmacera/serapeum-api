import { z } from '@genkit-ai/core';
import type { GenkitPlugin, GenkitPluginV2 } from 'genkit/plugin';
// @ts-ignore
import { googleAI } from '@genkit-ai/google-genai';
// @ts-ignore
import { ollama } from 'genkitx-ollama';
// @ts-ignore
import { openAI } from 'genkitx-openai';

/**
 * Configure Google AI plugin.
 * Defaults to Google AI if no other provider is properly configured,
 * but strictly requires API key to function.
 */
export const googlePlugin = (): GenkitPlugin | GenkitPluginV2 => {
  return googleAI();
};

/**
 * Configure Ollama plugin.
 * Returns null if OLLAMA_SERVER_URL is missing.
 */
export const ollamaPlugin = (): GenkitPlugin | null => {
  const serverAddress = process.env['OLLAMA_SERVER_URL'];
  const modelName = process.env['OLLAMA_MODEL'];

  if (!serverAddress) return null;

  // Cast config to any because genkitx-ollama types might be incomplete/different
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: any = {
    serverAddress: serverAddress,
  };

  if (modelName) {
    config.models = [{ name: modelName }];
  }

  return ollama(config);
};

/**
 * Configure OpenRouter plugin.
 * Returns null if OPENROUTER_API_KEY is missing.
 */
export const openRouterPlugin = (): GenkitPlugin | null => {
  const apiKey = process.env['OPENROUTER_API_KEY'];
  const modelName = process.env['OPENROUTER_MODEL'];

  if (!apiKey || !modelName) return null;

  return openAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    models: [
      {
        name: modelName,
        info: {
          label: `OpenRouter - ${modelName}`,
          supports: { multiturn: true, tools: true, media: false, output: ['text', 'json'] },
          versions: [],
        },
        configSchema: z.object({}).passthrough(),
      },
    ],
  });
};
