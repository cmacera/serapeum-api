import { ai, z } from '../lib/ai.js';

export const ExtractorSchema = z.object({
  titles: z.array(z.string()).describe('List of exact titles found in the search results (max 3)'),
});

export const extractorPrompt = ai.definePrompt(
  {
    name: 'extractorPrompt',
    input: { schema: z.object({ context: z.string() }) },
    output: { schema: ExtractorSchema },
  },
  `Role: Data Extractor.

Instruction:
Read the provided web search context below. Extract the names of the main media works (Movies, Games, Books, TV Shows) mentioned that are most relevant to the user's original intent.
Return them as a strict string array. Limit to a maximum of 3 titles.

Context:
{{context}}`
);
