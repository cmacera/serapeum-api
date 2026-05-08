import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkSupabaseHealth } from '@/lib/health.js';

const SUPABASE_URL = 'https://test.supabase.co';
const SERVICE_ROLE_KEY = 'service-role-key-test';

describe('checkSupabaseHealth', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env['SUPABASE_URL'] = SUPABASE_URL;
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns supabase_not_configured when SUPABASE_URL is not set', async () => {
    delete process.env['SUPABASE_URL'];
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await checkSupabaseHealth();

    expect(result).toEqual({ ok: false, error: 'supabase_not_configured' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns supabase_not_configured when SUPABASE_SERVICE_ROLE_KEY is not set', async () => {
    delete process.env['SUPABASE_SERVICE_ROLE_KEY'];
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await checkSupabaseHealth();

    expect(result).toEqual({ ok: false, error: 'supabase_not_configured' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns supabase_unreachable when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const result = await checkSupabaseHealth();

    expect(result).toEqual({ ok: false, error: 'supabase_unreachable' });
  });

  it('returns supabase_<status> when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response));

    const result = await checkSupabaseHealth();

    expect(result).toEqual({ ok: false, error: 'supabase_503' });
  });

  it('returns ok on a successful Supabase response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));

    const result = await checkSupabaseHealth();

    expect(result).toEqual({ ok: true });
  });

  it('queries query_cache with select=key&limit=1 and Supabase auth headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal('fetch', mockFetch);

    await checkSupabaseHealth();

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${SUPABASE_URL}/rest/v1/query_cache?select=key&limit=1`);
    const headers = options.headers as Record<string, string>;
    expect(headers['apikey']).toBe(SERVICE_ROLE_KEY);
    expect(headers['Authorization']).toBe(`Bearer ${SERVICE_ROLE_KEY}`);
  });
});
