-- migrate:up
ALTER TABLE vault ADD COLUMN availability TEXT NOT NULL DEFAULT 'unknown'
    CHECK (availability IN ('unknown', 'available', 'unavailable'));

ALTER TABLE vault ADD COLUMN scan_status TEXT NOT NULL DEFAULT 'never_scanned'
    CHECK (scan_status IN ('never_scanned', 'scanning', 'complete', 'incomplete', 'failed'));

ALTER TABLE vault ADD COLUMN last_successful_scan_at TEXT;
ALTER TABLE vault ADD COLUMN last_scan_error TEXT;

-- migrate:down
-- Removes recorded scan state while preserving vault registrations and notes.
ALTER TABLE vault DROP COLUMN last_scan_error;
ALTER TABLE vault DROP COLUMN last_successful_scan_at;
ALTER TABLE vault DROP COLUMN scan_status;
ALTER TABLE vault DROP COLUMN availability;
