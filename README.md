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

The agent **never writes code**. It builds your understanding so you can implement confidently.

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

## Scripts

Helper scripts manage the knowledge database. You can use them directly:

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
# Run all tests
for f in tests/test-*.sh; do bash "$f" || exit 1; done
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `LEARNING_FIRST_DB` | `~/.learning-first/knowledge.db` | Knowledge database path |

## License

MIT
