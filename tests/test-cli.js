#!/usr/bin/env node
// tests/test-cli.js — Node.js test suite for src/cli.js (zero deps).
process.removeAllListeners('warning');

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const CLI = path.join(__dirname, '..', 'src', 'cli.js');
const SCRATCH = path.join(__dirname, '..', '.test-tmp');
fs.mkdirSync(SCRATCH, { recursive: true });

function makeCli(dbPath) {
  return function cli(...args) {
    const result = execFileSync('node', ['--no-warnings', CLI, ...args], {
      encoding: 'utf8',
      env: { ...process.env, LEARNING_FIRST_DB: dbPath },
    });
    const trimmed = result.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  };
}

function freshDb(suite) {
  const p = path.join(SCRATCH, `cli-${suite}-${process.pid}-${Date.now()}.db`);
  return p;
}

function cleanup(dbPath) {
  for (const ext of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(dbPath + ext);
    } catch {}
  }
}

// ---------------------------------------------------------------------------
describe('init', () => {
  const db = freshDb('init');
  const cli = makeCli(db);
  after(() => cleanup(db));

  it('initialises the database file', () => {
    const r = cli('init');
    assert.equal(r.initialized, true);
    assert.ok(fs.existsSync(db), 'db file should exist');
  });

  it('init is idempotent', () => {
    const r = cli('init');
    assert.equal(r.initialized, true);
  });

  it('empty topics table returns nothing', () => {
    const rows = cli('--repo', 'r', 'topic', 'get', 'nope');
    assert.deepEqual(rows, []);
  });
});

// ---------------------------------------------------------------------------
describe('knowledge-db', () => {
  const db = freshDb('knowledge');
  const cli = makeCli(db);
  before(() => cli('init'));
  after(() => cleanup(db));

  it('topic upsert inserts a new topic', () => {
    const r = cli('--repo', 'test-repo', 'topic', 'upsert',
      'jwt-basics', 'authentication', 'JWT Basics', 'global', '1');
    assert.equal(r.ok, true);
    assert.equal(r.id, 'jwt-basics');

    const got = cli('--repo', 'test-repo', 'topic', 'get', 'jwt-basics');
    assert.equal(got[0].title, 'JWT Basics');
    assert.equal(got[0].depth_level, 1);
  });

  it('topic upsert updates depth (max wins)', () => {
    cli('--repo', 'test-repo', 'topic', 'upsert',
      'jwt-basics', 'authentication', 'JWT Basics', 'global', '2');
    const got = cli('--repo', 'test-repo', 'topic', 'get', 'jwt-basics');
    assert.equal(got[0].depth_level, 2);
  });

  it('topic upsert never lowers depth', () => {
    cli('--repo', 'test-repo', 'topic', 'upsert',
      'jwt-basics', 'authentication', 'JWT Basics', 'global', '1');
    const got = cli('--repo', 'test-repo', 'topic', 'get', 'jwt-basics');
    assert.equal(got[0].depth_level, 2);
  });

  it('topic status updates and sets mastered_at', () => {
    cli('--repo', 'test-repo', 'topic', 'status', 'jwt-basics', 'mastered');
    const got = cli('--repo', 'test-repo', 'topic', 'get', 'jwt-basics');
    assert.equal(got[0].status, 'mastered');
    assert.ok(got[0].mastered_at, 'mastered_at should be set');
  });

  it('repo-knowledge set + get round-trips', () => {
    cli('--repo', 'test-repo', 'repo-knowledge', 'set', 'src/auth/', 'basic');
    const got = cli('--repo', 'test-repo', 'repo-knowledge', 'get', 'src/auth/');
    assert.equal(got[0].familiarity, 'basic');
  });

  it('repo-knowledge get without area lists all rows', () => {
    cli('--repo', 'test-repo', 'repo-knowledge', 'set', 'src/api/', 'expert');
    const all = cli('--repo', 'test-repo', 'repo-knowledge', 'get');
    assert.equal(all.length, 2);
  });

  it('profile aggregates topics + repo knowledge + achievements', () => {
    const profile = cli('--repo', 'test-repo', 'profile');
    assert.equal(profile.repo_id, 'test-repo');
    assert.ok(Array.isArray(profile.topics));
    assert.ok(profile.topics.length >= 1);
    assert.ok(Array.isArray(profile.achievements));
    assert.ok(Array.isArray(profile.repo_knowledge));
    assert.ok(Array.isArray(profile.override_debts));
  });

  it('topic mastery returns counts', () => {
    const m = cli('--repo', 'test-repo', 'topic', 'mastery');
    assert.equal(m.repo_id, 'test-repo');
    assert.equal(m.total_topics, 1);
    assert.equal(m.mastered, 1);
  });
});

// ---------------------------------------------------------------------------
describe('quiz', () => {
  const db = freshDb('quiz');
  const cli = makeCli(db);
  before(() => {
    cli('init');
    cli('--repo', 'test-repo', 'topic', 'upsert',
      'jwt-basics', 'auth', 'JWT Basics', 'global', '1');
  });
  after(() => cleanup(db));

  it('records a correct quiz answer', () => {
    const r = cli('--repo', 'test-repo', 'quiz', 'record',
      'jwt-basics', 'What does JWT stand for?', 'JSON Web Token',
      '1', 'Correct!', '1');
    assert.equal(r.ok, true);
    assert.ok(typeof r.id === 'number' && r.id > 0);

    const hist = cli('--repo', 'test-repo', 'quiz', 'history', 'jwt-basics');
    assert.equal(hist.length, 1);
    assert.equal(hist[0].correct, 1);
    assert.equal(hist[0].user_answer, 'JSON Web Token');
  });

  it('records a wrong quiz answer', () => {
    cli('--repo', 'test-repo', 'quiz', 'record',
      'jwt-basics', 'What is the header for?', 'Authentication',
      '0', 'Not quite — it contains metadata', '1');
    const hist = cli('--repo', 'test-repo', 'quiz', 'history', 'jwt-basics');
    assert.equal(hist.length, 2);
  });

  it('stats aggregates across all topics', () => {
    const stats = cli('--repo', 'test-repo', 'quiz', 'stats');
    assert.equal(stats[0].total, 2);
    assert.equal(stats[0].correct, 1);
    assert.equal(stats[0].pct_correct, 50);
    assert.equal(stats[0].topics_quizzed, 1);
  });

  it('topic-stats returns per-topic numbers', () => {
    const ts = cli('--repo', 'test-repo', 'quiz', 'topic-stats', 'jwt-basics');
    assert.equal(ts[0].total, 2);
    assert.equal(ts[0].correct, 1);
    assert.equal(ts[0].pct_correct, 50);
    assert.equal(ts[0].max_depth, 1);
  });

  it('handles quotes in answers safely (parameterised SQL)', () => {
    cli('--repo', 'test-repo', 'quiz', 'record',
      'jwt-basics', "What's the token format?", "It's base64 with 'quotes' and \"double\"",
      '1', "That's right", '1');
    const hist = cli('--repo', 'test-repo', 'quiz', 'history', 'jwt-basics');
    assert.equal(hist.length, 3);
    assert.ok(hist.some((h) => /'quotes'/.test(h.user_answer)));
  });

  it('handles SQL-injection-looking strings safely', () => {
    const malicious = "'); DROP TABLE knowledge_topics; --";
    cli('--repo', 'test-repo', 'quiz', 'record',
      'jwt-basics', 'evil?', malicious, '0', 'nope', '1');
    const got = cli('--repo', 'test-repo', 'topic', 'get', 'jwt-basics');
    assert.equal(got.length, 1, 'topics table must still exist');
  });
});

// ---------------------------------------------------------------------------
describe('achievements', () => {
  const db = freshDb('ach');
  const cli = makeCli(db);
  before(() => cli('init'));
  after(() => cleanup(db));

  it('award inserts an achievement', () => {
    const r = cli('--repo', 'test-repo', 'achievement', 'award',
      'explorer-myrepo', 'Explorer: myrepo', 'First task in myrepo', 'Add JWT auth');
    assert.equal(r.ok, true);
    assert.equal(r.awarded, true);

    const list = cli('--repo', 'test-repo', 'achievement', 'list');
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'explorer-myrepo');
  });

  it('check returns true for earned achievement', () => {
    const r = cli('--repo', 'test-repo', 'achievement', 'check', 'explorer-myrepo');
    assert.equal(r.earned, true);
  });

  it('check returns false for unknown id', () => {
    const r = cli('--repo', 'test-repo', 'achievement', 'check', 'nonexistent');
    assert.equal(r.earned, false);
  });

  it('award is idempotent (no duplicate)', () => {
    const r = cli('--repo', 'test-repo', 'achievement', 'award',
      'explorer-myrepo', 'Explorer: myrepo', 'First task', 'context');
    assert.equal(r.awarded, false);
    const list = cli('--repo', 'test-repo', 'achievement', 'list');
    assert.equal(list.length, 1);
  });

  it('award supports multiple distinct achievements', () => {
    cli('--repo', 'test-repo', 'achievement', 'award',
      'mastered-jwt', 'Mastered: JWT', 'Deep understanding of JWT', 'JWT Auth task');
    const list = cli('--repo', 'test-repo', 'achievement', 'list');
    assert.equal(list.length, 2);
  });
});

// ---------------------------------------------------------------------------
describe('curriculum', () => {
  const db = freshDb('curr');
  const cli = makeCli(db);
  const MODULES = JSON.stringify([
    { module_id: 'mod-jwt', title: 'JWT Basics', topic_id: 'jwt-basics' },
    { module_id: 'mod-middleware', title: 'Middleware Patterns', topic_id: 'middleware' },
  ]);
  before(() => cli('init'));
  after(() => cleanup(db));

  it('create inserts curriculum + modules', () => {
    const r = cli('--repo', 'test-repo', 'curriculum', 'create',
      'task-1', 'Add JWT auth', MODULES);
    assert.equal(r.ok, true);
    assert.equal(r.modules, 2);

    const state = cli('--repo', 'test-repo', 'curriculum', 'state', 'task-1');
    assert.equal(state.status, 'active');
    assert.equal(state.modules.length, 2);
    assert.equal(state.current_module_index, 0);
  });

  it('current returns the first module initially', () => {
    const cur = cli('--repo', 'test-repo', 'curriculum', 'current', 'task-1');
    assert.equal(cur.module_id, 'mod-jwt');
  });

  it('module-status updates module status', () => {
    cli('--repo', 'test-repo', 'curriculum', 'module-status',
      'task-1', '0', 'completed');
    const state = cli('--repo', 'test-repo', 'curriculum', 'state', 'task-1');
    assert.equal(state.modules[0].status, 'completed');
    assert.ok(state.modules[0].completed_at, 'completed_at should be set');
  });

  it('advance moves the current pointer', () => {
    cli('--repo', 'test-repo', 'curriculum', 'advance', 'task-1');
    const cur = cli('--repo', 'test-repo', 'curriculum', 'current', 'task-1');
    assert.equal(cur.module_id, 'mod-middleware');
  });

  it('module-status records skip reason', () => {
    cli('--repo', 'test-repo', 'curriculum', 'module-status',
      'task-1', '1', 'skipped', 'already familiar');
    const state = cli('--repo', 'test-repo', 'curriculum', 'state', 'task-1');
    assert.equal(state.modules[1].status, 'skipped');
    assert.equal(state.modules[1].skipped_reason, 'already familiar');
  });

  it('complete marks curriculum completed', () => {
    cli('--repo', 'test-repo', 'curriculum', 'complete', 'task-1');
    const state = cli('--repo', 'test-repo', 'curriculum', 'state', 'task-1');
    assert.equal(state.status, 'completed');
  });

  it('abandon marks curriculum abandoned', () => {
    cli('--repo', 'test-repo', 'curriculum', 'create',
      'task-2', 'Another task', MODULES);
    cli('--repo', 'test-repo', 'curriculum', 'abandon', 'task-2');
    const state = cli('--repo', 'test-repo', 'curriculum', 'state', 'task-2');
    assert.equal(state.status, 'abandoned');
  });

  it('current returns null past the last module', () => {
    cli('--repo', 'test-repo', 'curriculum', 'advance', 'task-1');
    const cur = cli('--repo', 'test-repo', 'curriculum', 'current', 'task-1');
    assert.equal(cur, null);
  });
});

// ---------------------------------------------------------------------------
describe('integration', () => {
  const db = freshDb('integ');
  const cli = makeCli(db);
  const MODULES = JSON.stringify([
    { module_id: 'mod-auth-layer', title: 'Auth Layer', topic_id: 'auth-layer' },
    { module_id: 'mod-jwt', title: 'JWT Basics', topic_id: 'jwt-basics' },
    { module_id: 'mod-security', title: 'Security', topic_id: 'security' },
  ]);
  before(() => cli('init'));
  after(() => cleanup(db));

  it('runs a full learning flow end-to-end', () => {
    // Phase 1: empty profile
    let profile = cli('--repo', 'test-repo', 'profile');
    assert.equal(profile.topics.length, 0);

    // Phase 2: topics + curriculum
    cli('--repo', 'test-repo', 'topic', 'upsert',
      'auth-layer', 'architecture', 'Auth Layer Overview', 'repo', '1');
    cli('--repo', 'test-repo', 'topic', 'upsert',
      'jwt-basics', 'authentication', 'JWT Basics', 'global', '1');
    cli('--repo', 'test-repo', 'topic', 'upsert',
      'security', 'security', 'Security Considerations', 'global', '1');
    cli('--repo', 'test-repo', 'curriculum', 'create',
      'task-jwt-auth', 'Add JWT auth', MODULES);

    let state = cli('--repo', 'test-repo', 'curriculum', 'state', 'task-jwt-auth');
    assert.equal(state.modules.length, 3);

    // Phase 3: module 0 — active → quizzes → completed → advance → mastered
    cli('--repo', 'test-repo', 'curriculum', 'module-status',
      'task-jwt-auth', '0', 'active');
    cli('--repo', 'test-repo', 'quiz', 'record',
      'auth-layer', 'What pattern does the auth layer use?', 'Middleware',
      '1', 'Correct!', '1');
    cli('--repo', 'test-repo', 'quiz', 'record',
      'auth-layer', 'Where is auth configured?', 'src/auth/config.ts',
      '1', 'Right!', '1');
    cli('--repo', 'test-repo', 'curriculum', 'module-status',
      'task-jwt-auth', '0', 'completed');
    cli('--repo', 'test-repo', 'curriculum', 'advance', 'task-jwt-auth');
    cli('--repo', 'test-repo', 'topic', 'status', 'auth-layer', 'mastered');

    let cur = cli('--repo', 'test-repo', 'curriculum', 'current', 'task-jwt-auth');
    assert.equal(cur.module_id, 'mod-jwt');

    // Phase 4: module 1 skipped
    cli('--repo', 'test-repo', 'curriculum', 'module-status',
      'task-jwt-auth', '1', 'skipped', 'user said: I know this');
    cli('--repo', 'test-repo', 'curriculum', 'advance', 'task-jwt-auth');
    cli('--repo', 'test-repo', 'topic', 'status', 'jwt-basics', 'skipped');

    // Phase 5: module 2 — mixed quiz results
    cli('--repo', 'test-repo', 'curriculum', 'module-status',
      'task-jwt-auth', '2', 'active');
    cli('--repo', 'test-repo', 'quiz', 'record',
      'security', 'What is CSRF?', 'Cross-site request forgery',
      '1', 'Correct', '1');
    cli('--repo', 'test-repo', 'quiz', 'record',
      'security', 'How to prevent XSS?', "I don't know",
      '0', 'XSS is prevented by...', '1');
    cli('--repo', 'test-repo', 'curriculum', 'module-status',
      'task-jwt-auth', '2', 'completed');
    cli('--repo', 'test-repo', 'topic', 'status', 'security', 'in_progress');

    // Phase 6: complete
    cli('--repo', 'test-repo', 'curriculum', 'complete', 'task-jwt-auth');
    state = cli('--repo', 'test-repo', 'curriculum', 'state', 'task-jwt-auth');
    assert.equal(state.status, 'completed');

    // Phase 7: achievements
    cli('--repo', 'test-repo', 'achievement', 'award',
      'explorer-myrepo', 'Explorer: myrepo', 'First task in myrepo', 'JWT auth');
    cli('--repo', 'test-repo', 'achievement', 'award',
      'ready-jwt-auth', 'Ready to Ship: JWT Auth',
      'Completed learning for JWT auth', 'task-jwt-auth');
    const ach = cli('--repo', 'test-repo', 'achievement', 'list');
    assert.equal(ach.length, 2);

    // Phase 8: profile aggregations
    profile = cli('--repo', 'test-repo', 'profile');
    assert.equal(profile.topics.length, 3);
    const mastered = profile.topics.filter((t) => t.status === 'mastered');
    assert.equal(mastered.length, 1);

    // Phase 9: quiz stats
    const stats = cli('--repo', 'test-repo', 'quiz', 'stats');
    assert.equal(stats[0].total, 4);
    assert.equal(stats[0].correct, 3);
  });
});

// ---------------------------------------------------------------------------
describe('repo-prefs', () => {
  const db = freshDb('repo');
  const cli = makeCli(db);
  before(() => cli('init'));
  after(() => cleanup(db));

  it('detect returns repo_id and repo_name', () => {
    const r = cli('repo', 'detect');
    assert.ok(typeof r.repo_id === 'string' && r.repo_id.length > 0);
    assert.ok(typeof r.repo_name === 'string' && r.repo_name.length > 0);
  });

  it('pref returns exists:false for unknown repo', () => {
    const r = cli('repo', 'pref', 'unknown-repo');
    assert.equal(r.exists, false);
  });

  it('enable inserts a preference row', () => {
    const r = cli('repo', 'enable', 'r1', 'demo', '1');
    assert.equal(r.ok, true);
    assert.equal(r.learning_enabled, 1);

    const got = cli('repo', 'pref', 'r1');
    assert.equal(got.exists, true);
    assert.equal(got.learning_enabled, 1);
    assert.equal(got.repo_name, 'demo');
  });

  it('enable updates existing preference (upsert)', () => {
    cli('repo', 'enable', 'r1', 'demo', '0');
    const got = cli('repo', 'pref', 'r1');
    assert.equal(got.learning_enabled, 0);
  });

  it('override creates a debt and debts lists pending only', () => {
    const r = cli('repo', 'override', 'r1', 'task A', 'src/api/', 'jwt');
    assert.equal(r.ok, true);
    assert.ok(typeof r.debt_id === 'number' && r.debt_id > 0);

    const debts = cli('repo', 'debts', 'r1');
    assert.equal(debts.length, 1);
    assert.equal(debts[0].task_description, 'task A');
    assert.equal(debts[0].area, 'src/api/');
    assert.equal(debts[0].topics_skipped, 'jwt');
    assert.equal(debts[0].status, 'pending');
  });

  it('catch-up moves a debt to caught_up', () => {
    const r = cli('repo', 'override', 'r1', 'task B');
    cli('repo', 'catch-up', String(r.debt_id));
    const debts = cli('repo', 'debts', 'r1');
    // debts only lists pending, so task B should not appear
    assert.ok(debts.every((d) => d.id !== r.debt_id));
  });

  it('dismiss moves a debt to dismissed', () => {
    const r = cli('repo', 'override', 'r1', 'task C');
    cli('repo', 'dismiss', String(r.debt_id));
    const debts = cli('repo', 'debts', 'r1');
    assert.ok(debts.every((d) => d.id !== r.debt_id));
  });

  it('touch updates last_session_at without errors', () => {
    const r = cli('repo', 'touch', 'r1');
    assert.equal(r.ok, true);
  });
});

// ---------------------------------------------------------------------------
describe('review-scheduler', () => {
  const db = freshDb('review');
  const cli = makeCli(db);
  before(() => {
    cli('init');
    cli('--repo', 'r', 'topic', 'upsert', 't1', 'auth', 'T1', 'global', '1');
    cli('--repo', 'r', 'topic', 'upsert', 't2', 'auth', 'T2', 'global', '1');
  });
  after(() => cleanup(db));

  it('init-topic seeds default SM-2 state', () => {
    const r = cli('--repo', 'r', 'review', 'init-topic', 't1');
    assert.equal(r.ok, true);
    const state = cli('--repo', 'r', 'review', 'state', 't1');
    assert.equal(state.length, 1);
    assert.equal(state[0].ease_factor, 2.5);
    assert.equal(state[0].interval_days, 1);
    assert.equal(state[0].correct_streak, 0);
    assert.equal(state[0].lapse_count, 0);
  });

  it('init-topic is idempotent', () => {
    cli('--repo', 'r', 'review', 'init-topic', 't1');
    const state = cli('--repo', 'r', 'review', 'state', 't1');
    assert.equal(state.length, 1);
  });

  it("record 'good' doubles interval and increments streak", () => {
    const after = cli('--repo', 'r', 'review', 'record', 't1', 'good');
    assert.equal(after[0].interval_days, 2);
    assert.equal(after[0].ease_factor, 2.5);
    assert.equal(after[0].correct_streak, 1);
  });

  it("record 'easy' bumps ease and multiplies interval by 2.5", () => {
    const after = cli('--repo', 'r', 'review', 'record', 't1', 'easy');
    // From previous (ef=2.5, days=2): ef=2.65, days=5, streak=2
    assert.equal(after[0].ease_factor, 2.65);
    assert.equal(after[0].interval_days, 5);
    assert.equal(after[0].correct_streak, 2);
  });

  it("record 'hard' lowers ease and multiplies by 1.3", () => {
    const after = cli('--repo', 'r', 'review', 'record', 't1', 'hard');
    // From (ef=2.65, days=5): ef=2.5, days=6.5, streak=3
    assert.equal(after[0].ease_factor, 2.5);
    assert.equal(after[0].interval_days, 6.5);
    assert.equal(after[0].correct_streak, 3);
  });

  it("record 'lapse' resets interval and bumps lapse_count", () => {
    const after = cli('--repo', 'r', 'review', 'record', 't1', 'lapse');
    assert.equal(after[0].interval_days, 1);
    assert.equal(after[0].correct_streak, 0);
    assert.equal(after[0].lapse_count, 1);
    // ef = max(1.3, 2.5 - 0.2) = 2.3
    assert.equal(after[0].ease_factor, 2.3);
  });

  it('rejects unknown outcomes', () => {
    assert.throws(() => cli('--repo', 'r', 'review', 'record', 't1', 'bogus'));
  });

  it('next-due lists topics with due reviews', () => {
    cli('--repo', 'r', 'review', 'init-topic', 't2');
    const due = cli('--repo', 'r', 'review', '--limit', '5', 'next-due');
    assert.ok(Array.isArray(due));
    // t1 has been pushed forward by previous good/easy/hard/lapse reviews,
    // so only the freshly-initialised t2 should be due now.
    const ids = due.map((d) => d.topic_id);
    assert.ok(ids.includes('t2'), 't2 should be due');
  });

  it('lapses lists topics with lapses', () => {
    const lapses = cli('--repo', 'r', 'review', 'lapses');
    assert.ok(Array.isArray(lapses));
    const t1 = lapses.find((l) => l.topic_id === 't1');
    assert.ok(t1, 't1 should appear after a lapse');
    assert.equal(t1.lapse_count, 1);
  });
});

// ---------------------------------------------------------------------------
describe('session-tracker', () => {
  const db = freshDb('session');
  const cli = makeCli(db);
  let sid;
  before(() => cli('init'));
  after(() => cleanup(db));

  it('start opens a new session', () => {
    const r = cli('--repo', 'r', 'session', 'start');
    assert.match(r.session_id, /^sess-\d{8}-\d{6}-[a-f0-9]{8}$/);
    assert.equal(r.repo_id, 'r');
    sid = r.session_id;
  });

  it('active returns the running session', () => {
    const rows = cli('--repo', 'r', 'session', 'active');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, sid);
    assert.equal(rows[0].ended_at, null);
  });

  it('rate sets self_rated_quality (1-5)', () => {
    const r = cli('session', 'rate', sid, '4');
    assert.equal(r.ok, true);
    assert.equal(r.self_rated_quality, 4);
    const got = cli('session', 'get', sid);
    assert.equal(got[0].self_rated_quality, 4);
  });

  it('rate rejects values outside 1-5', () => {
    assert.throws(() => cli('session', 'rate', sid, '7'));
    assert.throws(() => cli('session', 'rate', sid, '0'));
  });

  it('note appends notes with newline separator', () => {
    cli('session', 'note', sid, 'first note');
    cli('session', 'note', sid, "with 'quotes'");
    const got = cli('session', 'get', sid);
    assert.equal(got[0].notes, "first note\nwith 'quotes'");
  });

  it('suggest-break returns a boolean', () => {
    const r = cli('session', 'suggest-break', sid);
    assert.equal(r.session_id, sid);
    assert.equal(typeof r.break_suggested, 'boolean');
  });

  it('end closes the session and records duration', () => {
    const r = cli('session', 'end', sid);
    assert.equal(r[0].id, sid);
    assert.ok(r[0].ended_at, 'ended_at should be set');
    assert.ok(typeof r[0].duration_minutes === 'number');

    const active = cli('--repo', 'r', 'session', 'active');
    assert.equal(active.length, 0, 'no active session after end');
  });
});

// Final cleanup of scratch dir on process exit (best-effort).
process.on('exit', () => {
  try {
    fs.rmSync(SCRATCH, { recursive: true, force: true });
  } catch {}
});
