const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

router.get('/', auth.authOptional, function (req, res) {
  let players = [];
  let selected = null;
  let records = [];
  try {
    players = db.getPlayers();
    selected = players[0] || null;
    if (selected) records = db.getPlayerRecords(selected.id);
  } catch (e) {
    console.error('[players] failed:', e.message);
  }
  res.render('players', { players: players, selected: selected, records: records });
});

module.exports = router;
