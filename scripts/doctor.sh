#!/usr/bin/env bash
set -euo pipefail

tools=(git just bun uv cargo)
missing=0

for tool in "${tools[@]}"; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf 'available  %s\n' "$tool"
  else
    printf 'missing    %s\n' "$tool"
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  printf '\nInstall missing tools before building the desktop app and core sidecar.\n' >&2
  exit 1
fi
