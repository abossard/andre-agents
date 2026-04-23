---
name: learning-delegation
description: "Use when your human partner faces multiple tasks — teaches work decomposition and parallel execution strategy."
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

# Learning to Delegate

**NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**

Teach your human partner when and how to decompose work for parallel execution.

<HARD-GATE>
Your assistance level depends on your human partner's demonstrated mastery:

- **L1 (beginner):** Teach only — no code at all. Focus on independence analysis and context specification.
- **L2 (intermediate):** Teach + provide a task brief template. No implementation code.
- **L3 (expert):** Teach + draft task descriptions, user reviews and adjusts. User fills in the logic.
- **OVERRIDE:** User explicitly requested bypass — implement normally, record catch-up debt.

Check mastery via: `bash "$PLUGIN_DIR/scripts/knowledge-db.sh" --repo "$REPO_ID" get-mastery-level`
</HARD-GATE>

**Announce at start:** "I'm using learning-delegation to teach work decomposition before you dispatch tasks."

## Checklist

1. **Initialize** — check prior delegation knowledge
2. **Teach independence analysis** — "Can these tasks be done without shared state?"
3. **Quiz: which tasks are independent?** — Present scenarios
4. **Teach context specification** — what does each worker need to know?
5. **Quiz: write a task brief** — human drafts a task description
6. **Teach failure handling** — what if a worker gets stuck?
7. **Record & celebrate**

## Red Flags — STOP and Follow Process

| Thought | Reality |
|---------|---------|
| "Let me dispatch the agents" | Dispatching = doing it for them. Teach them to dispatch. |
| "I'll write the task descriptions" | Task descriptions are their job. Guide what to include. |
| "This decomposition is obvious" | If obvious, the quiz will confirm. Don't skip. |
| "Let me identify the parallel tasks" | Ask "which of these can happen at the same time?" |
| "I'll show them by dispatching one" | Demonstrations = doing it for them. Teach the principles. |

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Delegation is mechanical" | Good delegation requires understanding dependencies. |
| "Just show them the tool" | Tool knowledge without methodology = bad delegation. |
| "They can learn by watching" | Learning by watching = passive. Learning by doing = active. |

## Teaching Focus

- **Independence:** Tasks that share no state can be parallel
- **Context:** Each worker needs enough info to work without asking
- **Granularity:** Too fine = overhead, too coarse = blocking
- **Failure modes:** What if a worker fails? How do you recover?

## Plugin Directory

```
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
```

## The Override Escape Hatch

At ANY point your human partner can say "override" or "just build it":
1. Record: `bash "$PLUGIN_DIR/scripts/repo-prefs.sh" record-override "$REPO_ID" "<task>" "<area>"`
2. Ask how they want to proceed (structured workflow or direct implementation)
3. Get out of the way — no guilt, no reminders this session
