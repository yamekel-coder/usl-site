const express = require('express');
const db = require('../database/db');

const router = express.Router();

router.get('/players/:id', function (req, res) {
  const user = db.get().prepare(
    'SELECT id, username, role, avatar_url, country FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ ok: false, error: 'Player not found' });
  res.render('partials/player-detail', {
    player: {
      id: user.id,
      username: user.username,
      role: user.role,
      country: user.country,
      rating: db.getPlayerRating(user.id),
      avatar_url: user.avatar_url
    },
    records: db.getPlayerRecords(user.id)
  });
});

router.get('/countries/:name', function (req, res) {
  const name = decodeURIComponent(req.params.name);
  const list = db.getCountries();
  const country = list.find(function (c) { return c.country === name; });
  if (!country) return res.status(404).json({ ok: false, error: 'Country not found' });
  country.flag = db.getCountryFlag(country.country);
  res.render('partials/country-detail', { country: country });
});

router.get('/demons/:id', function (req, res) {
  const demon = db.getDemonById(req.params.id);
  if (!demon) return res.status(404).json({ ok: false, error: 'Demon not found' });
  demon.points = db.calculateDemonPoints(demon.position);
  const records = db.getDemonRecords(demon.id);
  res.render('partials/demon-detail', { demon: demon, records: records });
});

module.exports = router;
