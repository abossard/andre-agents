// src/server/index.js — Server entry point: app factory, watcher, startup.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as db from '../db.js';
import {
  KB_ROOT,
  UDS_PATH,
  VERSION,
  allowedOriginFor,
  ensureDir,
  isLocalHost,
  parseArgs,
  repoKbDir,
  sendError,
} from './util.js';
import { writeLock, removeLock } from '../daemon.js';
import { sseBroadcast } from './sse.js';
import { handleApi } from './routes.js';
import { serveStatic } from './static.js';

export { sseBroadcast, repoKbDir };

export function createApp(defaultRepo) {
  return async (req, res) => {
    const parsed = new URL(req.url, 'http://localhost');
    res.lfAllowOrigin = allowedOriginFor(req);
    try {
      if (!isLocalHost(req)) {
        return sendError(res, 403, 'forbidden');
      }
      if (parsed.pathname.startsWith('/api/')) {
        await handleApi(req, res, parsed, defaultRepo);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendError(res, 405, 'method not allowed');
      }
      serveStatic(req, res, defaultRepo || 'default', parsed.pathname);
    } catch (err) {
      console.error('Request error:', err);
      try {
        sendError(res, 500, 'internal server error');
      } catch { /* ignore */ }
    }
  };
}

export function watchKb(repo) {
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
    console.warn(`⚠️  fs.watch unavailable for ${dir}: ${err.message}`);
  }
}

export function start() {
  const args = parseArgs(process.argv.slice(2));

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
    try { removeLock(); } catch { /* ignore */ }
    if (fs.existsSync(UDS_PATH)) {
      try { fs.unlinkSync(UDS_PATH); } catch { /* ignore */ }
    }
    process.exit(0);
  };
  process.on('SIGINT', onShutdown);
  process.on('SIGTERM', onShutdown);

  const startTcp = () => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${args.port} in use`);
        process.exit(1);
      }
      console.error(`❌ ${err.message}`);
      process.exit(1);
    });
    server.listen(args.port, '127.0.0.1', () => {
      try {
        writeLock({
          pid: process.pid,
          port: args.port,
          startedAt: new Date().toISOString(),
          version: VERSION,
        });
      } catch (e) {
        console.warn(`⚠️  failed to write lock file: ${e.message}`);
      }
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
    startTcp();
  }
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
