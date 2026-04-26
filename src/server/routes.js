// src/server/routes.js — Dispatch-table-based API routing.
import fs from 'node:fs';
import path from 'node:path';
import {
  VERSION,
  corsHeadersFor,
  readJsonBody,
  repoKbDir,
  sendError,
  sendJson,
} from './util.js';
import { sseAttach, sseBroadcast } from './sse.js';
import * as q from './queries.js';

function repoOf(parsed, defaultRepo) {
  return parsed.searchParams.get('repo') || defaultRepo || 'default';
}

function handleHealth(req, res) {
  return sendJson(res, { ok: true, version: VERSION });
}

function handleSSE(req, res) {
  return sseAttach(req, res);
}

async function handleNotify(req, res) {
  // Require a custom header so browsers must send a CORS preflight; this
  // blocks simple cross-site form/script POSTs that could inject SSE events.
  if (!req.headers['x-lf-notify']) {
    return sendError(res, 403, 'missing X-LF-Notify header');
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendError(res, 400, err.message || 'invalid body');
  }
  if (!body || typeof body.type !== 'string') {
    return sendError(res, 400, 'type required');
  }
  sseBroadcast({ ts: Date.now(), ...body });
  return sendJson(res, { ok: true });
}

function handleProfile(req, res, parsed, defaultRepo) {
  return sendJson(res, q.getProfile(repoOf(parsed, defaultRepo)));
}

function handleGetTopic(req, res, parsed, defaultRepo, m) {
  return sendJson(res, q.getTopic(decodeURIComponent(m[1]), repoOf(parsed, defaultRepo)));
}

async function handleUpsertTopic(req, res, parsed, defaultRepo) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendError(res, 400, err.message || 'invalid body');
  }
  const { id, domain, title, scope, depth } = body;
  const bodyRepo = body.repo || repoOf(parsed, defaultRepo);
  if (!id || !domain || !title || !scope) {
    return sendError(res, 400, 'id, domain, title, scope required');
  }
  return sendJson(res, q.upsertTopic({
    id, domain, title, scope, depth: depth ?? 1, repo: bodyRepo,
  }));
}

function handleQuizStats(req, res, parsed, defaultRepo) {
  return sendJson(res, q.getQuizStats(repoOf(parsed, defaultRepo)));
}

function handleAchievements(req, res, parsed, defaultRepo) {
  return sendJson(res, q.getAchievements(repoOf(parsed, defaultRepo)));
}

function handleCurriculum(req, res, parsed, defaultRepo, m) {
  return sendJson(res, q.getCurriculum(decodeURIComponent(m[1])));
}

function handleRepoPref(req, res, parsed, defaultRepo, m) {
  return sendJson(res, q.getRepoPref(decodeURIComponent(m[1])));
}

function handleReviewNextDue(req, res, parsed, defaultRepo) {
  const limit = parseInt(parsed.searchParams.get('limit') || '5', 10) || 5;
  return sendJson(res, q.getReviewNextDue(repoOf(parsed, defaultRepo), limit));
}

function handleSession(req, res, parsed, defaultRepo, m) {
  return sendJson(res, q.getSession(decodeURIComponent(m[1])));
}

function handleRepos(req, res) {
  return sendJson(res, q.listRepos());
}

function handleTopicsList(req, res, parsed, defaultRepo) {
  const repo = repoOf(parsed, defaultRepo);
  const filters = {
    domain: parsed.searchParams.get('domain') || undefined,
    status: parsed.searchParams.get('status') || undefined,
    depth: parsed.searchParams.get('depth') || undefined,
  };
  return sendJson(res, q.listTopics(repo, filters));
}

function handleQuizHistory(req, res, parsed, defaultRepo) {
  const bucket = parsed.searchParams.get('bucket') === 'week' ? 'week' : 'day';
  return sendJson(res, q.getQuizHistory(repoOf(parsed, defaultRepo), bucket));
}

function handleQuizByTopic(req, res, parsed, defaultRepo) {
  return sendJson(res, q.getQuizByTopic(repoOf(parsed, defaultRepo)));
}

function handleSessionsList(req, res, parsed, defaultRepo) {
  const repo = repoOf(parsed, defaultRepo);
  const limit = parsed.searchParams.get('limit') || 20;
  const since = parsed.searchParams.get('since') || undefined;
  return sendJson(res, q.listSessions(repo, { limit, since }));
}

function handleDebts(req, res, parsed, defaultRepo) {
  return sendJson(res, q.getDebts(repoOf(parsed, defaultRepo)));
}

function handleKbIndex(req, res, parsed, defaultRepo) {
  const repo = repoOf(parsed, defaultRepo);
  const dir = repoKbDir(repo);
  let files = [];
  try {
    if (fs.existsSync(dir)) {
      files = fs.readdirSync(dir)
        .filter((f) => f.endsWith('.html') || f.endsWith('.md'))
        .map((f) => {
          const full = path.join(dir, f);
          const stat = fs.statSync(full);
          return {
            name: f,
            path: `/${f}`,
            size: stat.size,
            mtime: stat.mtime.toISOString(),
          };
        });
    }
  } catch (err) {
    return sendError(res, 500, `kb index failed: ${err.message}`);
  }
  return sendJson(res, files);
}

const routes = [
  { method: 'GET', pattern: /^\/health$/, handler: handleHealth },
  { method: 'GET', pattern: /^\/sse$/, handler: handleSSE },
  { method: 'POST', pattern: /^\/notify$/, handler: handleNotify },
  { method: 'GET', pattern: /^\/profile$/, handler: handleProfile },
  { method: 'GET', pattern: /^\/topics\/([^/]+)$/, handler: handleGetTopic },
  { method: 'POST', pattern: /^\/topics$/, handler: handleUpsertTopic },
  { method: 'GET', pattern: /^\/topics$/, handler: handleTopicsList },
  { method: 'GET', pattern: /^\/quiz\/stats$/, handler: handleQuizStats },
  { method: 'GET', pattern: /^\/quiz\/history$/, handler: handleQuizHistory },
  { method: 'GET', pattern: /^\/quiz\/by-topic$/, handler: handleQuizByTopic },
  { method: 'GET', pattern: /^\/achievements$/, handler: handleAchievements },
  { method: 'GET', pattern: /^\/curriculum\/([^/]+)$/, handler: handleCurriculum },
  { method: 'GET', pattern: /^\/repo\/pref\/(.+)$/, handler: handleRepoPref },
  { method: 'GET', pattern: /^\/repos$/, handler: handleRepos },
  { method: 'GET', pattern: /^\/review\/next-due$/, handler: handleReviewNextDue },
  { method: 'GET', pattern: /^\/session\/([^/]+)$/, handler: handleSession },
  { method: 'GET', pattern: /^\/sessions$/, handler: handleSessionsList },
  { method: 'GET', pattern: /^\/debts$/, handler: handleDebts },
  { method: 'GET', pattern: /^\/kb\/index$/, handler: handleKbIndex },
];

export async function handleApi(req, res, parsed, defaultRepo) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeadersFor(res));
    return res.end();
  }

  const apiPath = parsed.pathname.replace(/^\/api\/v1/, '');

  for (const route of routes) {
    if (req.method !== route.method) continue;
    const m = apiPath.match(route.pattern);
    if (m) return route.handler(req, res, parsed, defaultRepo, m);
  }
  return sendError(res, 404, `no route for ${req.method} ${parsed.pathname}`);
}
