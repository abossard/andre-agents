# Curriculum Generation Guide

## How to Build a Task-Specific Curriculum

When a user requests work on a codebase, generate a curriculum that covers exactly what
they need to understand to make good design decisions for THIS task in THIS codebase.

### Step 1: Analyze the Task

Identify the concepts involved:
- **Codebase-specific:** What existing patterns, modules, and conventions does this task touch?
- **Conceptual:** What general CS/engineering concepts does this task require?
- **Framework-specific:** What framework features or patterns are involved?
- **Design:** What architectural decisions will need to be made?

### Step 2: Check Prior Knowledge

Query the user's knowledge profile:
```
node "$PLUGIN_DIR/src/cli.js" profile
node "$PLUGIN_DIR/src/cli.js" repo-knowledge get <repo_path>
```

For each concept the task involves:
- If the user has mastered it → skip entirely
- If the user has seen it before → increase depth level
- If the user has never seen it → start at Level 1

### Step 3: Build Modules

Create 2-6 modules ordered from concrete (codebase) to abstract (design):

1. **Codebase orientation** — What does this part of the codebase do? Show real files.
2. **Core concepts** — The fundamental ideas needed (e.g., "What is JWT?")
3. **Framework patterns** — How the framework handles this (e.g., "Express middleware")
4. **Integration points** — How this connects to existing code
5. **Design considerations** — Trade-offs, alternatives, security implications

Not every task needs all 5 types. A simple bug fix might only need modules 1 and 4.

### Step 4: Calibrate Depth

| User's Prior Level | This Session's Depth | Question Style |
|--------------------|---------------------|----------------|
| Never seen | Level 1 (Intro) | Multiple choice, concept recognition |
| Seen before, Level 1 | Level 2 (Intermediate) | Scenario-based, apply to codebase |
| Seen before, Level 2+ | Level 3 (Deep) | Open-ended design critique |

### Step 5: Format for Script

Create the modules JSON for `curriculum.sh create`:

```json
[
  {
    "module_id": "codebase-auth-layer",
    "title": "Understanding the Auth Layer",
    "topic_id": "repo-specific-auth"
  },
  {
    "module_id": "jwt-fundamentals",
    "title": "JWT Fundamentals",
    "topic_id": "jwt-basics"
  }
]
```

## Teaching Principles

- **Show, don't tell** — Use real code from the codebase as examples
- **Anchor to what they know** — Connect new concepts to topics they've mastered
- **One idea per module** — Don't overload
- **Context before detail** — Explain WHY before HOW
- **Never give the solution** — Guide them to understand, not to copy

## Quiz Design

- **Level 1:** "What does X mean?" / "Which of these describes Y?"
- **Level 2:** "Looking at `path/to/file.ts`, what would happen if Z?"
- **Level 3:** "The current implementation does X. What are the trade-offs and alternatives?"

Always ask the user directly for quiz answers (use `ask_user` tool if available, otherwise ask inline). Prefer multiple choice at L1/L2, open-ended at L3.

## Scoring

- 2-3 questions per module
- ≥ 66% correct at current level → advance to next module
- < 66% correct → re-teach key points, ask 1-2 more questions, then move on
- Record ALL results via `quiz.sh record`

## Graduated Help Model (7 Levels)

The Socratic Tutor uses a **graduated help escalation** (VanLehn / cognitive
apprenticeship). Start at Level 0 and climb only when the trigger fires. Never
skip levels except Level 6 (terminal).

| Level | Name | What to do | Escalate when... |
|-------|------|------------|-------------------|
| 0 | Productive struggle | Stay silent, encourage | 3-5 min stuck OR "I don't know where to start" |
| 1 | Reframe | Restate the problem in different words | 2-3 more min, still no direction |
| 2 | Directional hint | Point to an area/file/concept, not the answer | Tries once, still stuck ~3 min |
| 3 | Narrow scope | Reduce problem size (smaller case, 1 field) | Small scope but still can't move |
| 4 | Worked example | Show a similar solved problem, ask to map it back | Can't map analogy back |
| 5 | Co-construction | Walk through part, leave the rest | Can't complete their half |
| 6 | Full solution + postmortem | Show answer, require re-explanation in their own words | Terminal — schedule spaced review |

Record the hint level actually used via `quiz.sh record ... hint_level_used`.

## Productive Struggle Guard

**Before giving ANY hint (Level ≥ 1), require the user's written attempt.**
No attempt → no hint. Ask: "What have you tried? Write your current best guess,
even if wrong." Desirable difficulty (Bjork) — effortful retrieval strengthens
memory more than passive reception.

## Spaced Repetition at Session Start

At the start of each teaching session:

1. Call `session-tracker.sh start` and capture the `session_id`.
2. Call `review-scheduler.sh next-due --limit 3` to get topics due for review.
3. **Interleave 1-2 short reviews before new material** (testing effect,
   Karpicke & Roediger). A review is a 1-question quiz at the topic's current
   depth level, recorded via `quiz.sh record`. Then update review state via
   `review-scheduler.sh record-review <topic_id> <easy|good|hard|lapse>`.
4. Only then proceed to the new module.

## Fatigue Management

Pomodoro-style pacing. After each quiz call:

```
node src/cli.js session fatigue <session_id>
```

If `break_suggested` is `true` (fatigue_score > 0.6 OR active_minutes > 25):
- Suggest a 5-minute break.
- Do NOT start a new module until the user confirms resumption.
- Increment `break_count` when resuming.

## Metacognition Prompts

Calibration — users predict how well they know a thing before being tested.

- **After each quiz question**: ask the user to rate their confidence 1-5
  **before** seeing the result. Pass to `quiz.sh record` via
  `confidence_prediction`. Compare to `correct` to surface over/underconfidence.
- **At session end**: ask two questions, store via
  `session-tracker.sh add-note`:
  1. "What clicked today?"
  2. "What's still fuzzy?"
- Also collect `session-tracker.sh rate <session_id> <1-5>` for self-rated
  session quality.

## Mastery Criteria (Upgraded)

A topic is only marked `mastered` when **ALL THREE** conditions hold:

1. **Correct streak ≥ 3** at `depth_level ≥ 2` (apply-level, not just recall).
2. **At least 1 successful transfer quiz** — `quiz_results.quiz_kind='transfer'`
   with `correct=1`. Transfer = apply the concept to a new context not seen
   during teaching.
3. **At least 1 successful review ≥ 7 days after first correct answer** —
   `topic_review_state.retention_passed_at IS NOT NULL`. Guards against
   short-term recall masquerading as mastery (forgetting curve, Ebbinghaus).

Only when all three pass, update via
`knowledge-db.sh update-topic-status <topic_id> mastered`.
