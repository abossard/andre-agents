#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export LEARNING_FIRST_DB="/tmp/learning-first-test-knowledge-$$.db"
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

KDB="$PROJECT_DIR/scripts/legacy/knowledge-db.sh"

echo "=== knowledge-db.sh tests ==="

# Test: init
echo "--- init ---"
result=$("$KDB" --repo test-repo init 2>&1)
assert_eq "init succeeds" "initialized" "$result"

# Test: upsert-topic (new)
echo "--- upsert-topic ---"
"$KDB" --repo test-repo upsert-topic "jwt-basics" "authentication" "JWT Basics" "global" 1
result=$("$KDB" --repo test-repo get-topic "jwt-basics" | jq -r '.[0].title')
assert_eq "upserted topic title" "JWT Basics" "$result"

# Test: upsert-topic (update depth)
"$KDB" --repo test-repo upsert-topic "jwt-basics" "authentication" "JWT Basics" "global" 2
result=$("$KDB" --repo test-repo get-topic "jwt-basics" | jq -r '.[0].depth_level')
assert_eq "updated depth level" "2" "$result"

# Test: update-topic-status
echo "--- update-topic-status ---"
"$KDB" --repo test-repo update-topic-status "jwt-basics" "mastered"
result=$("$KDB" --repo test-repo get-topic "jwt-basics" | jq -r '.[0].status')
assert_eq "status updated to mastered" "mastered" "$result"

# Test: update-repo-knowledge
echo "--- update-repo-knowledge ---"
"$KDB" --repo test-repo update-repo-knowledge "src/auth/" "basic"
result=$("$KDB" --repo test-repo get-repo-knowledge "src/auth/" | jq -r '.[0].familiarity')
assert_eq "repo knowledge set" "basic" "$result"

# Test: get-profile (JSON output)
echo "--- get-profile ---"
result=$("$KDB" --repo test-repo get-profile)
echo "$result" | jq -e '.topics | length > 0' > /dev/null 2>&1
assert_eq "profile has topics" "0" "$?"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
