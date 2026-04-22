#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export LEARNING_FIRST_DB="/tmp/learning-first-test-ach-$$.db"
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

ACH="$PROJECT_DIR/scripts/achievements.sh"
KDB="$PROJECT_DIR/scripts/knowledge-db.sh"

echo "=== achievements.sh tests ==="

# Setup
"$KDB" init > /dev/null

# Test: award
echo "--- award ---"
"$ACH" award "explorer-myrepo" "Explorer: myrepo" "First task in myrepo" "Add JWT auth"
result=$("$ACH" list | jq 'length')
assert_eq "one achievement" "1" "$result"

# Test: check (exists)
echo "--- check ---"
result=$("$ACH" check "explorer-myrepo")
assert_eq "achievement exists" "true" "$result"

# Test: check (not exists)
result=$("$ACH" check "nonexistent")
assert_eq "achievement not exists" "false" "$result"

# Test: duplicate award is idempotent
echo "--- idempotent award ---"
"$ACH" award "explorer-myrepo" "Explorer: myrepo" "First task" "context"
result=$("$ACH" list | jq 'length')
assert_eq "still one achievement (no duplicate)" "1" "$result"

# Test: list multiple
echo "--- list ---"
"$ACH" award "mastered-jwt" "Mastered: JWT" "Deep understanding of JWT" "JWT Auth task"
result=$("$ACH" list | jq 'length')
assert_eq "two achievements" "2" "$result"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
