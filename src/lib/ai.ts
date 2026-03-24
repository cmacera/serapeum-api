import { genkit } from 'genkit';
import type { GenkitPlugin, GenkitPluginV2 } from 'genkit/plugin';
import { z } from '@genkit-ai/core';
import { googlePlugin, ollamaPlugin, ollamaCloudPlugin, openRouterPlugin } from './aiConfig.js';
import { initLangfuseTelemetry } from './telemetry.js';

const provider = process.env['AI_PROVIDER'];

/**
 * Global Genkit instance configuration.
 * Registers all available plugins (if configured in env).
 * ollamaPlugin is async — it fetches all available models from Ollama at
 * startup so every model is pre-registered and selectable in the eval UI.
 */
const plugins = (
  await Promise.all([googlePlugin(), ollamaPlugin(), ollamaCloudPlugin(), openRouterPlugin()])
).filter((p): p is GenkitPlugin | GenkitPluginV2 => p !== null);

export const ai = genkit({
  plugins,
  promptDir: './prompts',
});

await initLangfuseTelemetry();

/**
 * Active model configuration.
 * Exports the model to be used by flows based on the active provider.
 */
export const activeModel: string = ((): string => {
  const modelName = (p: string): string | undefined => process.env[p];

  switch (provider) {
    case 'ollama':
      if (!modelName('OLLAMA_MODEL')) {
        throw new Error('OLLAMA_MODEL environment variable is missing for Ollama');
      }
      return `ollama/${modelName('OLLAMA_MODEL')}`;
    case 'ollama-cloud':
      if (!modelName('OLLAMA_CLOUD_API_KEY')) {
        throw new Error('OLLAMA_CLOUD_API_KEY environment variable is missing for Ollama Cloud');
      }
      if (!modelName('OLLAMA_CLOUD_MODEL')) {
        throw new Error('OLLAMA_CLOUD_MODEL environment variable is missing for Ollama Cloud');
      }
      return `ollama/${modelName('OLLAMA_CLOUD_MODEL')}`;
    case 'openrouter':
      if (!modelName('OPENROUTER_MODEL')) {
        throw new Error('OPENROUTER_MODEL environment variable is missing');
      }
      return `openai/${modelName('OPENROUTER_MODEL')}`;
    case 'google':
    default: {
      const geminiModel = modelName('GEMINI_MODEL');
      if (!geminiModel) {
        throw new Error('GEMINI_MODEL environment variable is missing (required for Google AI)');
      }
      return `googleai/${geminiModel}`;
    }
  }
})();

if (process.env['DEBUG']) {
  console.log(
    `[AI Setup] Initializing with provider: '${
      provider || 'undefined (defaulting to google)'
    }' using model: '${activeModel}'`
  );
}

// Export Zod for convenience in flows
export { z };
