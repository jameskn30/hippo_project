-- Input: an open Hippo SQLite database.
-- Output: table definitions, followed by vault columns, indexes, and foreign keys.
-- All statements are read-only; SQLite's internal tables are omitted below.

SELECT name AS table_name, sql AS create_statement
FROM sqlite_schema
WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;

SELECT cid, name, type, "notnull" AS declared_not_null, dflt_value, pk
FROM pragma_table_info('vault')
ORDER BY cid;

SELECT name, "unique" AS is_unique, origin, partial
FROM pragma_index_list('vault')
ORDER BY name;

SELECT *
FROM pragma_foreign_key_list('vault');
