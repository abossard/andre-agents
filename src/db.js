// src/db.js — Shared database layer for learning-first
// Zero dependencies: uses node:sqlite (built-in Node 22+)
process.removeAllListeners('warning');

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA_PATH = path.resolve(import.meta.dirname, '..', 'schemas', 'knowledge.sql');

let _db = null;
let _dbPath = null;
let _repoIdCache = null;

function getDbPath() {
  if (_dbPath) return _dbPath;
  _dbPath =
    process.env.LEARNING_FIRST_DB ||
    path.join(os.homedir(), '.learning-first', 'knowledge.db');
  return _dbPath;
}

function _ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function _applyPragmas(db) {
  db.exec('PRAGMA journal_mode=WAL;');
  db.exec('PRAGMA foreign_keys=ON;');
  db.exec('PRAGMA busy_timeout=5000;');
}

function _loadSchema(db) {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
  }
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(sql);
}

function _migrate() {
  const version = scalar('PRAGMA user_version') || 0;

  if (version < 1) {
    // v0 → v1: Add indexes for high-traffic queries.
    exec(
      `CREATE INDEX IF NOT EXISTS idx_quiz_results_repo_topic
       ON quiz_results(repo_id, topic_id, asked_at DESC)`
    );
    exec(
      `CREATE INDEX IF NOT EXISTS idx_topic_review_next
       ON topic_review_state(repo_id, next_review_at)`
    );
    exec(
      `CREATE INDEX IF NOT EXISTS idx_override_debts_repo
       ON override_debts(repo_id, status)`
    );
    exec(
      `CREATE INDEX IF NOT EXISTS idx_sessions_repo
       ON learning_sessions(repo_id, ended_at)`
    );
    exec(`PRAGMA user_version = 1`);
  }

  // Future migrations: if (version < 2) { ... exec(`PRAGMA user_version = 2`); }
  // Note: column removal deferred to a future version after one release of deprecation.
}

function init() {
  if (_db) return _db;
  const dbPath = getDbPath();
  _ensureDir(dbPath);
  try {
    _db = new DatabaseSync(dbPath);
    _applyPragmas(_db);
    _loadSchema(_db);
    _migrate();
    return _db;
  } catch (err) {
    _db = null;
    throw new Error(`Failed to initialize database at ${dbPath}: ${err.message}`);
  }
}

function _getDb() {
  return _db || init();
}

function _normalizeParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return params || {};
  }
  // Replace undefined with null (node:sqlite does not accept undefined).
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    out[k] = v === undefined ? null : v;
  }
  return out;
}

function _wrap(action, sql, params, fn) {
  try {
    return fn();
  } catch (err) {
    const preview = sql.length > 200 ? sql.slice(0, 200) + '…' : sql;
    const e = new Error(
      `[db.${action}] ${err.message}\n  SQL: ${preview}\n  Params: ${JSON.stringify(params)}`
    );
    e.cause = err;
    throw e;
  }
}

function query(sql, params = {}) {
  const db = _getDb();
  const p = _normalizeParams(params);
  return _wrap('query', sql, params, () => {
    const stmt = db.prepare(sql);
    return stmt.all(p);
  });
}

function exec(sql, params = {}) {
  const db = _getDb();
  const p = _normalizeParams(params);
  return _wrap('exec', sql, params, () => {
    const stmt = db.prepare(sql);
    const result = stmt.run(p);
    return {
      changes: Number(result.changes ?? 0),
      lastInsertRowid: result.lastInsertRowid ?? null,
    };
  });
}

function scalar(sql, params = {}) {
  const db = _getDb();
  const p = _normalizeParams(params);
  return _wrap('scalar', sql, params, () => {
    const stmt = db.prepare(sql);
    const row = stmt.get(p);
    if (!row) return null;
    const keys = Object.keys(row);
    return keys.length ? row[keys[0]] : null;
  });
}

function transaction(fn) {
  const db = _getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn({ query, exec, scalar });
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback failures
    }
    throw err;
  }
}

function close() {
  if (_db) {
    try {
      _db.close();
    } finally {
      _db = null;
    }
  }
}

function detectRepoId() {
  if (_repoIdCache !== null) return _repoIdCache;
  try {
    let url = execSync('git remote get-url origin', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    // Strip credentials from URLs like https://user:token@github.com/owner/repo
    url = url.replace(/\/\/[^@/]+@/, '//');
    _repoIdCache = url;
  } catch {
    _repoIdCache = path.basename(process.cwd());
  }
  return _repoIdCache;
}

export {
  init,
  query,
  exec,
  scalar,
  transaction,
  close,
  getDbPath,
  detectRepoId,
};
