const WebSocket = require('ws');
const db = require('../database/db');

let wss = null;
const clients = new Set();

function init(server) {
  wss = new WebSocket.Server({ server: server, path: '/ws/chat' });

  wss.on('connection', function (ws) {
    clients.add(ws);
    ws.on('close', function () { clients.delete(ws); });
    ws.on('error', function () { clients.delete(ws); });
  });

  return wss;
}

function broadcast(message) {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'message', message: message });
  clients.forEach(function (ws) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(payload); } catch (e) { clients.delete(ws); }
    }
  });
}

// Broadcast a freshly inserted chat message (by id)
function broadcastChatMessage(id) {
  const msg = db.get().prepare(
    "SELECT cm.id, cm.user_id, cm.username, cm.message, cm.created_at, u.avatar_url " +
    "FROM chat_messages cm LEFT JOIN users u ON u.id = cm.user_id WHERE cm.id = ?"
  ).get(id);
  if (msg) broadcast(msg);
}

module.exports = { init, broadcastChatMessage };
