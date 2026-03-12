#!/usr/bin/env bash
set -euo pipefail

# Recreate a fresh branch from an upstream base and cherry-pick selected commits.
# Useful when a platform rejects updates to branches created outside Codex.
#
# Usage:
#   ./.zscripts/recover-codex-branch.sh \
#     --base origin/main \
#     --new-branch codex/hardening-fix \
#     --commits "<sha1> <sha2> ..."
#
# Example:
#   ./.zscripts/recover-codex-branch.sh --base origin/main --new-branch codex/tenant-hardening --commits "abc1234 def5678"

BASE_REF=""
NEW_BRANCH=""
COMMITS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_REF="$2"
      shift 2
      ;;
    --new-branch)
      NEW_BRANCH="$2"
      shift 2
      ;;
    --commits)
      COMMITS="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$BASE_REF" || -z "$NEW_BRANCH" || -z "$COMMITS" ]]; then
  echo "Missing required arguments." >&2
  echo "Usage: $0 --base <ref> --new-branch <name> --commits \"<sha1> <sha2>...\"" >&2
  exit 1
fi

echo "[1/5] Fetching remotes..."
git fetch --all --prune

echo "[2/5] Creating fresh branch '$NEW_BRANCH' from '$BASE_REF'..."
git checkout -B "$NEW_BRANCH" "$BASE_REF"

echo "[3/5] Cherry-picking commits: $COMMITS"
for sha in $COMMITS; do
  git cherry-pick "$sha"
done

echo "[4/5] Verifying history..."
git --no-pager log --oneline -n 10

echo "[5/5] Done. Push with:"
echo "    git push -u origin $NEW_BRANCH"
