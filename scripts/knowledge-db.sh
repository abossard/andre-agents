#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

# Auto-detect repo_id: git remote URL or folder name
_detect_repo_id() {
    git remote get-url origin 2>/dev/null || basename "$(pwd)"
}

usage() {
    echo "Usage: knowledge-db.sh [--repo REPO_ID] <command> [args...]"
    echo "  If --repo is omitted, auto-detects from git remote or folder name."
    echo "Commands:"
    echo "  init                                          Initialize database"
    echo "  get-profile                                   Get knowledge profile for repo (JSON)"
    echo "  get-topic <topic_id>                          Get single topic (JSON)"
    echo "  upsert-topic <id> <domain> <title> <scope> <depth>  Create or update topic"
    echo "  update-topic-status <id> <status>             Update topic status"
    echo "  get-repo-knowledge [area]                     Get repo familiarity (JSON)"
    echo "  update-repo-knowledge <area> <level>          Set repo area familiarity"
    echo "  get-mastery-level                             Get overall mastery level (1-3) for repo"
    exit 1
}

# Parse --repo flag
REPO_ID=""
if [ "${1:-}" = "--repo" ]; then
    REPO_ID="$2"
    shift 2
fi
[ -z "$REPO_ID" ] && REPO_ID=$(_detect_repo_id)

cmd_init() {
    db_init
    echo "initialized"
}

cmd_get_profile() {
    db_ensure_init
    local safe_repo
    safe_repo=$(db_safe_value "$REPO_ID")
    local topics achievements repo_knowledge debts
    topics=$(db_json_query "SELECT * FROM knowledge_topics WHERE repo_id='$safe_repo' OR repo_id='_global' ORDER BY first_seen_at DESC;")
    achievements=$(db_json_query "SELECT * FROM achievements WHERE repo_id='$safe_repo' OR repo_id='_global' ORDER BY earned_at DESC;")
    repo_knowledge=$(db_json_query "SELECT * FROM repo_knowledge WHERE repo_id='$safe_repo' ORDER BY last_assessed_at DESC;")
    debts=$(db_json_query "SELECT * FROM override_debts WHERE repo_id='$safe_repo' AND status='pending' ORDER BY created_at DESC;")
    echo "{\"repo_id\":\"$REPO_ID\",\"topics\":$topics,\"achievements\":$achievements,\"repo_knowledge\":$repo_knowledge,\"override_debts\":$debts}"
}

cmd_get_topic() {
    local topic_id="$1"
    db_ensure_init
    local safe_repo
    safe_repo=$(db_safe_value "$REPO_ID")
    db_json_query "SELECT * FROM knowledge_topics WHERE id='$(db_safe_value "$topic_id")' AND repo_id='$safe_repo';"
}

cmd_upsert_topic() {
    local id="$1" domain="$2" title="$3" scope="$4" depth="$5"
    db_ensure_init
    local safe_id safe_domain safe_title safe_scope safe_repo
    safe_id=$(db_safe_value "$id")
    safe_domain=$(db_safe_value "$domain")
    safe_title=$(db_safe_value "$title")
    safe_scope=$(db_safe_value "$scope")
    safe_repo=$(db_safe_value "$REPO_ID")
    db_exec "INSERT INTO knowledge_topics (id, repo_id, domain, title, scope, depth_level)
             VALUES ('$safe_id', '$safe_repo', '$safe_domain', '$safe_title', '$safe_scope', $depth)
             ON CONFLICT(id, repo_id) DO UPDATE SET
               depth_level = MAX(knowledge_topics.depth_level, excluded.depth_level),
               domain = excluded.domain,
               title = excluded.title;"
}

cmd_update_topic_status() {
    local id="$1" status="$2"
    db_ensure_init
    local safe_id safe_status safe_repo mastered_clause=""
    safe_id=$(db_safe_value "$id")
    safe_status=$(db_safe_value "$status")
    safe_repo=$(db_safe_value "$REPO_ID")
    if [ "$status" = "mastered" ]; then
        mastered_clause=", mastered_at = datetime('now')"
    fi
    db_exec "UPDATE knowledge_topics SET status='$safe_status'$mastered_clause WHERE id='$safe_id' AND repo_id='$safe_repo';"
}

cmd_get_repo_knowledge() {
    local area="${1:-}"
    db_ensure_init
    local safe_repo
    safe_repo=$(db_safe_value "$REPO_ID")
    if [ -n "$area" ]; then
        local safe_area
        safe_area=$(db_safe_value "$area")
        db_json_query "SELECT * FROM repo_knowledge WHERE repo_id='$safe_repo' AND area='$safe_area';"
    else
        db_json_query "SELECT * FROM repo_knowledge WHERE repo_id='$safe_repo';"
    fi
}

cmd_update_repo_knowledge() {
    local area="$1" familiarity="$2"
    db_ensure_init
    local safe_repo safe_area safe_fam
    safe_repo=$(db_safe_value "$REPO_ID")
    safe_area=$(db_safe_value "$area")
    safe_fam=$(db_safe_value "$familiarity")
    db_exec "INSERT INTO repo_knowledge (repo_id, area, familiarity)
             VALUES ('$safe_repo', '$safe_area', '$safe_fam')
             ON CONFLICT(repo_id, area) DO UPDATE SET
               familiarity = excluded.familiarity,
               last_assessed_at = datetime('now');"
}

cmd_get_mastery_level() {
    db_ensure_init
    local safe_repo
    safe_repo=$(db_safe_value "$REPO_ID")
    local total mastered
    total=$(db_query "SELECT COUNT(*) FROM knowledge_topics WHERE repo_id='$safe_repo';")
    mastered=$(db_query "SELECT COUNT(*) FROM knowledge_topics WHERE repo_id='$safe_repo' AND status='mastered';")
    local avg_depth
    avg_depth=$(db_query "SELECT COALESCE(ROUND(AVG(depth_level)), 1) FROM knowledge_topics WHERE repo_id='$safe_repo' AND status='mastered';")
    local quiz_pct
    quiz_pct=$(db_query "SELECT COALESCE(ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)), 0) FROM quiz_results WHERE repo_id='$safe_repo';")
    echo "{\"repo_id\":\"$REPO_ID\",\"total_topics\":$total,\"mastered\":$mastered,\"avg_depth\":$avg_depth,\"quiz_accuracy\":$quiz_pct}"
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
    get-repo-knowledge)  cmd_get_repo_knowledge "${@:-}" ;;
    update-repo-knowledge) [ $# -ge 2 ] || usage; cmd_update_repo_knowledge "$@" ;;
    get-mastery-level)   cmd_get_mastery_level ;;
    *) usage ;;
esac
