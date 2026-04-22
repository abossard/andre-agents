-- Learning-First Knowledge Database Schema
-- Location: ~/.learning-first/knowledge.db

PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS knowledge_topics (
    id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    title TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    depth_level INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'not_started',
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    mastered_at TEXT,
    CHECK (depth_level BETWEEN 1 AND 3),
    CHECK (status IN ('not_started', 'in_progress', 'mastered', 'skipped')),
    CHECK (scope IN ('global', 'repo'))
);

CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT NOT NULL REFERENCES knowledge_topics(id),
    question TEXT NOT NULL,
    user_answer TEXT,
    correct INTEGER NOT NULL DEFAULT 0,
    feedback TEXT,
    depth_level INTEGER NOT NULL DEFAULT 1,
    asked_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (correct IN (0, 1)),
    CHECK (depth_level BETWEEN 1 AND 3)
);

CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    context TEXT
);

CREATE TABLE IF NOT EXISTS repo_knowledge (
    repo_path TEXT NOT NULL,
    area TEXT NOT NULL,
    familiarity TEXT NOT NULL DEFAULT 'none',
    last_assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (repo_path, area),
    CHECK (familiarity IN ('none', 'basic', 'solid', 'expert'))
);

CREATE TABLE IF NOT EXISTS curricula (
    task_id TEXT PRIMARY KEY,
    repo_path TEXT,
    task_description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    current_module_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    CHECK (status IN ('active', 'completed', 'abandoned'))
);

CREATE TABLE IF NOT EXISTS curriculum_modules (
    task_id TEXT NOT NULL REFERENCES curricula(task_id),
    module_index INTEGER NOT NULL,
    module_id TEXT NOT NULL,
    title TEXT NOT NULL,
    topic_id TEXT REFERENCES knowledge_topics(id),
    status TEXT NOT NULL DEFAULT 'pending',
    skipped_reason TEXT,
    score REAL,
    started_at TEXT,
    completed_at TEXT,
    PRIMARY KEY (task_id, module_index),
    CHECK (status IN ('pending', 'active', 'completed', 'skipped', 'failed'))
);
