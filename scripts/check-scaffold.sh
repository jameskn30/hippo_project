#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

find "$root/scripts" -type f -name '*.sh' -exec bash -n {} \;
python3 -m json.tool "$root/plugins/claude-code/.claude-plugin/plugin.json" >/dev/null
python3 -m json.tool "$root/plugins/codex/.codex-plugin/plugin.json" >/dev/null
