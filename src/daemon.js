// src/daemon.js — Lockfile-based daemon management for the dashboard server.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import http from 'node:http';

const LF_HOME = path.join(os.homedir(), '.learning-first');
const LOCK_FILE = path.join(LF_HOME, 'server.lock');
const LOG_DIR = path.join(LF_HOME, 'logs');
const DEFAULT_PORT = 3142;

export { LF_HOME, LOCK_FILE, LOG_DIR, DEFAULT_PORT };

export function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function readLock() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function writeLock(data) {
  ensureDir(LF_HOME);
  const tmp = LOCK_FILE + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, LOCK_FILE);
}

export function removeLock() {
  try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}

export function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

export function healthCheck(port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: '127.0.0.1',
      port,
      path: '/api/v1/health',
      headers: { host: 'localhost' },
      timeout: timeoutMs,
    }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve(data.ok === true ? data : null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

export async function status() {
  const lock = readLock();
  if (!lock) return { running: false, reason: 'no lock file' };
  if (!isPidAlive(lock.pid)) {
    removeLock();
    return { running: false, reason: 'stale lock (process dead)' };
  }
  const health = await healthCheck(lock.port);
  if (!health) {
    return { running: false, reason: 'process alive but not responding', pid: lock.pid, port: lock.port };
  }
  return { running: true, ...lock, health };
}

export async function startDaemon(opts = {}) {
  const port = opts.port || DEFAULT_PORT;

  const current = await status();
  if (current.running) {
    return { alreadyRunning: true, ...current };
  }

  // If process is alive but not responding, double-check via a fresh health
  // probe before doing anything destructive. We must NOT kill or overwrite a
  // process we can't positively identify as our server (PID-reuse risk).
  if (current.pid && isPidAlive(current.pid)) {
    const health = await healthCheck(port, 1000);
    if (health) {
      writeLock({
        pid: current.pid,
        port,
        startedAt: new Date().toISOString(),
        version: '0.3.0',
      });
      return { alreadyRunning: true, pid: current.pid, port };
    }
    return {
      started: false,
      error: `Process ${current.pid} is using port ${port} but not responding as learning-first server. Kill it manually: kill ${current.pid}`,
    };
  }

  // Safe to start — clean up stale lock
  removeLock();
  ensureDir(LOG_DIR);
  const logFile = path.join(LOG_DIR, 'server.log');
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  const serverPath = path.join(import.meta.dirname, 'server.js');

  const child = spawn(process.execPath, ['--no-warnings', serverPath, '--port', String(port)], {
    detached: true,
    stdio: ['ignore', out, err],
    env: { ...process.env },
  });

  child.unref();

  // Server itself writes the authoritative lock (with its own pid). We write a
  // best-effort fallback so callers see something immediately.
  writeLock({
    pid: child.pid,
    port,
    startedAt: new Date().toISOString(),
    version: '0.3.0',
  });

  // Wait briefly for server to come up (~1s total)
  let health = null;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 100));
    health = await healthCheck(port, 500);
    if (health) break;
  }

  return {
    started: true,
    pid: child.pid,
    port,
    healthy: !!health,
    logFile,
  };
}

export async function stopDaemon() {
  const lock = readLock();
  if (!lock) return { stopped: false, reason: 'not running' };

  if (isPidAlive(lock.pid)) {
    // Verify the PID is actually our server before killing — protects against
    // PID reuse where an unrelated process now holds the lock's PID.
    const health = await healthCheck(lock.port, 1000);
    if (!health) {
      removeLock();
      return {
        stopped: false,
        reason: 'stale lock removed (process not our server)',
        pid: lock.pid,
      };
    }

    try {
      process.kill(lock.pid, 'SIGTERM');
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 200));
        if (!isPidAlive(lock.pid)) break;
      }
      if (isPidAlive(lock.pid)) {
        try { process.kill(lock.pid, 'SIGKILL'); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  removeLock();
  return { stopped: true, pid: lock.pid };
}

export function shouldAutoStart() {
  if (process.env.LEARNING_FIRST_NO_SERVER === '1') return false;
  if (process.env.CI) return false;
  if (process.env.SSH_CONNECTION) return false;
  if (process.env.TERM === 'dumb') return false;
  return true;
}

export function getSshHint(port = DEFAULT_PORT) {
  return `Dashboard available via port forwarding: ssh -L ${port}:localhost:${port} <host>`;
}
