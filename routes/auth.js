const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../database/db');
const auth = require('../middleware/auth');
const audit = require('../lib/audit');
const mailer = require('../lib/mailer');

const router = express.Router();

const SALT_ROUNDS = 12;
const MAX_ACCOUNTS_PER_IP = 2;
const CAPTCHA_COOKIE = 'usl_captcha';
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'usl-captcha-secret-key-change-in-prod';

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    '127.0.0.1';
}

function generateCaptcha() {
  const type = 'math';

  switch (type) {
    case 'math': {
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a, b, answer;
      if (op === '+') {
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        answer = String(a + b);
      } else if (op === '-') {
        a = Math.floor(Math.random() * 50) + 10;
        b = Math.floor(Math.random() * a) + 1;
        answer = String(a - b);
      } else {
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 12) + 1;
        answer = String(a * b);
      }
      return { type, question: `${a} ${op} ${b} = ?`, answer };
    }
  }
}

function signCaptcha(data) {
  const payload = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', CAPTCHA_SECRET);
  hmac.update(payload);
  const sig = hmac.digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + sig;
}

function verifyCaptchaToken(token) {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;
    const payload = Buffer.from(payloadB64, 'base64').toString('utf8');
    const hmac = crypto.createHmac('sha256', CAPTCHA_SECRET);
    hmac.update(payload);
    const expected = hmac.digest('hex');
    if (sig !== expected) return null;
    return JSON.parse(payload);
  } catch (e) {
    return null;
  }
}

function setSession(res, token) {
  // secure cookies only when HTTPS is actually available.
  // On VDS over plain HTTP (no SSL) this MUST be false, otherwise the
  // browser refuses to store the session cookie and login never persists.
  const secureCookies = process.env.COOKIE_SECURE === 'true' || process.env.COOKIE_SECURE === '1';
  res.cookie(auth.SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    maxAge: auth.COOKIE_MAX_AGE,
  });
}

function fail(res, req, error, page, data) {
  if (isAjax(req)) {
    return res.status(400).json({ ok: false, error: error });
  }
  data = data || {};
  data.error = error;
  return res.render(page, data);
}

function ok(res, req, token) {
  setSession(res, token);
  if (isAjax(req)) {
    return res.json({ ok: true, redirect: '/' });
  }
  return res.redirect('/');
}

function isAjax(req) {
  return req.get('X-Requested-With') === 'fetch' ||
    (req.get('Accept') || '').indexOf('application/json') !== -1;
}

// GET /auth/captcha-refresh — returns a fresh captcha + token (for AJAX retry)
router.get('/captcha-refresh', function (req, res) {
  var captcha = generateCaptcha();
  var token = signCaptcha(captcha);
  res.cookie(CAPTCHA_COOKIE, token, {
    httpOnly: true,
    maxAge: 5 * 60 * 1000,
    sameSite: 'lax',
  });
  res.json({ ok: true, token: token, captcha: captcha });
});

// GET /auth/register
router.get('/register', function (req, res) {
  var user = auth.getUserFromToken(req.cookies[auth.SESSION_COOKIE]);
  if (user) return res.redirect('/');
  var captcha = generateCaptcha();
  var token = signCaptcha(captcha);
  res.cookie(CAPTCHA_COOKIE, token, {
    httpOnly: true,
    maxAge: 5 * 60 * 1000,
    sameSite: 'lax',
  });
  res.render('auth/register', { error: null, captcha: captcha });
});

// POST /auth/register
router.post('/register', function (req, res) {
  var username = (req.body.username || '').trim();
  var email = (req.body.email || '').trim().toLowerCase();
  var password = req.body.password || '';
  var confirm = req.body.confirm || '';
  var country = db.normalizeCountry(req.body.country) || (req.body.country || '').trim();
  var agree = req.body.agree;
  var captchaAnswer = (req.body.captcha_answer || '').trim();

  // --- IP limit ---
  var ip = getClientIp(req);
  var ipCount = db.getRegistrationCount(ip);
  if (ipCount >= MAX_ACCOUNTS_PER_IP) {
    return fail(res, req, 'Registration limit reached for your IP address', 'auth/register', {
      captcha: generateCaptcha()
    });
  }

  // --- Captcha verification ---
  var captchaToken = req.cookies[CAPTCHA_COOKIE];
  var captchaData = verifyCaptchaToken(captchaToken);
  if (!captchaData) {
    var newCaptcha = generateCaptcha();
    return fail(res, req, 'Captcha expired, please try again', 'auth/register', {
      captcha: newCaptcha
    });
  }

  var expected = captchaData.answer.toLowerCase();
  var given = captchaAnswer.toLowerCase();
  if (given !== expected) {
    var retryCaptcha = generateCaptcha();
    return fail(res, req, 'Captcha verification failed', 'auth/register', {
      captcha: retryCaptcha
    });
  }

  // --- Validation ---
  if (!username || !email || !password || !confirm) {
    return fail(res, req, 'All fields are required', 'auth/register', {
      captcha: generateCaptcha()
    });
  }
  if (username.length < 3 || username.length > 24) {
    return fail(res, req, 'Username must be 3-24 characters', 'auth/register', {
      captcha: generateCaptcha()
    });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return fail(res, req, 'Username can only contain letters, numbers, hyphens and underscores', 'auth/register', {
      captcha: generateCaptcha()
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail(res, req, 'Invalid email address', 'auth/register', {
      captcha: generateCaptcha()
    });
  }
  if (password.length < 6) {
    return fail(res, req, 'Password must be at least 6 characters', 'auth/register', {
      captcha: generateCaptcha()
    });
  }
  if (password !== confirm) {
    return fail(res, req, 'Passwords do not match', 'auth/register', {
      captcha: generateCaptcha()
    });
  }
  if (!agree) {
    return fail(res, req, 'You must accept the List Rules to continue', 'auth/register', {
      captcha: generateCaptcha()
    });
  }

  var dbInstance = db.get();

  var existing = dbInstance.prepare(
    'SELECT id FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)'
  ).get(username, email);
  if (existing) {
    return fail(res, req, 'Username or email already taken', 'auth/register', {
      captcha: generateCaptcha()
    });
  }

  var hash = bcrypt.hashSync(password, SALT_ROUNDS);
  var info = dbInstance.prepare(
    'INSERT INTO users (username, email, password_hash, country) VALUES (?, ?, ?, ?)'
  ).run(username, email, hash, country || null);

  db.recordRegistration(ip);

  // Generate + "send" email verification code.
  var newUserId = info.lastInsertRowid;
  var code = db.generateEmailCode(newUserId);
  var mailResult = mailer.sendVerificationCode(email, code);

  res.clearCookie(CAPTCHA_COOKIE);
  var token = auth.createSession(newUserId);
  audit.log(req, 'register', username, 'email=' + email + ' ip=' + ip);
  // If email could not be sent (no SMTP / blocked by provider), surface the
  // code on the verification page so the user can still confirm manually.
  var devCode = (mailResult && mailResult.sent) ? '' : ('&devcode=' + code);
  var target = '/auth/verify-email?email=' + encodeURIComponent(email) + devCode;
  if (isAjax(req)) {
    return res.json({ ok: true, redirect: target });
  }
  return res.redirect(target);
});

// GET /auth/login
router.get('/login', function (req, res) {
  var user = auth.getUserFromToken(req.cookies[auth.SESSION_COOKIE]);
  if (user) return res.redirect('/');
  res.render('auth/login', { error: null });
});

// POST /auth/login
router.post('/login', function (req, res) {
  var identifier = (req.body.identifier || '').trim();
  var password = req.body.password || '';

  if (!identifier || !password) {
    return fail(res, req, 'Username/email and password are required', 'auth/login');
  }

  var dbInstance = db.get();
  var user = dbInstance.prepare(
    'SELECT id, username, email, password_hash, role, avatar_url, banned FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)'
  ).get(identifier, identifier);

  if (!user) {
    return fail(res, req, 'Invalid username/email or password', 'auth/login');
  }

  if (user.banned) {
    return fail(res, req, 'Your account has been banned', 'auth/login');
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return fail(res, req, 'Invalid username/email or password', 'auth/login');
  }

  var token = auth.createSession(user.id);
  audit.log(req, 'login', user.username, 'email=' + user.email);
  // Allow login but nudge unverified users to confirm their email.
  if (!user.email_verified) {
    if (isAjax(req)) {
      return res.json({ ok: true, redirect: '/auth/verify-email?email=' + encodeURIComponent(user.email) });
    }
    return res.redirect('/auth/verify-email?email=' + encodeURIComponent(user.email));
  }
  return ok(res, req, token);
});

// POST /auth/logout
router.post('/logout', function (req, res) {
  var token = req.cookies[auth.SESSION_COOKIE];
  if (token) {
    auth.deleteSession(token);
    res.clearCookie(auth.SESSION_COOKIE);
  }
  res.redirect('/');
});

// ---- Email verification ----

router.get('/verify-email', function (req, res) {
  var email = req.query.email || '';
  res.render('auth/verify-email', {
    email: email,
    error: req.query.error || null,
    devcode: req.query.devcode || null,
    success: req.query.ok === '1' ? true : false
  });
});

router.post('/verify-email', function (req, res) {
  var email = (req.body.email || '').trim().toLowerCase();
  var code = (req.body.code || '').trim();
  if (!email || !code) {
    return res.redirect('/auth/verify-email?email=' + encodeURIComponent(email) + '&error=' + encodeURIComponent('Email and code are required'));
  }
  var user = db.get().prepare('SELECT id, email_verified FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) {
    return res.redirect('/auth/verify-email?email=' + encodeURIComponent(email) + '&error=' + encodeURIComponent('Account not found'));
  }
  if (user.email_verified) {
    return res.redirect('/auth/verify-email?email=' + encodeURIComponent(email) + '&ok=1');
  }
  var ok = db.verifyEmailCode(user.id, code);
  if (!ok) {
    return res.redirect('/auth/verify-email?email=' + encodeURIComponent(email) + '&error=' + encodeURIComponent('Invalid or expired code'));
  }
  audit.log(req, 'email_verified', user.id ? String(user.id) : email, 'email=' + email);
  return res.redirect('/auth/verify-email?email=' + encodeURIComponent(email) + '&ok=1');
});

router.post('/verify-email/resend', function (req, res) {
  var email = (req.body.email || '').trim().toLowerCase();
  var user = db.get().prepare('SELECT id, email_verified FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (!user) {
    return res.redirect('/auth/verify-email?email=' + encodeURIComponent(email) + '&error=' + encodeURIComponent('Account not found'));
  }
  if (user.email_verified) {
    return res.redirect('/auth/verify-email?email=' + encodeURIComponent(email) + '&ok=1');
  }
  var code = db.generateEmailCode(user.id);
  var mailResult = mailer.sendVerificationCode(email, code);
  var devCode = (mailResult && mailResult.sent) ? '&resent=1' : ('&devcode=' + code + '&resent=1');
  res.redirect('/auth/verify-email?email=' + encodeURIComponent(email) + '&ok=1' + devCode);
});

module.exports = router;
module.exports.generateCaptcha = generateCaptcha;
