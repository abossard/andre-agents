-- Learning-First Knowledge Database Schema v2
-- Location: ~/.learning-first/knowledge.db
-- repo_id: git remote URL (preferred) or folder name

PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
PRAGMA foreign_keys=ON;

-- Per-repo opt-in/out preferences
CREATE TABLE IF NOT EXISTS repo_preferences (
    repo_id TEXT PRIMARY KEY,
    repo_name TEXT NOT NULL,
    learning_enabled INTEGER NOT NULL DEFAULT 1,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_session_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (learning_enabled IN (0, 1))
);

CREATE TABLE IF NOT EXISTS knowledge_topics (
    id TEXT NOT NULL,
    repo_id TEXT NOT NULL DEFAULT '_global',
    domain TEXT NOT NULL,
    title TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'global',
    depth_level INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'not_started',
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    mastered_at TEXT,
    PRIMARY KEY (id, repo_id),
    CHECK (depth_level BETWEEN 1 AND 3),
    CHECK (status IN ('not_started', 'in_progress', 'mastered', 'skipped')),
    CHECK (scope IN ('global', 'repo'))
);

CREATE TABLE IF NOT EXISTS quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id TEXT NOT NULL DEFAULT '_global',
    topic_id TEXT NOT NULL,
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
    repo_id TEXT NOT NULL DEFAULT '_global',
    title TEXT NOT NULL,
    description TEXT,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    context TEXT
);

CREATE TABLE IF NOT EXISTS repo_knowledge (
    repo_id TEXT NOT NULL,
    area TEXT NOT NULL,
    familiarity TEXT NOT NULL DEFAULT 'none',
    last_assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (repo_id, area),
    CHECK (familiarity IN ('none', 'basic', 'solid', 'expert'))
);

CREATE TABLE IF NOT EXISTS curricula (
    task_id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL DEFAULT '_global',
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
    topic_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    skipped_reason TEXT,
    score REAL,
    started_at TEXT,
    completed_at TEXT,
    PRIMARY KEY (task_id, module_index),
    CHECK (status IN ('pending', 'active', 'completed', 'skipped', 'failed'))
);

-- Override debts: tracks when user bypassed learning
CREATE TABLE IF NOT EXISTS override_debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id TEXT NOT NULL,
    task_description TEXT NOT NULL,
    area TEXT,
    topics_skipped TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    caught_up_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    CHECK (status IN ('pending', 'caught_up', 'dismissed'))
);
