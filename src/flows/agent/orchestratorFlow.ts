import { inspect } from 'util';
import { ai, z, activeModel } from '../../lib/ai.js';
import { searchAll, SearchAllOutputSchema } from '../catalog/searchAll.js';
import { searchMedia, SearchMediaOutputSchema } from '../catalog/searchMedia.js';
import { searchGames, SearchGamesOutputSchema } from '../catalog/searchGames.js';
import { searchBooks, SearchBooksOutputSchema } from '../catalog/searchBooks.js';
import { searchTavilyTool } from '../../tools/search-tavily-tool.js';
import { routerPrompt } from '../../prompts/routerPrompt.js';
import { extractorPrompt } from '../../prompts/extractorPrompt.js';
import { synthesizerPrompt } from '../../prompts/synthesizerPrompt.js';

export const AgentResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('refusal'),
    message: z.string(),
  }),
  z.object({
    kind: z.literal('search_results'),
    message: z.string(),
    data: z.union([
      SearchAllOutputSchema,
      SearchMediaOutputSchema,
      SearchGamesOutputSchema,
      SearchBooksOutputSchema,
    ]),
  }),
  z.object({
    kind: z.literal('discovery'),
    message: z.string(),
    data: SearchAllOutputSchema,
  }),
  z.object({
    kind: z.literal('error'),
    error: z.string(),
    details: z.string().optional(),
  }),
]);

// Flow
export const orchestratorFlow = ai.defineFlow(
  {
    name: 'orchestratorFlow',
    inputSchema: z.object({
      query: z.string(),
      language: z.enum(['en', 'es', 'fr', 'de', 'zh', 'ja']).optional().default('en'),
    }),
    outputSchema: AgentResponseSchema,
  },
  async (inputParam) => {
    const query = inputParam.query;
    const language = inputParam.language || 'en';

    // 1. Router
    const { output: route } = await routerPrompt({ query, language }, { model: activeModel });

    if (!route) {
      console.error('[orchestratorFlow] Router failed to generate response');
      return {
        kind: 'error' as const,
        error: 'Router failed to generate response',
        details: 'The AI router could not determine the intent of your query.',
      };
    }

    // Path C: Guardrail
    if (route.intent === 'OUT_OF_SCOPE') {
      return {
        kind: 'refusal' as const,
        message:
          route.refusalReason ||
          "I'm sorry, I specialize only in Movies, Games, Books, and TV Shows.",
      };
    }

    // Path A: Specific Entity
    if (route.intent === 'SPECIFIC_ENTITY') {
      const input = { query: route.extractedQuery, language };

      try {
        let executionResult;

        switch (route.category) {
          case 'MOVIE_TV':
            executionResult = await searchMedia(input);
            break;
          case 'GAME':
            executionResult = await searchGames(input);
            break;
          case 'BOOK':
            executionResult = await searchBooks(input);
            break;
          case 'ALL':
          default:
            executionResult = await searchAll(input);
            break;
        }

        let generatedText = 'Here is what I found about that:';
        try {
          const synthesis = await synthesizerPrompt(
            {
              originalQuery: input.query,
              webContext: '', // Empty context since it's a specific entity
              apiDetails: JSON.stringify(executionResult),
              language,
            },
            { model: activeModel }
          );
          generatedText = synthesis.text;
        } catch (error) {
          console.error(
            `[orchestratorFlow] Synthesizer failed for specific entity "${input.query}":`,
            inspect(error, { depth: null, colors: true })
          );
        }

        return {
          kind: 'search_results' as const,
          message: generatedText,
          data: executionResult,
        };
      } catch (error) {
        console.error(
          `[orchestratorFlow] Specific Entity Search failed for query "${input.query}":`,
          inspect(error, { depth: null, colors: true })
        );
        return {
          kind: 'error' as const,
          error: 'Failed to retrieve specific entity details.',
          details: error instanceof Error ? error.message : String(error),
        };
      }
    }

    // Path B: General Discovery
    if (route.intent === 'GENERAL_DISCOVERY') {
      // 1. Search Tavily for context
      let tavilyContext = '';
      try {
        const tavilyResults = await searchTavilyTool({
          query: route.extractedQuery,
          maxResults: 5,
        });
        tavilyContext = tavilyResults.map((r) => r.content).join('\n');
      } catch (error) {
        console.error(
          `[orchestratorFlow] Tavily search failed for query "${route.extractedQuery}":`,
          inspect(error, { depth: null, colors: true })
        );
        // Continue with empty context (or maybe fallback logic could be improved, but this prevents crash)
        tavilyContext = '';
      }

      // 2. Extract Titles
      let extraction;
      try {
        const extractionResult = await extractorPrompt(
          { context: tavilyContext },
          { model: activeModel }
        );
        extraction = extractionResult.output;
      } catch (error) {
        console.error(
          `[orchestratorFlow] Extractor failed for context length ${tavilyContext.length}:`,
          inspect(error, { depth: null, colors: true })
        );
        return {
          kind: 'error' as const,
          error: 'Failed to process search results',
          details: error instanceof Error ? error.message : String(error),
        };
      }

      if (!extraction) {
        console.error('[orchestratorFlow] Extractor returned null output');
        return {
          kind: 'error' as const,
          error: 'Failed to extract information from search results',
          details: 'Title extraction returned null.',
        };
      }

      // 3. Search DBs for these titles (Enrichment)
      // We'll search for each title in parallel using the appropriate flow based on category
      const enrichmentPromises = extraction.titles.map(async (title) => {
        const input = { query: title, language };

        switch (route.category) {
          case 'MOVIE_TV': {
            const movies = await searchMedia(input);
            return { movies, books: [], games: [] };
          }
          case 'GAME': {
            const games = await searchGames(input);
            return { movies: [], books: [], games };
          }
          case 'BOOK': {
            const books = await searchBooks(input);
            return { movies: [], books, games: [] };
          }
          case 'ALL':
          default:
            return await searchAll(input);
        }
      });

      const enrichmentResultsRaw = await Promise.allSettled(enrichmentPromises);

      // Aggregate results
      const enrichmentResults: z.infer<typeof SearchAllOutputSchema> = {
        movies: [],
        books: [],
        games: [],
      };

      for (const result of enrichmentResultsRaw) {
        if (result.status === 'fulfilled') {
          // result.value will always have { movies, books, games } structure now
          if (result.value.movies) enrichmentResults.movies.push(...result.value.movies);
          if (result.value.books) enrichmentResults.books.push(...result.value.books);
          if (result.value.games) enrichmentResults.games.push(...result.value.games);
        } else {
          console.error(
            '[orchestratorFlow] Enrichment promise rejected:',
            inspect(result.reason, { depth: null, colors: true })
          );
        }
      }

      // 4. Synthesize Answer
      try {
        const synthesis = await synthesizerPrompt(
          {
            originalQuery: query,
            webContext: tavilyContext,
            apiDetails: JSON.stringify(enrichmentResults),
            language,
          },
          { model: activeModel }
        );

        return {
          kind: 'discovery' as const,
          message: synthesis.text,
          data: enrichmentResults,
        };
      } catch (error) {
        console.error(
          `[orchestratorFlow] Synthesizer failed for query "${query}":`,
          inspect(error, { depth: null, colors: true })
        );
        // Fallback: return data with a generic message
        return {
          kind: 'discovery' as const,
          message:
            "I found some information but couldn't generate a summary. Please check the details below.",
          data: enrichmentResults,
        };
      }
    }

    return {
      kind: 'refusal' as const,
      message:
        "I wasn't sure how to handle that query, but I'm here to help with movies, games, and books.",
    };
  }
);
