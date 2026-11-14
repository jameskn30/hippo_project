-- migrate:up
-- Update the default and existing v2 targets together. Rebuild affected active
-- indexes using compact headings; preserve other processor targets and source.
ALTER TABLE note ADD COLUMN next_processor_version TEXT NOT NULL DEFAULT 'markdown-v3'
    CHECK (length(trim(next_processor_version)) > 0);
UPDATE note
SET next_processor_version = CASE
        WHEN required_processor_version = 'markdown-v2' THEN 'markdown-v3'
        ELSE required_processor_version END,
    processing_status = CASE
        WHEN required_processor_version = 'markdown-v2' AND deleted_at IS NULL
            THEN 'pending' ELSE processing_status END,
    last_error = CASE
        WHEN required_processor_version = 'markdown-v2' AND deleted_at IS NULL
            THEN NULL ELSE last_error END;
ALTER TABLE note DROP COLUMN required_processor_version;
ALTER TABLE note RENAME COLUMN next_processor_version TO required_processor_version;

-- migrate:down
-- Restore the prior default/target. Affected active notes need reparsing with
-- the older processor to recover heading positions from their captured source.
ALTER TABLE note ADD COLUMN next_processor_version TEXT NOT NULL DEFAULT 'markdown-v2'
    CHECK (length(trim(next_processor_version)) > 0);
UPDATE note
SET next_processor_version = CASE
        WHEN required_processor_version = 'markdown-v3' THEN 'markdown-v2'
        ELSE required_processor_version END,
    processing_status = CASE
        WHEN required_processor_version = 'markdown-v3' AND deleted_at IS NULL
            THEN 'pending' ELSE processing_status END,
    last_error = CASE
        WHEN required_processor_version = 'markdown-v3' AND deleted_at IS NULL
            THEN NULL ELSE last_error END;
ALTER TABLE note DROP COLUMN required_processor_version;
ALTER TABLE note RENAME COLUMN next_processor_version TO required_processor_version;
