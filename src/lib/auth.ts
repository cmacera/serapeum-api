import { GenkitError } from 'genkit';
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

/**
 * Cryptographically verifies a Supabase JWT.
 * Now strictly supports asymmetric keys (ES256/RS256) via the public JWKS endpoint.
 *
 * @param token - Raw JWT string (without the "Bearer " prefix).
 * @returns The verified JWT payload.
 * @throws {GenkitError} with status UNAUTHENTICATED (→ HTTP 401) if the token
 *   is missing, invalid, expired, or has a bad signature.
 */
export async function verifySupabaseJwt(token: string): Promise<JWTPayload> {
  const supabaseUrl = process.env['SUPABASE_URL'];

  if (!supabaseUrl) {
    throw new GenkitError({
      status: 'INTERNAL',
      message: 'Server misconfiguration: SUPABASE_URL is not set.',
    });
  }

  const issuer = `${supabaseUrl}/auth/v1`;

  try {
    const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);
    const JWKS = createRemoteJWKSet(jwksUrl);

    const result = await jwtVerify(token, JWKS, {
      audience: 'authenticated',
      issuer,
    });

    return result.payload;
  } catch (err) {
    if (err instanceof GenkitError) {
      throw err;
    }
    // jose errors (JWTExpired, JWSSignatureVerificationFailed, etc.)
    throw new GenkitError({
      status: 'UNAUTHENTICATED',
      message: 'Unauthorized: invalid or expired token.',
    });
  }
}

// Re-export JWTPayload so callers don't need to import jose directly.
export type { JWTPayload };
