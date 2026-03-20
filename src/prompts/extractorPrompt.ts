import { ai, z } from '../lib/ai.js';

export const ExtractorSchema = z.object({
  titles: z
    .array(z.string())
    .max(3)
    .refine((titles) => new Set(titles.map((t) => t.toLowerCase())).size === titles.length, {
      message: 'Titles must be unique (case-insensitive)',
    })
    .describe('List of exact titles found in the search results (max 3)'),
});

const ExtractorInputSchema = z.object({
  query: z.string(),
  context: z.string(),
});

// Register schemas so dotprompt can reference them by name
ai.defineSchema('ExtractorInput', ExtractorInputSchema);
ai.defineSchema('ExtractorOutput', ExtractorSchema);

export const extractorPrompt = ai.prompt<typeof ExtractorInputSchema, typeof ExtractorSchema>(
  'extractorPrompt'
);
