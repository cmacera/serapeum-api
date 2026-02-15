import { z } from '@genkit-ai/core';
import { genkitPlugin } from 'genkit/plugin';
import type { GenkitPlugin, GenkitPluginV2 } from 'genkit/plugin';
import type { Genkit } from 'genkit';
import type { GenerateRequest, MessageData, Part, CandidateData, ModelInfo } from 'genkit/model';
// @ts-ignore
import { googleAI } from '@genkit-ai/google-genai';
// @ts-ignore
import { ollama } from 'genkitx-ollama';
import { OpenAI } from 'openai';
import type { ClientOptions } from 'openai';
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import type { ToolDefinition } from 'genkit/model';

interface OpenAIModelConfig {
  name: string;
  info?: ModelInfo;
  configSchema?: z.ZodTypeAny;
}

interface OpenAIPluginOptions extends ClientOptions {
  models?: OpenAIModelConfig[];
}

/**
 * Custom OpenAI plugin factory to allow multiple instances.
 * genkitx-openai hardcodes the plugin name to 'openai', preventing multiple registrations.
 * This helper allows us to register OpenAI-compatible providers with unique names.
 */
const createOpenAIPlugin = (name: string, options: OpenAIPluginOptions): GenkitPlugin => {
  return genkitPlugin(name, async (ai: Genkit) => {
    const client = new OpenAI(options);

    options.models?.forEach((modelConfig: OpenAIModelConfig) => {
      const modelId = `${name}/${modelConfig.name}`; // e.g. groq/llama3...
      ai.defineModel(
        {
          name: modelId,
          ...modelConfig.info,
          configSchema: modelConfig.configSchema,
        },
        async (request: GenerateRequest, _streamingCallback: unknown) => {
          const messages = request.messages.map((m: MessageData) => {
            const role =
              m.role === 'model' ? 'assistant' : (m.role as 'user' | 'system' | 'assistant');
            const content = m.content.map((c: Part) => c.text || '').join('');
            return { role, content };
          });

          const body: ChatCompletionCreateParamsNonStreaming = {
            model: modelConfig.name,
            messages: messages as ChatCompletionMessageParam[],
            temperature: request.config?.temperature,
            max_tokens: request.config?.maxOutputTokens,
            top_p: request.config?.topP,
            stop: request.config?.stopSequences,
          };

          if (request.tools?.length) {
            body.tools = request.tools.map((t: ToolDefinition) => ({
              type: 'function',
              function: {
                name: t.name,
                description: t.description,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                parameters: t.inputSchema as any,
              },
            }));
          }

          const response = await client.chat.completions.create(body);
          const choice = response.choices?.[0];

          if (!choice) {
            throw new Error(`No candidates returned via ${name} plugin.`);
          }

          return {
            candidates: [
              {
                index: 0,
                finishReason: choice.finish_reason as CandidateData['finishReason'],
                message: {
                  role: 'model',
                  content: [{ text: choice.message.content || '' }],
                },
              },
            ],
          };
        }
      );
    });
  });
};

/**
 * Configure Google AI plugin.
 * Defaults to Google AI if no other provider is properly configured,
 * but strictly requires API key to function.
 */
export const googlePlugin = (): GenkitPlugin | GenkitPluginV2 => {
  return googleAI();
};

/**
 * Configure Groq plugin.
 * Returns null if GROQ_API_KEY is missing.
 */
export const groqPlugin = (): GenkitPlugin | null => {
  const apiKey = process.env['GROQ_API_KEY'];
  const modelName = process.env['GROQ_MODEL'] || 'llama3-70b-8192';

  if (!apiKey) return null;

  return createOpenAIPlugin('groq', {
    apiKey: apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
    models: [
      {
        name: modelName,
        info: {
          label: `Groq - ${modelName}`,
          supports: { multiturn: true, tools: true, media: false, output: ['text', 'json'] },
          versions: [],
        },
        configSchema: z.object({}).passthrough(),
      },
    ],
  });
};

/**
 * Configure Local (LM Studio) plugin.
 * Returns null if LM_STUDIO_URL is missing.
 */
export const localPlugin = (): GenkitPlugin | null => {
  const baseURL = process.env['LM_STUDIO_URL'];
  const modelName = process.env['LM_STUDIO_MODEL'] || 'local-model';

  if (!baseURL) return null;

  return createOpenAIPlugin('local', {
    apiKey: 'no-key-required',
    baseURL: baseURL,
    models: [
      {
        name: modelName,
        info: {
          label: `LM Studio - ${modelName}`,
          supports: { multiturn: true, tools: true, media: false, output: ['text', 'json'] },
          versions: [],
        },
        configSchema: z.object({}).passthrough(),
      },
    ],
  });
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
  const modelName = process.env['OPENROUTER_MODEL'] || 'meta-llama/llama-3-8b-instruct';

  if (!apiKey) return null;

  return createOpenAIPlugin('openrouter', {
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
