const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

router.get('/', auth.authOptional, function (req, res) {
  let records = [];
  try {
    records = db.getRecords();
  } catch (e) {
    console.error('[records] failed:', e.message);
  }
  res.render('records', { records: records });
});

module.exports = router;
