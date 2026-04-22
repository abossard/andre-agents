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

## The Iron Law

**NO IMPLEMENTATION CODE. TEACHING AIDS ARE OK.**
