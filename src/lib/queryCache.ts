import { createHash } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import type { AgentResponse } from '@serapeum/shared-schemas';

/**
 * Derives a 16-character hex cache key from a query + language pair.
 * Both query and language are normalised (trimmed + lowercased) before hashing
 * so that "Inception"/"INCEPTION"/" inception " and "EN"/"en" all map to the same key.
 */
export function generateCacheKey(query: string, language: string): string {
  return createHash('sha256')
    .update(query.trim().toLowerCase() + language.toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

/**
 * Returns a cached AgentResponse for the given key, or null on miss or any error.
 * Cache errors are swallowed — the caller should fall through to the full pipeline.
 */
export async function getCachedResponse(key: string): Promise<AgentResponse | null> {
  try {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!supabaseUrl || !serviceRoleKey) return null;

    const now = new Date().toISOString();
    const url = `${supabaseUrl}/rest/v1/query_cache?select=response&key=eq.${key}&expires_at=gt.${encodeURIComponent(now)}&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ response: AgentResponse }>;
    return rows.length > 0 ? (rows[0]?.response ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Writes a non-error response to the cache asynchronously (fire-and-forget) and
 * returns it unchanged, so it can be used inline at any return site:
 *
 *   return cacheAsync(cacheKey, { kind: 'search_results', ... });
 *
 * Error responses are never cached — a transient failure should not be stored
 * and served as if it were a valid result on the next request.
 *
 * The underlying write is intentionally not awaited: callers get their response
 * immediately without paying the latency cost of the Supabase round-trip.
 *
 * Note: `waitUntil` extends the function lifetime on Vercel so the cache write
 * completes after the response is sent. Outside Vercel it is a no-op and the
 * promise runs (but is not awaited by the runtime).
 */
export function cacheAsync(key: string, response: AgentResponse): AgentResponse {
  if (response.kind !== 'error') waitUntil(setCachedResponse(key, response));
  return response;
}

/**
 * Writes a response to the cache.
 * Silently swallows all errors — cache is non-critical, flow must never fail because of it.
 */
export async function setCachedResponse(key: string, response: AgentResponse): Promise<void> {
  try {
    const supabaseUrl = process.env['SUPABASE_URL'];
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!supabaseUrl || !serviceRoleKey) return;

    const ttl = parseInt(process.env['CACHE_TTL_SECONDS'] ?? '', 10) || 86400;
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const res = await fetch(`${supabaseUrl}/rest/v1/query_cache`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key, response, expires_at: expiresAt }),
    });
    if (!res.ok) return;
  } catch {
    // fail open
  }
}
