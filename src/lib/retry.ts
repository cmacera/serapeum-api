import axios from 'axios';
import { GenkitError } from '@genkit-ai/core';

const RETRYABLE_NETWORK_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED']);

/**
 * Thrown by fetch-based tools when they receive a retryable HTTP status (429, 503)
 * before the outer catch block converts it to a plain Error.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Returns true if the error represents a transient failure worth retrying:
 * - HTTP 429 (rate limit) or 503 (service unavailable)
 * - Network connectivity errors (ECONNRESET, ETIMEDOUT, ENOTFOUND, ECONNREFUSED)
 *
 * Never retries on 401, 403, 404 or other definitive failures.
 */
export function isRetryable(error: unknown): boolean {
  // Axios HTTP errors (raw, before catch conversion)
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status !== undefined) return status === 429 || status === 503;
    // Network error: request was sent but no response received
    return error.request !== undefined && error.response === undefined;
  }

  // GenkitError (used by get-media-detail-tool)
  if (error instanceof GenkitError) {
    return error.status === 'RESOURCE_EXHAUSTED' || error.status === 'UNAVAILABLE';
  }

  // HttpError (used by fetch-based tools)
  if (error instanceof HttpError) {
    return error.status === 429 || error.status === 503;
  }

  // Generic object errors: covers Tavily SDK errors (.status) and Node.js network errors (.code)
  if (error !== null && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const code = typeof e['code'] === 'string' ? e['code'] : undefined;
    if (code !== undefined && RETRYABLE_NETWORK_CODES.has(code)) return true;
    const responseStatus =
      typeof e['status'] === 'number'
        ? e['status']
        : typeof (e['response'] as Record<string, unknown> | undefined)?.['status'] === 'number'
          ? ((e['response'] as Record<string, unknown>)['status'] as number)
          : undefined;
    if (responseStatus === 429 || responseStatus === 503) return true;
  }

  return false;
}

/**
 * Retries an async function up to `maxAttempts` times with exponential backoff.
 * Only retries on transient failures detected by `isRetryable`.
 *
 * Backoff: attempt 1 → 200ms, attempt 2 → 400ms (2^(attempt-1) * 200ms)
 */
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts || !isRetryable(error)) {
        throw error;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 2 ** (attempt - 1) * 200));
    }
  }
  // Unreachable, but TypeScript requires a return path
  throw new Error('Unexpected exit from retry loop');
}
