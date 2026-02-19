import { GenkitError } from 'genkit';
import { jwtVerify, type JWTPayload } from 'jose';

let cachedJwtSecret: Uint8Array | null = null;

/**
 * Returns the Supabase JWT secret as a Uint8Array, ready for use with `jose`.
 * The result is cached to avoid repeated TextEncoder allocations.
 * Throws a server error if `SUPABASE_JWT_SECRET` is not configured.
 */
function getJwtSecret(): Uint8Array {
  if (cachedJwtSecret) return cachedJwtSecret;

  const secret = process.env['SUPABASE_JWT_SECRET'];
  if (!secret) {
    throw new GenkitError({
      status: 'INTERNAL',
      message: 'Server misconfiguration: SUPABASE_JWT_SECRET is not set.',
    });
  }

  cachedJwtSecret = new TextEncoder().encode(secret);
  return cachedJwtSecret;
}

/**
 * Cryptographically verifies a Supabase JWT using the project's shared secret.
 * Verification is done **locally** — no network request to Supabase is made.
 *
 * @param token - Raw JWT string (without the "Bearer " prefix).
 * @returns The verified JWT payload.
 * @throws {GenkitError} with status UNAUTHENTICATED (→ HTTP 401) if the token
 *   is missing, invalid, expired, or has a bad signature.
 */
export async function verifySupabaseJwt(token: string): Promise<JWTPayload> {
  const secret = getJwtSecret();
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return payload;
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
