const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', function (req, res) {
  const demons = db.getDemons();
  const demonPoints = demons.map(function (d) {
    return Object.assign({}, d, { points: db.calculateDemonPoints(d.position) });
  });
  const selected = demonPoints.length > 0 ? demonPoints[0] : null;
  const records = selected ? db.getDemonRecords(selected.id) : [];

  const user = res.locals.user;
  const isMod = !!user && (user.role === 'moderator' || user.role === 'admin');
  const isAdmin = !!user && user.role === 'admin';

  const data = {
    demons: demonPoints,
    selected: selected,
    records: records,
    user: user,
    toast: req.query.toast || null,
    recordMsg: req.query.record === 'success' ? 'success' : null
  };

  if (isMod) {
    data.isMod = isMod;
    data.isAdmin = isAdmin;
    data.pendingRecords = db.getPendingRecords();
    data.levelRequests = db.getLevelRequests('pending');
    data.modApplications = isAdmin ? db.getSubmissions('moderator', 'pending') : [];
    data.users = isAdmin ? db.getUsers() : [];
  }

  res.render('list', data);
});

module.exports = router;
