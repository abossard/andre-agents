// src/server/sse.js — Server-Sent Events broadcast layer.
import { VERSION, corsHeadersFor } from './util.js';

export const sseClients = new Set();

export function sseAttach(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    ...corsHeadersFor(res),
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

export function sseBroadcast(payload) {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try { client.write(line); } catch { sseClients.delete(client); }
  }
}
