const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// Block any links: http(s)://, www., and bare domains like site.com or sub.site.tld
function containsLink(text) {
  if (!text) return false;
  const patterns = [
    /https?:\/\//i,
    /\bwww\./i,
    /\b[\w-]+(\.[\w-]{2,}){1,}\b\/\S/i,        // domain with path
    /\b[\w-]+\.(com|net|org|ru|io|gg|tv|xyz|top|info|me|co|us|uk|de|fr|nl|su|рф)\b/i
  ];
  return patterns.some(function (p) { return p.test(text); });
}

// GET /chat — chat page
router.get('/', function (req, res) {
  const messages = db.getChatMessages(100);
  res.render('chat', {
    user: res.locals.user || null,
    messages: messages,
    count: db.getChatMessageCount(),
    error: req.query.error || null
  });
});

// GET /chat/messages — JSON for live polling
router.get('/messages', function (req, res) {
  const since = parseInt(req.query.since, 10) || 0;
  const all = db.getChatMessages(100);
  const fresh = since ? all.filter(function (m) { return m.id > since; }) : all;
  res.json({ messages: fresh, count: db.getChatMessageCount() });
});

// POST /chat — send a message (registered users only)
router.post('/', auth.authRequired, function (req, res) {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') !== -1)) {
      return res.status(400).json({ ok: false, error: 'empty' });
    }
    return res.redirect('/chat');
  }
  if (message.length > 500) {
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') !== -1)) {
      return res.status(400).json({ ok: false, error: 'too-long' });
    }
    return res.redirect('/chat?error=too-long');
  }
  if (containsLink(message)) {
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') !== -1)) {
      return res.status(400).json({ ok: false, error: 'no-links' });
    }
    return res.redirect('/chat?error=no-links');
  }
  db.addChatMessage(req.user.id, req.user.username, message);
  const msg = db.get().prepare(
    "SELECT cm.id, cm.user_id, cm.username, cm.message, cm.created_at, u.avatar_url " +
    "FROM chat_messages cm LEFT JOIN users u ON u.id = cm.user_id WHERE cm.id = last_insert_rowid()"
  ).get();
  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') !== -1)) {
    return res.json({ ok: true, message: msg });
  }
  res.redirect('/chat');
});

module.exports = router;
