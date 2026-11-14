-- migrate:up
-- Replace the version column to change its default without rebuilding note IDs
-- or foreign keys. Other processor targets are preserved.
ALTER TABLE note ADD COLUMN next_processor_version TEXT NOT NULL DEFAULT 'markdown-v2'
    CHECK (length(trim(next_processor_version)) > 0);
UPDATE note
SET next_processor_version = CASE
        WHEN required_processor_version = 'markdown-v1' THEN 'markdown-v2'
        ELSE required_processor_version END,
    processing_status = CASE
        WHEN required_processor_version = 'markdown-v1' AND deleted_at IS NULL
            THEN 'pending' ELSE processing_status END,
    last_error = CASE
        WHEN required_processor_version = 'markdown-v1' AND deleted_at IS NULL
            THEN NULL ELSE last_error END;
ALTER TABLE note DROP COLUMN required_processor_version;
ALTER TABLE note RENAME COLUMN next_processor_version TO required_processor_version;

-- migrate:down
-- Restore the previous default/target and require affected active notes to be
-- reparsed by the matching older processor. Captured content is preserved.
ALTER TABLE note ADD COLUMN next_processor_version TEXT NOT NULL DEFAULT 'markdown-v1'
    CHECK (length(trim(next_processor_version)) > 0);
UPDATE note
SET next_processor_version = CASE
        WHEN required_processor_version = 'markdown-v2' THEN 'markdown-v1'
        ELSE required_processor_version END,
    processing_status = CASE
        WHEN required_processor_version = 'markdown-v2' AND deleted_at IS NULL
            THEN 'pending' ELSE processing_status END,
    last_error = CASE
        WHEN required_processor_version = 'markdown-v2' AND deleted_at IS NULL
            THEN NULL ELSE last_error END;
ALTER TABLE note DROP COLUMN required_processor_version;
ALTER TABLE note RENAME COLUMN next_processor_version TO required_processor_version;
