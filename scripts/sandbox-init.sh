#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

sandbox="$root/sandbox"
vault="$sandbox/vault"
database_url="sqlite:$sandbox/hippo.sqlite3"

if [[ ! -d seed-md-data ]]; then
    printf 'Error: seed-md-data/ is missing.\n' >&2
    exit 1
fi

# Keep generated files inside this checkout, including SQLite companion files.
for path in "$sandbox" "$vault" "$sandbox/hippo.sqlite3" \
    "$sandbox/hippo.sqlite3-wal" "$sandbox/hippo.sqlite3-shm" \
    "$sandbox/hippo.sqlite3-journal"; do
    if [[ -L "$path" ]]; then
        printf 'Error: sandbox initialization refuses symbolic links: %s\n' "$path" >&2
        exit 1
    fi
done

mkdir -p "$sandbox"

if [[ ! -e .env.migrations && ! -L .env.migrations ]]; then
    # Noclobber also protects a configuration created by another process.
    (
        set -o noclobber
        printf 'HIPPO_MIGRATION_DATABASE_URL="%s"\nMIGRATION_SRC_PATH="database/migrations"\n' \
            "$database_url" > .env.migrations
    )
fi

# Reuse migration preflight rather than interpreting the env file in Bash.
configuration="$(node database/scripts/migrate.mjs check)"
configured_database="$(printf '%s\n' "$configuration" | sed -n 's/^Database URL: //p')"
configured_source="$(printf '%s\n' "$configuration" | sed -n 's/^SQL source: //p')"
if [[ "$configured_database" != "$database_url" || "$configured_source" != "$root/database/migrations" ]]; then
    printf 'Error: sandbox-init requires database %s and migrations %s.\n' \
        "$database_url" "$root/database/migrations" >&2
    printf 'Check .env.migrations and exported migration variables; configuration was preserved.\n' >&2
    exit 1
fi

# Pin the checked targets so this command can only migrate the sandbox database.
HIPPO_MIGRATION_DATABASE_URL="$database_url" \
    MIGRATION_SRC_PATH="$root/database/migrations" \
    node database/scripts/migrate.mjs run

mkdir -p "$vault"
copied=0
preserved=0
shopt -s nullglob
for source in "$root"/seed-md-data/*.md; do
    destination="$vault/${source##*/}"
    if [[ -e "$destination" || -L "$destination" ]]; then
        preserved=$((preserved + 1))
    else
        cp -n "$source" "$destination"
        copied=$((copied + 1))
    fi
done

printf '\nSandbox ready: %s\nVault: %s\nSeed files copied: %s; preserved: %s\n' \
    "$sandbox/hippo.sqlite3" "$vault" "$copied" "$preserved"
