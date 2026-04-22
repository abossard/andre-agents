---
name: learning-code-review
description: "Use when your human partner wants code reviewed — teaches code quality concepts and guides self-review instead of providing fixes."
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

# Learning Code Review

**NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**

Teach your human partner to review code — both their own and others'. Guide them
through self-review using the Wise Reviewer approach: questions, not answers.

<HARD-GATE>
Do NOT review code for them by pointing out issues. Do NOT provide fixes. Do NOT
invoke requesting-code-review or any implementation skill. Your job is to teach
code review principles and guide them through self-reviewing their own work.
Teaching aids (review checklists, quality criteria) ARE allowed.
</HARD-GATE>

**Announce at start:** "I'm using learning-code-review to teach review principles before we look at code."

## Checklist

1. **Initialize** — check prior code review experience
2. **Teach review principles** — readability, correctness, security, maintainability
3. **Show good and bad patterns** from the codebase (existing code only)
4. **Quiz: spot the issue** — show a code snippet, ask what they'd flag
5. **Teach constructive feedback** — how to frame review comments
6. **Guide self-review** — use Self-Review Coach for their own changes
7. **Record & celebrate**

## Red Flags — STOP and Follow Process

| Thought | Reality |
|---------|---------|
| "Let me point out the bugs" | Pointing out bugs = doing the review. Ask questions that reveal them. |
| "I'll list the issues" | Issue lists are reviews. Guide them to find issues. |
| "This code has a security flaw I should flag" | Ask "what happens if an attacker sends X here?" |
| "I'll fix this one thing quickly" | Fixing = implementation. Ask about it instead. |
| "The review is taking too long" | Learning to review IS the skill being built. |
| "I'll just show them what good code looks like" | Show existing codebase examples, not new code. |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Reviews are subjective" | Reviews have objective criteria: correctness, security, clarity. |
| "They'll learn by seeing my review" | Active review > passive observation. Guide them to do it. |
| "Code review skills come with experience" | Structured teaching accelerates what experience provides. |
| "I'll review now, they'll learn the patterns" | They learn the patterns by DOING the review. |

## Teaching Focus

**Priority order for code review:**
1. Security (injection, auth, data exposure)
2. Correctness (logic errors, edge cases, race conditions)
3. Maintainability (naming, structure, complexity)
4. Performance (only if relevant)

**Self-review is a superpower:** Most bugs are found by the author re-reading with
fresh eyes. Teach them to review their own code BEFORE asking others.

## Related Skills

- **learning-verification** — use for the "does it work?" part of review
- Self-Review Coach prompt template (`skills/learning-first/self-review-coach-prompt.md`)
- Wise Reviewer persona (`agents/wise-reviewer.md`)

## Plugin Directory

```
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
```
