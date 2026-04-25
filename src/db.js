// src/db.js — Shared database layer for learning-first
// Zero dependencies: uses node:sqlite (built-in Node 22+)
process.removeAllListeners('warning');

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA_PATH = path.resolve(__dirname, '..', 'schemas', 'knowledge.sql');

let _db = null;
let _dbPath = null;

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

function init() {
  if (_db) return _db;
  const dbPath = getDbPath();
  _ensureDir(dbPath);
  try {
    _db = new DatabaseSync(dbPath);
    _applyPragmas(_db);
    _loadSchema(_db);
    return _db;
  } catch (err) {
    _db = null;
    throw new Error(`Failed to initialize database at ${dbPath}: ${err.message}`);
  }
}

function _getDb() {
  return _db || init();
}

// node:sqlite uses `$param` named parameters. Allow callers to use `:param`
// style for ergonomics; translate SQL and params accordingly.
function _translate(sql, params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return { sql, params: params || {} };
  }
  // Replace :name with $name (skip :: which would be a cast operator).
  const newSql = sql.replace(/(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/g, '$$$1');
  const newParams = {};
  for (const [k, v] of Object.entries(params)) {
    const key = k.startsWith('$') ? k : `$${k}`;
    newParams[key] = v === undefined ? null : v;
  }
  return { sql: newSql, params: newParams };
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
  const { sql: tSql, params: tParams } = _translate(sql, params);
  return _wrap('query', sql, params, () => {
    const stmt = db.prepare(tSql);
    return stmt.all(tParams);
  });
}

function exec(sql, params = {}) {
  const db = _getDb();
  const { sql: tSql, params: tParams } = _translate(sql, params);
  return _wrap('exec', sql, params, () => {
    const stmt = db.prepare(tSql);
    const result = stmt.run(tParams);
    return {
      changes: Number(result.changes ?? 0),
      lastInsertRowid: result.lastInsertRowid ?? null,
    };
  });
}

function scalar(sql, params = {}) {
  const db = _getDb();
  const { sql: tSql, params: tParams } = _translate(sql, params);
  return _wrap('scalar', sql, params, () => {
    const stmt = db.prepare(tSql);
    const row = stmt.get(tParams);
    if (!row) return null;
    const keys = Object.keys(row);
    return keys.length ? row[keys[0]] : null;
  });
}

function transaction(fn) {
  const db = _getDb();
  db.exec('BEGIN');
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
  try {
    return execSync('git remote get-url origin', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return path.basename(process.cwd());
  }
}

module.exports = {
  init,
  query,
  exec,
  scalar,
  transaction,
  close,
  getDbPath,
  detectRepoId,
};
