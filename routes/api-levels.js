const express = require('express');
const db = require('../database/db');

const router = express.Router();

function formatDemon(d, index) {
  const parts = [];
  if (d.position) parts.push('#' + d.position);
  parts.push(d.name);
  if (d.difficulty) parts.push('(' + d.difficulty + ')');
  if (d.creator) parts.push('• ' + d.creator);
  if (d.requirement) parts.push('• ' + d.requirement + '%');
  if (d.shittylist_equiv) parts.push('• ' + d.shittylist_equiv);
  return (index + 1) + '. ' + parts.join(' ');
}

router.get('/demons', function (req, res) {
  const page = Math.max(0, parseInt(req.query.page) || 0);
  const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 10, 100));
  const offset = page * limit;

  const all = db.getDemons();
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, pages - 1);

  const start = currentPage * limit;
  const end = Math.min(start + limit, total);
  const slice = all.slice(start, end);

  const formatted = slice.map(formatDemon).join('\n');
  const response = {
    ok: true,
    page: currentPage + 1,
    pages: pages,
    count: slice.length,
    total: total,
    levels: formatted
  };
  res.json(response);
});

router.get('/demons/search', function (req, res) {
  const q = ((req.query.q || '')).toLowerCase();
  if (!q) return res.status(400).json({ ok: false, error: 'Query q is required' });

  const all = db.getDemons();
  const filtered = all.filter(function (d) {
    return (d.name || '').toLowerCase().includes(q) || (d.creator || '').toLowerCase().includes(q);
  });

  const formatted = filtered.map(formatDemon).join('\n');
  res.json({ ok: true, query: q, total: filtered.length, levels: formatted });
});

module.exports = router;
