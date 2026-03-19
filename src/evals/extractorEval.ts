import { ai, z } from '../lib/ai.js';
import { extractOutput } from './utils.js';

const extractorOutputSchema = z.object({ titles: z.array(z.string()) });
const extractorReferenceSchema = z.object({ titles: z.array(z.string()) });

type ExtractorOutput = z.infer<typeof extractorOutputSchema>;
type ExtractorReference = z.infer<typeof extractorReferenceSchema>;

function computeF1(predicted: string[], reference: string[]): number {
  if (predicted.length === 0 && reference.length === 0) return 1;
  if (predicted.length === 0 || reference.length === 0) return 0;

  const normPred = [...new Set(predicted.map((t) => t.toLowerCase().trim()))];
  const normRef = [...new Set(reference.map((t) => t.toLowerCase().trim()))];

  const truePositives = normPred.filter((t) => normRef.includes(t)).length;
  const precision = truePositives / normPred.length;
  const recall = truePositives / normRef.length;

  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * Evaluates extractor title precision using F1 score.
 *
 * Score:
 *   1.0 = all expected titles extracted, no extras
 *   0.0 = no overlap between predicted and reference
 *
 * Run with:
 *   genkit eval:run .genkit/datasets/extractor-cases.json --flow extractorPrompt --evaluators extractor/precision
 */
export const extractorPrecisionEvaluator = ai.defineEvaluator(
  {
    name: 'extractor/precision',
    displayName: 'Extractor Title Precision',
    definition:
      'Measures title extraction quality using F1 score (0–1). Normalises titles to lowercase before comparison.',
    isBilled: false,
  },
  async (datapoint) => {
    const rawOutput = extractOutput<unknown>(datapoint.output);
    const outputParsed = extractorOutputSchema.safeParse(rawOutput);
    const referenceParsed = extractorReferenceSchema.safeParse(datapoint.reference);

    if (!outputParsed.success || !referenceParsed.success) {
      const reason = !outputParsed.success
        ? outputParsed.error.message
        : referenceParsed.error!.message;
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: { score: 0, rationale: `Validation failed: ${reason}` },
      };
    }

    const output: ExtractorOutput = outputParsed.data;
    const reference: ExtractorReference = referenceParsed.data;

    const score = computeF1(output.titles, reference.titles);
    const predicted = output.titles.length ? output.titles.join(', ') : '(none)';
    const expected = reference.titles.length ? reference.titles.join(', ') : '(none)';

    return {
      testCaseId: datapoint.testCaseId,
      evaluation: {
        score,
        rationale: `predicted: [${predicted}] | expected: [${expected}] | F1: ${score.toFixed(2)}`,
      },
    };
  }
);
