#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

usage() {
    echo "Usage: achievements.sh <command> [args...]"
    echo "Commands:"
    echo "  award <id> <title> <description> [context]   Award achievement (idempotent)"
    echo "  list                                          List all achievements (JSON)"
    echo "  check <id>                                    Check if earned (true/false)"
    exit 1
}

cmd_award() {
    local id="$1" title="$2" description="$3" context="${4:-}"
    db_ensure_init
    local si st sd sc
    si=$(db_safe_value "$id")
    st=$(db_safe_value "$title")
    sd=$(db_safe_value "$description")
    sc=$(db_safe_value "$context")
    db_exec "INSERT OR IGNORE INTO achievements (id, title, description, context)
             VALUES ('$si', '$st', '$sd', '$sc');"
}

cmd_list() {
    db_ensure_init
    db_json_query "SELECT * FROM achievements ORDER BY earned_at DESC;"
}

cmd_check() {
    local id="$1"
    db_ensure_init
    local safe_id
    safe_id=$(db_safe_value "$id")
    local count
    count=$(db_query "SELECT COUNT(*) FROM achievements WHERE id='$safe_id';")
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
