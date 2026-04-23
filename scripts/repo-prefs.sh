#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

usage() {
    echo "Usage: repo-prefs.sh <command> [args...]"
    echo "Commands:"
    echo "  detect-repo                                Get repo_id for current directory (JSON)"
    echo "  get-pref <repo_id>                         Get preferences for repo (JSON)"
    echo "  set-enabled <repo_id> <repo_name> <0|1>    Enable/disable learning for repo"
    echo "  record-override <repo_id> <task> [area] [topics]  Record an override debt"
    echo "  get-debts <repo_id>                        Get pending catch-up debts (JSON)"
    echo "  catch-up <debt_id>                         Mark a debt as caught up"
    echo "  dismiss <debt_id>                          Dismiss a debt"
    echo "  touch-session <repo_id>                    Update last_session_at"
    exit 1
}

cmd_detect_repo() {
    local repo_id repo_name
    repo_id=$(git remote get-url origin 2>/dev/null || basename "$(pwd)")
    repo_name=$(basename "$(pwd)")
    printf '{"repo_id":"%s","repo_name":"%s"}\n' "$repo_id" "$repo_name"
}

cmd_get_pref() {
    local repo_id="$1"
    db_ensure_init
    local safe_id
    safe_id=$(db_safe_value "$repo_id")
    local result
    result=$(db_json_query "SELECT * FROM repo_preferences WHERE repo_id='$safe_id';")
    if [ "$result" = "[]" ]; then
        echo '{"exists":false}'
    else
        echo "$result" | jq '.[0] + {exists: true}'
    fi
}

cmd_set_enabled() {
    local repo_id="$1" repo_name="$2" enabled="$3"
    db_ensure_init
    local safe_id safe_name
    safe_id=$(db_safe_value "$repo_id")
    safe_name=$(db_safe_value "$repo_name")
    db_exec "INSERT INTO repo_preferences (repo_id, repo_name, learning_enabled)
             VALUES ('$safe_id', '$safe_name', $enabled)
             ON CONFLICT(repo_id) DO UPDATE SET
               learning_enabled = excluded.learning_enabled,
               last_session_at = datetime('now');"
}

cmd_record_override() {
    local repo_id="$1" task="$2" area="${3:-}" topics="${4:-}"
    db_ensure_init
    local safe_id safe_task safe_area safe_topics
    safe_id=$(db_safe_value "$repo_id")
    safe_task=$(db_safe_value "$task")
    safe_area=$(db_safe_value "$area")
    safe_topics=$(db_safe_value "$topics")
    local area_clause="NULL"
    [ -n "$area" ] && area_clause="'$safe_area'"
    local topics_clause="NULL"
    [ -n "$topics" ] && topics_clause="'$safe_topics'"
    db_exec "INSERT INTO override_debts (repo_id, task_description, area, topics_skipped)
             VALUES ('$safe_id', '$safe_task', $area_clause, $topics_clause);"
}

cmd_get_debts() {
    local repo_id="$1"
    db_ensure_init
    local safe_id
    safe_id=$(db_safe_value "$repo_id")
    db_json_query "SELECT * FROM override_debts WHERE repo_id='$safe_id' AND status='pending' ORDER BY created_at DESC;"
}

cmd_catch_up() {
    local debt_id="$1"
    db_ensure_init
    db_exec "UPDATE override_debts SET status='caught_up', caught_up_at=datetime('now') WHERE id=$debt_id;"
}

cmd_dismiss() {
    local debt_id="$1"
    db_ensure_init
    db_exec "UPDATE override_debts SET status='dismissed', caught_up_at=datetime('now') WHERE id=$debt_id;"
}

cmd_touch_session() {
    local repo_id="$1"
    db_ensure_init
    local safe_id
    safe_id=$(db_safe_value "$repo_id")
    db_exec "UPDATE repo_preferences SET last_session_at=datetime('now') WHERE repo_id='$safe_id';"
}

# --- Main dispatch ---
[ $# -ge 1 ] || usage
command="$1"
shift

case "$command" in
    detect-repo)     cmd_detect_repo ;;
    get-pref)        [ $# -ge 1 ] || usage; cmd_get_pref "$@" ;;
    set-enabled)     [ $# -ge 3 ] || usage; cmd_set_enabled "$@" ;;
    record-override) [ $# -ge 2 ] || usage; cmd_record_override "$@" ;;
    get-debts)       [ $# -ge 1 ] || usage; cmd_get_debts "$@" ;;
    catch-up)        [ $# -ge 1 ] || usage; cmd_catch_up "$@" ;;
    dismiss)         [ $# -ge 1 ] || usage; cmd_dismiss "$@" ;;
    touch-session)   [ $# -ge 1 ] || usage; cmd_touch_session "$@" ;;
    *) usage ;;
esac
