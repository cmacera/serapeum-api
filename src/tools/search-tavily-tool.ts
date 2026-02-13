import { ai, z } from '../lib/ai.js';
import { tavily } from '@tavily/core';
import type { TavilySearchResult } from '../lib/tavily-types.js';

/**
 * Genkit Tool: Web search using Tavily API
 * Provides high-quality, AI-optimized search results.
 */
export const TavilySearchResultSchema = z.object({
    title: z.string(),
    url: z.string().url(),
    content: z.string(),
    score: z.number(),
    published_date: z.string().optional(),
});

export const searchTavilyTool = ai.defineTool(
    {
        name: 'searchTavilyTool',
        description:
            'Perform a comprehensive web search using the Tavily API. Use this tool to find up-to-date information, news, research data, or general web content that is not available in specialized tools.',
        inputSchema: z.object({
            query: z.string().min(1, 'Search query cannot be empty'),
            searchDepth: z.enum(['basic', 'advanced']).optional(),
            maxResults: z.number().min(1).max(10).optional(),
        }),
        outputSchema: z.array(TavilySearchResultSchema),
    },
    async (input) => {
        const apiKey = process.env['TAVILY_API_KEY'];

        if (!apiKey) {
            throw new Error('TAVILY_API_KEY environment variable is not configured');
        }

        try {
            const tvly = tavily({ apiKey });
            const response = await tvly.search(input.query, {
                searchDepth: input.searchDepth,
                maxResults: input.maxResults,
                includeAnswer: false,
                includeImages: false,
                includeRawContent: false,
            });

            // Map results to ensure they match our schema
            const results: TavilySearchResult[] = response.results.map((result) => ({
                title: result.title,
                url: result.url,
                content: result.content,
                score: result.score,
                published_date: result.publishedDate,
            }));

            return results;
        } catch (error: any) {
            // Handle common API errors
            const status = error?.status || error?.response?.status;

            if (status === 401) {
                throw new Error('Tavily API authentication failed. Please check your API key.');
            } else if (status === 429) {
                throw new Error('Tavily API rate limit exceeded. Please try again later.');
            } else if (error.message?.includes('network') || error.code === 'ECONNREFUSED') {
                throw new Error(
                    'Network error: Unable to reach Tavily API. Please check your internet connection.'
                );
            }

            throw new Error(`Tavily API error: ${error?.message || 'Unknown error'}`);
        }
    }
);
