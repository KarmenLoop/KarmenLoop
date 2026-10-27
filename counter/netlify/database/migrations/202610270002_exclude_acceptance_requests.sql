-- The two prelaunch HEAD acceptance checks were normalized to GET by Netlify.
-- Exclude only that identified test record. Different traffic, a different
-- installation, or an already-corrected record is left untouched.
UPDATE profile_counter
SET count = count - 2, updated_at = CURRENT_TIMESTAMP
WHERE id = 'karmenloop'
  AND count = 2
  AND started_at = TIMESTAMPTZ '2026-10-27T08:01:49.028Z';
