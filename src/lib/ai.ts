import { genkit } from 'genkit';
import type { GenkitPlugin, GenkitPluginV2 } from 'genkit/plugin';
import { z } from '@genkit-ai/core';
import { googlePlugin, ollamaPlugin, openRouterPlugin } from './aiConfig.js';

const provider = process.env['AI_PROVIDER'];
console.log(
  `[AI Setup] Initializing with provider: '${provider || 'undefined (defaulting to google)'}'`
);

/**
 * Global Genkit instance configuration.
 * Registers all available plugins (if configured in env).
 */
export const ai = genkit({
  plugins: [googlePlugin(), ollamaPlugin(), openRouterPlugin()].filter(
    (p): p is GenkitPlugin | GenkitPluginV2 => p !== null
  ),
});

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
    case 'openrouter':
      if (!modelName('OPENROUTER_MODEL')) {
        throw new Error('OPENROUTER_MODEL environment variable is missing');
      }
      return `openrouter/${modelName('OPENROUTER_MODEL')}`;
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

// Export Zod for convenience in flows
export { z };
