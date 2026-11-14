-- migrate:up
ALTER TABLE note ADD COLUMN required_processor_version TEXT NOT NULL DEFAULT 'markdown-v1'
    CHECK (length(trim(required_processor_version)) > 0);
ALTER TABLE note ADD COLUMN last_error TEXT;

CREATE TABLE note_index (
    note_id INTEGER NOT NULL PRIMARY KEY REFERENCES note(note_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    frontmatter_json TEXT NOT NULL DEFAULT '{}' CHECK (
        CASE WHEN json_valid(frontmatter_json)
            THEN json_type(frontmatter_json) = 'object' ELSE 0 END
    ),
    tags_json TEXT NOT NULL DEFAULT '[]' CHECK (
        CASE WHEN json_valid(tags_json)
            THEN json_type(tags_json) = 'array' ELSE 0 END
    ),
    headings_json TEXT NOT NULL DEFAULT '[]' CHECK (
        CASE WHEN json_valid(headings_json)
            THEN json_type(headings_json) = 'array' ELSE 0 END
    ),
    links_json TEXT NOT NULL DEFAULT '[]' CHECK (
        CASE WHEN json_valid(links_json)
            THEN json_type(links_json) = 'array' ELSE 0 END
    ),
    searchable_text TEXT NOT NULL,
    indexed_revision INTEGER NOT NULL CHECK (
        typeof(indexed_revision) = 'integer' AND indexed_revision > 0
    ),
    processor_version TEXT NOT NULL CHECK (length(trim(processor_version)) > 0),
    indexed_at TEXT NOT NULL CHECK (length(indexed_at) > 0)
) WITHOUT ROWID;

-- migrate:down
-- Removes rebuildable indexes and processing metadata, preserving captured notes.
DROP TABLE note_index;
UPDATE note SET processing_status = 'pending' WHERE deleted_at IS NULL;
ALTER TABLE note DROP COLUMN last_error;
ALTER TABLE note DROP COLUMN required_processor_version;
