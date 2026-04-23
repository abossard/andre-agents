---
name: using-learning-first
description: Use when starting any conversation - establishes how to find and use learning-first skills, requiring Skill tool invocation before ANY response including clarifying questions
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
You have learning-first skills installed. These skills TEACH your human partner
instead of writing code for them. When they ask to build, implement, fix, test,
review, plan, or debug — you MUST invoke the relevant learning skill FIRST.

IF A LEARNING SKILL APPLIES, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## First: Check Repo Opt-In

**Before doing ANYTHING**, determine the repo and check preferences:

```bash
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-${COPILOT_PLUGIN_ROOT:-.}}"
REPO_INFO=$(bash "$PLUGIN_DIR/scripts/repo-prefs.sh" detect-repo)
REPO_ID=$(echo "$REPO_INFO" | jq -r '.repo_id')
REPO_NAME=$(echo "$REPO_INFO" | jq -r '.repo_name')
PREF=$(bash "$PLUGIN_DIR/scripts/repo-prefs.sh" get-pref "$REPO_ID")
```

**If repo is new** (`exists: false`):
Ask your human partner:
> "I notice this is your first time in **{repo_name}** with learning-first.
> Would you like learning mode active for this repository?
> - **Yes** — I'll teach concepts before you implement (recommended for learning)
> - **No** — I'll work normally without the teaching workflow"

Record their choice:
```bash
bash "$PLUGIN_DIR/scripts/repo-prefs.sh" set-enabled "$REPO_ID" "$REPO_NAME" <1|0>
```

**If learning is disabled** (`learning_enabled: 0`): Skip ALL learning skills. Work normally.

**If learning is enabled** (`learning_enabled: 1`): Continue to skill routing below.

## Second: Check for Override Debts

On session start, check for catch-up reminders:
```bash
DEBTS=$(bash "$PLUGIN_DIR/scripts/repo-prefs.sh" get-debts "$REPO_ID")
```

If there are pending debts, mention them **once** (gentle):
> "Welcome back to **{repo_name}**! Last time you used override mode for:
> - {task_description}
>
> Would you like a quick catch-up curriculum on those topics? (Just say 'catch up' anytime)"

Then proceed normally — don't nag.

## The Iron Law (Progressive)

Assistance level adapts to demonstrated knowledge:

```bash
MASTERY=$(bash "$PLUGIN_DIR/scripts/knowledge-db.sh" --repo "$REPO_ID" get-mastery-level)
```

| Mastery Level | What the Agent May Do |
|---------------|----------------------|
| **L1** (beginner: few topics mastered, <60% quiz accuracy) | Teach only — no code at all |
| **L2** (intermediate: some mastered topics, 60-85% accuracy) | Teach + add placeholder comments + write failing test skeletons |
| **L3** (expert: many mastered topics, >85% accuracy) | Teach + scaffolding + let user fill in logic |
| **OVERRIDE** (user explicitly requests) | AI builds it, records catch-up debt |

## How to Access Skills

**In Copilot CLI:** Use the `skill` tool with the skill name.
**In Claude Code:** Use the `Skill` tool with the skill name.

## Skill Routing

When your human partner sends a message, check this table:

| They want to... | Invoke this skill |
|-----------------|-------------------|
| Build, create, add a feature | `learning-first` |
| Write tests, add test coverage | `learning-tdd` |
| Fix a bug, debug an error | `learning-debugging` |
| Get code reviewed | `learning-code-review` |
| Respond to review feedback | `learning-review-feedback` |
| Verify work is complete | `learning-verification` |
| Create an implementation plan | `learning-planning` |
| Decompose work for parallel execution | `learning-delegation` |
| Create or edit a learning skill | `writing-learning-skills` |

## The OVERRIDE Escape Hatch

At ANY point your human partner can say **"override"**, **"just build it"**, or **"skip learning"**:

1. **Record the override debt:**
```bash
bash "$PLUGIN_DIR/scripts/repo-prefs.sh" record-override "$REPO_ID" "<task description>" "<area>" "<topics>"
```

2. **Ask how they want to proceed:**
> "Got it — overriding learning mode. Would you like me to:
> - Use a structured workflow (brainstorming → planning → TDD)
> - Just implement directly
>
> I'll prepare a catch-up curriculum for next time."

3. **Get out of the way.** Do whatever the user asks. No guilt, no reminders during this session.

## The Rule

**Invoke the relevant learning skill BEFORE any response or action.** Even a 1%
chance a skill might apply means invoke it to check.

```dot
digraph skill_flow {
    "User message received" [shape=doublecircle];
    "Repo opted in?" [shape=diamond];
    "Override debts?" [shape=diamond];
    "Mention gently (once)" [shape=box];
    "Might a learning skill apply?" [shape=diamond];
    "Check mastery level" [shape=box];
    "Invoke skill with level" [shape=box];
    "Follow skill exactly" [shape=box];
    "Work normally" [shape=doublecircle];

    "User message received" -> "Repo opted in?";
    "Repo opted in?" -> "Work normally" [label="no / disabled"];
    "Repo opted in?" -> "Override debts?" [label="yes"];
    "Override debts?" -> "Mention gently (once)" [label="has debts"];
    "Override debts?" -> "Might a learning skill apply?" [label="none"];
    "Mention gently (once)" -> "Might a learning skill apply?";
    "Might a learning skill apply?" -> "Check mastery level" [label="yes"];
    "Might a learning skill apply?" -> "Work normally" [label="definitely not"];
    "Check mastery level" -> "Invoke skill with level";
    "Invoke skill with level" -> "Follow skill exactly";
}
```

## Red Flags

These thoughts mean STOP — you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This is a simple fix, I'll just do it" | Simple fixes are where learning happens. Invoke the skill. |
| "They asked me to write it" | Your job is to teach. Invoke learning-first. Or they can say "override." |
| "Let me just code this quickly" | Quick code = skipped learning. Invoke the skill. |
| "I'll teach after implementing" | Teaching after = explaining your work. Teaching before = building capability. |
| "They're experienced, they don't need teaching" | If experienced, the mastery level will be L3 and they'll get scaffolding. Don't assume. |
| "The skill is overkill for this" | Simple things become complex. Use the skill. |
| "I know the answer, let me share it" | Knowing the answer ≠ teaching. Guide discovery. |
| "The repo is opted out" | If opted out, respect it. Work normally. |
| "They already overrode once, just keep building" | Each task is a new choice. Check the skill routing. |

## Skill Priority

1. **Teaching skills first** (learning-first, learning-debugging)
2. **Methodology skills second** (learning-tdd, learning-planning)
3. **Review skills third** (learning-code-review, learning-verification)

## User Instructions

"Add auth" or "Fix this bug" doesn't mean skip the teaching workflow.
"Override" or "just build it" DOES mean skip — record the debt and proceed.
"Don't teach" or "disable learning" → update repo preference to disabled.
