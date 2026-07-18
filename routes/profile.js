const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const db = require('../database/db');
const auth = require('../middleware/auth');
const COUNTRIES = require('../database/countries');

const router = express.Router();

const AVATAR_DIR = path.join(__dirname, '..', 'public', 'uploads', 'avatars');

if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, AVATAR_DIR);
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname) || '.png';
    cb(null, 'user_' + req.user.id + ext);
  },
});

const fileFilter = function (req, file, cb) {
  var allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  var ext = path.extname(file.originalname).toLowerCase();
  if (allowed.indexOf(ext) !== -1) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (png, jpg, gif, webp) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /profile — view own profile
router.get('/', auth.authRequired, function (req, res) {
  var dbInstance = db.get();
  var user = dbInstance.prepare(
    'SELECT id, username, email, role, avatar_url, country, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  var avatarPath = resolveAvatar(user, path);
  user.avatarUrl = avatarPath;

  var recordCount = dbInstance.prepare('SELECT COUNT(*) c FROM records WHERE user_id = ?').get(user.id).c;
  var records = dbInstance.prepare(
    'SELECT r.progress, r.status, r.created_at, d.name AS demon_name, d.difficulty ' +
    'FROM records r JOIN demons d ON d.id = r.demon_id WHERE r.user_id = ? ' +
    'ORDER BY r.created_at DESC LIMIT 5'
  ).all(user.id);

  res.render('profile', {
    profile: user,
    user: req.user,
    record_count: recordCount,
    rating: db.getPlayerRating(user.id),
    records: records,
    countries: COUNTRIES,
    error: null,
    success: req.query.success || null
  });
});

// GET /profile/:id — view any user's profile
router.get('/:id', function (req, res) {
  var dbInstance = db.get();
  var user = dbInstance.prepare(
    'SELECT id, username, email, role, avatar_url, country, created_at FROM users WHERE id = ?'
  ).get(req.params.id);

  if (!user) {
    return res.status(404).send('User not found');
  }

  var avatarPath = resolveAvatar(user, path);
  user.avatarUrl = avatarPath;

  var recordCount = dbInstance.prepare('SELECT COUNT(*) c FROM records WHERE user_id = ?').get(user.id).c;
  var records = dbInstance.prepare(
    'SELECT r.progress, r.status, r.created_at, d.name AS demon_name, d.difficulty ' +
    'FROM records r JOIN demons d ON d.id = r.demon_id WHERE r.user_id = ? ' +
    'ORDER BY r.created_at DESC LIMIT 5'
  ).all(user.id);

  res.render('profile', {
    profile: user,
    user: req.user || null,
    record_count: recordCount,
    rating: db.getPlayerRating(user.id),
    records: records,
    error: null
  });
});

function resolveAvatar(user, path) {
  var fs = require('fs');
  if (user.avatar_url) {
    var fullPath = path.join(__dirname, '..', 'public', user.avatar_url);
    if (fs.existsSync(fullPath)) return user.avatar_url;
  }
  var exts = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
  for (var i = 0; i < exts.length; i++) {
    var p = '/uploads/avatars/user_' + user.id + exts[i];
    if (fs.existsSync(path.join(__dirname, '..', 'public', p))) return p;
  }
  return null;
}

// POST /profile/avatar — upload avatar
router.post('/avatar', auth.authRequired, function (req, res) {
  upload.single('avatar')(req, res, function (err) {
    if (err) {
      var dbInstance = db.get();
      var user = dbInstance.prepare(
        'SELECT id, username, email, role, avatar_url, created_at FROM users WHERE id = ?'
      ).get(req.user.id);
      user.avatarUrl = null;
      return res.render('profile', { profile: user, error: err.message });
    }

    if (!req.file) {
      var dbInstance = db.get();
      var user = dbInstance.prepare(
        'SELECT id, username, email, role, avatar_url, created_at FROM users WHERE id = ?'
      ).get(req.user.id);
      user.avatarUrl = null;
      return res.render('profile', { profile: user, error: 'No file uploaded' });
    }

    // Update avatar_url in DB
    var ext = path.extname(req.file.filename);
    var avatarUrl = '/uploads/avatars/user_' + req.user.id + ext;

    var dbInstance = db.get();
    dbInstance.prepare('UPDATE users SET avatar_url = ? WHERE id = ?')
      .run(avatarUrl, req.user.id);

    // Clean up old avatar files with different extensions
    fs.readdirSync(AVATAR_DIR).forEach(function (f) {
      if (f.startsWith('user_' + req.user.id) && f !== 'user_' + req.user.id + ext) {
        fs.unlinkSync(path.join(AVATAR_DIR, f));
      }
    });

    res.redirect('/profile');
  });
});

// POST /profile/country — change region
router.post('/country', auth.authRequired, function (req, res) {
  var country = typeof req.body.country === 'string' ? req.body.country.trim() : '';
  if (country && !COUNTRIES.some(function (c) { return c.name === country; })) {
    return res.redirect('/profile?success=invalid-country');
  }
  db.setUserCountry(req.user.id, country || null);
  res.redirect('/profile?success=country-updated');
});

// POST /profile/username — change nickname
router.post('/username', auth.authRequired, function (req, res) {
  var name = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  if (name.length < 3 || name.length > 24) {
    return res.redirect('/profile?success=username-short');
  }
  if (!/^[A-Za-z0-9_.\- ]+$/.test(name)) {
    return res.redirect('/profile?success=username-invalid');
  }
  if (db.usernameExists(name, req.user.id)) {
    return res.redirect('/profile?success=username-taken');
  }
  db.setUsername(req.user.id, name);
  res.redirect('/profile?success=username-updated');
});

// POST /profile/password — change password
router.post('/password', auth.authRequired, function (req, res) {
  var current = req.body.current || '';
  var next = req.body.next || '';
  var confirm = req.body.confirm || '';

  var dbInstance = db.get();
  var user = dbInstance.prepare(
    'SELECT id, password_hash FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user || !bcrypt.compareSync(current, user.password_hash)) {
    return res.redirect('/profile?success=wrong-password');
  }
  if (next.length < 6) {
    return res.redirect('/profile?success=password-short');
  }
  if (next !== confirm) {
    return res.redirect('/profile?success=password-mismatch');
  }

  db.setUserPassword(req.user.id, bcrypt.hashSync(next, 10));
  res.redirect('/profile?success=password-updated');
});

module.exports = router;
