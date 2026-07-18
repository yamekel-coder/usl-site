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
    count: db.getChatMessageCount()
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
    return res.redirect('/chat');
  }
  if (message.length > 500) {
    return res.redirect('/chat?error=too-long');
  }
  if (containsLink(message)) {
    return res.redirect('/chat?error=no-links');
  }
  db.addChatMessage(req.user.id, req.user.username, message);
  res.redirect('/chat');
});

module.exports = router;
