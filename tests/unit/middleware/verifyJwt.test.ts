import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GenkitError } from 'genkit';
import { SignJWT } from 'jose';
import { jwtContextProvider } from '../../../src/middleware/verifyJwt.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_SECRET = 'test-secret-that-is-at-least-32-chars-long!';
const TEST_SECRET_BYTES = new TextEncoder().encode(TEST_SECRET);
const TEST_URL = 'https://abc123xyz.supabase.co';

/**
 * Creates a signed HS256 JWT using the test secret.
 * Defaults to a 1-hour expiry so it is valid by default.
 */
async function signToken(
  payload: Record<string, unknown> = { sub: 'user-test-id' },
  expiresIn = '1h'
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('authenticated')
    .setIssuer(TEST_URL)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(TEST_SECRET_BYTES);
}

/**
 * Builds a fake contextProvider argument as Genkit would provide it.
 */
function makeContext(authHeader?: string): {
  method: 'POST';
  headers: Record<string, string>;
  input: unknown;
} {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader;
  }
  return { method: 'POST', headers, input: {} };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('jwtContextProvider', () => {
  beforeEach(() => {
    // Inject the test secret into process.env so auth.ts can read it
    vi.stubEnv('SUPABASE_JWT_SECRET', TEST_SECRET);
    vi.stubEnv('SUPABASE_URL', TEST_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws UNAUTHENTICATED when there is no Authorization header', async () => {
    const result = jwtContextProvider(makeContext());
    await expect(result).rejects.toBeInstanceOf(GenkitError);
    await expect(result).rejects.toMatchObject({
      status: 'UNAUTHENTICATED',
    });
  });

  it('throws UNAUTHENTICATED when the Authorization scheme is not Bearer', async () => {
    const result = jwtContextProvider(makeContext('Basic dXNlcjpwYXNz'));
    await expect(result).rejects.toBeInstanceOf(GenkitError);
    await expect(result).rejects.toMatchObject({
      status: 'UNAUTHENTICATED',
    });
  });

  it('throws UNAUTHENTICATED when the token has an invalid signature', async () => {
    // Sign with a *different* secret than what is loaded in env
    const wrongSecretBytes = new TextEncoder().encode('wrong-secret-that-is-at-least-32-chars!');
    const badToken = await new SignJWT({ sub: 'attacker' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(wrongSecretBytes);

    const result = jwtContextProvider(makeContext(`Bearer ${badToken}`));
    await expect(result).rejects.toBeInstanceOf(GenkitError);
    await expect(result).rejects.toMatchObject({
      status: 'UNAUTHENTICATED',
    });
  });

  it('throws UNAUTHENTICATED when the token is expired', async () => {
    const expiredToken = await signToken({ sub: 'user-id' }, '-1s');

    const result = jwtContextProvider(makeContext(`Bearer ${expiredToken}`));
    await expect(result).rejects.toBeInstanceOf(GenkitError);
    await expect(result).rejects.toMatchObject({
      status: 'UNAUTHENTICATED',
    });
  });

  it('returns the JWT payload when the token is valid', async () => {
    const token = await signToken({ sub: 'user-123', email: 'test@example.com' });

    const context = await jwtContextProvider(makeContext(`Bearer ${token}`));

    expect(context).toMatchObject({
      sub: 'user-123',
      email: 'test@example.com',
    });
  });
});
