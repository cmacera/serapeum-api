CREATE TABLE IF NOT EXISTS query_cache (
  key         TEXT PRIMARY KEY,
  response    JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS query_cache_expires_at_idx ON query_cache (expires_at);
