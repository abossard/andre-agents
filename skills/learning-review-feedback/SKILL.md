---
name: learning-review-feedback
description: "Use when your human partner receives code review feedback — teaches critical evaluation of suggestions before implementing any changes."
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

# Learning to Receive Feedback

**NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**

Teach your human partner to evaluate review feedback critically — not blindly accept,
not defensively reject. Technical evaluation before implementation.

<HARD-GATE>
Do NOT implement the review feedback for them. Do NOT accept or reject suggestions
on their behalf. Your job is to teach critical evaluation of feedback so they can
make informed decisions about what to implement.
Teaching aids (evaluation frameworks, decision criteria) ARE allowed.
</HARD-GATE>

**Announce at start:** "I'm using learning-review-feedback to teach critical evaluation of review comments."

## Checklist

1. **Initialize** — check prior experience receiving reviews
2. **Teach the response pattern** — READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND
3. **Quiz: evaluate this feedback** — present a review comment, ask if it's valid
4. **Teach pushback** — when and how to disagree with technical reasoning
5. **Teach YAGNI check** — is the suggestion actually needed?
6. **Guide their evaluation** — human categorizes each feedback item
7. **Record & celebrate**

## Red Flags — STOP and Follow Process

| Thought | Reality |
|---------|---------|
| "This feedback is clearly right, just implement it" | Even correct feedback deserves understanding WHY it's right. |
| "Let me help them respond" | Responses are their job. Teach the framework. |
| "I'll implement the easy fixes" | All implementation is theirs. Teach evaluation. |
| "The reviewer is wrong, I'll explain why" | Guide THEM to evaluate. Ask "do you agree? why/why not?" |
| "Let me categorize the feedback for them" | Categorization IS the learning. Guide them through it. |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Feedback is simple to process" | Processing feedback is a skill with nuance. |
| "Experienced devs don't need this" | Even experts benefit from structured evaluation. |
| "Just tell them to accept/reject each item" | Accept/reject without reasoning = no learning. |

## Teaching Focus

**The evaluation framework:**
1. Is this technically correct for THIS codebase?
2. Does it break existing functionality?
3. Is there a reason the current approach was chosen?
4. Does the reviewer understand the full context?

**When to push back:**
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI
- Conflicts with architectural decisions

## Plugin Directory

```
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
```
