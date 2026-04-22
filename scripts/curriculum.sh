#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

usage() {
    echo "Usage: curriculum.sh <command> [args...]"
    echo "Commands:"
    echo "  create <task_id> <repo_path> <description> <modules_json>"
    echo "  get-state <task_id>                   Full curriculum state (JSON)"
    echo "  get-current <task_id>                  Current module (JSON)"
    echo "  advance <task_id>                      Move to next module"
    echo "  set-module-status <task_id> <index> <status> [reason]"
    echo "  complete <task_id>                     Mark curriculum done"
    echo "  abandon <task_id>                      Abandon curriculum"
    exit 1
}

cmd_create() {
    local task_id="$1" repo_path="$2" description="$3" modules_json="$4"
    db_ensure_init
    local safe_task safe_repo safe_desc
    safe_task=$(db_safe_value "$task_id")
    safe_repo=$(db_safe_value "$repo_path")
    safe_desc=$(db_safe_value "$description")
    db_exec "INSERT INTO curricula (task_id, repo_path, task_description)
             VALUES ('$safe_task', '$safe_repo', '$safe_desc');"

    # Parse JSON modules and insert each
    local count
    count=$(echo "$modules_json" | jq 'length')
    for ((i=0; i<count; i++)); do
        local mid mtitle mtopic
        mid=$(echo "$modules_json" | jq -r ".[$i].module_id")
        mtitle=$(echo "$modules_json" | jq -r ".[$i].title")
        mtopic=$(echo "$modules_json" | jq -r ".[$i].topic_id // empty")
        local safe_mid safe_mtitle safe_mtopic
        safe_mid=$(db_safe_value "$mid")
        safe_mtitle=$(db_safe_value "$mtitle")
        safe_mtopic=$(db_safe_value "${mtopic:-}")
        local topic_clause="NULL"
        [ -n "$mtopic" ] && topic_clause="'$safe_mtopic'"
        db_exec "INSERT INTO curriculum_modules (task_id, module_index, module_id, title, topic_id)
                 VALUES ('$safe_task', $i, '$safe_mid', '$safe_mtitle', $topic_clause);"
    done
}

cmd_get_state() {
    local task_id="$1"
    db_ensure_init
    local safe_task
    safe_task=$(db_safe_value "$task_id")
    local curriculum modules
    curriculum=$(db_json_query "SELECT * FROM curricula WHERE task_id='$safe_task';")
    modules=$(db_json_query "SELECT * FROM curriculum_modules WHERE task_id='$safe_task' ORDER BY module_index;")
    local status current_idx
    status=$(echo "$curriculum" | jq -r '.[0].status // "unknown"')
    current_idx=$(echo "$curriculum" | jq -r '.[0].current_module_index // 0')
    echo "{\"task_id\":\"$task_id\",\"status\":\"$status\",\"current_module_index\":$current_idx,\"modules\":$modules}"
}

cmd_get_current() {
    local task_id="$1"
    db_ensure_init
    local safe_task
    safe_task=$(db_safe_value "$task_id")
    local idx
    idx=$(db_query "SELECT current_module_index FROM curricula WHERE task_id='$safe_task';")
    db_json_query "SELECT * FROM curriculum_modules WHERE task_id='$safe_task' AND module_index=$idx;" | jq '.[0]'
}

cmd_advance() {
    local task_id="$1"
    db_ensure_init
    local safe_task
    safe_task=$(db_safe_value "$task_id")
    db_exec "UPDATE curricula SET current_module_index = current_module_index + 1 WHERE task_id='$safe_task';"
}

cmd_set_module_status() {
    local task_id="$1" index="$2" status="$3" reason="${4:-}"
    db_ensure_init
    local safe_task safe_status
    safe_task=$(db_safe_value "$task_id")
    safe_status=$(db_safe_value "$status")
    local reason_clause="NULL"
    if [ -n "$reason" ]; then
        local safe_reason
        safe_reason=$(db_safe_value "$reason")
        reason_clause="'$safe_reason'"
    fi
    local time_clause=""
    case "$status" in
        active)    time_clause=", started_at = datetime('now')" ;;
        completed) time_clause=", completed_at = datetime('now')" ;;
        skipped)   time_clause=", completed_at = datetime('now')" ;;
    esac
    db_exec "UPDATE curriculum_modules
             SET status='$safe_status', skipped_reason=$reason_clause$time_clause
             WHERE task_id='$safe_task' AND module_index=$index;"
}

cmd_complete() {
    local task_id="$1"
    db_ensure_init
    local safe_task
    safe_task=$(db_safe_value "$task_id")
    db_exec "UPDATE curricula SET status='completed', completed_at=datetime('now') WHERE task_id='$safe_task';"
}

cmd_abandon() {
    local task_id="$1"
    db_ensure_init
    local safe_task
    safe_task=$(db_safe_value "$task_id")
    db_exec "UPDATE curricula SET status='abandoned', completed_at=datetime('now') WHERE task_id='$safe_task';"
}

# --- Main dispatch ---
[ $# -ge 1 ] || usage
command="$1"
shift

case "$command" in
    create)            [ $# -ge 4 ] || usage; cmd_create "$@" ;;
    get-state)         [ $# -ge 1 ] || usage; cmd_get_state "$@" ;;
    get-current)       [ $# -ge 1 ] || usage; cmd_get_current "$@" ;;
    advance)           [ $# -ge 1 ] || usage; cmd_advance "$@" ;;
    set-module-status) [ $# -ge 3 ] || usage; cmd_set_module_status "$@" ;;
    complete)          [ $# -ge 1 ] || usage; cmd_complete "$@" ;;
    abandon)           [ $# -ge 1 ] || usage; cmd_abandon "$@" ;;
    *) usage ;;
esac
