import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GenkitError } from 'genkit';
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import nock from 'nock';
import { jwtContextProvider } from '../../../src/middleware/verifyJwt.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_URL = 'https://abc123xyz.supabase.co';
const TEST_ISSUER = `${TEST_URL}/auth/v1`;
const JWKS_PATH = '/auth/v1/.well-known/jwks.json';

let privateKey: any; // Using any to avoid complex jose KeyLike vs CryptoKey issues in different environments
let publicKeyJWK: Record<string, any>;

/**
 * Generates a test RSA key pair for signing and JWKS mocking.
 */
async function ensureKeys() {
  if (privateKey) return;
  const { privateKey: priv, publicKey: pub } = await generateKeyPair('RS256');
  privateKey = priv;
  publicKeyJWK = (await exportJWK(pub)) as Record<string, any>;
  publicKeyJWK.kid = 'test-kid';
  publicKeyJWK.alg = 'RS256';
  publicKeyJWK.use = 'sig';
}

/**
 * Creates a signed HS256 JWT using the test secret.
 * Defaults to a 1-hour expiry so it is valid by default.
 */
async function signToken(
  payload: Record<string, unknown> = { sub: 'user-test-id' },
  expiresIn = '1h'
): Promise<string> {
  await ensureKeys();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setAudience('authenticated')
    .setIssuer(TEST_ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(privateKey);
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
  beforeEach(async () => {
    await ensureKeys();
    vi.stubEnv('SUPABASE_URL', TEST_URL);

    // Mock the JWKS endpoint
    nock(TEST_URL)
      .get(JWKS_PATH)
      .reply(200, {
        keys: [publicKeyJWK],
      })
      .persist();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    nock.cleanAll();
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
    // Sign with a *different* key
    const { privateKey: wrongKey } = await generateKeyPair('RS256');
    const badToken = await new SignJWT({ sub: 'attacker' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
      .setAudience('authenticated')
      .setIssuer(TEST_ISSUER)
      .setExpirationTime('1h')
      .sign(wrongKey);

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
