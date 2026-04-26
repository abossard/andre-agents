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

## Architecture (v0.4.0)

Plugin is implemented in Node.js (≥ 22) with **zero npm dependencies**, ESM throughout:

- `src/db.js` — `node:sqlite` wrapper (schema bootstrap, versioned migrations, query helpers)
- `src/cli.js` — unified CLI invoked by every skill/command:
  `node "$PLUGIN_DIR/src/cli.js" <module> <command> [...]`
  Modules: `init | profile | topic | repo-knowledge | quiz | achievement | curriculum | repo | review | session | server | doctor`
- `src/server/` — modular HTTP server (auto-starts with sessions):
  `index.js` (startup) · `routes.js` (18 endpoints) · `queries.js` · `sse.js` · `static.js` · `util.js`
- `src/public/` — SPA dashboard (vanilla JS, dark theme, SVG charts, SSE live updates)
- `src/daemon.js` — lockfile-based server lifecycle (start/stop/status, PID verification)
- `src/notify.js` — fire-and-forget CLI → server SSE push

Run tests with `npm test` (70 tests, Node `node:test` runner). Prerequisite: Node.js ≥ 22.

## The Iron Law

**NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**
