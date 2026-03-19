// When running from the Dev UI, Genkit wraps the prompt output in a full GenerateResponse.
// These helpers extract the actual content from that wrapper.
type GenkitResponse = { message?: { content?: Array<{ text?: string }> } };

/**
 * Extracts and JSON-parses structured output from a Genkit GenerateResponse wrapper.
 * Returns null for falsy raw values or if JSON parsing fails.
 */
export function extractOutput<T>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === 'object' && 'message' in raw) {
    const text = (raw as GenkitResponse).message?.content?.[0]?.text ?? '';
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

/**
 * Extracts plain text output from a Genkit GenerateResponse wrapper.
 * Returns an empty string if the raw value is falsy or unrecognised.
 */
export function extractTextOutput(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'object' && 'message' in raw) {
    return (raw as GenkitResponse).message?.content?.[0]?.text ?? '';
  }
  if (typeof raw === 'string') return raw;
  return '';
}
