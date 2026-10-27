ALTER TABLE github_traffic_sync
  ADD COLUMN IF NOT EXISTS repository_ids bigint[] NOT NULL DEFAULT '{}';
