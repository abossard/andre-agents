#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export LEARNING_FIRST_DB="/tmp/learning-first-test-curriculum-$$.db"
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

CUR="$PROJECT_DIR/scripts/curriculum.sh"
KDB="$PROJECT_DIR/scripts/knowledge-db.sh"

echo "=== curriculum.sh tests ==="

# Setup
"$KDB" init > /dev/null

MODULES='[{"module_id":"mod-jwt","title":"JWT Basics","topic_id":"jwt-basics"},{"module_id":"mod-middleware","title":"Middleware Patterns","topic_id":"middleware"}]'

# Test: create
echo "--- create ---"
"$CUR" create "task-1" "/tmp/repo" "Add JWT auth" "$MODULES"
result=$("$CUR" get-state "task-1" | jq -r '.status')
assert_eq "curriculum created" "active" "$result"

# Test: get-current
echo "--- get-current ---"
result=$("$CUR" get-current "task-1" | jq -r '.module_id')
assert_eq "first module is current" "mod-jwt" "$result"

# Test: set-module-status
echo "--- set-module-status ---"
"$CUR" set-module-status "task-1" 0 "completed"
result=$("$CUR" get-state "task-1" | jq -r '.modules[0].status')
assert_eq "module 0 completed" "completed" "$result"

# Test: advance
echo "--- advance ---"
"$CUR" advance "task-1"
result=$("$CUR" get-current "task-1" | jq -r '.module_id')
assert_eq "advanced to module 1" "mod-middleware" "$result"

# Test: skip
echo "--- skip ---"
"$CUR" set-module-status "task-1" 1 "skipped" "already familiar"
result=$("$CUR" get-state "task-1" | jq -r '.modules[1].skipped_reason')
assert_eq "skip reason recorded" "already familiar" "$result"

# Test: complete
echo "--- complete ---"
"$CUR" complete "task-1"
result=$("$CUR" get-state "task-1" | jq -r '.status')
assert_eq "curriculum completed" "completed" "$result"

# Test: abandon
echo "--- abandon test ---"
"$CUR" create "task-2" "/tmp/repo" "Another task" "$MODULES"
"$CUR" abandon "task-2"
result=$("$CUR" get-state "task-2" | jq -r '.status')
assert_eq "curriculum abandoned" "abandoned" "$result"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
