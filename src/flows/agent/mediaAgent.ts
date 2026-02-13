import { ai, z } from '../../lib/ai.js';
import { searchMediaTool } from '../../tools/search-media-tool.js';
import { searchBooksTool } from '../../tools/search-books-tool.js';
import { searchGamesTool } from '../../tools/search-games-tool.js';
import { searchTavilyTool } from '../../tools/search-tavily-tool.js';

// @ts-ignore
import { googleAI } from '@genkit-ai/google-genai';


// Define the output schema for reuse
const MediaAgentOutputSchema = z.object({
  text: z.string().describe('The response message or explanation'),
  output: z.any().optional().describe('The structured result payload'),
});

export const mediaAgent = ai.defineFlow(
  {
    name: 'mediaAgent',
    inputSchema: z.object({
      prompt: z.string(),
    }),
    outputSchema: MediaAgentOutputSchema,
  },
  async (input) => {
    try {
      const { text, output } = await ai.generate({
        prompt: input.prompt,
        model: googleAI.model('gemini-2.5-flash'),
        system: `You are an expert media librarian. Your goal is to find the specific content the user is looking for.

If the user provides a specific title, search the corresponding database directly.

If the user query is vague (e.g., "that movie about..."), use the Web Search tool first to identify the title, then search the specific database.

Always return the structured data from the database tools if possible.`,
        tools: [searchMediaTool, searchBooksTool, searchGamesTool, searchTavilyTool],
        output: { schema: MediaAgentOutputSchema },
      });

      return { text, output };
    } catch (error) {
      console.error('Error in mediaAgent:', error);
      throw error; // Re-throw to let Genkit handle the error response
    }
  }
);
