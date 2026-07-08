#!/usr/bin/env bash
# Dispatch a task to the Antigravity CLI (agy) as a worker agent.
#
# Usage:
#   tools/agy-worker.sh "prompt text"          new conversation
#   tools/agy-worker.sh -f prompt.md           prompt read from a file
#   tools/agy-worker.sh -c "fix this: ..."     continue the previous conversation
#   tools/agy-worker.sh -m "Gemini 3.1 Pro (High)" "prompt"   override model
#
# Notes:
#   - agy print mode ignores the shell cwd: files must be referenced by
#     ABSOLUTE path in the prompt, and the project root is granted via --add-dir.
#   - Runs in accept-edits mode (writes files without prompting) but NOT
#     --dangerously-skip-permissions.
#   - Full transcript of each run is appended to tools/agy-worker.log.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODEL="Gemini 3.5 Flash (High)"
CONTINUE=()
PROMPT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c) CONTINUE=(--continue); shift ;;
    -m) MODEL="$2"; shift 2 ;;
    -f) PROMPT="$(cat "$2")"; shift 2 ;;
    *)  PROMPT="$1"; shift ;;
  esac
done

if [[ -z "$PROMPT" ]]; then
  echo "error: no prompt given" >&2
  exit 2
fi

LOG="$PROJECT_ROOT/tools/agy-worker.log"
{
  echo "=== $(date -Is) model=$MODEL continue=${#CONTINUE[@]} ==="
  echo "--- prompt ---"
  echo "$PROMPT"
  echo "--- response ---"
} >> "$LOG"

agy -p "$PROMPT" \
  --model "$MODEL" \
  --mode accept-edits \
  --add-dir "$PROJECT_ROOT" \
  --print-timeout 15m \
  "${CONTINUE[@]}" | tee -a "$LOG"
