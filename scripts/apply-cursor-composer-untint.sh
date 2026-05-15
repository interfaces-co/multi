#!/usr/bin/env bash
set -euo pipefail

readonly CURSOR_CSS="/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css"
readonly PATCH="$(cd "$(dirname "$0")" && pwd)/cursor-composer-untint-overrides.css"
readonly MARKER="CURSOR_COMPOSER_UNTINT_V1"

if [[ ! -f "$CURSOR_CSS" ]]; then
  echo "error: workbench CSS not found at $CURSOR_CSS" >&2
  exit 1
fi

if [[ ! -f "$PATCH" ]]; then
  echo "error: patch file not found at $PATCH" >&2
  exit 1
fi

if grep -q "$MARKER" "$CURSOR_CSS"; then
  echo "Overrides already present in $CURSOR_CSS (marker $MARKER). Remove the appended block to re-apply." >&2
  exit 0
fi

backup="${CURSOR_CSS}.bak.$(date +%Y%m%d%H%M%S)"
cp "$CURSOR_CSS" "$backup"
printf '\n' >> "$CURSOR_CSS"
cat "$PATCH" >> "$CURSOR_CSS"
echo "Appended $(basename "$PATCH") to Cursor workbench CSS."
echo "Backup: $backup"
