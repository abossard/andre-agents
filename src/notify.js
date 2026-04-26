// src/notify.js — Fire-and-forget SSE notification to the running server.
import http from 'node:http';
import { readLock } from './daemon.js';

export function notifyServer(eventType, data = {}) {
  const lock = readLock();
  if (!lock) return;

  const payload = JSON.stringify({ type: eventType, ...data, ts: Date.now() });

  try {
    const req = http.request({
      hostname: '127.0.0.1',
      port: lock.port,
      path: '/api/v1/notify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-LF-Notify': '1',
        host: 'localhost',
      },
      timeout: 500,
    });

    req.on('error', () => {});
    req.on('timeout', () => { try { req.destroy(); } catch {} });
    req.write(payload);
    req.end();
  } catch {
    /* never throw from notify */
  }
}
