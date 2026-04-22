#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
export LEARNING_FIRST_DB="/tmp/learning-first-test-integration-$$.db"
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

KDB="$PROJECT_DIR/scripts/knowledge-db.sh"
CUR="$PROJECT_DIR/scripts/curriculum.sh"
QUIZ="$PROJECT_DIR/scripts/quiz.sh"
ACH="$PROJECT_DIR/scripts/achievements.sh"

echo "=== Integration Test: Full Learning Flow ==="

# 1. Initialize
echo "--- Phase 1: Init ---"
"$KDB" init > /dev/null
profile=$("$KDB" get-profile)
assert_eq "empty profile" "0" "$(echo "$profile" | jq '.topics | length')"

# 2. Create curriculum
echo "--- Phase 2: Create Curriculum ---"
MODULES='[
  {"module_id":"mod-auth-layer","title":"Auth Layer","topic_id":"auth-layer"},
  {"module_id":"mod-jwt","title":"JWT Basics","topic_id":"jwt-basics"},
  {"module_id":"mod-security","title":"Security","topic_id":"security"}
]'
"$KDB" upsert-topic "auth-layer" "architecture" "Auth Layer Overview" "repo" 1
"$KDB" upsert-topic "jwt-basics" "authentication" "JWT Basics" "global" 1
"$KDB" upsert-topic "security" "security" "Security Considerations" "global" 1
"$CUR" create "task-jwt-auth" "/tmp/myrepo" "Add JWT auth" "$MODULES"
state=$("$CUR" get-state "task-jwt-auth")
assert_eq "3 modules created" "3" "$(echo "$state" | jq '.modules | length')"

# 3. Simulate teach+quiz for module 0
echo "--- Phase 3: Module 0 (Auth Layer) ---"
"$CUR" set-module-status "task-jwt-auth" 0 "active"
"$QUIZ" record "auth-layer" "What pattern does the auth layer use?" "Middleware" 1 "Correct!" 1
"$QUIZ" record "auth-layer" "Where is auth configured?" "src/auth/config.ts" 1 "Right!" 1
"$CUR" set-module-status "task-jwt-auth" 0 "completed"
"$CUR" advance "task-jwt-auth"
"$KDB" update-topic-status "auth-layer" "mastered"

current=$("$CUR" get-current "task-jwt-auth")
assert_eq "advanced to module 1" "mod-jwt" "$(echo "$current" | jq -r '.module_id')"

# 4. Module 1 — user skips
echo "--- Phase 4: Module 1 (JWT — skipped) ---"
"$CUR" set-module-status "task-jwt-auth" 1 "skipped" "user said: I know this"
"$CUR" advance "task-jwt-auth"
"$KDB" update-topic-status "jwt-basics" "skipped"

# 5. Module 2 — mixed results
echo "--- Phase 5: Module 2 (Security) ---"
"$CUR" set-module-status "task-jwt-auth" 2 "active"
"$QUIZ" record "security" "What is CSRF?" "Cross-site request forgery" 1 "Correct" 1
"$QUIZ" record "security" "How to prevent XSS?" "I don't know" 0 "XSS is prevented by..." 1
"$CUR" set-module-status "task-jwt-auth" 2 "completed"
"$KDB" update-topic-status "security" "in_progress"

# 6. Complete curriculum
echo "--- Phase 6: Complete ---"
"$CUR" complete "task-jwt-auth"
state=$("$CUR" get-state "task-jwt-auth")
assert_eq "curriculum completed" "completed" "$(echo "$state" | jq -r '.status')"

# 7. Award achievements
echo "--- Phase 7: Achievements ---"
"$ACH" award "explorer-myrepo" "Explorer: myrepo" "First task in myrepo" "JWT auth"
"$ACH" award "ready-jwt-auth" "Ready to Ship: JWT Auth" "Completed learning for JWT auth" "task-jwt-auth"
result=$("$ACH" list | jq 'length')
assert_eq "2 achievements earned" "2" "$result"

# 8. Verify final profile
echo "--- Phase 8: Final Profile ---"
profile=$("$KDB" get-profile)
topics=$(echo "$profile" | jq '.topics | length')
assert_eq "3 topics in profile" "3" "$topics"

mastered=$(echo "$profile" | jq '[.topics[] | select(.status == "mastered")] | length')
assert_eq "1 mastered topic" "1" "$mastered"

# 9. Quiz stats
echo "--- Phase 9: Quiz Stats ---"
stats=$("$QUIZ" stats)
total=$(echo "$stats" | jq -r '.[0].total')
correct=$(echo "$stats" | jq -r '.[0].correct')
assert_eq "total quiz questions" "4" "$total"
assert_eq "correct answers" "3" "$correct"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] || exit 1
