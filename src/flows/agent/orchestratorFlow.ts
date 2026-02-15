import { ai, z, activeModel } from '../../lib/ai.js';
import { searchAll, SearchAllOutputSchema } from '../catalog/searchAll.js';
import { searchMedia, SearchMediaOutputSchema } from '../catalog/searchMedia.js';
import { searchGames, SearchGamesOutputSchema } from '../catalog/searchGames.js';
import { searchBooks, SearchBooksOutputSchema } from '../catalog/searchBooks.js';
import { searchTavilyTool } from '../../tools/search-tavily-tool.js';
import { routerPrompt } from '../../prompts/routerPrompt.js';
import { extractorPrompt } from '../../prompts/extractorPrompt.js';
import { synthesizerPrompt } from '../../prompts/synthesizerPrompt.js';

const GeneralDiscoveryResponseSchema = z.object({
  text: z.string(),
  data: SearchAllOutputSchema,
});

// Flow
export const orchestratorFlow = ai.defineFlow(
  {
    name: 'orchestratorFlow',
    inputSchema: z.string(),
    outputSchema: z.union([
      z.string(),
      GeneralDiscoveryResponseSchema,
      SearchAllOutputSchema,
      SearchMediaOutputSchema,
      SearchGamesOutputSchema,
      SearchBooksOutputSchema,
    ]),
  },
  async (query) => {
    // 1. Router
    const { output: route } = await routerPrompt({ query }, { model: activeModel });

    if (!route) {
      throw new Error('Router failed to generate response');
    }

    // Path C: Guardrail
    if (route.intent === 'OUT_OF_SCOPE') {
      return (
        route.refusalReason || "I'm sorry, I specialize only in Movies, Games, Books, and TV Shows."
      );
    }

    // Path A: Specific Entity
    if (route.intent === 'SPECIFIC_ENTITY') {
      const input = { query: route.extractedQuery, language: 'en' };

      switch (route.category) {
        case 'MOVIE_TV':
          return await searchMedia(input);
        case 'GAME':
          return await searchGames(input);
        case 'BOOK':
          return await searchBooks(input);
        case 'ALL':
        default:
          return await searchAll(input);
      }
    }

    // Path B: General Discovery
    if (route.intent === 'GENERAL_DISCOVERY') {
      // 1. Search Tavily for context
      const tavilyResults = await searchTavilyTool({ query: route.extractedQuery, maxResults: 5 });
      const tavilyContext = tavilyResults.map((r) => r.content).join('\n');

      // 2. Extract Titles
      const { output: extraction } = await extractorPrompt(
        { context: tavilyContext },
        { model: activeModel }
      );

      if (!extraction) {
        throw new Error('Extractor failed to generate response');
      }

      // 3. Search DBs for these titles (Enrichment)
      // We'll search for each title in parallel using the appropriate flow based on category
      const enrichmentPromises = extraction.titles.map(async (title) => {
        const input = { query: title, language: 'en' };

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
        }
      }

      // 4. Synthesize Answer
      const synthesis = await synthesizerPrompt(
        {
          originalQuery: query,
          webContext: tavilyContext,
          apiDetails: JSON.stringify(enrichmentResults),
        },
        { model: activeModel }
      );

      return {
        text: synthesis.text,
        data: enrichmentResults,
      };
    }

    return "I wasn't sure how to handle that query, but I'm here to help with movies, games, and books.";
  }
);
