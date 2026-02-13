import { vi } from 'vitest';

// Mock genkit tools and AI to avoid side effects and filesystem ops
vi.mock('../src/lib/ai', () => ({
  ai: {
    defineFlow: (config: any, fn: any) => fn,
    generate: vi.fn(),
  },
  z: {
    object: () => ({}),
    string: () => ({}),
    unknown: () => ({}),
  },
}));

vi.mock('../src/tools/search-media-tool', () => ({ searchMediaTool: {} }));
vi.mock('../src/tools/search-books-tool', () => ({ searchBooksTool: {} }));
vi.mock('../src/tools/search-games-tool', () => ({ searchGamesTool: {} }));
vi.mock('../src/tools/search-tavily-tool', () => ({ searchTavilyTool: {} }));
