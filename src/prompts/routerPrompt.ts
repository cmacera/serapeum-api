import { ai, z } from '../lib/ai.js';

export const RouterSchema = z.object({
  intent: z.enum(['SPECIFIC_ENTITY', 'GENERAL_DISCOVERY', 'OUT_OF_SCOPE', 'FACTUAL_QUERY']),
  category: z
    .enum(['MOVIE_TV', 'GAME', 'BOOK', 'ALL'])
    .describe('The specific media category if the user explicitly mentions it, otherwise ALL')
    .default('ALL'),
  extractedQuery: z
    .string()
    .describe(
      'The clean title for specific entities OR the optimized search query for discovery, or empty if out of scope'
    ),
  refusalReason: z
    .string()
    .nullish()
    .describe(
      'A polite message explaining why the query is out of scope (only if intent is OUT_OF_SCOPE)'
    ),
});

const RouterInputSchema = z.object({
  query: z.string(),
  language: z.string().optional().default('en'),
});

// Register schemas so dotprompt can reference them by name
ai.defineSchema('RouterInput', RouterInputSchema);
ai.defineSchema('RouterOutput', RouterSchema);

export const routerPrompt = ai.prompt<typeof RouterInputSchema, typeof RouterSchema>(
  'routerPrompt'
);
