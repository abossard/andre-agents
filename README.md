# Learning-First

A learning-focused skill plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
and [GitHub Copilot CLI](https://githubnext.com/projects/copilot-cli/) that teaches before
implementing.

## What It Does

When you ask an AI agent to implement something, **Learning-First** intercepts and runs a
learning flow first:

1. **Analyzes** the codebase and task to identify what you need to understand
2. **Generates a curriculum** tailored to your current knowledge level
3. **Teaches** concepts using real examples from the codebase
4. **Quizzes** you to assess understanding (always skippable)
5. **Adapts** depth based on your performance — returning to the same topic goes deeper
6. **Guides** you to propose your own design instead of giving you the answer

The agent **never writes implementation code**. It teaches, quizzes, guides, and celebrates.

## The Iron Law

> **NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**

Every skill enforces this with `<HARD-GATE>` blocks and `<SUBAGENT-STOP>` guards.
Pressure test scenarios in `tests/pressure-scenarios/` validate compliance.

## Skills (9)

| Skill | What It Teaches |
|-------|----------------|
| **learning-first** | Codebase concepts before design decisions |
| **learning-tdd** | TDD methodology before writing tests |
| **learning-debugging** | Systematic debugging before fixing bugs |
| **learning-code-review** | Code review through guided self-review |
| **learning-review-feedback** | Critical evaluation of review comments |
| **learning-verification** | Evidence-based completion verification |
| **learning-planning** | Task decomposition for implementation plans |
| **learning-delegation** | Work decomposition for parallel execution |
| **writing-learning-skills** | Meta-skill: TDD-for-skills methodology |

Each skill follows the same structure:
- Frontmatter with `name` and `description`
- `<SUBAGENT-STOP>` guard — prevents subagent bypass
- `<HARD-GATE>` — Iron Law enforcement with explicit boundaries
- Checklist — step-by-step teaching flow
- Red Flags table — common violations with corrections
- Common Rationalizations table — excuses vs reality

## Agent Personas (3)

| Agent | Role |
|-------|------|
| **master-teacher** | Default teaching persona using Socratic method |
| **wise-reviewer** | Teaches through code review questions, not answers |
| **achievement-narrator** | Celebrates learning milestones with personality |

Agent files live in `agents/` and are referenced by skills as needed.

## Commands (4)

| Command | Description |
|---------|-------------|
| `/learning-status` | Show knowledge profile — topics, depth levels, curriculum state |
| `/learning-achievements` | List all earned achievements |
| `/learning-stats` | Quiz statistics — accuracy, topics covered, learning velocity |
| `/learning-reset` | Clear all progress (requires confirmation) |

## Installation

### Claude Code

```bash
# Clone the repo
git clone https://github.com/abossard/andre-agents.git

# Add as a plugin
claude plugin add /path/to/andre-agents
```

### GitHub Copilot CLI

Clone or symlink to your Copilot CLI plugin discovery directory.

### Updates

```bash
cd /path/to/andre-agents && git pull
```

## How It Works

### Knowledge Tracking

Your learning progress is stored locally in `~/.learning-first/knowledge.db` (SQLite).
This tracks:

- **Topics** you've encountered and their depth level (1-3)
- **Quiz results** for adaptive difficulty
- **Repo-specific knowledge** — familiarity with different areas of each codebase
- **Achievements** — milestones earned through demonstrated understanding

### Adaptive Depth

| Encounter | Level | What You Learn |
|-----------|-------|---------------|
| 1st time | Level 1 | Fundamentals — what, why, basic structure |
| 2nd time | Level 2 | Intermediate — edge cases, patterns, integration |
| 3rd+ time | Level 3 | Deep — security, trade-offs, design critique |

### Achievements

Earn milestones as you learn:

- **Explorer: project-name** — First task in a new repo
- **Mastered: Topic Name** — Demonstrated deep understanding
- **Ready to Ship: Task** — Completed all learning for a task
- **Deepening: Topic (L1→L2)** — Returned and went deeper

### Session Hook

A `SessionStart` hook (`hooks/session-start`) automatically injects learning-first context
into every new session, so the teaching persona is always active.

## Prompt Templates

Teaching prompt templates in `skills/learning-first/`:

| Template | Purpose |
|----------|---------|
| `socratic-tutor-prompt.md` | Guides Socratic questioning flow |
| `knowledge-assessor-prompt.md` | Assesses current knowledge level |
| `curriculum-designer-prompt.md` | Designs personalized curriculum |
| `learning-reviewer-prompt.md` | Reviews learning progress |
| `self-review-coach-prompt.md` | Coaches self-review habits |

## Scripts

Helper scripts manage the knowledge database:

```bash
# Check your learning profile
./scripts/knowledge-db.sh get-profile

# View quiz stats
./scripts/quiz.sh stats

# List achievements
./scripts/achievements.sh list
```

## Testing

```bash
# Run all unit tests
for f in tests/test-*.sh; do bash "$f" || exit 1; done
```

### Pressure Tests

Each skill has pressure test scenarios (`tests/pressure-scenarios/`) that validate
Iron Law compliance with RED/GREEN/REFACTOR patterns:

- `learning-tdd-pressure.md`
- `learning-debugging-pressure.md`
- `learning-code-review-pressure.md`
- `learning-verification-pressure.md`
- `learning-planning-pressure.md`
- `learning-delegation-pressure.md`

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `LEARNING_FIRST_DB` | `~/.learning-first/knowledge.db` | Knowledge database path |

## Project Structure

```
├── .claude-plugin/       # Plugin manifest
├── agents/               # Agent persona definitions (3)
├── commands/             # CLI commands (4)
├── docs/                 # References and plans
├── hooks/                # Session hooks
├── schemas/              # JSON schemas
├── scripts/              # Helper scripts (knowledge-db, quiz, achievements, etc.)
├── skills/               # Learning skills (9)
│   ├── learning-first/   # Core skill + prompt templates
│   ├── learning-tdd/
│   ├── learning-debugging/
│   ├── learning-code-review/
│   ├── learning-review-feedback/
│   ├── learning-verification/
│   ├── learning-planning/
│   ├── learning-delegation/
│   └── writing-learning-skills/
└── tests/                # Unit tests + pressure scenarios
```

## License

MIT
