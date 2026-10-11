#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

./scripts/doctor.sh

printf '\nDevelopment tools checked. Install dependencies with:\n  just app-setup\n  just core-setup\n\nShow core CLI help with: just core-help\n'
