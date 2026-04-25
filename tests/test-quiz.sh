#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export LEARNING_FIRST_DB="/tmp/learning-first-test-quiz-$$.db"
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

QUIZ="$PROJECT_DIR/scripts/legacy/quiz.sh"
KDB="$PROJECT_DIR/scripts/legacy/knowledge-db.sh"

echo "=== quiz.sh tests ==="

# Setup
"$KDB" --repo test-repo init > /dev/null
"$KDB" --repo test-repo upsert-topic "jwt-basics" "auth" "JWT Basics" "global" 1

# Test: record correct answer
echo "--- record ---"
"$QUIZ" --repo test-repo record "jwt-basics" "What does JWT stand for?" "JSON Web Token" 1 "Correct!" 1
result=$("$QUIZ" --repo test-repo history "jwt-basics" | jq 'length')
assert_eq "one result recorded" "1" "$result"

# Test: record wrong answer
"$QUIZ" --repo test-repo record "jwt-basics" "What is the header for?" "Authentication" 0 "Not quite — it contains metadata" 1
result=$("$QUIZ" --repo test-repo history "jwt-basics" | jq 'length')
assert_eq "two results recorded" "2" "$result"

# Test: stats
echo "--- stats ---"
result=$("$QUIZ" --repo test-repo stats)
total=$(echo "$result" | jq -r '.[0].total')
correct=$(echo "$result" | jq -r '.[0].correct')
assert_eq "total questions" "2" "$total"
assert_eq "correct answers" "1" "$correct"

# Test: topic-stats
echo "--- topic-stats ---"
result=$("$QUIZ" --repo test-repo topic-stats "jwt-basics")
pct=$(echo "$result" | jq -r '.[0].pct_correct')
assert_eq "50% correct" "50.0" "$pct"

# Test: answer with quotes (injection safety)
echo "--- injection safety ---"
"$QUIZ" --repo test-repo record "jwt-basics" "What's the token format?" "It's base64" 1 "That's right" 1
result=$("$QUIZ" --repo test-repo history "jwt-basics" | jq 'length')
assert_eq "quote in answer handled" "3" "$result"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
