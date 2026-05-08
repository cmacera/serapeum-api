export type HealthResult = { ok: true } | { ok: false; error: string };

/**
 * Pings Supabase Postgres via REST to keep the project active on the free tier
 * (Supabase pauses projects after 7 days without database activity — Auth hits
 * do not count). Used by the GET /health endpoint and the Vercel cron job.
 */
export async function checkSupabaseHealth(): Promise<HealthResult> {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: 'supabase_not_configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `${supabaseUrl}/rest/v1/query_cache?select=key&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: `supabase_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'supabase_timeout' };
    }
    return { ok: false, error: 'supabase_unreachable' };
  } finally {
    clearTimeout(timeout);
  }
}
