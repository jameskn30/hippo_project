# Database migrations

Hippo uses [dbmate](https://github.com/amacneil/dbmate) to run SQLite migrations independently of Python. This directory contains SQL assets, with no Python runner. The core package build includes these files.

## Run migrations

Install Node.js 20.12+ and npm, then prepare the pinned dbmate package from the repository root:

```sh
node scripts/migrations/migrate.mjs install
```

Set `HIPPO_MIGRATION_DATABASE_URL` in the root `.env.migrations`, for example:

```dotenv
HIPPO_MIGRATION_DATABASE_URL="sqlite:/absolute/path/hippo.sqlite3"
MIGRATION_SRC_PATH="core/src/hippo/migrations"
```

The local file is Git-ignored. Its configured database is `/Users/nguyen/Library/Application Support/Hippo/hippo.sqlite3`; the parent directory was created, but the database was not. This is local migration configuration, not a hardcoded engine default. The tracked `.env.migrations.example` retains an empty URL for other checkouts. `MIGRATION_SRC_PATH` identifies the SQL source directory; it is separate from the destination database and the Obsidian documentation folder.

Preflight parses literal, single-line dotenv assignments without executing them. It rejects malformed assignments, mismatched quotes, and duplicate keys, then resolves each setting from an exported variable first and the file second. Empty overrides are errors. Use literal paths rather than variable expansion or multiline values. Dbmate receives the exact validated database URL and source path through command flags. The unrelated root `.env` is not loaded.

Run or report migrations directly, or use the equivalent Just wrapper:

```sh
node scripts/migrations/migrate.mjs check
node scripts/migrations/migrate.mjs report
node scripts/migrations/migrate.mjs run
just data-migrate check
just data-migrate report
just data-migrate run
```

`install` downloads/caches `dbmate@2.36.0` using npm and prints its version. Install/run/report use `npm exec --yes --package=dbmate@2.36.0 -- dbmate`, selecting the pinned npm package rather than a global dbmate on PATH. `check` uses only Node's built-in modules and does not need npm or network access. npm can fetch a missing package during run/report, so first use or a cleared cache may need network access. This adds no Python dependency or root npm project manifest.

One JavaScript ES module, `scripts/migrations/migrate.mjs`, owns arguments, preflight, and npm execution. Each named function documents its inputs and return value. The script can run from any working directory. For a different configuration file, use `node scripts/migrations/migrate.mjs run --env-file /path/to/.env.migrations`; a relative override path is resolved from the caller's directory. Relative SQL source paths and database URLs resolve from the repository root. npm receives arguments directly without a shell, with terminal output and exit codes forwarded. Help is available through `node scripts/migrations/migrate.mjs --help` without npm or database configuration.

Before `run` or `report` starts dbmate, preflight checks the env file, both required settings, the SQLite file URL, the writable/executable database parent, an existing target's regular-file/read/write access, and a readable SQL source directory containing readable numbered `.sql` files. Configuration failures print `Preflight failed:` with the affected setting/path and a corrective hint, then exit without opening or creating a database. `install` skips database preflight. To check configuration alone, run `node scripts/migrations/migrate.mjs check`; success prints the validated URL and source directory.

Supported database targets use `sqlite:` or `sqlite3:` without hosts, queries, fragments, memory targets, or `file:` URI paths. Decoded filenames containing `%`, `?`, or `#` are rejected to avoid SQLite driver URL ambiguities. Access checks do not guarantee a later database operation will succeed; runtime errors are still reported normally.

The parent database directory must exist. `run` creates the database when missing and applies pending migrations in order with `up --strict`. `report` uses `status` to show applied and pending files and their totals; pending work alone is not a command failure. Reporting applies no migrations, but SQLite can create an empty file when opening a missing database path. Use `check` for validation without database creation. `--no-dump-schema` avoids a generated schema dump. Quote paths containing spaces. Neither Python nor the Hippo engine is needed to run the script.

Dbmate records applied versions in `schema_migrations`; Hippo does not also track migrations with `PRAGMA user_version`. This is database bookkeeping, not a new vault or note identity. `VaultRepository` opens an existing database and never creates or upgrades tables. It must be used after migrations have succeeded. The vault CLI handlers remain unconnected to storage.

## Add a migration

Generate a new file from the repository root:

```sh
npm exec --yes --package=dbmate@2.36.0 -- dbmate --env-file /dev/null --migrations-dir core/src/hippo/migrations new add_note_table
```

Files use `<timestamp>_<description>.sql` and dbmate's format:

```sql
-- migrate:up
-- Forward schema changes and any required data backfill go here.

-- migrate:down
-- A reviewed reverse operation goes here, where one is appropriate.
```

Dbmate owns the transaction and records the version with the migration. Keep the default transactional mode; omit `BEGIN` and `COMMIT` from SQL files. Preserve IDs and references during backfills. Released migration files stay unchanged; corrections use a new file. Schema versions, note revisions, and processor versions serve different purposes.

The initial migration creates the existing `vault` table. Its down operation drops registrations and is intended for disposable development databases. No rollback Just recipe is provided. Prefer forward corrections for databases containing useful data.

## Current limits

- This increment initializes fresh databases. An existing vault table without dbmate history makes the initial `CREATE TABLE` fail rather than silently adopting its structure. Do not bypass this with `IF NOT EXISTS` or manually mark a migration applied without reviewing the schema and backing up the database. Dbmate can create its tracking table before that failure; it does not perform unknown-database detection without changes.
- Automatic backups, legacy-schema adoption, application schema-compatibility checks, serialized migration startup, and packaged engine startup integration are later work. Take a SQLite-aware backup before migrating an existing database, and run one migration command at a time while application writers are stopped. Dbmate's `up --strict` checks pending migration ordering; it does not reject a database simply because it contains versions absent from this checkout. Do not rely on dbmate to coordinate concurrent SQLite migration commands.
- The local migration URL is configured in `.env.migrations`; the engine's default database location remains undecided. Keep live databases and backups outside the Markdown vault, source tree, and cloud-sync directories.

## Manual verification

Use a disposable database outside the checkout and Markdown vault. On macOS, from the repository root:

```sh
hippo_migration_dir="$(mktemp -d /tmp/hippo-migrations.XXXXXX)"
export HIPPO_MIGRATION_DATABASE_URL="sqlite:$hippo_migration_dir/hippo.sqlite3"
node scripts/migrations/migrate.mjs install
node scripts/migrations/migrate.mjs report
node scripts/migrations/migrate.mjs run
sqlite3 "$hippo_migration_dir/hippo.sqlite3" '.schema vault'
sqlite3 "$hippo_migration_dir/hippo.sqlite3" 'SELECT version FROM schema_migrations;'
just data-migrate report
just data-migrate run
unset HIPPO_MIGRATION_DATABASE_URL
```

Expect one pending migration before running, the vault schema and version `20261017000100` afterwards, and no pending migrations on the repeated run. Keep the shell variable to inspect the disposable files afterwards. Also check an alternate env file from another working directory, paths containing spaces, malformed/duplicate assignments, missing/unreadable env files, empty values, an invalid scheme, an unwritable/missing database parent, a directory used as the database target, a missing SQL source or a directory without numbered migrations, and invalid exported overrides. Configuration failures should stop at preflight. Check unversioned vault tables and out-of-order migrations only on disposable copies. No automated tests are included.
