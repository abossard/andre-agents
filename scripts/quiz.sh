#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

usage() {
    echo "Usage: quiz.sh <command> [args...]"
    echo "Commands:"
    echo "  record <topic_id> <question> <answer> <correct:0|1> <feedback> <depth>"
    echo "  history <topic_id>            Quiz history for topic (JSON)"
    echo "  stats                         Overall quiz stats (JSON)"
    echo "  topic-stats <topic_id>        Stats for one topic (JSON)"
    exit 1
}

cmd_record() {
    local topic_id="$1" question="$2" answer="$3" correct="$4" feedback="$5" depth="$6"
    db_ensure_init
    local sq sa sf st
    st=$(db_safe_value "$topic_id")
    sq=$(db_safe_value "$question")
    sa=$(db_safe_value "$answer")
    sf=$(db_safe_value "$feedback")
    db_exec "INSERT INTO quiz_results (topic_id, question, user_answer, correct, feedback, depth_level)
             VALUES ('$st', '$sq', '$sa', $correct, '$sf', $depth);"
}

cmd_history() {
    local topic_id="$1"
    db_ensure_init
    local safe_topic
    safe_topic=$(db_safe_value "$topic_id")
    db_json_query "SELECT * FROM quiz_results WHERE topic_id='$safe_topic' ORDER BY asked_at DESC;"
}

cmd_stats() {
    db_ensure_init
    db_json_query "SELECT
        COUNT(*) as total,
        SUM(correct) as correct,
        ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)) as pct_correct,
        COUNT(DISTINCT topic_id) as topics_quizzed
    FROM quiz_results;"
}

cmd_topic_stats() {
    local topic_id="$1"
    db_ensure_init
    local safe_topic
    safe_topic=$(db_safe_value "$topic_id")
    db_json_query "SELECT
        COUNT(*) as total,
        SUM(correct) as correct,
        ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)) as pct_correct,
        MAX(depth_level) as max_depth
    FROM quiz_results WHERE topic_id='$safe_topic';"
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
