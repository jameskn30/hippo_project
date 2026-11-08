-- migrate:up
CREATE TABLE vault (
    vault_id INTEGER PRIMARY KEY AUTOINCREMENT,
    root_path TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL
);

-- migrate:down
-- Development-only rollback: removes every vault registration.
DROP TABLE vault;
