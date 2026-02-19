import { GenkitError } from 'genkit';
import type { ContextProvider } from 'genkit/context';
import { verifySupabaseJwt, type JWTPayload } from '../lib/auth.js';

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns `null` if the header is absent or malformed.
 */
function extractBearerToken(headers: Record<string, string>): string | null {
  const authHeader = headers['authorization'];
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') return null;

  return parts[1] ?? null;
}

/**
 * Genkit `contextProvider` that validates incoming Supabase JWTs.
 *
 * - Rejects requests without a token or with an invalid/expired token → 401.
 * - On success, returns the verified JWT payload as the request context,
 *   making it available to flows via `getFlowContext()` if needed later.
 */
export const jwtContextProvider: ContextProvider<JWTPayload> = async ({ headers }) => {
  const token = extractBearerToken(headers as Record<string, string>);

  if (!token) {
    throw new GenkitError({
      status: 'UNAUTHENTICATED',
      message: 'Unauthorized: missing or malformed Authorization header.',
    });
  }

  return verifySupabaseJwt(token);
};
