CREATE TABLE IF NOT EXISTS github_traffic_sync (
  id text PRIMARY KEY CHECK (id = 'karmenloop'),
  observed_at timestamptz,
  completed_at timestamptz,
  repository_count integer NOT NULL CHECK (repository_count >= 0),
  last_attempt_at timestamptz NOT NULL,
  last_error text
);
CREATE TABLE IF NOT EXISTS github_repository_views (
  repository_id bigint NOT NULL CHECK (repository_id > 0),
  day date NOT NULL,
  count bigint NOT NULL CHECK (count >= 0),
  observed_at timestamptz NOT NULL,
  PRIMARY KEY (repository_id, day)
);
