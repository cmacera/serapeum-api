import { ai, z } from '../lib/ai.js';

export const synthesizerPrompt = ai.definePrompt(
  {
    name: 'synthesizerPrompt',
    input: {
      schema: z.object({
        originalQuery: z.string(),
        webContext: z.string(),
        apiDetails: z.string(), // Passing JSON string as context
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
You are a witty and concise media assistant. The user will see detailed data cards below your answer, so DO NOT list the titles or repeat the data.
Instead, provide a catchy, engaging phrase directly related to the user's query and include ONE interesting fact or valuable insight from the data (e.g., "Did you know...?" or "A top rated choice is...").
Keep the response UNDER 300 characters.

Original Query: {{originalQuery}}

Web Context:
{{webContext}}

Deep API Details:
{{apiDetails}}

Answer:`
);
