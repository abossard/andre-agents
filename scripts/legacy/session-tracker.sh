#!/usr/bin/env bash
# Learning session lifecycle + fatigue tracking.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

_detect_repo_id() {
    git remote get-url origin 2>/dev/null || basename "$(pwd)"
}

usage() {
    echo "Usage: session-tracker.sh [--repo REPO_ID] <command> [args...]"
    echo "Commands:"
    echo "  start                              Create new session, prints session_id"
    echo "  end <session_id>                   Close session, compute duration_minutes"
    echo "  get <session_id>                   Session info (JSON)"
    echo "  get-active                         Active session for this repo (JSON)"
    echo "  fatigue-check <session_id>         Fatigue score + break_suggested (JSON)"
    echo "  rate <session_id> <1-5>            Set self_rated_quality"
    echo "  add-note <session_id> <text>       Append to notes"
    echo "  suggest-break <session_id>         true/false"
    exit 1
}

REPO_ID=""
if [ "${1:-}" = "--repo" ]; then
    REPO_ID="$2"
    shift 2
fi
[ -z "$REPO_ID" ] && REPO_ID=$(_detect_repo_id)

_gen_id() {
    local ts rnd
    ts=$(date +%Y%m%d-%H%M%S)
    rnd=$(od -An -N4 -tx1 /dev/urandom 2>/dev/null | tr -d ' \n' || echo "$RANDOM$RANDOM")
    echo "sess-${ts}-${rnd}"
}

cmd_start() {
    db_ensure_init
    local sid sr
    sid=$(_gen_id)
    sr=$(db_safe_value "$REPO_ID")
    db_exec "INSERT INTO learning_sessions (id, repo_id, started_at)
             VALUES ('$(db_safe_value "$sid")', '$sr', datetime('now'));"
    echo "$sid"
}

cmd_end() {
    local sid="$1"
    db_ensure_init
    local ss
    ss=$(db_safe_value "$sid")
    db_exec "UPDATE learning_sessions
             SET ended_at = datetime('now'),
                 duration_minutes = CAST((julianday('now') - julianday(started_at)) * 24 * 60 AS INTEGER)
             WHERE id='$ss';"
    cmd_get "$sid"
}

cmd_get() {
    local sid="$1"
    db_ensure_init
    local ss
    ss=$(db_safe_value "$sid")
    db_json_query "SELECT * FROM learning_sessions WHERE id='$ss';"
}

cmd_get_active() {
    db_ensure_init
    local sr
    sr=$(db_safe_value "$REPO_ID")
    db_json_query "SELECT * FROM learning_sessions
                   WHERE repo_id='$sr' AND ended_at IS NULL
                   ORDER BY started_at DESC LIMIT 1;"
}

_active_minutes() {
    local sid="$1"
    db_query "SELECT CAST(
                (julianday(COALESCE(ended_at, datetime('now'))) - julianday(started_at)) * 24 * 60
                AS INTEGER)
              FROM learning_sessions WHERE id='$(db_safe_value "$sid")';"
}

cmd_fatigue_check() {
    local sid="$1"
    db_ensure_init
    local ss
    ss=$(db_safe_value "$sid")

    # last 5 quiz results in this session
    local total correct avg_rt
    total=$(db_query "SELECT COUNT(*) FROM (SELECT 1 FROM quiz_results
                      WHERE session_id='$ss' ORDER BY asked_at DESC LIMIT 5);")
    correct=$(db_query "SELECT COALESCE(SUM(correct),0) FROM (SELECT correct FROM quiz_results
                        WHERE session_id='$ss' ORDER BY asked_at DESC LIMIT 5);")
    avg_rt=$(db_query "SELECT COALESCE(ROUND(AVG(response_time_ms)),0) FROM (
                        SELECT response_time_ms FROM quiz_results
                        WHERE session_id='$ss' AND response_time_ms IS NOT NULL
                        ORDER BY asked_at DESC LIMIT 5);")
    [ -z "$total" ] && total=0
    [ -z "$correct" ] && correct=0
    [ -z "$avg_rt" ] && avg_rt=0

    local active
    active=$(_active_minutes "$sid")
    [ -z "$active" ] && active=0

    # Error rate (0..1); slow-response factor (rt > 30s considered slow, capped at 60s)
    local score
    score=$(awk -v t="$total" -v c="$correct" -v rt="$avg_rt" -v am="$active" 'BEGIN {
        err = (t>0) ? (t-c)/t : 0;
        rt_f = (rt>30000) ? ((rt-30000)/30000) : 0;
        if (rt_f>1) rt_f=1;
        time_f = (am>25) ? ((am-25)/25) : 0;
        if (time_f>1) time_f=1;
        s = 0.5*err + 0.3*rt_f + 0.2*time_f;
        if (s<0) s=0; if (s>1) s=1;
        printf "%.3f", s;
    }')

    local break_sug="false"
    awk -v s="$score" -v am="$active" 'BEGIN { exit !(s+0 > 0.6 || am+0 > 25) }' && break_sug="true"

    # persist fatigue_score
    db_exec "UPDATE learning_sessions SET fatigue_score=$score WHERE id='$ss';"

    echo "{\"session_id\":\"$sid\",\"fatigue_score\":$score,\"active_minutes\":$active,\"recent_quizzes\":$total,\"recent_correct\":$correct,\"avg_response_time_ms\":$avg_rt,\"break_suggested\":$break_sug}"
}

cmd_rate() {
    local sid="$1" rating="$2"
    case "$rating" in
        1|2|3|4|5) ;;
        *) echo "rating must be 1-5" >&2; exit 1 ;;
    esac
    db_ensure_init
    local ss
    ss=$(db_safe_value "$sid")
    db_exec "UPDATE learning_sessions SET self_rated_quality=$rating WHERE id='$ss';"
}

cmd_add_note() {
    local sid="$1" text="$2"
    db_ensure_init
    local ss sn
    ss=$(db_safe_value "$sid")
    sn=$(db_safe_value "$text")
    db_exec "UPDATE learning_sessions
             SET notes = CASE
                 WHEN notes IS NULL OR notes='' THEN '$sn'
                 ELSE notes || char(10) || '$sn'
             END
             WHERE id='$ss';"
}

cmd_suggest_break() {
    local sid="$1"
    local j
    j=$(cmd_fatigue_check "$sid")
    echo "$j" | grep -q '"break_suggested":true' && echo "true" || echo "false"
}

[ $# -ge 1 ] || usage
command="$1"
shift

case "$command" in
    start)          cmd_start ;;
    end)            [ $# -ge 1 ] || usage; cmd_end "$@" ;;
    get)            [ $# -ge 1 ] || usage; cmd_get "$@" ;;
    get-active)     cmd_get_active ;;
    fatigue-check)  [ $# -ge 1 ] || usage; cmd_fatigue_check "$@" ;;
    rate)           [ $# -ge 2 ] || usage; cmd_rate "$@" ;;
    add-note)       [ $# -ge 2 ] || usage; cmd_add_note "$@" ;;
    suggest-break)  [ $# -ge 1 ] || usage; cmd_suggest_break "$@" ;;
    *) usage ;;
esac
