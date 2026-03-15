import { ai, z } from '../lib/ai.js';

export const ExtractorSchema = z.object({
  titles: z
    .array(z.string())
    .max(3)
    .refine((titles) => new Set(titles.map((t) => t.toLowerCase())).size === titles.length, {
      message: 'Titles must be unique (case-insensitive)',
    })
    .describe('List of exact titles found in the search results (max 3)'),
});

export const extractorPrompt = ai.definePrompt(
  {
    name: 'extractorPrompt',
    input: { schema: z.object({ query: z.string(), context: z.string() }) },
    output: { schema: ExtractorSchema },
  },
  `Role: Data Extractor.

Instruction:
User's original search intent: {{query}}

Read the provided web search context below. Extract the names of the main media works (Movies, Games, Books, TV Shows) mentioned that are most relevant to the intent above. Extract up to 3 titles if available.

- Extract titles most relevant to the intent above.
- Prefer well-known, standalone titles that directly represent the user's intent. Do NOT extract sub-story names, comic event names, or storyline titles found inside franchise articles (e.g., for intent "batman", extract "Batman" or "The Batman" — not "Batman: Zero Year", "Flashpoint", or "The Return of Bruce Wayne").
- If context is empty or contains no identifiable titles, return {"titles": []}.
- Do NOT include duplicate titles (case-insensitive).

IMPORTANT: Return ONLY the JSON object following the schema. Do NOT explain the schema, do NOT include the schema definition, and do NOT wrap the data in a "properties" key unless required by the schema itself.

Few-shot Examples:
- Context: "Spider-Man: No Way Home is a 2021 American superhero film... also mentioned are Spider-Man: Into the Spider-Verse and The Amazing Spider-Man 2."
  Output: {"titles": ["Spider-Man: No Way Home", "Spider-Man: Into the Spider-Verse", "The Amazing Spider-Man 2"]}

- Context: "The Last of Us Part II is a 2020 action-adventure game... other titles include God of War and Horizon Zero Dawn."
  Output: {"titles": ["The Last of Us Part II", "God of War", "Horizon Zero Dawn"]}

- Context: ""
  Output: {"titles": []}

Context:
{{context}}`
);
