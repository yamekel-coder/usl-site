const express = require('express');
const router = express.Router();
const db = require('../database/db');
const rateLimit = require('../middleware/ratelimit');

function requireAuth(req, res, next) {
  if (!res.locals.user) {
    return res.redirect('/auth/login');
  }
  next();
}

// Strip anything that could be used for XSS (HTML tags, angle brackets, quotes).
function sanitizeStr(v, maxLen) {
  if (v == null) return '';
  var s = String(v);
  s = s.replace(/<[^>]*>/g, '');          // remove tags
  s = s.replace(/[<>"'\\]/g, '');          // remove breaking chars
  s = s.replace(/javascript:/gi, '');
  s = s.replace(/on\w+\s*=/gi, '');        // remove event handlers
  s = s.trim();
  if (maxLen && s.length > maxLen) s = s.substring(0, maxLen);
  return s;
}

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

router.get('/level', requireAuth, function (req, res) {
  res.render('submit-level', { error: null });
});

router.post('/level', requireAuth, function (req, res) {
  const name = sanitizeStr(req.body.name, 100);
  const creators = sanitizeStr(req.body.creators, 200);
  const verifier = sanitizeStr(req.body.verifier, 100);
  const level_id = sanitizeStr(req.body.level_id, 50);
  const video_url = sanitizeStr(req.body.video_url, 500);
  const banner_url = sanitizeStr(req.body.banner_url, 500);
  const difficulty = sanitizeStr(req.body.difficulty, 20);
  const requirement = req.body.requirement;
  const comment = sanitizeStr(req.body.comment, 500);
  if (!name) {
    return res.redirect('/list?toast=' + encodeURIComponent('Level name is required'));
  }
  if (!creators) {
    return res.redirect('/list?toast=' + encodeURIComponent('Creator nickname is required'));
  }
  if (!video_url) {
    return res.redirect('/list?toast=' + encodeURIComponent('Video link is required'));
  }
  if (!difficulty) {
    return res.redirect('/list?toast=' + encodeURIComponent('Difficulty is required'));
  }
  db.createSubmission(res.locals.user.id, 'level-request', {
    name: name,
    creators: creators,
    verifier: verifier,
    level_id: level_id,
    video_url: video_url,
    banner_url: banner_url,
    difficulty: difficulty,
    requirement: requirement ? parseInt(requirement, 10) || 100 : 100,
    comment: comment
  });
  res.redirect('/list?toast=' + encodeURIComponent('Level submitted! It will be reviewed by moderators.'));
});

router.get('/moderator', requireAuth, function (req, res) {
  res.render('submit-mod', { error: null });
});

router.post('/moderator', requireAuth, function (req, res) {
  const age = sanitizeStr(req.body.age, 10);
  const timezone = sanitizeStr(req.body.timezone, 50);
  const hardest_level = sanitizeStr(req.body.hardest_level, 200);
  const mod_before = sanitizeStr(req.body.mod_before, 500);
  const hours = sanitizeStr(req.body.hours, 20);
  const responsibility = sanitizeStr(req.body.responsibility, 500);
  const agree = req.body.agree;
  if (!age || !timezone || !hardest_level || !mod_before || !hours || !responsibility) {
    return res.redirect('/list?toast=' + encodeURIComponent('All fields are required'));
  }
  if (!agree) {
    return res.redirect('/list?toast=' + encodeURIComponent('You must agree to the rules'));
  }
  db.createSubmission(res.locals.user.id, 'moderator', {
    age: age,
    timezone: timezone,
    hardest_level: hardest_level,
    mod_before: mod_before,
    hours: hours,
    responsibility: responsibility
  });
  res.redirect('/list?toast=' + encodeURIComponent('Application sent! It will be reviewed.'));
});

// Anti-farm: limit how many records a user can submit per time window.
const RECORD_LIMIT_COUNT = 5;
const RECORD_LIMIT_HOURS = 3;

router.post('/record', requireAuth, rateLimit({ keySuffix: 'submit-rec', max: RECORD_LIMIT_COUNT + 2, windowMs: RECORD_LIMIT_HOURS * 3600 * 1000 }), function (req, res) {
  const userId = res.locals.user.id;
  const username = res.locals.user.username;

  // Enforce per-user record quota with auto-ban on abuse.
  const recent = db.countRecentRecords(userId, RECORD_LIMIT_HOURS);
  if (recent >= RECORD_LIMIT_COUNT) {
    db.autoBanForSpam(userId, 'record spam: ' + recent + ' records in ' + RECORD_LIMIT_HOURS + 'h (limit ' + RECORD_LIMIT_COUNT + ')');
    return res.redirect('/auth/login?toast=' + encodeURIComponent('Your account was automatically banned for submitting too many records.'));
  }

  const demonId = req.body.demon_id;
  const youtube = sanitizeStr(req.body.youtube, 500);
  const raw = sanitizeStr(req.body.raw, 500);
  const percentRaw = req.body.percent;
  const platform = sanitizeStr(req.body.platform, 50);
  const comment = sanitizeStr(req.body.comment, 500);
  const opinion = sanitizeStr(req.body.opinion, 300);

  if (!demonId) {
    return res.redirect('/list?toast=' + encodeURIComponent('Select a level.'));
  }
  const demon = db.getDemonById(parseInt(demonId, 10));
  if (!demon) {
    return res.redirect('/list?toast=' + encodeURIComponent('Level not found.'));
  }
  if (!youtube || !raw) {
    return res.redirect('/list?toast=' + encodeURIComponent('YouTube and raw footage links are required.'));
  }

  const percent = parseInt(percentRaw, 10);
  const progress = isNaN(percent) ? (demon.requirement || 100) : Math.max(0, Math.min(100, percent));

  db.createRecord(userId, {
    demon_id: demon.id,
    progress: progress,
    youtube_url: youtube,
    raw_footage_url: raw,
    platform: platform,
    comment: comment,
    opinion: opinion
  });

  res.redirect('/list?record=success');
});

module.exports = router;
