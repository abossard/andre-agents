#!/usr/bin/env node
// src/server.js — HTTP server for the learning-first plugin web UI.
// Zero npm dependencies. Uses only node: built-in modules.
process.removeAllListeners('warning');

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const url = require('node:url');

const db = require('./db');

const VERSION = '0.3.0';
const DEFAULT_PORT = 3142;
const UDS_PATH = path.join(os.homedir(), '.learning-first', 'server.sock');
const KB_ROOT = path.join(os.homedir(), '.learning-first', 'knowledge-base');

// ---------- arg parsing ----------
function parseArgs(argv) {
  const out = { port: DEFAULT_PORT, repo: null, uds: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') out.port = parseInt(argv[++i], 10) || DEFAULT_PORT;
    else if (a === '--repo') out.repo = argv[++i];
    else if (a === '--uds') out.uds = true;
  }
  return out;
}

// ---------- utilities ----------
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function repoSlug(repo) {
  return String(repo || 'default').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function repoKbDir(repo) {
  return path.join(KB_ROOT, repoSlug(repo));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function mimeFor(p) {
  return MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...CORS_HEADERS,
  });
  res.end(body);
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    ...CORS_HEADERS,
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

async function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(new Error('invalid JSON: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

// ---------- SSE ----------
const sseClients = new Set();

function sseAttach(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    ...CORS_HEADERS,
  });
  res.write(`: connected\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'hello', version: VERSION })}\n\n`);
  sseClients.add(res);
  const heartbeat = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch { /* ignore */ }
  }, 25000);
  const cleanup = () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  };
  req.on('close', cleanup);
  req.on('error', cleanup);
}

function sseBroadcast(payload) {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try { client.write(line); } catch { sseClients.delete(client); }
  }
}

// ---------- DB-backed handlers (mirror cli.js) ----------
function getProfile(repo) {
  const topics = db.query(
    `SELECT * FROM knowledge_topics WHERE repo_id=:repo OR repo_id='_global' ORDER BY first_seen_at DESC`,
    { repo }
  );
  const achievements = db.query(
    `SELECT * FROM achievements WHERE repo_id=:repo OR repo_id='_global' ORDER BY earned_at DESC`,
    { repo }
  );
  const repoKnowledge = db.query(
    `SELECT * FROM repo_knowledge WHERE repo_id=:repo ORDER BY last_assessed_at DESC`,
    { repo }
  );
  const debts = db.query(
    `SELECT * FROM override_debts WHERE repo_id=:repo AND status='pending' ORDER BY created_at DESC`,
    { repo }
  );
  return {
    repo_id: repo,
    topics,
    achievements,
    repo_knowledge: repoKnowledge,
    override_debts: debts,
  };
}

function getTopic(id, repo) {
  return db.query(
    `SELECT * FROM knowledge_topics WHERE id=:id AND (repo_id=:repo OR repo_id='_global')`,
    { id, repo }
  );
}

function upsertTopic({ id, domain, title, scope, depth, repo }) {
  db.exec(
    `INSERT INTO knowledge_topics (id, repo_id, domain, title, scope, depth_level)
     VALUES (:id, :repo, :domain, :title, :scope, :depth)
     ON CONFLICT(id, repo_id) DO UPDATE SET
       depth_level = MAX(knowledge_topics.depth_level, excluded.depth_level),
       domain = excluded.domain,
       title = excluded.title`,
    { id, repo, domain, title, scope, depth: parseInt(depth, 10) || 1 }
  );
  return { ok: true, id, repo_id: repo };
}

function getQuizStats(repo) {
  return db.query(
    `SELECT
        COUNT(*) as total,
        SUM(correct) as correct,
        ROUND(100.0 * SUM(correct) / MAX(COUNT(*), 1)) as pct_correct,
        COUNT(DISTINCT topic_id) as topics_quizzed
     FROM quiz_results WHERE repo_id=:repo`,
    { repo }
  );
}

function getAchievements(repo) {
  return db.query(
    `SELECT * FROM achievements WHERE repo_id=:repo OR repo_id='_global' ORDER BY earned_at DESC`,
    { repo }
  );
}

function getCurriculum(taskId) {
  const curr = db.query(`SELECT * FROM curricula WHERE task_id=:t`, { t: taskId });
  const modules = db.query(
    `SELECT * FROM curriculum_modules WHERE task_id=:t ORDER BY module_index ASC`,
    { t: taskId }
  );
  return { curriculum: curr[0] || null, modules };
}

function getRepoPref(repoId) {
  const rows = db.query(
    `SELECT * FROM repo_preferences WHERE repo_id=:r`,
    { r: repoId }
  );
  if (rows.length === 0) return { exists: false };
  return { ...rows[0], exists: true };
}

function getReviewNextDue(repo, limit) {
  return db.query(
    `SELECT trs.*, kt.title, kt.domain, kt.depth_level, kt.status
     FROM topic_review_state trs
     LEFT JOIN knowledge_topics kt
       ON kt.id = trs.topic_id AND kt.repo_id = trs.repo_id
     WHERE trs.repo_id=:repo
       AND trs.next_review_at IS NOT NULL
       AND trs.next_review_at <= datetime('now')
     ORDER BY trs.next_review_at ASC
     LIMIT :limit`,
    { repo, limit }
  );
}

function getSession(id) {
  return db.query(`SELECT * FROM learning_sessions WHERE id=:id`, { id });
}

// ---------- welcome page ----------
const WELCOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Learning-First</title>
  <style>
    body { font-family: system-ui; background: #1a1a2e; color: #e0e0e0;
           max-width: 800px; margin: 60px auto; padding: 0 20px; }
    h1 { color: #4ade80; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; }
    .verified { background: #166534; color: #4ade80; border-left: 3px solid #4ade80; }
    .inferred { background: #422006; color: #fbbf24; border-left: 3px solid #fbbf24; }
    .suggested { background: #1f1f1f; color: #f87171; border: 1px dashed #f87171; }
    code { background: #2d2d44; padding: 2px 6px; border-radius: 3px; }
    pre { background: #2d2d44; padding: 16px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🎓 Learning-First</h1>
  <p>Your personal knowledge base is empty. Start a learning session in the CLI:</p>
  <pre><code>&gt; Add authentication to the API</code></pre>
  <p>As you learn, concept pages will appear here automatically.</p>
  <div id="status"></div>
  <script>
    const es = new EventSource('/api/v1/sse');
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'page-update') location.reload();
    };
  </script>
</body>
</html>
`;

// ---------- static serving ----------
function safeJoin(root, relPath) {
  const target = path.resolve(root, '.' + path.posix.normalize('/' + relPath));
  if (!target.startsWith(path.resolve(root))) return null;
  return target;
}

function serveStatic(req, res, repo, urlPath) {
  const root = repoKbDir(repo);
  ensureDir(root);

  // Decode URL path (strip query, decode %xx)
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';

  const filePath = safeJoin(root, rel);
  if (!filePath) return sendError(res, 403, 'forbidden');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat) {
      // For root request, serve welcome page if KB is empty.
      if (rel === '/index.html') {
        const entries = fs.readdirSync(root).filter((e) => !e.startsWith('.'));
        if (entries.length === 0) {
          return sendText(res, 200, WELCOME_HTML, 'text/html; charset=utf-8');
        }
      }
      return sendError(res, 404, 'not found');
    }
    if (stat.isDirectory()) {
      const idx = path.join(filePath, 'index.html');
      if (fs.existsSync(idx)) return streamFile(res, idx);
      return sendError(res, 404, 'directory listing disabled');
    }
    streamFile(res, filePath);
  });
}

function streamFile(res, filePath) {
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': mimeFor(filePath),
    'Cache-Control': 'no-cache',
    ...CORS_HEADERS,
  });
  stream.on('error', () => {
    try { res.end(); } catch { /* ignore */ }
  });
  stream.pipe(res);
}

// ---------- routing ----------
async function handleApi(req, res, parsedUrl, defaultRepo) {
  const pathname = parsedUrl.pathname;
  const qs = parsedUrl.searchParams;
  const repo = qs.get('repo') || defaultRepo || 'default';

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // Health
  if (pathname === '/api/v1/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, version: VERSION });
  }

  // SSE
  if (pathname === '/api/v1/sse' && req.method === 'GET') {
    return sseAttach(req, res);
  }

  // Profile
  if (pathname === '/api/v1/profile' && req.method === 'GET') {
    return sendJson(res, 200, getProfile(repo));
  }

  // Topic by id: /api/v1/topics/:id
  let m = pathname.match(/^\/api\/v1\/topics\/([^/]+)$/);
  if (m && req.method === 'GET') {
    return sendJson(res, 200, getTopic(decodeURIComponent(m[1]), repo));
  }

  // Topics upsert
  if (pathname === '/api/v1/topics' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const { id, domain, title, scope, depth } = body;
    const bodyRepo = body.repo || repo;
    if (!id || !domain || !title || !scope) {
      return sendError(res, 400, 'id, domain, title, scope required');
    }
    return sendJson(res, 200, upsertTopic({
      id, domain, title, scope, depth: depth ?? 1, repo: bodyRepo,
    }));
  }

  // Quiz stats
  if (pathname === '/api/v1/quiz/stats' && req.method === 'GET') {
    return sendJson(res, 200, getQuizStats(repo));
  }

  // Achievements
  if (pathname === '/api/v1/achievements' && req.method === 'GET') {
    return sendJson(res, 200, getAchievements(repo));
  }

  // Curriculum
  m = pathname.match(/^\/api\/v1\/curriculum\/([^/]+)$/);
  if (m && req.method === 'GET') {
    return sendJson(res, 200, getCurriculum(decodeURIComponent(m[1])));
  }

  // Repo pref
  m = pathname.match(/^\/api\/v1\/repo\/pref\/(.+)$/);
  if (m && req.method === 'GET') {
    return sendJson(res, 200, getRepoPref(decodeURIComponent(m[1])));
  }

  // Review next-due
  if (pathname === '/api/v1/review/next-due' && req.method === 'GET') {
    const limit = parseInt(qs.get('limit') || '5', 10) || 5;
    return sendJson(res, 200, getReviewNextDue(repo, limit));
  }

  // Session
  m = pathname.match(/^\/api\/v1\/session\/([^/]+)$/);
  if (m && req.method === 'GET') {
    return sendJson(res, 200, getSession(decodeURIComponent(m[1])));
  }

  return sendError(res, 404, `no route for ${req.method} ${pathname}`);
}

function createApp(defaultRepo) {
  return async (req, res) => {
    const parsed = new URL(req.url, 'http://localhost');
    try {
      if (parsed.pathname.startsWith('/api/')) {
        await handleApi(req, res, parsed, defaultRepo);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendError(res, 405, 'method not allowed');
      }
      serveStatic(req, res, defaultRepo || 'default', parsed.pathname);
    } catch (err) {
      try {
        sendError(res, 500, err && err.message ? err.message : 'internal error');
      } catch { /* ignore */ }
    }
  };
}

// ---------- KB watcher ----------
function watchKb(repo) {
  const dir = repoKbDir(repo);
  ensureDir(dir);
  let debounceTimer = null;
  try {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        sseBroadcast({
          type: 'page-update',
          event: eventType,
          file: filename || null,
          ts: Date.now(),
        });
      }, 100);
    });
  } catch (err) {
    // recursive watch not supported on some platforms; degrade gracefully
    console.warn(`⚠️  fs.watch unavailable for ${dir}: ${err.message}`);
  }
}

// ---------- startup ----------
function start() {
  const args = parseArgs(process.argv.slice(2));

  // Init DB (will throw with helpful message if schema missing)
  try { db.init(); } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  const defaultRepo = args.repo || db.detectRepoId();
  ensureDir(KB_ROOT);
  ensureDir(repoKbDir(defaultRepo));
  watchKb(defaultRepo);

  const server = http.createServer(createApp(defaultRepo));

  const onShutdown = () => {
    try { server.close(); } catch { /* ignore */ }
    try { db.close(); } catch { /* ignore */ }
    if (fs.existsSync(UDS_PATH)) {
      try { fs.unlinkSync(UDS_PATH); } catch { /* ignore */ }
    }
    process.exit(0);
  };
  process.on('SIGINT', onShutdown);
  process.on('SIGTERM', onShutdown);

  const startTcp = () => {
    server.listen(args.port, '127.0.0.1', () => {
      console.log(`🌐 Learning companion: http://localhost:${args.port}/`);
      console.log(`   API:  http://localhost:${args.port}/api/v1/health`);
      console.log(`   Repo: ${defaultRepo}`);
      console.log(`   KB:   ${repoKbDir(defaultRepo)}`);
    });
  };

  if (args.uds) {
    ensureDir(path.dirname(UDS_PATH));
    if (fs.existsSync(UDS_PATH)) {
      try { fs.unlinkSync(UDS_PATH); } catch { /* ignore */ }
    }
    server.once('error', (err) => {
      console.warn(`⚠️  UDS bind failed (${err.message}); falling back to TCP`);
      startTcp();
    });
    server.listen(UDS_PATH, () => {
      try { fs.chmodSync(UDS_PATH, 0o600); } catch { /* ignore */ }
      console.log(`🌐 Learning companion (UDS): ${UDS_PATH}`);
      console.log(`   Repo: ${defaultRepo}`);
    });
  } else {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${args.port} in use`);
        process.exit(1);
      }
      console.error(`❌ ${err.message}`);
      process.exit(1);
    });
    startTcp();
  }
}

if (require.main === module) {
  start();
}

module.exports = { createApp, sseBroadcast, repoKbDir };
