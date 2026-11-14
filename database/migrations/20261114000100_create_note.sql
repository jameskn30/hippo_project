-- migrate:up
CREATE TABLE note (
    note_id INTEGER PRIMARY KEY AUTOINCREMENT,
    vault_id INTEGER NOT NULL REFERENCES vault(vault_id) ON DELETE RESTRICT,
    relative_path TEXT NOT NULL CHECK (
        length(relative_path) > 0
        AND instr(relative_path, char(0)) = 0
        AND instr(relative_path, char(92)) = 0
        AND relative_path NOT LIKE '/%'
        AND relative_path NOT LIKE '%/'
        AND instr(relative_path, '//') = 0
        AND instr('/' || relative_path || '/', '/./') = 0
        AND instr('/' || relative_path || '/', '/../') = 0
    ),
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL CHECK (
        length(content_hash) = 64
        AND content_hash NOT GLOB '*[^0-9a-f]*'
    ),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (
        typeof(revision) = 'integer' AND revision > 0
    ),
    deleted_at TEXT CHECK (deleted_at IS NULL OR length(deleted_at) > 0),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'ready', 'failed')
    )
);

CREATE UNIQUE INDEX note_active_path
ON note (vault_id, relative_path)
WHERE deleted_at IS NULL;

-- migrate:down
-- Destructive development-only rollback: removes all captured notes.
DROP TABLE note;
