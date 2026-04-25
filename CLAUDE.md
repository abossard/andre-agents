# Learning-First Plugin

A learning-focused ecosystem that teaches before implementing.
The agent never writes implementation code — it teaches, quizzes, guides, and celebrates.

## Available Skills

- **learning-first** — Teaches codebase concepts before design decisions
- **learning-tdd** — Teaches TDD methodology before writing tests
- **learning-debugging** — Teaches systematic debugging before fixing bugs
- **learning-code-review** — Teaches code review through guided self-review
- **learning-review-feedback** — Teaches critical evaluation of review comments
- **learning-verification** — Teaches evidence-based completion verification
- **learning-planning** — Teaches task decomposition for implementation plans
- **learning-delegation** — Teaches work decomposition for parallel execution
- **writing-learning-skills** — Meta-skill: TDD-for-skills methodology

## Agent Personas

- **master-teacher** — Default teaching persona, Socratic method
- **wise-reviewer** — Teaching through code review questions
- **achievement-narrator** — Celebrating learning milestones

## Commands

- **learning-status** — Show knowledge profile and progress
- **learning-achievements** — List earned achievements
- **learning-stats** — Quiz statistics and accuracy
- **learning-reset** — Clear all progress (with confirmation)

## Knowledge Database

User progress stored in `~/.learning-first/knowledge.db` (SQLite).
Override with `LEARNING_FIRST_DB` environment variable.

## Architecture (v0.3.0)

Plugin is implemented in Node.js (≥ 22) with **zero npm dependencies**:

- `src/db.js` — shared `node:sqlite` wrapper (schema bootstrap, query helpers)
- `src/cli.js` — unified CLI invoked by every skill/command:
  `node "$PLUGIN_DIR/src/cli.js" <module> <command> [...]`
  Replaces all former `scripts/*.sh` files (now archived in `scripts/legacy/`).
- `src/server.js` — optional HTTP server (`npm start`, default port `3142`)
  for the web companion knowledge base.

Run tests with `npm test` (Node `node:test` runner). Prerequisite: Node.js ≥ 22.

## The Iron Law

**NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**
