#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export LEARNING_FIRST_DB="/tmp/learning-first-test-$$.db"
trap 'rm -f "$LEARNING_FIRST_DB"' EXIT

PASS=0
FAIL=0

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo "  ✓ $desc"
        PASS=$((PASS + 1))
    else
        echo "  ✗ $desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        FAIL=$((FAIL + 1))
    fi
}

assert_ok() {
    local desc="$1"
    shift
    if "$@" > /dev/null 2>&1; then
        echo "  ✓ $desc"
        PASS=$((PASS + 1))
    else
        echo "  ✗ $desc (exit code $?)"
        FAIL=$((FAIL + 1))
    fi
}

echo "=== db-helper.sh tests ==="

# Test: init creates the DB
echo "--- init ---"
source "$PROJECT_DIR/scripts/db-helper.sh"
assert_ok "db_init creates database" db_init
assert_eq "DB file exists" "true" "$([ -f "$LEARNING_FIRST_DB" ] && echo true || echo false)"

# Test: db_query runs SQL
echo "--- db_query ---"
result=$(db_query "SELECT COUNT(*) FROM knowledge_topics;")
assert_eq "empty topics table returns 0" "0" "$result"

# Test: db_exec runs INSERT
echo "--- db_exec ---"
db_exec "INSERT INTO knowledge_topics (id, domain, title) VALUES ('test-1', 'testing', 'Test Topic');"
result=$(db_query "SELECT title FROM knowledge_topics WHERE id='test-1';")
assert_eq "inserted topic retrievable" "Test Topic" "$result"

# Test: db_safe_value escapes quotes
echo "--- db_safe_value ---"
safe=$(db_safe_value "it's a \"test\"")
assert_eq "escapes single quotes" "it''s a \"test\"" "$safe"

# Test: db_json_query returns JSON
echo "--- db_json_query ---"
result=$(db_json_query "SELECT id, title FROM knowledge_topics WHERE id='test-1';")
echo "$result" | jq -e '.[0].id == "test-1"' > /dev/null 2>&1
assert_eq "JSON output is valid" "0" "$?"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
