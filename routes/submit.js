const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireAuth(req, res, next) {
  if (!res.locals.user) {
    return res.redirect('/auth/login');
  }
  next();
}

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

router.get('/level', requireAuth, function (req, res) {
  res.render('submit-level', { error: null });
});

router.post('/level', requireAuth, function (req, res) {
  const { name, creators, verifier, level_id, video_url, banner_url, difficulty, requirement, comment } = req.body;
  if (!name || !name.trim()) {
    return res.redirect('/list?toast=' + encodeURIComponent('Level name is required'));
  }
  if (!creators || !creators.trim()) {
    return res.redirect('/list?toast=' + encodeURIComponent('Creator nickname is required'));
  }
  if (!video_url || !video_url.trim()) {
    return res.redirect('/list?toast=' + encodeURIComponent('Video link is required'));
  }
  if (!difficulty || !difficulty.trim()) {
    return res.redirect('/list?toast=' + encodeURIComponent('Difficulty is required'));
  }
  db.createSubmission(res.locals.user.id, 'level-request', {
    name: name.trim(),
    creators: creators.trim(),
    verifier: (verifier || '').trim(),
    level_id: (level_id || '').trim(),
    video_url: video_url.trim(),
    banner_url: (banner_url || '').trim(),
    difficulty: difficulty.trim(),
    requirement: requirement ? parseInt(requirement, 10) || 100 : 100,
    comment: (comment || '').trim()
  });
  res.redirect('/list?toast=' + encodeURIComponent('Level submitted! It will be reviewed by moderators.'));
});

router.get('/moderator', requireAuth, function (req, res) {
  res.render('submit-mod', { error: null });
});

router.post('/moderator', requireAuth, function (req, res) {
  const { age, timezone, hardest_level, mod_before, hours, responsibility, agree } = req.body;
  if (!age || !timezone || !hardest_level || !mod_before || !hours || !responsibility) {
    return res.redirect('/list?toast=' + encodeURIComponent('All fields are required'));
  }
  if (!agree) {
    return res.redirect('/list?toast=' + encodeURIComponent('You must agree to the rules'));
  }
  db.createSubmission(res.locals.user.id, 'moderator', {
    age: age.trim(),
    timezone: (timezone || '').trim(),
    hardest_level: hardest_level.trim(),
    mod_before: mod_before.trim(),
    hours: hours.trim(),
    responsibility: responsibility.trim()
  });
  res.redirect('/list?toast=' + encodeURIComponent('Application sent! It will be reviewed.'));
});

router.post('/record', requireAuth, function (req, res) {
  const levels = toArray(req.body.level);
  const youtubes = toArray(req.body.youtube);
  const raws = toArray(req.body.raw);
  const percents = toArray(req.body.percent);
  const platform = (req.body.platform || '').trim();
  const comment = (req.body.comment || '').trim();

  let created = 0;
  levels.forEach(function (levelId, i) {
    if (!levelId) return;
    const demon = db.getDemonById(parseInt(levelId, 10));
    if (!demon) return;
    const percent = parseInt(percents[i], 10);
    const progress = isNaN(percent) ? (demon.requirement || 100) : percent;
    db.createRecord(res.locals.user.id, {
      demon_id: demon.id,
      progress: progress,
      youtube_url: (youtubes[i] || '').trim(),
      raw_footage_url: (raws[i] || '').trim(),
      platform: platform,
      comment: comment
    });
    created += 1;
  });

  if (created === 0) {
    return res.redirect('/list?toast=' + encodeURIComponent('Select at least one level and provide a link.'));
  }
  res.redirect('/list?record=success');
});

module.exports = router;
