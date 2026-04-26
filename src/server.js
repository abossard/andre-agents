#!/usr/bin/env node
// src/server.js — Backwards-compatible re-export of the split server modules.
import { fileURLToPath } from 'node:url';

export { createApp, start, sseBroadcast, repoKbDir } from './server/index.js';

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const { start } = await import('./server/index.js');
  start();
}
