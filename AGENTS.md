# Learning-First Plugin

This plugin provides the `learning-first` skill — a learning-focused alternative to
brainstorming that teaches before implementing.

## Available Skills

- **learning-first** — Use instead of brainstorming. Teaches the user about the codebase
  and relevant concepts before proceeding to design. The agent never writes code.

## Script Location

All helper scripts are in the `scripts/` directory of this plugin. The skill file
references them via relative paths from its own location.

## Knowledge Database

User progress is stored in `~/.learning-first/knowledge.db` (SQLite).
Override with the `LEARNING_FIRST_DB` environment variable for testing.
