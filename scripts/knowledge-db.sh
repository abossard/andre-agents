#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

usage() {
    echo "Usage: knowledge-db.sh <command> [args...]"
    echo "Commands:"
    echo "  init                                          Initialize database"
    echo "  get-profile                                   Get full knowledge profile (JSON)"
    echo "  get-topic <topic_id>                          Get single topic (JSON)"
    echo "  upsert-topic <id> <domain> <title> <scope> <depth>  Create or update topic"
    echo "  update-topic-status <id> <status>             Update topic status"
    echo "  get-repo-knowledge <repo_path> [area]         Get repo familiarity (JSON)"
    echo "  update-repo-knowledge <repo> <area> <level>   Set repo area familiarity"
    exit 1
}

cmd_init() {
    db_init
    echo "initialized"
}

cmd_get_profile() {
    db_ensure_init
    local topics achievements repo_knowledge
    topics=$(db_json_query "SELECT * FROM knowledge_topics ORDER BY first_seen_at DESC;")
    achievements=$(db_json_query "SELECT * FROM achievements ORDER BY earned_at DESC;")
    repo_knowledge=$(db_json_query "SELECT * FROM repo_knowledge ORDER BY last_assessed_at DESC;")
    echo "{\"topics\":$topics,\"achievements\":$achievements,\"repo_knowledge\":$repo_knowledge}"
}

cmd_get_topic() {
    local topic_id="$1"
    db_ensure_init
    db_json_query "SELECT * FROM knowledge_topics WHERE id='$(db_safe_value "$topic_id")';"
}

cmd_upsert_topic() {
    local id="$1" domain="$2" title="$3" scope="$4" depth="$5"
    db_ensure_init
    local safe_id safe_domain safe_title safe_scope
    safe_id=$(db_safe_value "$id")
    safe_domain=$(db_safe_value "$domain")
    safe_title=$(db_safe_value "$title")
    safe_scope=$(db_safe_value "$scope")
    db_exec "INSERT INTO knowledge_topics (id, domain, title, scope, depth_level)
             VALUES ('$safe_id', '$safe_domain', '$safe_title', '$safe_scope', $depth)
             ON CONFLICT(id) DO UPDATE SET
               depth_level = MAX(knowledge_topics.depth_level, excluded.depth_level),
               domain = excluded.domain,
               title = excluded.title;"
}

cmd_update_topic_status() {
    local id="$1" status="$2"
    db_ensure_init
    local safe_id safe_status mastered_clause=""
    safe_id=$(db_safe_value "$id")
    safe_status=$(db_safe_value "$status")
    if [ "$status" = "mastered" ]; then
        mastered_clause=", mastered_at = datetime('now')"
    fi
    db_exec "UPDATE knowledge_topics SET status='$safe_status'$mastered_clause WHERE id='$safe_id';"
}

cmd_get_repo_knowledge() {
    local repo_path="$1"
    local area="${2:-}"
    db_ensure_init
    local safe_repo
    safe_repo=$(db_safe_value "$repo_path")
    if [ -n "$area" ]; then
        local safe_area
        safe_area=$(db_safe_value "$area")
        db_json_query "SELECT * FROM repo_knowledge WHERE repo_path='$safe_repo' AND area='$safe_area';"
    else
        db_json_query "SELECT * FROM repo_knowledge WHERE repo_path='$safe_repo';"
    fi
}

cmd_update_repo_knowledge() {
    local repo_path="$1" area="$2" familiarity="$3"
    db_ensure_init
    local safe_repo safe_area safe_fam
    safe_repo=$(db_safe_value "$repo_path")
    safe_area=$(db_safe_value "$area")
    safe_fam=$(db_safe_value "$familiarity")
    db_exec "INSERT INTO repo_knowledge (repo_path, area, familiarity)
             VALUES ('$safe_repo', '$safe_area', '$safe_fam')
             ON CONFLICT(repo_path, area) DO UPDATE SET
               familiarity = excluded.familiarity,
               last_assessed_at = datetime('now');"
}

# --- Main dispatch ---
[ $# -ge 1 ] || usage
command="$1"
shift

case "$command" in
    init)                cmd_init ;;
    get-profile)         cmd_get_profile ;;
    get-topic)           [ $# -ge 1 ] || usage; cmd_get_topic "$@" ;;
    upsert-topic)        [ $# -ge 5 ] || usage; cmd_upsert_topic "$@" ;;
    update-topic-status) [ $# -ge 2 ] || usage; cmd_update_topic_status "$@" ;;
    get-repo-knowledge)  [ $# -ge 1 ] || usage; cmd_get_repo_knowledge "$@" ;;
    update-repo-knowledge) [ $# -ge 3 ] || usage; cmd_update_repo_knowledge "$@" ;;
    *) usage ;;
esac
