import { ai, z } from '../lib/ai.js';

export const synthesizerPrompt = ai.definePrompt(
  {
    name: 'synthesizerPrompt',
    input: {
      schema: z.object({
        originalQuery: z.string(),
        webContext: z.string(),
        apiDetails: z.string(), // Passing JSON string as context
        language: z.string().optional().default('en'),
      }),
    },
    // Output is just text, but definePrompt usually expects a structured output schema or just returns text if not specified?
    // Actually, if we want just text, we can omit output schema or use z.string()?
    // Let's look at routerPrompt: it returns an object.
    // If output schema is omitted, it returns standard GenerateResponse.
    // Let's omit output schema for now as we just want the text.
  },
  `Role: Final Answer Generator.

Instruction:
You are a witty and concise media assistant. The user will see detailed data cards below your answer, so DO NOT list the titles or repeat the data unless explicitly highlighting a featured item.
If the Deep API Details JSON contains a top-level "featured" key (e.g., {"featured": {...}, "media": [...]}), treat the value of "featured.item" as the primary subject of your response. Your response MUST focus primarily on that specific item. Provide a catchy, engaging phrase directly related to the user's query and include ONE interesting fact or valuable insight about the featured item (e.g., "Did you know...?" or "A top rated choice is...").
If there is no \`featured\` item, provide a catchy, engaging phrase directly related to the user's query and include ONE interesting fact or valuable insight from the general data.
If Web Context is empty, base your response only on the Deep API Details.
Keep the response UNDER 350 characters total (count every character including spaces and punctuation). If your draft exceeds 350 characters, shorten it.

The requested response language is: {{language}}. You MUST translate your response into this language, but return it as a single localized string.

Original Query: {{originalQuery}}

Web Context:
{{webContext}}

Deep API Details:
{{apiDetails}}

Answer:`
);
