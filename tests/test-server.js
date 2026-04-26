#!/usr/bin/env node
// tests/test-server.js — HTTP test suite for src/server/* (zero deps).
process.removeAllListeners('warning');

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const SCRATCH = path.join(__dirname, '..', '.test-tmp');
fs.mkdirSync(SCRATCH, { recursive: true });
const TEST_DB = path.join(SCRATCH, `server-${Date.now()}-${process.pid}.db`);
process.env.LEARNING_FIRST_DB = TEST_DB;

const { createApp } = await import('../src/server/index.js');
const dbMod = await import('../src/db.js');

function request(server, method, urlPath, { host = 'localhost' } = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        method,
        path: urlPath,
        headers: { host },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function parseJson(body) {
  try { return JSON.parse(body); } catch { return null; }
}

describe('server API', () => {
  let server;
  const REPO = 'test-repo';

  before(async () => {
    dbMod.init();
    // Seed a repo preference + a topic + a quiz result + a session for richer endpoint tests
    dbMod.exec(
      `INSERT OR REPLACE INTO repo_preferences (repo_id, repo_name, learning_enabled, last_session_at)
       VALUES ($id, $name, 1, datetime('now'))`,
      { $id: REPO, $name: 'Test Repo' },
    );
    dbMod.exec(
      `INSERT OR REPLACE INTO knowledge_topics (id, repo_id, domain, title, scope, depth_level)
       VALUES ('topic-a', $repo, 'auth', 'Topic A', 'repo', 2)`,
      { $repo: REPO },
    );
    dbMod.exec(
      `INSERT INTO quiz_results (repo_id, topic_id, question, correct, asked_at)
       VALUES ($repo, 'topic-a', 'q?', 1, datetime('now'))`,
      { $repo: REPO },
    );

    const app = createApp(REPO);
    server = http.createServer(app);
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
  });

  after(async () => {
    await new Promise((r) => server.close(r));
    try { dbMod.close(); } catch { /* ignore */ }
    try { fs.unlinkSync(TEST_DB); } catch { /* ignore */ }
    try { fs.unlinkSync(`${TEST_DB}-wal`); } catch { /* ignore */ }
    try { fs.unlinkSync(`${TEST_DB}-shm`); } catch { /* ignore */ }
  });

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(server, 'GET', '/api/v1/health');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.equal(data.ok, true);
    assert.ok(data.version);
  });

  it('GET /api/v1/profile returns profile shape', async () => {
    const res = await request(server, 'GET', '/api/v1/profile');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok('topics' in data);
    assert.ok('achievements' in data);
    assert.ok('repo_knowledge' in data);
    assert.ok('override_debts' in data);
  });

  it('GET /api/v1/repos returns array', async () => {
    const res = await request(server, 'GET', '/api/v1/repos');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
    assert.ok(data.some((r) => r.repo_id === REPO));
  });

  it('GET /api/v1/topics returns filtered list', async () => {
    const res = await request(server, 'GET', '/api/v1/topics?domain=auth');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
    assert.ok(data.every((t) => t.domain === 'auth'));
  });

  it('GET /api/v1/quiz/stats returns row', async () => {
    const res = await request(server, 'GET', '/api/v1/quiz/stats');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
  });

  it('GET /api/v1/quiz/history?bucket=day returns time series', async () => {
    const res = await request(server, 'GET', '/api/v1/quiz/history?bucket=day');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
    if (data.length > 0) {
      assert.ok('bucket' in data[0]);
      assert.ok('total' in data[0]);
    }
  });

  it('GET /api/v1/quiz/by-topic returns per-topic stats', async () => {
    const res = await request(server, 'GET', '/api/v1/quiz/by-topic');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
  });

  it('GET /api/v1/sessions returns array', async () => {
    const res = await request(server, 'GET', '/api/v1/sessions?limit=5');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
  });

  it('GET /api/v1/debts returns array', async () => {
    const res = await request(server, 'GET', '/api/v1/debts');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
  });

  it('GET /api/v1/kb/index returns array', async () => {
    const res = await request(server, 'GET', '/api/v1/kb/index');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
  });

  it('GET /api/v1/achievements returns array', async () => {
    const res = await request(server, 'GET', '/api/v1/achievements');
    assert.equal(res.status, 200);
    const data = parseJson(res.body);
    assert.ok(Array.isArray(data));
  });

  it('GET /api/v1/unknown returns 404', async () => {
    const res = await request(server, 'GET', '/api/v1/does-not-exist');
    assert.equal(res.status, 404);
  });

  it('rejects non-localhost Host header with 403', async () => {
    const res = await request(server, 'GET', '/api/v1/health', { host: 'evil.com' });
    assert.equal(res.status, 403);
  });

  it('OPTIONS preflight returns 204 with CORS headers', async () => {
    const res = await request(server, 'OPTIONS', '/api/v1/profile');
    assert.equal(res.status, 204);
    assert.ok(res.headers['access-control-allow-origin']);
  });

  it('POST /api/v1/topics validates required fields', async () => {
    // Missing fields → 400
    const addr = server.address();
    const res = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: addr.port,
          method: 'POST',
          path: '/api/v1/topics',
          headers: {
            host: 'localhost',
            'Content-Type': 'application/json',
          },
        },
        (r) => {
          let body = '';
          r.on('data', (d) => { body += d; });
          r.on('end', () => resolve({ status: r.statusCode, body }));
        },
      );
      req.on('error', reject);
      req.end(JSON.stringify({ id: 'x' }));
    });
    assert.equal(res.status, 400);
  });
});
