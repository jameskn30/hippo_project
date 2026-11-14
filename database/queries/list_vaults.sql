-- Input: a Hippo database initialized with the vault migration.
-- Output: saved vault IDs, display names, and root paths in ID order.

select name from sqlite_schema where type = 'table' and name not like 'sqlite_%' order by name

select * from schema_migrations;

SELECT vault_id, display_name, root_path
FROM vault
ORDER BY vault_id;

select * from note limit 50

SELECT *
FROM note
WHERE deleted_at IS NULL
ORDER BY note_id;

SELECT *
FROM note
WHERE deleted_at IS NOT NULL
ORDER BY note_id;

select * from note_index;