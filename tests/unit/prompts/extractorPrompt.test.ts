import { describe, it, expect, vi } from 'vitest';

// Mock ai to avoid initialization errors when importing the schema
vi.mock('../../../src/lib/ai.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/ai.js')>();
  return {
    ...actual,
    ai: {
      ...actual.ai,
      definePrompt: vi.fn(),
    },
  };
});

import { ExtractorSchema } from '../../../src/prompts/extractorPrompt.js';

describe('extractorPrompt schema validation', () => {
  it('should correctly parse valid title extraction data', () => {
    const validData = {
      titles: [
        'Spider-Man: No Way Home',
        'Spider-Man: Into the Spider-Verse',
        'The Amazing Spider-Man 2',
      ],
    };

    const result = ExtractorSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.titles).toHaveLength(3);
      expect(result.data.titles[0]).toBe('Spider-Man: No Way Home');
    }
  });

  it('should fail to parse if the data is wrapped in a properties key (modeling the reported failure)', () => {
    const invalidData = {
      type: 'object',
      properties: {
        titles: [
          'Spider-Man: No Way Home',
          'Spider-Man: Into the Spider-Verse',
          'The Amazing Spider-Man 2',
        ],
      },
      required: ['titles'],
      additionalProperties: true,
      $schema: 'http://json-schema.org/draft-07/schema#',
    };

    const result = ExtractorSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
