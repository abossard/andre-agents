// src/server/util.js — Shared utilities for the HTTP server.
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

export const VERSION = '0.3.0';
export const DEFAULT_PORT = 3142;
export const UDS_PATH = path.join(os.homedir(), '.learning-first', 'server.sock');
export const KB_ROOT = path.join(os.homedir(), '.learning-first', 'knowledge-base');

export const MIME = {
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

const CORS_BASE = {
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-LF-Notify',
};

const LOCALHOST_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

export function isAllowedOrigin(origin) {
  if (!origin) return false;
  return LOCALHOST_ORIGIN_RE.test(origin);
}

// Compute the Access-Control-Allow-Origin value for a request. Returns null
// when the request's Origin is set but not localhost (so we don't echo back
// arbitrary origins). When Origin is missing (same-origin or non-browser),
// we fall back to the default localhost URL.
export function allowedOriginFor(req, defaultPort = DEFAULT_PORT) {
  const origin = req && req.headers && req.headers.origin;
  if (!origin) return `http://localhost:${defaultPort}`;
  if (isAllowedOrigin(origin)) return origin;
  return null;
}

export function corsHeadersFor(res) {
  const headers = { ...CORS_BASE };
  const allow = res && res.lfAllowOrigin;
  if (allow) headers['Access-Control-Allow-Origin'] = allow;
  return headers;
}

// Backwards-compatible static export — used only for tests/imports that
// reference the legacy constant. Prefer corsHeadersFor(res) at runtime.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `http://localhost:${DEFAULT_PORT}`,
  ...CORS_BASE,
};

export function parseArgs(argv) {
  const out = { port: DEFAULT_PORT, repo: null, uds: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') out.port = parseInt(argv[++i], 10) || DEFAULT_PORT;
    else if (a === '--repo') out.repo = argv[++i];
    else if (a === '--uds') out.uds = true;
  }
  return out;
}

export function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function repoSlug(repo) {
  return String(repo || 'default').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export function repoKbDir(repo) {
  return path.join(KB_ROOT, repoSlug(repo));
}

export function mimeFor(p) {
  return MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
}

export function isLocalHost(req) {
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  return ['localhost', '127.0.0.1', '[::1]'].includes(host);
}

export function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...corsHeadersFor(res),
  });
  res.end(body);
}

export function sendText(res, text, status = 200, mime = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': mime,
    'Content-Length': Buffer.byteLength(text),
    ...corsHeadersFor(res),
  });
  res.end(text);
}

export function sendError(res, status, msg) {
  sendJson(res, { error: msg }, status);
}

export async function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        req.destroy();
        reject(new Error('payload too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}
