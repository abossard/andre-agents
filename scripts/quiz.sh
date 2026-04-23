#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

# Auto-detect repo_id: git remote URL or folder name
_detect_repo_id() {
    git remote get-url origin 2>/dev/null || basename "$(pwd)"
}

usage() {
    echo "Usage: quiz.sh [--repo REPO_ID] <command> [args...]"
    echo "  If --repo is omitted, auto-detects from git remote or folder name."
    echo "Commands:"
    echo "  record <topic_id> <question> <answer> <correct:0|1> <feedback> <depth>"
    echo "  history <topic_id>            Quiz history for topic (JSON)"
    echo "  stats                         Overall quiz stats (JSON)"
    echo "  topic-stats <topic_id>        Stats for one topic (JSON)"
    exit 1
}

# Parse --repo flag
REPO_ID=""
if [ "${1:-}" = "--repo" ]; then
    REPO_ID="$2"
    shift 2
fi
[ -z "$REPO_ID" ] && REPO_ID=$(_detect_repo_id)

cmd_record() {
    local topic_id="$1" question="$2" answer="$3" correct="$4" feedback="$5" depth="$6"
    db_ensure_init
    local sq sa sf st safe_repo
    st=$(db_safe_value "$topic_id")
    sq=$(db_safe_value "$question")
    sa=$(db_safe_value "$answer")
    sf=$(db_safe_value "$feedback")
    safe_repo=$(db_safe_value "$REPO_ID")
    db_exec "INSERT INTO quiz_results (repo_id, topic_id, question, user_answer, correct, feedback, depth_level)
             VALUES ('$safe_repo', '$st', '$sq', '$sa', $correct, '$sf', $depth);"
}

cmd_history() {
    local topic_id="$1"
    db_ensure_init
    local safe_topic safe_repo
    safe_topic=$(db_safe_value "$topic_id")
    safe_repo=$(db_safe_value "$REPO_ID")
    db_json_query "SELECT * FROM quiz_results WHERE topic_id='$safe_topic' AND repo_id='$safe_repo' ORDER BY asked_at DESC;"
}

cmd_stats() {
    db_ensure_init
    local safe_repo
    safe_repo=$(db_safe_value "$REPO_ID")
    db_json_query "SELECT
        COUNT(*) as total,
        SUM(correct) as correct,
        ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)) as pct_correct,
        COUNT(DISTINCT topic_id) as topics_quizzed
    FROM quiz_results WHERE repo_id='$safe_repo';"
}

cmd_topic_stats() {
    local topic_id="$1"
    db_ensure_init
    local safe_topic safe_repo
    safe_topic=$(db_safe_value "$topic_id")
    safe_repo=$(db_safe_value "$REPO_ID")
    db_json_query "SELECT
        COUNT(*) as total,
        SUM(correct) as correct,
        ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)) as pct_correct,
        MAX(depth_level) as max_depth
    FROM quiz_results WHERE topic_id='$safe_topic' AND repo_id='$safe_repo';"
}

# --- Main dispatch ---
[ $# -ge 1 ] || usage
command="$1"
shift

case "$command" in
    record)      [ $# -ge 6 ] || usage; cmd_record "$@" ;;
    history)     [ $# -ge 1 ] || usage; cmd_history "$@" ;;
    stats)       cmd_stats ;;
    topic-stats) [ $# -ge 1 ] || usage; cmd_topic_stats "$@" ;;
    *) usage ;;
esac
