#!/usr/bin/env bash
# SM-2 spaced repetition scheduler for learning-first plugin.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/db-helper.sh"

_detect_repo_id() {
    git remote get-url origin 2>/dev/null || basename "$(pwd)"
}

usage() {
    echo "Usage: review-scheduler.sh [--repo REPO_ID] <command> [args...]"
    echo "Commands:"
    echo "  next-due [--limit N]            Topics due for review (default 5)"
    echo "  record-review <topic_id> <outcome>   outcome = easy|good|hard|lapse"
    echo "  init-topic <topic_id>           Insert default review state row"
    echo "  get-state <topic_id>            Get review state for topic (JSON)"
    echo "  list-lapses                     Topics regressed after mastery (JSON)"
    exit 1
}

REPO_ID=""
if [ "${1:-}" = "--repo" ]; then
    REPO_ID="$2"
    shift 2
fi
[ -z "$REPO_ID" ] && REPO_ID=$(_detect_repo_id)

cmd_init_topic() {
    local topic_id="$1"
    db_ensure_init
    local st sr
    st=$(db_safe_value "$topic_id")
    sr=$(db_safe_value "$REPO_ID")
    db_exec "INSERT OR IGNORE INTO topic_review_state
             (repo_id, topic_id, ease_factor, interval_days, next_review_at)
             VALUES ('$sr', '$st', 2.5, 1, datetime('now'));"
}

cmd_get_state() {
    local topic_id="$1"
    db_ensure_init
    local st sr
    st=$(db_safe_value "$topic_id")
    sr=$(db_safe_value "$REPO_ID")
    db_json_query "SELECT * FROM topic_review_state
                   WHERE repo_id='$sr' AND topic_id='$st';"
}

cmd_next_due() {
    local limit=5
    if [ "${1:-}" = "--limit" ]; then
        limit="$2"
    fi
    db_ensure_init
    local sr
    sr=$(db_safe_value "$REPO_ID")
    db_json_query "SELECT trs.*, kt.title, kt.domain, kt.depth_level, kt.status
                   FROM topic_review_state trs
                   LEFT JOIN knowledge_topics kt
                     ON kt.id = trs.topic_id AND kt.repo_id = trs.repo_id
                   WHERE trs.repo_id='$sr'
                     AND trs.next_review_at IS NOT NULL
                     AND trs.next_review_at <= datetime('now')
                   ORDER BY trs.next_review_at ASC
                   LIMIT $limit;"
}

cmd_record_review() {
    local topic_id="$1" outcome="$2"
    db_ensure_init
    local st sr
    st=$(db_safe_value "$topic_id")
    sr=$(db_safe_value "$REPO_ID")

    # Ensure row exists
    db_exec "INSERT OR IGNORE INTO topic_review_state
             (repo_id, topic_id, ease_factor, interval_days, next_review_at)
             VALUES ('$sr', '$st', 2.5, 1, datetime('now'));"

    # Read current state
    local current
    current=$(db_query "SELECT ease_factor || '|' || interval_days || '|' || correct_streak || '|' || lapse_count
                        FROM topic_review_state
                        WHERE repo_id='$sr' AND topic_id='$st';")
    local ef days streak lapses
    IFS='|' read -r ef days streak lapses <<< "$current"
    [ -z "$ef" ] && ef=2.5
    [ -z "$days" ] && days=1
    [ -z "$streak" ] && streak=0
    [ -z "$lapses" ] && lapses=0

    local new_ef new_days new_streak new_lapses retention_clause=""
    case "$outcome" in
        easy)
            new_ef=$(awk -v e="$ef" 'BEGIN{printf "%.4f", e+0.15}')
            new_days=$(awk -v d="$days" 'BEGIN{printf "%.4f", d*2.5}')
            new_streak=$((streak + 1))
            new_lapses=$lapses
            ;;
        good)
            new_ef="$ef"
            new_days=$(awk -v d="$days" 'BEGIN{printf "%.4f", d*2.0}')
            new_streak=$((streak + 1))
            new_lapses=$lapses
            ;;
        hard)
            new_ef=$(awk -v e="$ef" 'BEGIN{v=e-0.15; if(v<1.3)v=1.3; printf "%.4f", v}')
            new_days=$(awk -v d="$days" 'BEGIN{printf "%.4f", d*1.3}')
            new_streak=$((streak + 1))
            new_lapses=$lapses
            ;;
        lapse)
            new_ef=$(awk -v e="$ef" 'BEGIN{v=e-0.2; if(v<1.3)v=1.3; printf "%.4f", v}')
            new_days=1
            new_streak=0
            new_lapses=$((lapses + 1))
            ;;
        *)
            echo "Unknown outcome: $outcome (use easy|good|hard|lapse)" >&2
            exit 1
            ;;
    esac

    # Mark retention_passed if review is ≥7 days after last_reviewed_at and outcome not lapse
    if [ "$outcome" != "lapse" ]; then
        local elig
        elig=$(db_query "SELECT CASE
                           WHEN last_reviewed_at IS NOT NULL
                                AND (julianday('now') - julianday(last_reviewed_at)) >= 7
                           THEN 1 ELSE 0 END
                         FROM topic_review_state
                         WHERE repo_id='$sr' AND topic_id='$st';")
        if [ "$elig" = "1" ]; then
            retention_clause=", retention_passed_at = datetime('now')"
        fi
    fi

    db_exec "UPDATE topic_review_state SET
               ease_factor = $new_ef,
               interval_days = $new_days,
               correct_streak = $new_streak,
               lapse_count = $new_lapses,
               last_reviewed_at = datetime('now'),
               next_review_at = datetime('now', '+' || $new_days || ' days')
               $retention_clause
             WHERE repo_id='$sr' AND topic_id='$st';"

    db_json_query "SELECT * FROM topic_review_state
                   WHERE repo_id='$sr' AND topic_id='$st';"
}

cmd_list_lapses() {
    db_ensure_init
    local sr
    sr=$(db_safe_value "$REPO_ID")
    # Topics that were previously mastered but whose most recent quiz was wrong,
    # OR whose review state shows a lapse_count > 0.
    db_json_query "
        WITH latest_quiz AS (
            SELECT topic_id, correct, asked_at,
                   ROW_NUMBER() OVER (PARTITION BY topic_id ORDER BY asked_at DESC) AS rn
            FROM quiz_results WHERE repo_id='$sr'
        )
        SELECT kt.id AS topic_id, kt.title, kt.domain,
               kt.mastered_at, lq.correct AS last_correct, lq.asked_at AS last_asked_at,
               COALESCE(trs.lapse_count, 0) AS lapse_count
        FROM knowledge_topics kt
        LEFT JOIN latest_quiz lq ON lq.topic_id = kt.id AND lq.rn = 1
        LEFT JOIN topic_review_state trs
               ON trs.topic_id = kt.id AND trs.repo_id = kt.repo_id
        WHERE kt.repo_id='$sr'
          AND (
            (kt.mastered_at IS NOT NULL AND lq.correct = 0 AND lq.asked_at > kt.mastered_at)
            OR COALESCE(trs.lapse_count, 0) > 0
          )
        ORDER BY lq.asked_at DESC;
    "
}

[ $# -ge 1 ] || usage
command="$1"
shift

case "$command" in
    next-due)       cmd_next_due "$@" ;;
    record-review)  [ $# -ge 2 ] || usage; cmd_record_review "$@" ;;
    init-topic)     [ $# -ge 1 ] || usage; cmd_init_topic "$@" ;;
    get-state)      [ $# -ge 1 ] || usage; cmd_get_state "$@" ;;
    list-lapses)    cmd_list_lapses ;;
    *) usage ;;
esac
