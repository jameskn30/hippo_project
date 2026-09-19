#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

./scripts/doctor.sh

printf '\nScaffold only: app and core dependency manifests will be added with their first implementations.\n'
