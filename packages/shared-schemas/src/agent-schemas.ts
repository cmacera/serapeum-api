import { z } from 'zod';
import { SearchAllOutputSchema } from './search-all-schemas.js';

export const AgentResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('refusal'),
    message: z.string(),
    traceId: z.string().optional(),
  }),
  z.object({
    kind: z.literal('search_results'),
    message: z.string(),
    data: SearchAllOutputSchema,
    traceId: z.string().optional(),
  }),
  z.object({
    kind: z.literal('discovery'),
    message: z.string(),
    data: SearchAllOutputSchema,
    traceId: z.string().optional(),
  }),
  z.object({
    kind: z.literal('error'),
    error: z.string(),
    details: z.string().optional(),
    traceId: z.string().optional(),
  }),
]);

export type AgentResponse = z.infer<typeof AgentResponseSchema>;
