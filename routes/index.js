const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', function (req, res) {
  const stats = db.getStats();
  let news = [];
  let demons = [];
  try {
    news = db.getNews(5);
  } catch (e) {
    console.error('[index] news failed:', e.message);
  }
  try {
    demons = db.getDemons();
  } catch (e) {
    console.error('[index] demons failed:', e.message);
  }
  res.render('index', { stats: stats, news: news, demons: demons });
});

module.exports = router;
