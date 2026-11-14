-- migrate:up
-- Keep text in note_index; FTS5 stores rebuildable search data keyed by note_id.
-- Source: https://www.sqlite.org/fts5.html#external_content_tables
-- Search callers must also filter Note lifecycle, vault, revision, and version.
CREATE VIRTUAL TABLE note_search USING fts5(
    title,
    searchable_text,
    content = 'note_index',
    content_rowid = 'note_id',
    tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER note_index_search_insert AFTER INSERT ON note_index BEGIN
    INSERT INTO note_search (rowid, title, searchable_text)
    VALUES (new.note_id, new.title, new.searchable_text);
END;

CREATE TRIGGER note_index_search_update AFTER UPDATE ON note_index BEGIN
    INSERT INTO note_search (note_search, rowid, title, searchable_text)
    VALUES ('delete', old.note_id, old.title, old.searchable_text);
    INSERT INTO note_search (rowid, title, searchable_text)
    VALUES (new.note_id, new.title, new.searchable_text);
END;

CREATE TRIGGER note_index_search_delete AFTER DELETE ON note_index BEGIN
    INSERT INTO note_search (note_search, rowid, title, searchable_text)
    VALUES ('delete', old.note_id, old.title, old.searchable_text);
END;

-- Triggers cover future writes; rebuild also includes already stored indexes.
INSERT INTO note_search (note_search) VALUES ('rebuild');

-- migrate:down
-- Remove only search acceleration, preserving captured notes and parsed indexes.
DROP TRIGGER note_index_search_insert;
DROP TRIGGER note_index_search_update;
DROP TRIGGER note_index_search_delete;
DROP TABLE note_search;
