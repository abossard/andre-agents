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
bash "$PLUGIN_DIR/scripts/knowledge-db.sh" get-profile
bash "$PLUGIN_DIR/scripts/knowledge-db.sh" get-repo-knowledge <repo_path>
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

Always use the `ask_user` tool for quizzes — prefer multiple choice at L1/L2, open-ended at L3.

## Scoring

- 2-3 questions per module
- ≥ 66% correct at current level → advance to next module
- < 66% correct → re-teach key points, ask 1-2 more questions, then move on
- Record ALL results via `quiz.sh record`
