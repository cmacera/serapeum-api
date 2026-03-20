import { ai, z } from '../lib/ai.js';

const SynthesizerInputSchema = z.object({
  originalQuery: z.string(),
  webContext: z.string(),
  apiDetails: z.string(),
  language: z.string().optional().default('en'),
});

// Register schema so dotprompt can reference it by name
ai.defineSchema('SynthesizerInput', SynthesizerInputSchema);

// No output schema — callers access the response via .text
export const synthesizerPrompt = ai.prompt<typeof SynthesizerInputSchema>('synthesizerPrompt');
