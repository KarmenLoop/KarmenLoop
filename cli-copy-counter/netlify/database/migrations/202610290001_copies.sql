CREATE TABLE IF NOT EXISTS cli_download_copy_events (
  event_id uuid PRIMARY KEY,
  source text NOT NULL CHECK (source IN ('github', 'website')),
  recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
