const crypto = require('crypto');
const db = require('../database/db');

const SESSION_COOKIE = 'usl_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

function createSession(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE).toISOString();
  const dbInstance = db.get();
  dbInstance.prepare(
    'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(userId, token, expiresAt);
  return token;
}

function deleteSession(token) {
  const dbInstance = db.get();
  dbInstance.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function getUserFromToken(token) {
  if (!token) return null;
  const dbInstance = db.get();
  const row = dbInstance.prepare(
    `SELECT u.id, u.username, u.email, u.role, u.avatar_url
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).get(token);
  return row || null;
}

function authRequired(req, res, next) {
  const user = getUserFromToken(req.cookies[SESSION_COOKIE]);
  if (!user) {
    return res.redirect('/auth/login');
  }
  req.user = user;
  next();
}

function authOptional(req, res, next) {
  const user = getUserFromToken(req.cookies[SESSION_COOKIE]);
  req.user = user || null;
  next();
}

module.exports = {
  SESSION_COOKIE,
  COOKIE_MAX_AGE,
  createSession,
  deleteSession,
  getUserFromToken,
  authRequired,
  authOptional,
};
