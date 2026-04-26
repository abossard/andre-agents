// src/server/static.js — Serves the SPA shell, /app/* assets, and per-repo KB.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  corsHeadersFor,
  ensureDir,
  mimeFor,
  repoKbDir,
  sendError,
} from './util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const SPA_INDEX = path.join(PUBLIC_DIR, 'index.html');

export function safeJoin(root, relPath) {
  const resolved = path.resolve(root);
  const target = path.resolve(root, '.' + path.posix.normalize('/' + relPath));
  if (target !== resolved && !target.startsWith(resolved + path.sep)) return null;
  return target;
}

export function streamFile(res, filePath) {
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': mimeFor(filePath),
    'Cache-Control': 'no-cache',
    ...corsHeadersFor(res),
  });
  stream.on('error', () => {
    try { res.end(); } catch { /* ignore */ }
  });
  stream.pipe(res);
}

function serveSpaAsset(res, urlPath) {
  // urlPath like '/app/style.css' or '/app/' -> map to PUBLIC_DIR
  const rel = urlPath.replace(/^\/app\/?/, '/') || '/';
  const target = safeJoin(PUBLIC_DIR, rel === '/' ? '/index.html' : rel);
  if (!target) return sendError(res, 403, 'forbidden');
  fs.stat(target, (err, stat) => {
    if (err || !stat || !stat.isFile()) return sendError(res, 404, 'not found');
    streamFile(res, target);
  });
}

function serveSpaIndex(res) {
  fs.stat(SPA_INDEX, (err, stat) => {
    if (err || !stat) return sendError(res, 500, 'spa missing');
    streamFile(res, SPA_INDEX);
  });
}

export function serveStatic(req, res, repo, urlPath) {
  const rel = decodeURIComponent(urlPath || '/');

  // SPA assets
  if (rel === '/app' || rel === '/app/' || rel.startsWith('/app/')) {
    return serveSpaAsset(res, rel);
  }

  // Root: SPA shell
  if (rel === '/' || rel === '') {
    return serveSpaIndex(res);
  }

  // KB content (everything else under per-repo KB dir)
  const root = repoKbDir(repo);
  ensureDir(root);

  const filePath = safeJoin(root, rel);
  if (!filePath) return sendError(res, 403, 'forbidden');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat) return sendError(res, 404, 'not found');
    if (stat.isDirectory()) {
      const idx = path.join(filePath, 'index.html');
      if (fs.existsSync(idx)) return streamFile(res, idx);
      return sendError(res, 404, 'directory listing disabled');
    }
    streamFile(res, filePath);
  });
}
