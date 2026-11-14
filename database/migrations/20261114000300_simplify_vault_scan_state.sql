-- migrate:up
ALTER TABLE vault RENAME COLUMN availability TO previous_availability;
ALTER TABLE vault RENAME COLUMN scan_status TO previous_scan_status;

ALTER TABLE vault ADD COLUMN availability TEXT NOT NULL DEFAULT 'not_ok'
    CHECK (availability IN ('ok', 'not_ok'));
ALTER TABLE vault ADD COLUMN scan_status TEXT NOT NULL DEFAULT 'not_ok'
    CHECK (scan_status IN ('ok', 'not_ok'));

UPDATE vault
SET availability = CASE WHEN previous_availability = 'available' THEN 'ok' ELSE 'not_ok' END,
    scan_status = CASE WHEN previous_scan_status = 'complete' THEN 'ok' ELSE 'not_ok' END;

ALTER TABLE vault DROP COLUMN previous_scan_status;
ALTER TABLE vault DROP COLUMN previous_availability;

-- migrate:down
-- Detailed former statuses cannot be reconstructed from binary values.
-- Conservatively map not_ok to unavailable/failed; preserve vaults and notes.
ALTER TABLE vault RENAME COLUMN availability TO previous_availability;
ALTER TABLE vault RENAME COLUMN scan_status TO previous_scan_status;

ALTER TABLE vault ADD COLUMN availability TEXT NOT NULL DEFAULT 'unknown'
    CHECK (availability IN ('unknown', 'available', 'unavailable'));
ALTER TABLE vault ADD COLUMN scan_status TEXT NOT NULL DEFAULT 'never_scanned'
    CHECK (scan_status IN ('never_scanned', 'scanning', 'complete', 'incomplete', 'failed'));

UPDATE vault
SET availability = CASE WHEN previous_availability = 'ok' THEN 'available' ELSE 'unavailable' END,
    scan_status = CASE WHEN previous_scan_status = 'ok' THEN 'complete' ELSE 'failed' END;

ALTER TABLE vault DROP COLUMN previous_scan_status;
ALTER TABLE vault DROP COLUMN previous_availability;
