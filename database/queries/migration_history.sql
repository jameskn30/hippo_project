-- Input: a Hippo database initialized by dbmate.
-- Output: applied migration versions, oldest first.

SELECT version
FROM schema_migrations
ORDER BY version;
