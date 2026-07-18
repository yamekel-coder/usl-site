// Audit logging helper. Call from routes to record user actions for the
// admin activity feed (shows username, email, IP, action, target, detail).

const db = require('../database/db');

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1';
}

function log(req, action, target, detail) {
  const u = req.user;
  try {
    db.logAction({
      user_id: u ? u.id : null,
      username: u ? u.username : (req.body && req.body.username) || null,
      email: u ? u.email : (req.body && req.body.email) || null,
      ip: getClientIp(req),
      action: action,
      target: target || null,
      detail: detail || null
    });
  } catch (e) { /* never break the request on log failure */ }
}

module.exports = { log, getClientIp };
