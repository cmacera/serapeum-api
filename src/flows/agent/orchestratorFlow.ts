import { inspect } from 'util';
import { ai, z, activeModel } from '../../lib/ai.js';
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

type TranslationKeys =
  | 'router_failure'
  | 'generic_refusal'
  | 'specific_fallback'
  | 'specific_error'
  | 'synthesis_failure'
  | 'unrecognized_intent';

type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

const TRANSLATIONS: Record<SupportedLanguage, Record<TranslationKeys, string>> = {
  en: {
    router_failure: 'The AI router could not determine the intent of your query.',
    generic_refusal: "I'm sorry, I specialize only in Movies, Games, Books, and TV Shows.",
    specific_fallback: 'Here is what I found about that:',
    specific_error: 'Failed to retrieve specific entity details.',
    synthesis_failure:
      "I found some information but couldn't generate a summary. Please check the details below.",
    unrecognized_intent:
      "I wasn't sure how to handle that query, but I'm here to help with movies, games, and books.",
  },
  es: {
    router_failure: 'El enrutador de IA no pudo determinar la intención de tu consulta.',
    generic_refusal:
      'Lo siento, solo me especializo en películas, juegos, libros y programas de televisión.',
    specific_fallback: 'Esto es lo que encontré al respecto:',
    specific_error: 'Error al recuperar los detalles de la entidad específica.',
    synthesis_failure:
      'Encontré algo de información pero no pude generar un resumen. Consulta los detalles a continuación.',
    unrecognized_intent:
      'No estaba seguro de cómo manejar esa consulta, pero estoy aquí para ayudarte con películas, juegos y libros.',
  },
  fr: {
    router_failure: "Le routeur d'IA n'a pas pu déterminer l'intention de votre requête.",
    generic_refusal:
      'Je suis désolé, je me spécialise uniquement dans les films, les jeux, les livres et les émissions de télévision.',
    specific_fallback: "Voici ce que j'ai trouvé à ce sujet :",
    specific_error: "Échec de la récupération des détails de l'entité spécifique.",
    synthesis_failure:
      "J'ai trouvé quelques informations mais je n'ai pas pu générer de résumé. Veuillez vérifier les détails ci-dessous.",
    unrecognized_intent:
      'Je ne savais pas trop comment gérer cette requête, mais je suis là pour vous aider avec les films, les jeux et les livres.',
  },
  de: {
    router_failure: 'Der KI-Router konnte die Absicht Ihrer Anfrage nicht bestimmen.',
    generic_refusal:
      'Es tut mir leid, ich bin nur auf Filme, Spiele, Bücher und Fernsehsendungen spezialisiert.',
    specific_fallback: 'Hier ist, was ich dazu gefunden habe:',
    specific_error: 'Fehler beim Abrufen spezifischer Entitätsdetails.',
    synthesis_failure:
      'Ich habe einige Informationen gefunden, konnte aber keine Zusammenfassung erstellen. Bitte überprüfen Sie die Details unten.',
    unrecognized_intent:
      'Ich war mir nicht sicher, wie ich diese Anfrage bearbeiten soll, aber ich bin hier, um bei Filmen, Spielen und Büchern zu helfen.',
  },
  zh: {
    router_failure: 'AI 路由无法确定您的查询意图。',
    generic_refusal: '抱歉，我仅专门从事电影、游戏、书籍和电视节目。',
    specific_fallback: '这是我找到的相关信息：',
    specific_error: '无法检索特定实体详细信息。',
    synthesis_failure: '我找到了一些信息，但无法生成摘要。请查看下面的详细信息。',
    unrecognized_intent: '我不确定如何处理该查询，但我在这里为您提供电影、游戏和书籍方面的帮助。',
  },
  ja: {
    router_failure: 'AIルーターがクエリの意図を判断できませんでした。',
    generic_refusal: '申し訳ありませんが、私は映画、ゲーム、本、テレビ番組のみを専門としています。',
    specific_fallback: 'それについて見つかった情報は次のとおりです：',
    specific_error: '特定のエンティティの詳細を取得できませんでした。',
    synthesis_failure:
      'いくつかの情報が見つかりましたが、要約を生成できませんでした。以下の詳細を確認してください。',
    unrecognized_intent:
      'そのクエリの処理方法がわかりませんでしたが、映画、ゲーム、本に関するお手伝いをいたします。',
  },
};

function getTranslations(language: string): Record<TranslationKeys, string> {
  if (language in TRANSLATIONS) {
    return TRANSLATIONS[language as SupportedLanguage];
  }
  return TRANSLATIONS['en'];
}

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
      return { movies: res, books: [], games: [] };
    }
    case 'GAME': {
      const res = await searchGames(input);
      return { movies: [], books: [], games: res };
    }
    case 'BOOK': {
      const res = await searchBooks(input);
      return { movies: [], books: res, games: [] };
    }
    case 'ALL': {
      const res = await searchAll(input);
      return { movies: res.movies, books: res.books, games: res.games, errors: res.errors };
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

        return await executeCategorySearch(
          route.category as 'MOVIE_TV' | 'GAME' | 'BOOK' | 'ALL',
          input
        );
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

        const t = getTranslations(language);
        const finalMessage =
          synthesis.text && synthesis.text.trim() ? synthesis.text : t['synthesis_failure'];

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
