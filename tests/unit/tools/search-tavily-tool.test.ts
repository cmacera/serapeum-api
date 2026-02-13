import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { searchTavilyTool } from '../../../src/tools/search-tavily-tool.js';
import { tavily } from '@tavily/core';

// Mock the Tavily SDK
vi.mock('@tavily/core', () => ({
    tavily: vi.fn(),
}));

describe('searchTavilyTool', () => {
    const mockApiKey = 'test-tavily-key';
    const mockSearch = vi.fn();

    beforeEach(() => {
        process.env.TAVILY_API_KEY = mockApiKey;
        vi.clearAllMocks();
        (tavily as any).mockReturnValue({
            search: mockSearch,
        });
    });

    afterEach(() => {
        delete process.env.TAVILY_API_KEY;
    });

    describe('Successful searches', () => {
        it('should return search results for a valid query', async () => {
            const mockResponse = {
                results: [
                    {
                        title: 'Genkit Documentation',
                        url: 'https://firebase.google.com/docs/genkit',
                        content: 'Genkit is a framework for building AI-powered apps.',
                        score: 0.99,
                        publishedDate: '2024-01-01',
                    },
                ],
            };

            mockSearch.mockResolvedValue(mockResponse);

            const result = await searchTavilyTool({ query: 'Genkit' } as any);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                title: 'Genkit Documentation',
                url: 'https://firebase.google.com/docs/genkit',
                content: 'Genkit is a framework for building AI-powered apps.',
                score: 0.99,
                published_date: '2024-01-01',
            });
            expect(mockSearch).toHaveBeenCalledWith('Genkit', expect.objectContaining({
                searchDepth: undefined,
                maxResults: undefined,
            }));
        });

        it('should handle custom maxResults and searchDepth', async () => {
            mockSearch.mockResolvedValue({ results: [] });

            await searchTavilyTool({
                query: 'advanced search',
                searchDepth: 'advanced',
                maxResults: 3,
            });

            expect(mockSearch).toHaveBeenCalledWith('advanced search', expect.objectContaining({
                searchDepth: 'advanced',
                maxResults: 3,
            }));
        });
    });

    describe('Error handling', () => {
        it('should throw error when API key is missing', async () => {
            delete process.env.TAVILY_API_KEY;

            await expect(searchTavilyTool({ query: 'test' } as any)).rejects.toThrow(
                'TAVILY_API_KEY environment variable is not configured'
            );
        });

        it('should handle authentication errors', async () => {
            mockSearch.mockRejectedValue({ status: 401 });

            await expect(searchTavilyTool({ query: 'test' } as any)).rejects.toThrow(
                'Tavily API authentication failed. Please check your API key.'
            );
        });

        it('should handle rate limit errors', async () => {
            mockSearch.mockRejectedValue({ status: 429 });

            await expect(searchTavilyTool({ query: 'test' } as any)).rejects.toThrow(
                'Tavily API rate limit exceeded. Please try again later.'
            );
        });

        it('should handle network failures (ECONNREFUSED)', async () => {
            mockSearch.mockRejectedValue({ code: 'ECONNREFUSED' });

            await expect(searchTavilyTool({ query: 'test' } as any)).rejects.toThrow(
                'Network error: Unable to reach Tavily API'
            );
        });
    });
});
