import { ai, z } from '../../lib/ai.js';
import { searchMediaTool } from '../../tools/search-media-tool.js';
import { searchBooksTool } from '../../tools/search-books-tool.js';
import { searchGamesTool } from '../../tools/search-games-tool.js';
import { searchTavilyTool } from '../../tools/search-tavily-tool.js';

// Define the output schema for reuse

// Define the standardized output schema
const AgentResponseSchema = z.object({
  summary: z.string().describe('Contextual answer based on research and findings'),
  items: z
    .array(
      z.object({
        id: z.coerce
          .string()
          .describe('The ID of the item (convert number to string if necessary)'),
        title: z.string().describe('The title of the item'),
        type: z.enum(['movie', 'tv', 'book', 'game']).describe('The type of the item'),
        posterUrl: z.string().optional().describe('The URL of the poster image if available'),
        releaseDate: z.string().optional().describe('The release date of the item'),
      })
    )
    .describe('List of standardized media items found'),
});

export const mediaAgent = ai.defineFlow(
  {
    name: 'mediaAgent',
    inputSchema: z.object({
      prompt: z.string(),
      language: z.enum(['en', 'es', 'fr', 'de', 'zh', 'ja']).optional().default('en'),
    }),
    outputSchema: AgentResponseSchema,
  },
  async (input) => {
    const systemPrompt = `You are an expert media curator and orchestrator. Your goal is to provide a comprehensive answer and a list of specific media items (movies, TV shows, books, games) based on the user's request.

**LANGUAGE INSTRUCTION**:
The user has requested the response in this language: "${input.language}".
You MUST write the \`summary\` and any text content in this language.
When searching, use this language code for the tools where applicable.

Follow this "Research & Fetch" strategy:

1.  **Analyze & Research**:
    *   If the user request is vague (e.g., "movies about time travel", "games like Fallout"), FIRST use the \`searchTavilyTool\` to identify the most relevant specific titles.
    *   Get a list of candidate titles from the web search.

2.  **Fetch Details**:
    *   For the specific titles identified (or if the user provided specific titles), use the dedicated database tools to get their official metadata:
        *   Use \`searchMediaTool\` for movies and TV shows.
        *   Use \`searchBooksTool\` for books.
        *   Use \`searchGamesTool\` for video games.
    *   **CRITICAL**: You MUST use these specific tools to populate the \`items\` array. Do NOT fabricate IDs or URLs. Only use data returned by the tools.

3.  **Synthesize**:
    *   Construct the \`summary\` to answer the user's question, providing context found during the research phase.
    *   Populate the \`items\` array with the structured data from the "Fetch Details" step. Map the tool outputs to the standardized schema:
        *   \`id\`: **ALWAYS convert the ID to a STRING**.
        *   \`type\`: specific to the content ('movie', 'tv', 'book', 'game').
        *   \`posterUrl\`: Use \`poster_path\` (TMDB), \`cover_url\` (IGDB), or \`imageLinks.thumbnail\` (Google Books).
        *   \`releaseDate\`: Use the relevant date field.

Limit the \`items\` list to the top 5-10 most relevant results.`;

    const tools = [searchMediaTool, searchBooksTool, searchGamesTool, searchTavilyTool];

    // Use Genkit's automatic tool handling
    try {
      const response = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: input.prompt, // Use the prompt from input
        system: systemPrompt, // System prompt
        tools,
        output: { schema: AgentResponseSchema },
        config: {
          temperature: 0.5, // slightly creative but focused
        },
      });

      if (!response.output) {
        throw new Error('Agent failed to produce a structured response.');
      }

      return response.output;
    } catch (error) {
      console.error('[mediaAgent] ai.generate failed:', {
        error,
        prompt: input.prompt,
        language: input.language,
      });
      // Rethrow to let Genkit or the caller handle the error shape
      throw error;
    }
  }
);
