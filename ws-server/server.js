'use strict';

/**
 * Rail Baron WebSocket relay server.
 *
 * Two listeners:
 *   - :3001  WebSocket — game clients connect here (proxied via nginx /ws).
 *            Client sends: { type: 'join', game_id: 123 }
 *            Server sends: { type: 'refresh', game_id: 123 }
 *
 *   - :4000  HTTP (loopback only) — Drupal posts here after any state change.
 *            POST /notify  body: { "game_id": 123 }
 *
 * The server never sees or stores game state — it only relays refresh signals.
 * Authentication stays entirely in Drupal; clients fetch actual state via REST.
 */

const WebSocket = require('ws');
const http      = require('http');

// rooms: Map<gameId (Number), Set<WebSocket>>
const rooms = new Map();

// ---------------------------------------------------------------------------
// WebSocket server — game clients
// ---------------------------------------------------------------------------
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const { type, game_id } = JSON.parse(raw);
      if (type !== 'join' || !game_id) return;

      // Leave previous room if client is rejoining.
      if (ws.gameId != null) {
        rooms.get(ws.gameId)?.delete(ws);
      }

      ws.gameId = Number(game_id);
      if (!rooms.has(ws.gameId)) rooms.set(ws.gameId, new Set());
      rooms.get(ws.gameId).add(ws);
    } catch (_) {}
  });

  ws.on('close', () => {
    if (ws.gameId != null) {
      rooms.get(ws.gameId)?.delete(ws);
    }
  });
});

console.log('[ws-server] WebSocket listening on :3001');

// ---------------------------------------------------------------------------
// Internal HTTP server — Drupal notify endpoint
// ---------------------------------------------------------------------------
const notifyServer = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/notify') {
    res.writeHead(404).end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    try {
      const { game_id } = JSON.parse(body);
      const id   = Number(game_id);
      const room = rooms.get(id);

      if (room && room.size > 0) {
        const msg = JSON.stringify({ type: 'refresh', game_id: id });
        for (const client of room) {
          if (client.readyState === WebSocket.OPEN) client.send(msg);
        }
      }
    } catch (_) {}
    res.writeHead(200).end('ok');
  });
});

notifyServer.listen(4000, '127.0.0.1', () =>
  console.log('[ws-server] Notify endpoint listening on 127.0.0.1:4000'));
