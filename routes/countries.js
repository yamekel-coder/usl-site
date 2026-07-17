const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

router.get('/', auth.authOptional, function (req, res) {
  let countries = [];
  let selected = null;
  try {
    countries = db.getCountries().map(function (c) {
      c.flag = db.getCountryFlag(c.country);
      return c;
    });
    selected = countries[0] || null;
    if (selected && !selected.flag) selected.flag = db.getCountryFlag(selected.country);
  } catch (e) {
    console.error('[countries] failed:', e.message);
  }
  res.render('countries', { countries: countries, selected: selected });
});

module.exports = router;
