# Hippo database tools

Keep database tooling outside the Python package:

```text
database/
├── README.md
├── migrations/       # Versioned schema changes applied by dbmate
│   ├── README.md
│   └── 20261017000100_create_vault.sql
├── queries/          # Reusable read-only SQL
│   ├── inspect_schema.sql
│   ├── list_vaults.sql
│   └── migration_history.sql
└── scripts/          # Executable database utilities
    └── migrate.mjs
```

The live SQLite file belongs in local application data outside this directory. The Python repository opens that file; migrations and queries are repository assets and are not included in the Python wheel.

Agents can use the shared [hippo-database skill](../skills/hippo-database/SKILL.md): `$hippo-database` in Codex or `/hippo-database` in Claude Code.

## Migrations

Configure the database URL and SQL source directory in the root `.env.migrations`, using `.env.migrations.example` as a template:

```dotenv
HIPPO_MIGRATION_DATABASE_URL="sqlite:/absolute/path/hippo.sqlite3"
MIGRATION_SRC_PATH="database/migrations"
```

From the repository root, with Node.js 20.12+ and npm installed:

```sh
just data-migrate install  # Prepare pinned dbmate
just data-migrate check    # Validate configuration without opening SQLite
just data-migrate run      # Apply pending migrations
just data-migrate report   # Show migration status
```

Direct invocation is `node database/scripts/migrate.mjs <action>`. See [migration details](migrations/README.md) for configuration, migration creation, and failure handling. Preserve applied filenames and SQL; corrections belong in a new migration.

## Query the database

Each file in `queries/` contains ordinary read-only SQL:

| File | Output |
| --- | --- |
| [inspect_schema.sql](queries/inspect_schema.sql) | Table definitions, vault columns, indexes, and foreign keys |
| [list_vaults.sql](queries/list_vaults.sql) | Registered vaults in ID order |
| [migration_history.sql](queries/migration_history.sql) | Applied dbmate migration versions |

In SQLite3 Editor for VS Code, open the database, click **Query Editor**, and paste the SQL below its generated database-link comment. Run one statement with **Shift+Enter**.

Alternatively, use the SQLite CLI from the repository root. Set the file path to match the configured database URL, without the `sqlite:` prefix:

```sh
hippo_database_path="/absolute/path/hippo.sqlite3"
sqlite3 -readonly -header -column "$hippo_database_path" < database/queries/inspect_schema.sql
sqlite3 -readonly -header -column "$hippo_database_path" < database/queries/list_vaults.sql
sqlite3 -readonly -header -column "$hippo_database_path" < database/queries/migration_history.sql
```

`-readonly` prevents writes and fails if the database does not exist. An empty vault list is valid. A missing `vault` or `schema_migrations` table means the selected database has not been initialized with the expected migrations. Query results may contain local note or vault information; keep exported results out of Git.
