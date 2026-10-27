CREATE TABLE IF NOT EXISTS profile_counter (
  id text PRIMARY KEY CHECK (id = 'karmenloop'),
  count bigint NOT NULL CHECK (count >= 0),
  started_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
