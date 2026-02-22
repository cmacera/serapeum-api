import { inspect } from 'util';
import { ai, z, activeModel } from '../../lib/ai.js';
import { getTranslations } from '../../lib/translations.js';
import { searchAll, SearchAllOutputSchema } from '../catalog/searchAll.js';
import { searchMedia } from '../catalog/searchMedia.js';
import { searchGames } from '../catalog/searchGames.js';
import { searchBooks } from '../catalog/searchBooks.js';
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
    data: SearchAllOutputSchema,
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

/**
 * Helper to execute the appropriate category search and normalize the output to SearchAllOutputSchema
 */
async function executeCategorySearch(
  category: 'MOVIE_TV' | 'GAME' | 'BOOK' | 'ALL',
  input: { query: string; language: string }
): Promise<z.infer<typeof SearchAllOutputSchema>> {
  switch (category) {
    case 'MOVIE_TV': {
      const res = await searchMedia(input);
      return { media: res, books: [], games: [] };
    }
    case 'GAME': {
      const res = await searchGames(input);
      return { media: [], books: [], games: res };
    }
    case 'BOOK': {
      const res = await searchBooks(input);
      return { media: [], books: res, games: [] };
    }
    case 'ALL': {
      const res = await searchAll(input);
      return { media: res.media, books: res.books, games: res.games, errors: res.errors };
    }
    default: {
      const _exhaustiveCheck: never = category;
      throw new Error(`Unhandled category: ${_exhaustiveCheck}`);
    }
  }
}

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
    const language = inputParam.language;

    // 1. Router
    const { output: route } = await routerPrompt({ query, language }, { model: activeModel });

    if (!route) {
      console.error('[orchestratorFlow] Router failed to generate response');
      const t = getTranslations(language);
      return {
        kind: 'error' as const,
        error: 'Router failure',
        details: t['router_failure'],
      };
    }

    // Path C: Guardrail
    if (route.intent === 'OUT_OF_SCOPE') {
      const t = getTranslations(language);
      return {
        kind: 'refusal' as const,
        message: route.refusalReason || t['generic_refusal'],
      };
    }

    // Path A: Specific Entity
    if (route.intent === 'SPECIFIC_ENTITY') {
      const input = { query: route.extractedQuery, language };

      try {
        const executionResult = await executeCategorySearch(
          route.category as 'MOVIE_TV' | 'GAME' | 'BOOK' | 'ALL',
          input
        );

        const t = getTranslations(language);
        let generatedText = t['specific_fallback'];
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
          if (synthesis.text && synthesis.text.trim()) {
            generatedText = synthesis.text;
          }
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
        const t = getTranslations(language);
        return {
          kind: 'error' as const,
          error: t['specific_error'],
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
          language,
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
        const t = getTranslations(language);
        return {
          kind: 'error' as const,
          error: t['failedProcessSearchResults'],
          details: error instanceof Error ? error.message : String(error),
        };
      }

      if (!extraction) {
        console.error('[orchestratorFlow] Extractor returned null output');
        const t = getTranslations(language);
        return {
          kind: 'error' as const,
          error: t['failedExtractSearchResults'],
          details: 'Title extraction returned null.',
        };
      }

      // 3. Search DBs for these titles (Enrichment)
      // We'll search for each title in parallel using the appropriate flow based on category
      const enrichmentPromises = extraction.titles.map(async (title) => {
        const input = { query: title, language };

        return await executeCategorySearch(
          route.category as 'MOVIE_TV' | 'GAME' | 'BOOK' | 'ALL',
          input
        );
      });

      const enrichmentResultsRaw = await Promise.allSettled(enrichmentPromises);

      // Aggregate results
      const enrichmentResults: z.infer<typeof SearchAllOutputSchema> = {
        media: [],
        books: [],
        games: [],
        errors: [],
      };

      for (const result of enrichmentResultsRaw) {
        if (result.status === 'fulfilled') {
          // result.value will always have { media, books, games } structure now
          if (result.value.media) enrichmentResults.media.push(...result.value.media);
          if (result.value.books) enrichmentResults.books.push(...result.value.books);
          if (result.value.games) enrichmentResults.games.push(...result.value.games);
          if (result.value.errors) enrichmentResults.errors!.push(...result.value.errors);
        } else {
          console.error(
            '[orchestratorFlow] Enrichment promise rejected:',
            inspect(result.reason, { depth: null, colors: true })
          );
        }
      }

      if (enrichmentResults.errors && enrichmentResults.errors.length === 0) {
        delete enrichmentResults.errors;
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

        const t = getTranslations(language);
        let finalMessage =
          synthesis.text && synthesis.text.trim() ? synthesis.text : t.synthesis_failure;

        // Add a status message about partial failures if any
        if (enrichmentResults.errors && enrichmentResults.errors.length > 0) {
          const failedTitles = enrichmentResults.errors.map(
            (e) => e.message.split('"')[1] || 'Unknown'
          );
          const uniqueFailures = [...new Set(failedTitles)].filter((t) => t !== 'Unknown');

          if (uniqueFailures.length > 0) {
            finalMessage += `\n\n(${t.failedProcessSearchResults}: ${uniqueFailures.join(', ')})`;
          }
        }

        return {
          kind: 'discovery' as const,
          message: finalMessage,
          data: enrichmentResults,
        };
      } catch (error) {
        console.error(
          `[orchestratorFlow] Synthesizer failed for query "${query}":`,
          inspect(error, { depth: null, colors: true })
        );
        // Fallback: return data with a generic message
        const t = getTranslations(language);
        return {
          kind: 'discovery' as const,
          message: t['synthesis_failure'],
          data: enrichmentResults,
        };
      }
    }

    const t = getTranslations(language);
    return {
      kind: 'refusal' as const,
      message: t['unrecognized_intent'],
    };
  }
);
