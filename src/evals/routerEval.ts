import { ai } from '../lib/ai.js';
import { extractOutput } from './utils.js';

type RouterOutput = {
  intent: 'SPECIFIC_ENTITY' | 'GENERAL_DISCOVERY' | 'OUT_OF_SCOPE';
  category: 'MOVIE_TV' | 'GAME' | 'BOOK' | 'ALL';
  extractedQuery: string;
  refusalReason?: string | null;
};

type RouterReference = {
  intent: 'SPECIFIC_ENTITY' | 'GENERAL_DISCOVERY' | 'OUT_OF_SCOPE';
  category: 'MOVIE_TV' | 'GAME' | 'BOOK' | 'ALL';
};

/**
 * Evaluates router classification accuracy.
 *
 * Score:
 *   1.0 = intent + category both correct
 *   0.5 = intent correct, category wrong
 *   0.0 = intent wrong
 *
 * Run with:
 *   genkit eval:run .genkit/datasets/router-cases.json --flow routerPrompt --evaluators router/classification
 */
export const routerClassificationEvaluator = ai.defineEvaluator(
  {
    name: 'router/classification',
    displayName: 'Router Classification Accuracy',
    definition:
      'Measures accuracy of intent and category classification. Score: 1 = both correct, 0.5 = intent correct only, 0 = intent wrong.',
    isBilled: false,
  },
  async (datapoint) => {
    const output = extractOutput<RouterOutput>(datapoint.output);
    const reference = datapoint.reference as RouterReference;

    if (!reference || !output) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: { score: 0, rationale: 'Missing output or reference' },
      };
    }

    const intentOk = output.intent === reference.intent;
    const isOutOfScope = reference.intent === 'OUT_OF_SCOPE';
    const categoryOk = !isOutOfScope && output.category === reference.category;
    const score = intentOk ? (isOutOfScope || categoryOk ? 1.0 : 0.5) : 0.0;
    const categoryRationale = isOutOfScope
      ? 'category N/A'
      : `category: ${output.category} vs ${reference.category} (${categoryOk ? '✓' : '✗'})`;

    return {
      testCaseId: datapoint.testCaseId,
      evaluation: {
        score,
        rationale: `intent: ${output.intent} vs ${reference.intent} (${intentOk ? '✓' : '✗'}) | ${categoryRationale}`,
      },
    };
  }
);
