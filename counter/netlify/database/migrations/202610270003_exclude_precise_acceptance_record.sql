-- PostgreSQL retained microseconds that the application's JavaScript Date
-- serialization omitted. Preserve migration 0002 and match the exact stored
-- timestamp observed during acceptance; never subtract from other traffic.
UPDATE profile_counter
SET count = count - 2, updated_at = CURRENT_TIMESTAMP
WHERE id = 'karmenloop'
  AND count = 2
  AND started_at = TIMESTAMPTZ '2026-10-27T08:01:49.028254Z';
