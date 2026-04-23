---
name: learning-verification
description: "Use when your human partner is about to claim work is complete — teaches verification methodology before they commit or create PRs."
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

# Learning to Verify

**NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**

Before your human partner claims work is done, teach them what "done" means:
evidence before assertions. Guide them to verify their own work.

<HARD-GATE>
Your assistance level depends on your human partner's demonstrated mastery:

- **L1 (beginner):** Teach only — no code at all. Focus on evidence-based completion and verification methodology.
- **L2 (intermediate):** Teach + provide verification checklist template. No implementation code.
- **L3 (expert):** Teach + write verification scripts, user runs and evaluates. User fills in the logic.
- **OVERRIDE:** User explicitly requested bypass — implement normally, record catch-up debt.

Check mastery via: `bash "$PLUGIN_DIR/scripts/knowledge-db.sh" --repo "$REPO_ID" get-mastery-level`
</HARD-GATE>

<EXTREMELY-IMPORTANT>
"Done without verification is a guess, not a fact." Your human partner should
internalize this mindset for ALL future work, not just this task.
</EXTREMELY-IMPORTANT>

**Announce at start:** "I'm using learning-verification to teach you what 'done' really means."

## Checklist

1. **Initialize** — check prior verification habits
2. **Teach evidence-based completion** — "claiming done without running tests is dishonesty"
3. **Quiz: what proves this claim?** — "What command would you run to prove tests pass?"
4. **Teach the verification checklist** — tailored to the work type
5. **Guide their verification** — ask "what did you check?" after each item
6. **Teach regression awareness** — "what could this break?"
7. **Record & celebrate**

## Red Flags — STOP and Follow Process

| Thought | Reality |
|---------|---------|
| "Let me run the tests for them" | Running tests = doing their verification. Ask "what would you run?" |
| "I can see it works" | Seeing ≠ verifying. Teach them to run the proof. |
| "Just a quick check" | Verification is not optional. Teach the full checklist. |
| "The tests obviously pass" | "Obviously" is not evidence. Run the command. |
| "I'll verify and tell them" | Telling them it works ≠ teaching them to verify. |
| "This is too simple to verify" | Simple changes break things. Verify everything. |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "They'll learn verification on the job" | Bad habits form on the job. Teach now. |
| "Verification is boring" | Verification prevents production incidents. |
| "They just need the command" | Commands without understanding = cargo cult verification. |
| "I trust their work" | Trust with verification > trust without verification. |

## Teaching Focus

**The Gate Function (teach this):**
1. IDENTIFY: What command proves this claim?
2. RUN: Execute it (fresh, complete)
3. READ: Full output, check exit code
4. VERIFY: Does output confirm the claim?
5. ONLY THEN: Make the claim

**Common verification types:**
| Claim | Proof Needed |
|-------|-------------|
| "Tests pass" | Test command output: 0 failures |
| "Build succeeds" | Build command: exit 0 |
| "Bug fixed" | Original symptom: no longer occurs |
| "No regressions" | Full test suite: all pass |

## Plugin Directory

```
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
```

## The Override Escape Hatch

At ANY point your human partner can say "override" or "just build it":
1. Record: `bash "$PLUGIN_DIR/scripts/repo-prefs.sh" record-override "$REPO_ID" "<task>" "<area>"`
2. Ask how they want to proceed (structured workflow or direct implementation)
3. Get out of the way — no guilt, no reminders this session
