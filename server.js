const express = require('express');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const db = require('./database/db');
const chatSocket = require('./lib/chat-socket');
const COUNTRIES = require('./database/countries');
const auth = require('./middleware/auth');
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
const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞'];
const WORDS = ['geometry','demon','list','record','verify','submit','moderator','challenge','platform','extreme','insane','hardest','progress','percent','level'];
const ODD_ONE_OUT = [
  { items: ['2','4','6','9','8'], answer: '9' },
  { items: ['3','7','11','14','17'], answer: '14' },
  { items: ['5','10','15','20','22'], answer: '22' },
  { items: ['11','13','17','19','23','25'], answer: '25' },
  { items: ['100','81','64','49','30','16'], answer: '30' },
  { items: ['1','8','27','64','100'], answer: '100' },
];

function generateCaptcha() {
  const types = ['math', 'text', 'emoji', 'word', 'logic'];
  const type = types[Math.floor(Math.random() * types.length)];
  switch (type) {
    case 'math': {
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a, b, answer;
      if (op === '+') { a = 1 + Math.floor(Math.random() * 50); b = 1 + Math.floor(Math.random() * 50); answer = String(a + b); }
      else if (op === '-') { a = 10 + Math.floor(Math.random() * 50); b = 1 + Math.floor(Math.random() * a); answer = String(a - b); }
      else { a = 1 + Math.floor(Math.random() * 12); b = 1 + Math.floor(Math.random() * 12); answer = String(a * b); }
      return { type, question: a + ' ' + op + ' ' + b + ' = ?', answer };
    }
    case 'text': {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let t = '';
      for (let i = 0; i < 6; i++) t += chars[Math.floor(Math.random() * chars.length)];
      return { type, question: t, answer: t };
    }
    case 'emoji': {
      const idx = Math.floor(Math.random() * EMOJIS.length);
      const target = EMOJIS[idx];
      const pool = EMOJIS.filter((_, i) => i !== idx);
      const opts = [target];
      while (opts.length < 9) { const p = pool[Math.floor(Math.random() * pool.length)]; if (!opts.includes(p)) opts.push(p); }
      for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
      return { type, question: target, options: opts, answer: target };
    }
    case 'word': {
      const w = WORDS[Math.floor(Math.random() * WORDS.length)];
      return { type, question: w.split('').reverse().join(''), answer: w.toLowerCase() };
    }
    case 'logic': {
      const g = ODD_ONE_OUT[Math.floor(Math.random() * ODD_ONE_OUT.length)];
      return { type, question: g.items.join(', '), answer: g.answer };
    }
  }
}

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

  // Pass captcha to all pages (for auth modal)
  var captcha = generateCaptcha();
  res.locals.captcha = captcha;
  res.locals.captchaToken = signCaptcha(captcha);

  next();
});

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
