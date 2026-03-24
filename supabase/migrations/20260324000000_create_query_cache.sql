CREATE TABLE IF NOT EXISTS query_cache (
  key         TEXT PRIMARY KEY,
  response    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS query_cache_expires_at_idx ON query_cache (expires_at);

-- Restrict access: only the service role (used by the API) may read/write this table.
-- anon and authenticated roles have no business accessing cache internals.
REVOKE ALL ON TABLE query_cache FROM anon, authenticated;

-- Cleanup helper: removes all expired rows.
-- Call periodically via a Supabase Edge Function cron or pg_cron if available.
CREATE OR REPLACE FUNCTION purge_expired_query_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM query_cache WHERE expires_at < now();
$$;
