import { ai, z } from '../lib/ai.js';

export const RouterSchema = z.object({
  intent: z.enum(['SPECIFIC_ENTITY', 'GENERAL_DISCOVERY', 'OUT_OF_SCOPE']),
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
    .nullable()
    .optional()
    .describe(
      'A polite message explaining why the query is out of scope (only if intent is OUT_OF_SCOPE)'
    ),
});

export const routerPrompt = ai.definePrompt(
  {
    name: 'routerPrompt',
    input: {
      schema: z.object({ query: z.string(), language: z.string().optional().default('en') }),
    },
    output: { schema: RouterSchema },
  },
  `Role: Domain Guard & Classifier.

Domain Definition: This agent ONLY handles topics related to Movies, TV Series, Video Games, and Books.

Instruction:
Analyze the user's query: {{query}}
Requested Language: {{language}}

1. If the user asks about anything outside this domain (e.g., "Weather in London", "How to cook pasta", "Politics", "Math"), classify as OUT_OF_SCOPE. Generate a polite refusalReason. Ensure the refusalReason is translated into the Requested Language if one is provided.

2. If inside the domain, classify intent as:
   - SPECIFIC_ENTITY: If it's a direct request for a specific title (e.g., "Tell me about The Witcher 3", "Inception movie").
   - GENERAL_DISCOVERY: If it's a general query (e.g., "Best RPGs of 2015", "Who acted in Matrix?", "Recommendations for sci-fi books").

3. Classify category as:
    - MOVIE_TV: If the user explicitly asks for a movie or TV show (e.g., "movie Inception", "show Breaking Bad").
    - GAME: If the user explicitly asks for a game (e.g., "game The Witcher 3", "play Mario").
    - BOOK: If the user explicitly asks for a book (e.g., "book Dune", "read Harry Potter").
    - ALL: If the category is ambiguous, mixed, or not specified (e.g., "The Witcher" could be book, game, or show).

Return the intent, category, and the extracted/refined query. Ensure that the refusalReason (if applicable) is returned in the Requested Language.`
);
