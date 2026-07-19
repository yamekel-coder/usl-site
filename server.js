const express = require('express');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const db = require('./database/db');
const chatSocket = require('./lib/chat-socket');
const COUNTRIES = require('./database/countries');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
try { require('dotenv').config(); } catch (e) {}
const app = express();
const PORT = process.env.PORT || 3000;

db.init();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Security headers
app.use(function (req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Captcha helpers
const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'usl-captcha-secret-key-change-in-prod';
const generateCaptcha = authRoutes.generateCaptcha;

function signCaptcha(data) {
  const payload = JSON.stringify(data);
  const sig = crypto.createHmac('sha256', CAPTCHA_SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + sig;
}

app.use(function (req, res, next) {
  var tokenUser = auth.getUserFromToken(req.cookies[auth.SESSION_COOKIE]);
  if (tokenUser) {
    res.locals.user = db.get().prepare(
      'SELECT id, username, email, role, avatar_url FROM users WHERE id = ?'
    ).get(tokenUser.id);
  } else {
    res.locals.user = null;
  }
  res.locals.path = req.path;
  res.locals.discordInvite = process.env.DISCORD_INVITE || 'https://discord.gg/tMhpsfz9YQ';
  res.locals.telegramInvite = process.env.TELEGRAM_INVITE || 'https://t.me/slyenew';
  res.locals.twitterInvite = process.env.TWITTER_INVITE || 'https://x.com/ultimateshlist';
  res.locals.youtubeId = function (input) { return db.youtubeId(input); };
  res.locals.countries = COUNTRIES;
  res.locals.flag = function (code) { return COUNTRIES.flagEmoji(code); };
  res.locals.countryName = function (code) { return COUNTRIES.countryName(code); };

  // Pass captcha to all pages (for auth modal)
  var captcha = generateCaptcha();
  res.locals.captcha = captcha;
  res.locals.captchaToken = signCaptcha(captcha);
  // Set the captcha cookie on EVERY page load so the auth modal (which can
  // open from any page) always has a valid signed token to verify against.
  const secureCookies = process.env.COOKIE_SECURE === 'true' || process.env.COOKIE_SECURE === '1';
  res.cookie('usl_captcha', res.locals.captchaToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
  });

  next();
});

// Safely embed a JS object as a double-quoted HTML attribute value.
// JSON uses double quotes; we escape them so they don't break the
// attribute (EJS <%= %> already escapes < > & ' for us).
function optAttr(obj) {
  return JSON.stringify(obj || []).replace(/"/g, '&quot;');
}
app.locals.optAttr = optAttr;

app.use('/', require('./routes/index'));
app.use('/list', require('./routes/list'));
app.use('/profile', require('./routes/profile'));
app.use('/records', require('./routes/records'));
app.use('/players', require('./routes/players'));
app.use('/countries', require('./routes/countries'));
app.use('/submit', require('./routes/submit'));
app.use('/api', require('./routes/api'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/chat', require('./routes/chat'));

app.get('/privacy', function (req, res) { res.render('privacy'); });
app.get('/terms', function (req, res) { res.render('terms'); });

const server = http.createServer(app);
chatSocket.init(server);

server.listen(PORT, () => {
  console.log(`USL running at http://localhost:${PORT}`);
});
