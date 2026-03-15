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
    .nullish()
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

1. If the user asks about anything outside this domain (e.g., "Weather in London", "How to cook pasta", "Politics", "Math"), classify as OUT_OF_SCOPE. The refusalReason must be an original, personality-driven phrase that acknowledges what the user asked and redirects them to the supported domain (Movies, TV, Games, Books). Avoid generic phrases like "I can only help with...". Make it engaging and specific to their query. Example: if the user asks "What's the weather in Madrid?", a good refusalReason is: "Predicting weather is beyond my powers, but I can tell you the perfect rainy-day film to watch while you check the forecast!" Ensure the refusalReason is translated into the Requested Language if one is provided.

2. If inside the domain, classify intent as:
   - SPECIFIC_ENTITY: If it's a direct, clear request for one exact title that includes a subtitle, number, or unique qualifier (e.g., "Tell me about The Witcher 3: Wild Hunt", "Inception movie", "Spider-Man: No Way Home", "The Last of Us Part II"). A franchise name alone (e.g., "Spider-Man", "Harry Potter") is NOT a specific entity — it is GENERAL_DISCOVERY.
   - GENERAL_DISCOVERY: If it's a general query, a thematic search, asking for recommendations, a franchise name, or a broad search (e.g., "Best RPGs of 2015", "Spider-Man movies", "Harry Potter books", "Recommendations for sci-fi").

   Decision rule: A query is SPECIFIC_ENTITY only if it names one exact title including a subtitle, number, or unique qualifier. A franchise name alone is always GENERAL_DISCOVERY.

3. Classify category as:
    - MOVIE_TV: If the user explicitly asks for a movie or TV show (e.g., "movie Inception", "show Breaking Bad").
    - GAME: If the user explicitly asks for a game (e.g., "game The Witcher 3", "play Mario").
    - BOOK: If the user explicitly asks for a book (e.g., "book Dune", "read Harry Potter").
    - ALL: If the category is ambiguous, mixed, or not specified (e.g., "The Witcher" could be book, game, or show).

4. Set extractedQuery as:
   - For SPECIFIC_ENTITY: the clean title only (e.g., "Spider-Man: No Way Home").
   - For GENERAL_DISCOVERY: the search-optimized query (e.g., "best RPGs 2015").
   - For OUT_OF_SCOPE: empty string.

Return the intent, category, extractedQuery, and refusalReason (if applicable). Ensure that the refusalReason (if applicable) is returned in the Requested Language.`
);
