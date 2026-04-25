#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

# Auto-detect repo_id: git remote URL or folder name
_detect_repo_id() {
    git remote get-url origin 2>/dev/null || basename "$(pwd)"
}

usage() {
    echo "Usage: achievements.sh [--repo REPO_ID] <command> [args...]"
    echo "  If --repo is omitted, auto-detects from git remote or folder name."
    echo "Commands:"
    echo "  award <id> <title> <description> [context]   Award achievement (idempotent)"
    echo "  list                                          List all achievements (JSON)"
    echo "  check <id>                                    Check if earned (true/false)"
    exit 1
}

# Parse --repo flag
REPO_ID=""
if [ "${1:-}" = "--repo" ]; then
    REPO_ID="$2"
    shift 2
fi
[ -z "$REPO_ID" ] && REPO_ID=$(_detect_repo_id)

cmd_award() {
    local id="$1" title="$2" description="$3" context="${4:-}"
    db_ensure_init
    local si st sd sc safe_repo
    si=$(db_safe_value "$id")
    st=$(db_safe_value "$title")
    sd=$(db_safe_value "$description")
    sc=$(db_safe_value "$context")
    safe_repo=$(db_safe_value "$REPO_ID")
    db_exec "INSERT OR IGNORE INTO achievements (id, repo_id, title, description, context)
             VALUES ('$si', '$safe_repo', '$st', '$sd', '$sc');"
}

cmd_list() {
    db_ensure_init
    local safe_repo
    safe_repo=$(db_safe_value "$REPO_ID")
    db_json_query "SELECT * FROM achievements WHERE repo_id='$safe_repo' OR repo_id='_global' ORDER BY earned_at DESC;"
}

cmd_check() {
    local id="$1"
    db_ensure_init
    local safe_id safe_repo
    safe_id=$(db_safe_value "$id")
    safe_repo=$(db_safe_value "$REPO_ID")
    local count
    count=$(db_query "SELECT COUNT(*) FROM achievements WHERE id='$safe_id' AND (repo_id='$safe_repo' OR repo_id='_global');")
    if [ "$count" -gt 0 ]; then
        echo "true"
    else
        echo "false"
    fi
}

# --- Main dispatch ---
[ $# -ge 1 ] || usage
command="$1"
shift

case "$command" in
    award) [ $# -ge 3 ] || usage; cmd_award "$@" ;;
    list)  cmd_list ;;
    check) [ $# -ge 1 ] || usage; cmd_check "$@" ;;
    *) usage ;;
esac
