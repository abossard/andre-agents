#!/usr/bin/env bash
# Shared database helper for Learning-First plugin.
# Source this file; do not execute directly.

set -euo pipefail

_LF_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_LF_PROJECT_DIR="$(cd "$_LF_SCRIPT_DIR/.." && pwd)"
_LF_SCHEMA="$_LF_PROJECT_DIR/schemas/knowledge.sql"

# DB location: env override > default
LEARNING_FIRST_DB="${LEARNING_FIRST_DB:-$HOME/.learning-first/knowledge.db}"

db_init() {
    local db_dir
    db_dir="$(dirname "$LEARNING_FIRST_DB")"
    mkdir -p "$db_dir"
    sqlite3 "$LEARNING_FIRST_DB" < "$_LF_SCHEMA" > /dev/null 2>&1
}

db_query() {
    sqlite3 -batch -noheader "$LEARNING_FIRST_DB" "$1"
}

db_exec() {
    sqlite3 "$LEARNING_FIRST_DB" "$1"
}

db_json_query() {
    local result
    result=$(sqlite3 -json "$LEARNING_FIRST_DB" "$1")
    if [ -z "$result" ]; then
        echo "[]"
    else
        echo "$result"
    fi
}

db_safe_value() {
    printf '%s\n' "$1" | sed "s/'/''/g"
}

db_ensure_init() {
    if [ ! -f "$LEARNING_FIRST_DB" ]; then
        db_init
    fi
}
