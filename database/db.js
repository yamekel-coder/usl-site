const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'usl.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function init() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  migrate(db);

  console.log('[DB] SQLite initialized at', DB_PATH);
  return db;
}

function migrate(database) {
  const userCols = database.prepare("PRAGMA table_info(users)").all();
  if (!userCols.some(function (c) { return c.name === 'country'; })) {
    database.exec("ALTER TABLE users ADD COLUMN country TEXT DEFAULT NULL");
  }
  const demonCols = database.prepare("PRAGMA table_info(demons)").all();
  if (!demonCols.some(function (c) { return c.name === 'position'; })) {
    database.exec("ALTER TABLE demons ADD COLUMN position INTEGER DEFAULT NULL");
  }
  if (!demonCols.some(function (c) { return c.name === 'verifier'; })) {
    database.exec("ALTER TABLE demons ADD COLUMN verifier TEXT DEFAULT NULL");
  }
  if (!demonCols.some(function (c) { return c.name === 'level_id'; })) {
    database.exec("ALTER TABLE demons ADD COLUMN level_id TEXT DEFAULT NULL");
  }
  if (!demonCols.some(function (c) { return c.name === 'requirement'; })) {
    database.exec("ALTER TABLE demons ADD COLUMN requirement INTEGER NOT NULL DEFAULT 100");
  }
  if (!demonCols.some(function (c) { return c.name === 'banner_url'; })) {
    database.exec("ALTER TABLE demons ADD COLUMN banner_url TEXT DEFAULT NULL");
  }
  if (!demonCols.some(function (c) { return c.name === 'shittylist_equiv'; })) {
    database.exec("ALTER TABLE demons ADD COLUMN shittylist_equiv TEXT DEFAULT NULL");
  }

  const recordCols = database.prepare("PRAGMA table_info(records)").all();
  ['youtube_url', 'raw_footage_url', 'platform', 'comment', 'opinion', 'player_name'].forEach(function (col) {
    if (!recordCols.some(function (c) { return c.name === col; })) {
      database.exec("ALTER TABLE records ADD COLUMN " + col + " TEXT DEFAULT NULL");
    }
  });
  // Allow records not linked to a registered account (admin-added records):
  // make user_id nullable by rebuilding the table if it is still NOT NULL.
  const recUserIdCol = database.prepare("PRAGMA table_info(records)").all().find(function (c) { return c.name === 'user_id'; });
  if (recUserIdCol && recUserIdCol.notnull) {
    database.exec(
      "CREATE TABLE records_new (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, " +
      "demon_id INTEGER NOT NULL REFERENCES demons(id) ON DELETE CASCADE, " +
      "progress INTEGER NOT NULL DEFAULT 100, " +
      "status TEXT NOT NULL DEFAULT 'verified' CHECK(status IN ('pending','verified','rejected')), " +
      "youtube_url TEXT DEFAULT NULL, raw_footage_url TEXT DEFAULT NULL, " +
      "platform TEXT DEFAULT NULL, comment TEXT DEFAULT NULL, opinion TEXT DEFAULT NULL, " +
      "player_name TEXT DEFAULT NULL, " +
      "created_at TEXT NOT NULL DEFAULT (datetime('now')))"
    );
    database.exec(
      "INSERT INTO records_new (id, user_id, demon_id, progress, status, youtube_url, raw_footage_url, platform, comment, opinion, player_name, created_at) " +
      "SELECT id, user_id, demon_id, progress, status, youtube_url, raw_footage_url, platform, comment, opinion, player_name, created_at FROM records"
    );
    database.exec("DROP TABLE records");
    database.exec("ALTER TABLE records_new RENAME TO records");
  }

  database.exec(
    "CREATE TABLE IF NOT EXISTS news (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "author_id INTEGER REFERENCES users(id) ON DELETE SET NULL, " +
    "title TEXT NOT NULL, description TEXT NOT NULL, " +
    "created_at TEXT NOT NULL DEFAULT (datetime('now')))"
  );

  const sub = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='submissions'").get();
  if (sub && sub.sql.indexOf('level-request') === -1) {
    database.exec("ALTER TABLE submissions RENAME TO submissions_old");
    database.exec(
      "CREATE TABLE submissions (" +
      "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
      "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, " +
      "type TEXT NOT NULL CHECK(type IN ('level', 'moderator', 'level-request')), " +
      "status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')), " +
      "data TEXT NOT NULL DEFAULT '{}', " +
      "created_at TEXT NOT NULL DEFAULT (datetime('now')), " +
      "updated_at TEXT NOT NULL DEFAULT (datetime('now')))"
    );
    database.exec(
      "INSERT INTO submissions (id, user_id, type, status, data, created_at, updated_at) " +
      "SELECT id, user_id, type, status, data, created_at, updated_at FROM submissions_old"
    );
    database.exec("DROP TABLE submissions_old");
  }

  // Add banned column to users
  const userCols2 = database.prepare("PRAGMA table_info(users)").all();
  if (!userCols2.some(function (c) { return c.name === 'banned'; })) {
    database.exec("ALTER TABLE users ADD COLUMN banned INTEGER NOT NULL DEFAULT 0");
  }

  // Email verification columns
  const userCols3 = database.prepare("PRAGMA table_info(users)").all();
  if (!userCols3.some(function (c) { return c.name === 'email_verified'; })) {
    database.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
  }
  if (!userCols3.some(function (c) { return c.name === 'email_code'; })) {
    database.exec("ALTER TABLE users ADD COLUMN email_code TEXT");
  }
  if (!userCols3.some(function (c) { return c.name === 'email_code_expires'; })) {
    database.exec("ALTER TABLE users ADD COLUMN email_code_expires TEXT");
  }

  database.exec(
    "CREATE TABLE IF NOT EXISTS registrations (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "ip TEXT NOT NULL, " +
    "created_at TEXT NOT NULL DEFAULT (datetime('now')))"
  );

  database.exec(
    "CREATE TABLE IF NOT EXISTS chat_messages (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, " +
    "username TEXT NOT NULL, " +
    "message TEXT NOT NULL, " +
    "created_at TEXT NOT NULL DEFAULT (datetime('now')))"
  );

  // Admin activity log (who did what, with IP + email)
  database.exec(
    "CREATE TABLE IF NOT EXISTS activity_log (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "user_id INTEGER, " +
    "username TEXT, " +
    "email TEXT, " +
    "ip TEXT, " +
    "action TEXT NOT NULL, " +
    "target TEXT, " +
    "detail TEXT, " +
    "created_at TEXT NOT NULL DEFAULT (datetime('now')))"
  );

  // Normalize all existing countries
  const countryMap = {
    'Россия': 'RU', 'россия': 'RU', 'RUSSIA': 'RU', 'Russia': 'RU', 'RU': 'RU', 'rus': 'RU', 'RUS': 'RU', 'ru': 'RU',
    'Украина': 'UA', 'украина': 'UA', 'Ukraine': 'UA', 'UA': 'UA', 'ukr': 'UA', 'UKR': 'UA',
    'Беларусь': 'BY', 'беларусь': 'BY', 'Belarus': 'BY', 'BY': 'BY',
    'Казахстан': 'KZ', 'казахстан': 'KZ', 'Kazakhstan': 'KZ', 'KZ': 'KZ',
    'Узбекистан': 'UZ', 'узбекистан': 'UZ', 'Uzbekistan': 'UZ', 'UZ': 'UZ',
    'Армения': 'AM', 'армения': 'AM', 'Armenia': 'AM', 'AM': 'AM',
    'Грузия': 'GE', 'грузия': 'GE', 'Georgia': 'GE', 'GE': 'GE',
    'Молдова': 'MD', 'молдова': 'MD', 'Moldova': 'MD', 'MD': 'MD',
    'Латвия': 'LV', 'латвия': 'LV', 'Latvia': 'LV', 'LV': 'LV',
    'Литва': 'LT', 'литва': 'LT', 'Lithuania': 'LT', 'LT': 'LT',
    'Эстония': 'EE', 'эстония': 'EE', 'Estonia': 'EE', 'EE': 'EE',
    'Польша': 'PL', 'польша': 'PL', 'Poland': 'PL', 'PL': 'PL',
    'Германия': 'DE', 'германия': 'DE', 'Germany': 'DE', 'DE': 'DE',
    'Франция': 'FR', 'франция': 'FR', 'France': 'FR', 'FR': 'FR',
    'Великобритания': 'GB', 'великобритания': 'GB', 'United Kingdom': 'GB', 'GB': 'GB',
    'Испания': 'ES', 'испания': 'ES', 'Spain': 'ES', 'ES': 'ES',
    'Италия': 'IT', 'италия': 'IT', 'Italy': 'IT', 'IT': 'IT',
    'Нидерланды': 'NL', 'нидерланды': 'NL', 'Netherlands': 'NL', 'NL': 'NL',
    'Турция': 'TR', 'турция': 'TR', 'Turkey': 'TR', 'TR': 'TR',
    'США': 'US', 'сша': 'US', 'Америка': 'US', 'америка': 'US', 'USA': 'US', 'United States': 'US', 'US': 'US',
    'Канада': 'CA', 'канада': 'CA', 'Canada': 'CA', 'CA': 'CA',
    'Бразилия': 'BR', 'бразилия': 'BR', 'Brazil': 'BR', 'BR': 'BR',
    'Австралия': 'AU', 'австралия': 'AU', 'Australia': 'AU', 'AU': 'AU',
    'Япония': 'JP', 'япония': 'JP', 'Japan': 'JP', 'JP': 'JP',
    'Корея': 'KR', 'корея': 'KR', 'South Korea': 'KR', 'KR': 'KR',
    'Китай': 'CN', 'китай': 'CN', 'China': 'CN', 'CN': 'CN',
    'Индонезия': 'ID', 'индонезия': 'ID', 'Indonesia': 'ID', 'ID': 'ID',
    'Филиппины': 'PH', 'филиппины': 'PH', 'Philippines': 'PH', 'PH': 'PH',
    'Индия': 'IN', 'индия': 'IN', 'India': 'IN', 'IN': 'IN',
    'Аргентина': 'AR', 'аргентина': 'AR', 'Argentina': 'AR', 'AR': 'AR',
    'Мексика': 'MX', 'мексика': 'MX', 'Mexico': 'MX', 'MX': 'MX',
    'Колумбия': 'CO', 'колумбия': 'CO', 'Colombia': 'CO', 'CO': 'CO',
    'Чили': 'CL', 'чили': 'CL', 'Chile': 'CL', 'CL': 'CL',
    'Перу': 'PE', 'перу': 'PE', 'Peru': 'PE', 'PE': 'PE',
    'Португалия': 'PT', 'португалия': 'PT', 'Portugal': 'PT', 'PT': 'PT',
    'Чехия': 'CZ', 'чехия': 'CZ', 'Czech Republic': 'CZ', 'CZ': 'CZ',
    'Румыния': 'RO', 'румыния': 'RO', 'Romania': 'RO', 'RO': 'RO',
    'Венгрия': 'HU', 'венгрия': 'HU', 'Hungary': 'HU', 'HU': 'HU',
    'Болгария': 'BG', 'болгария': 'BG', 'Bulgaria': 'BG', 'BG': 'BG',
    'Сербия': 'RS', 'сербия': 'RS', 'Serbia': 'RS', 'RS': 'RS',
    'Хорватия': 'HR', 'хорватия': 'HR', 'Croatia': 'HR', 'HR': 'HR',
    'Таиланд': 'TH', 'таиланд': 'TH', 'Thailand': 'TH', 'TH': 'TH',
    'Вьетнам': 'VN', 'вьетнам': 'VN', 'Vietnam': 'VN', 'VN': 'VN',
    'Малайзия': 'MY', 'малайзия': 'MY', 'Malaysia': 'MY', 'MY': 'MY',
    'Сингапур': 'SG', 'сингапур': 'SG', 'Singapore': 'SG', 'SG': 'SG',
    'Финляндия': 'FI', 'финляндия': 'FI', 'Finland': 'FI', 'FI': 'FI',
    'Швеция': 'SE', 'швеция': 'SE', 'Sweden': 'SE', 'SE': 'SE',
    'Норвегия': 'NO', 'норвегия': 'NO', 'Norway': 'NO', 'NO': 'NO',
    'Дания': 'DK', 'дания': 'DK', 'Denmark': 'DK', 'DK': 'DK',
    'Израиль': 'IL', 'израиль': 'IL', 'Israel': 'IL', 'IL': 'IL',
    'Египет': 'EG', 'египет': 'EG', 'Egypt': 'EG', 'EG': 'EG',
    'Пакистан': 'PK', 'пакистан': 'PK', 'Pakistan': 'PK', 'PK': 'PK',
    'Бангладеш': 'BD', 'бангладеш': 'BD', 'Bangladesh': 'BD', 'BD': 'BD',
    'Нигерия': 'NG', 'нигерия': 'NG', 'Nigeria': 'NG', 'NG': 'NG',
  };
  const users = database.prepare("SELECT id, country FROM users WHERE country IS NOT NULL AND country != ''").all();
  const updateStmt = database.prepare("UPDATE users SET country = ? WHERE id = ?");
  for (const u of users) {
    const raw = (u.country || '').trim();
    if (!raw) continue;
    const mapped = countryMap[raw] || countryMap[raw.toUpperCase()] || countryMap[raw.toLowerCase()] || raw.toUpperCase();
    if (mapped !== raw) {
      updateStmt.run(mapped, u.id);
    }
  }

  const subCols = database.prepare("PRAGMA table_info(submissions)").all();
  if (!subCols.some(function (c) { return c.name === 'reject_reason'; })) {
    database.exec("ALTER TABLE submissions ADD COLUMN reject_reason TEXT DEFAULT NULL");
  }
}

function getDemons(limit) {
  const database = get();
  const sql = "SELECT * FROM demons WHERE position IS NOT NULL ORDER BY position ASC, id ASC" +
    (limit ? " LIMIT " + Number(limit) : "");
  return database.prepare(sql).all();
}

function getDemonById(id) {
  return get().prepare("SELECT * FROM demons WHERE id = ?").get(id);
}

function getDemonRecords(demonId) {
  return get().prepare(
    "SELECT r.id, r.progress, r.status, r.created_at, r.player_name, u.username, u.avatar_url " +
    "FROM records r LEFT JOIN users u ON u.id = r.user_id " +
    "WHERE r.demon_id = ? AND r.status = 'verified' " +
    "ORDER BY r.progress DESC, r.created_at ASC"
  ).all(demonId);
}

function calculateDemonPoints(position) {
  if (!position || position <= 0) return 0;
  if (position === 1) return 1000;
  if (position <= 9) return Math.max(0, 1000 - (position - 1) * 40);
  if (position <= 19) return Math.max(0, 600 - (position - 10) * 20);
  if (position <= 49) return Math.max(0, 400 - (position - 20) * 4);
  if (position <= 74) return Math.max(0, 280 - (position - 50) * 7);
  if (position <= 150) return Math.max(0, 75 - (position - 75));
  return Math.max(0, Math.round((0 - (position - 151) * 0.20) * 100) / 100);
}

function getRecords(limit) {
  const database = get();
  const sql =
    "SELECT r.id, r.progress, r.status, r.created_at, u.username, d.name AS demon_name, d.difficulty " +
    "FROM records r " +
    "LEFT JOIN users u ON u.id = r.user_id " +
    "LEFT JOIN demons d ON d.id = r.demon_id " +
    "ORDER BY r.created_at DESC" +
    (limit ? " LIMIT " + Number(limit) : "");
  return database.prepare(sql).all();
}

function getPlayerRating(userId) {
  const rows = get().prepare(
    "SELECT r.status, COALESCE(d.difficulty, 'easy') AS difficulty " +
    "FROM records r LEFT JOIN demons d ON d.id = r.demon_id " +
    "WHERE r.user_id = ?"
  ).all(userId);
  const diffPoints = { easy: 100, medium: 150, hard: 200, insane: 300, extreme: 500 };
  let rating = 0;
  for (const r of rows) {
    if (r.status !== 'verified') continue;
    const base = diffPoints[String(r.difficulty).toLowerCase()] || 100;
    rating += base;
  }
  return rating;
}

function getPlayerRecords(userId) {
  return get().prepare(
    "SELECT r.progress, r.status, r.created_at, d.name AS demon_name, d.difficulty, d.position " +
    "FROM records r JOIN demons d ON d.id = r.demon_id WHERE r.user_id = ? " +
    "ORDER BY r.created_at DESC"
  ).all(userId);
}

function normalizeCountry(c) {
  if (!c) return null;
  var t = c.trim();
  if (!t) return null;
  var low = t.toLowerCase();
  var up = t.toUpperCase();
  // Russia
  if (low === 'russia' || up === 'RU' || low === 'россия' || low === 'российская федерация') return 'RU';
  // Ukraine
  if (low === 'ukraine' || low === 'украина' || up === 'UA') return 'UA';
  // Belarus
  if (low === 'belarus' || low === 'беларусь' || low === 'belorussia' || up === 'BY') return 'BY';
  // Kazakhstan
  if (low === 'kazakhstan' || low === 'казахстан' || up === 'KZ') return 'KZ';
  // Uzbekistan
  if (low === 'uzbekistan' || low === 'узбекистан' || up === 'UZ') return 'UZ';
  // Armenia
  if (low === 'armenia' || low === 'армения' || up === 'AM') return 'AM';
  // Georgia
  if (low === 'georgia' || low === 'грузия' || up === 'GE') return 'GE';
  // Moldova
  if (low === 'moldova' || low === 'молдова' || low === 'moldavia' || up === 'MD') return 'MD';
  // Latvia
  if (low === 'latvia' || low === 'латвия' || up === 'LV') return 'LV';
  // Lithuania
  if (low === 'lithuania' || low === 'литва' || up === 'LT') return 'LT';
  // Estonia
  if (low === 'estonia' || low === 'эстония' || up === 'EE') return 'EE';
  // Poland
  if (low === 'poland' || low === 'польша' || up === 'PL') return 'PL';
  // Germany
  if (low === 'germany' || low === 'германия' || up === 'DE') return 'DE';
  // France
  if (low === 'france' || low === 'франция' || up === 'FR') return 'FR';
  // United Kingdom
  if (low === 'united kingdom' || low === 'great britain' || low === 'великобритания' || up === 'GB') return 'GB';
  // Spain
  if (low === 'spain' || low === 'испания' || up === 'ES') return 'ES';
  // Italy
  if (low === 'italy' || low === 'италия' || up === 'IT') return 'IT';
  // Netherlands
  if (low === 'netherlands' || low === 'нидерланды' || low === 'holland' || up === 'NL') return 'NL';
  // Turkey
  if (low === 'turkey' || low === 'türkiye' || low === 'турция' || up === 'TR') return 'TR';
  // United States
  if (low === 'united states' || low === 'usa' || low === 'us' || low === 'америка' || low === 'сша' || up === 'US') return 'US';
  // Canada
  if (low === 'canada' || low === 'канада' || up === 'CA') return 'CA';
  // Brazil
  if (low === 'brazil' || low === 'бразилия' || up === 'BR') return 'BR';
  // Australia
  if (low === 'australia' || low === 'австралия' || up === 'AU') return 'AU';
  // Japan
  if (low === 'japan' || low === 'япония' || up === 'JP') return 'JP';
  // South Korea
  if (low === 'south korea' || low === 'корея' || low === 'korea' || up === 'KR') return 'KR';
  // China
  if (low === 'china' || low === 'китай' || up === 'CN') return 'CN';
  // Indonesia
  if (low === 'indonesia' || low === 'индонезия' || up === 'ID') return 'ID';
  // Philippines
  if (low === 'philippines' || low === 'филиппины' || up === 'PH') return 'PH';
  // India
  if (low === 'india' || low === 'индия' || up === 'IN') return 'IN';
  // Argentina
  if (low === 'argentina' || low === 'аргентина' || up === 'AR') return 'AR';
  // Mexico
  if (low === 'mexico' || low === 'мексика' || up === 'MX') return 'MX';
  // Colombia
  if (low === 'colombia' || low === 'колумбия' || up === 'CO') return 'CO';
  // Chile
  if (low === 'chile' || low === 'чили' || up === 'CL') return 'CL';
  // Peru
  if (low === 'peru' || low === 'перу' || up === 'PE') return 'PE';
  // Portugal
  if (low === 'portugal' || low === 'португалия' || up === 'PT') return 'PT';
  // Czech Republic
  if (low === 'czech republic' || low === 'czechia' || low === 'чехия' || up === 'CZ') return 'CZ';
  // Romania
  if (low === 'romania' || low === 'румыния' || low === 'românia' || up === 'RO') return 'RO';
  // Hungary
  if (low === 'hungary' || low === 'венгрия' || up === 'HU') return 'HU';
  // Bulgaria
  if (low === 'bulgaria' || low === 'болгария' || up === 'BG') return 'BG';
  // Serbia
  if (low === 'serbia' || low === 'сербия' || up === 'RS') return 'RS';
  // Croatia
  if (low === 'croatia' || low === 'хорватия' || up === 'HR') return 'HR';
  // Thailand
  if (low === 'thailand' || low === 'таиланд' || up === 'TH') return 'TH';
  // Vietnam
  if (low === 'vietnam' || low === 'вьетнам' || up === 'VN') return 'VN';
  // Malaysia
  if (low === 'malaysia' || low === 'малайзия' || up === 'MY') return 'MY';
  // Singapore
  if (low === 'singapore' || low === 'сингапур' || up === 'SG') return 'SG';
  // Finland
  if (low === 'finland' || low === 'финляндия' || up === 'FI') return 'FI';
  // Sweden
  if (low === 'sweden' || low === 'швеция' || up === 'SE') return 'SE';
  // Norway
  if (low === 'norway' || low === 'норвегия' || up === 'NO') return 'NO';
  // Denmark
  if (low === 'denmark' || low === 'дания' || up === 'DK') return 'DK';
  // Israel
  if (low === 'israel' || low === 'израиль' || up === 'IL') return 'IL';
  // Egypt
  if (low === 'egypt' || low === 'египет' || up === 'EG') return 'EG';
  // South Africa
  if (low === 'south africa' || up === 'ZA') return 'ZA';
  // Pakistan
  if (low === 'pakistan' || low === 'пакистан' || up === 'PK') return 'PK';
  // Bangladesh
  if (low === 'bangladesh' || low === 'бангладеш' || up === 'BD') return 'BD';
  // Nigeria
  if (low === 'nigeria' || low === 'нигерия' || up === 'NG') return 'NG';
  // Ukraine aliases
  if (low === 'украинa' || low === 'ukr' || up === 'UKR') return 'UA';
  // Russia aliases
  if (up === 'RUS' || low === 'ru') return 'RU';
  // Fallback: if it's a 2-letter code, use uppercase
  if (t.length === 2 && /^[a-zA-Z]+$/.test(t)) return up;
  return up;
}

function getCountries() {
  const players = getPlayers();
  const map = {};
  players.forEach(function (p) {
    if (!p.country) return;
    var key = normalizeCountry(p.country) || p.country;
    if (!map[key]) {
      map[key] = { country: key, players: 0, points: 0, members: [] };
    }
    map[key].players += 1;
    map[key].points += p.rating;
    map[key].members.push({
      id: p.id, username: p.username, rating: p.rating, avatar_url: p.avatar_url
    });
  });
  const list = Object.keys(map).map(function (k) { return map[k]; });
  list.sort(function (a, b) { return b.points - a.points; });
  return list;
}

function getPlayers() {
  const database = get();
  const players = database.prepare(
    "SELECT u.id, u.username, u.role, u.country, u.avatar_url, u.created_at, " +
    "(SELECT COUNT(*) FROM records r WHERE r.user_id = u.id) AS record_count, " +
    "(SELECT COUNT(*) FROM records r WHERE r.user_id = u.id AND r.status='verified') AS verified_count " +
    "FROM users u"
  ).all();
  return players
    .map(function (p) { return Object.assign({}, p, { rating: getPlayerRating(p.id) }); })
    .sort(function (a, b) { return b.rating - a.rating; });
}

function getStats() {
  const database = get();
  const count = function (sql) {
    return database.prepare(sql).get().c;
  };
  return {
    players: count("SELECT COUNT(*) AS c FROM users"),
    levels: count("SELECT COUNT(*) AS c FROM demons"),
    records: count("SELECT COUNT(*) AS c FROM records"),
    countries: count("SELECT COUNT(DISTINCT CASE WHEN UPPER(TRIM(country)) IN ('RU','RUSSIA','Россия') THEN 'RU' ELSE UPPER(TRIM(country)) END) AS c FROM users WHERE country IS NOT NULL AND TRIM(country) != ''")
  };
}

function createSubmission(userId, type, data) {
  return get().prepare(
    "INSERT INTO submissions (user_id, type, data) VALUES (?, ?, ?)"
  ).run(userId, type, JSON.stringify(data));
}

function getSubmissions(type, status) {
  let sql = "SELECT s.*, u.username FROM submissions s JOIN users u ON u.id = s.user_id";
  const params = [];
  const conditions = [];
  if (type) { conditions.push("s.type = ?"); params.push(type); }
  if (status) { conditions.push("s.status = ?"); params.push(status); }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  sql += " ORDER BY s.created_at DESC";
  return get().prepare(sql).all(...params);
}

function updateSubmissionStatus(id, status, reason) {
  if (reason !== undefined) {
    return get().prepare(
      "UPDATE submissions SET status = ?, reject_reason = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(status, reason || null, id);
  }
  return get().prepare(
    "UPDATE submissions SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(status, id);
}

function getUserSubmissions(userId) {
  return get().prepare(
    "SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId);
}

function addChatMessage(userId, username, message) {
  var info = get().prepare(
    "INSERT INTO chat_messages (user_id, username, message) VALUES (?, ?, ?)"
  ).run(userId, username, message);
  return info.lastInsertRowid;
}

function getChatMessages(limit) {
  return get().prepare(
    "SELECT cm.id, cm.user_id, cm.username, cm.message, cm.created_at, u.avatar_url " +
    "FROM chat_messages cm LEFT JOIN users u ON u.id = cm.user_id " +
    "ORDER BY cm.id DESC LIMIT ?"
  ).all(limit || 100).reverse();
}

function getChatMessageCount() {
  return get().prepare("SELECT COUNT(*) c FROM chat_messages").get().c;
}

function getUserById(id) {
  return get().prepare(
    "SELECT id, username, email, role, avatar_url, country, created_at FROM users WHERE id = ?"
  ).get(id);
}

function getUserByEmail(email) {
  return get().prepare(
    "SELECT id, username, email, role, avatar_url, country, created_at FROM users WHERE LOWER(email) = LOWER(?)"
  ).get(email);
}

function setUserRole(id, role) {
  return get().prepare(
    "UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(role, id);
}

function getUsers() {
  return get().prepare(
    "SELECT id, username, email, role, country, avatar_url, banned, created_at FROM users ORDER BY id ASC"
  ).all();
}

function getTeamMembers() {
  return get().prepare(
    "SELECT id, username, email, role, country, avatar_url, created_at FROM users WHERE role IN ('admin', 'moderator') ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'moderator' THEN 1 END, id ASC"
  ).all();
}

function getUsersByRole(role) {
  return get().prepare(
    "SELECT id, username, email, role, country, avatar_url, created_at FROM users WHERE role = ? ORDER BY id ASC"
  ).all(role);
}

function addDemon(demon) {
  let position = demon.position != null ? demon.position : null;
  if (position == null) {
    const row = get().prepare("SELECT MAX(position) AS m FROM demons").get();
    position = (row && row.m ? row.m : 0) + 1;
  }
  const info = get().prepare(
    "INSERT INTO demons (position, name, creator, verifier, difficulty, video_url, banner_url, level_id, requirement, verified) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)"
  ).run(
    position,
    demon.name,
    demon.creator || null,
    demon.verifier || null,
    demon.difficulty || 'Insane',
    demon.video_url || null,
    demon.banner_url || null,
    demon.level_id || null,
    demon.requirement != null ? demon.requirement : 100
  );
  return info.lastInsertRowid;
}

function updateDemon(id, fields) {
  const allowed = ['position', 'name', 'creator', 'verifier', 'difficulty', 'video_url', 'banner_url', 'level_id', 'requirement', 'shittylist_equiv'];
  const sets = [];
  const params = [];
  allowed.forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(key + " = ?");
      params.push(fields[key]);
    }
  });
  if (!sets.length) return;
  sets.push("updated_at = datetime('now')");
  params.push(id);
  get().prepare("UPDATE demons SET " + sets.join(", ") + " WHERE id = ?").run(...params);
}

function deleteDemon(id) {
  return get().prepare("DELETE FROM demons WHERE id = ?").run(id);
}

function setUserCountry(userId, country) {
  return get().prepare(
    "UPDATE users SET country = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(country || null, userId);
}

function setUserPassword(userId, hash) {
  return get().prepare(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(hash, userId);
}

function usernameExists(username, exceptUserId) {
  var row = get().prepare(
    "SELECT id FROM users WHERE lower(username) = lower(?) AND id != ?"
  ).get(username, exceptUserId || 0);
  return !!row;
}

function setUsername(userId, username) {
  return get().prepare(
    "UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(username, userId);
}

function deleteUserSessions(userId) {
  return get().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

function createRecord(userId, record) {
  const info = get().prepare(
    "INSERT INTO records (user_id, demon_id, progress, status, youtube_url, raw_footage_url, platform, comment, opinion) " +
    "VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)"
  ).run(
    userId,
    record.demon_id,
    record.progress != null ? record.progress : 100,
    record.youtube_url || null,
    record.raw_footage_url || null,
    record.platform || null,
    record.comment || null,
    record.opinion || null
  );
  return info.lastInsertRowid;
}

// Admin-added record for a player that may not have an account.
function createUnregisteredRecord(record) {
  const info = get().prepare(
    "INSERT INTO records (user_id, demon_id, progress, status, youtube_url, raw_footage_url, platform, comment, player_name) " +
    "VALUES (NULL, ?, ?, 'verified', ?, ?, ?, ?, ?)"
  ).run(
    record.demon_id,
    record.progress != null ? record.progress : 100,
    record.youtube_url || null,
    record.raw_footage_url || null,
    record.platform || null,
    record.comment || null,
    record.player_name || null
  );
  return info.lastInsertRowid;
}

function getPendingRecords() {
  return get().prepare(
    "SELECT r.id, r.user_id, r.demon_id, r.progress, r.status, r.youtube_url, r.raw_footage_url, r.platform, r.comment, r.created_at, " +
    "u.username, u.avatar_url, d.name AS demon_name, d.position AS demon_position, d.requirement AS demon_requirement, d.difficulty " +
    "FROM records r JOIN users u ON u.id = r.user_id JOIN demons d ON d.id = r.demon_id " +
    "WHERE r.status = 'pending' ORDER BY r.created_at DESC"
  ).all();
}

function getRecordById(id) {
  return get().prepare(
    "SELECT r.id, r.user_id, r.demon_id, r.progress, r.status, r.youtube_url, r.raw_footage_url, r.platform, r.comment, r.created_at, " +
    "u.username, u.avatar_url, d.name AS demon_name, d.position AS demon_position, d.requirement AS demon_requirement, d.difficulty, d.video_url AS demon_video " +
    "FROM records r JOIN users u ON u.id = r.user_id JOIN demons d ON d.id = r.demon_id " +
    "WHERE r.id = ?"
  ).get(id);
}

function approveRecord(id) {
  return get().prepare(
    "UPDATE records SET status = 'verified' WHERE id = ? AND status = 'pending'"
  ).run(id);
}

function rejectRecord(id) {
  return get().prepare(
    "UPDATE records SET status = 'rejected' WHERE id = ? AND status = 'pending'"
  ).run(id);
}

function updateRecord(id, progress, status, youtubeUrl, platform) {
  return get().prepare(
    "UPDATE records SET progress = ?, status = ?, youtube_url = ?, platform = ? WHERE id = ?"
  ).run(progress, status, youtubeUrl || null, platform || null, id);
}

// Count records a user created in the last N hours (anti spam/farm).
function countRecentRecords(userId, hours) {
  return get().prepare(
    "SELECT COUNT(*) AS c FROM records WHERE user_id = ? AND created_at >= datetime('now', ?)"
  ).get(userId, '-' + hours + ' hours').c;
}

// Auto-ban a user for record spam (called when they exceed the limit).
function autoBanForSpam(userId, reason) {
  const d = get();
  d.prepare("UPDATE users SET banned = 1, updated_at = datetime('now') WHERE id = ?").run(userId);
  d.prepare("DELETE FROM records WHERE user_id = ?").run(userId);
  d.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  logAction({
    user_id: null,
    username: 'SYSTEM',
    email: null,
    ip: null,
    action: 'auto_ban',
    target: 'user#' + userId,
    detail: reason || 'record spam'
  });
}

function getLevelRequests(status) {
  return getSubmissions('level-request', status);
}

function approveLevelRequest(id) {
  const sub = get().prepare("SELECT * FROM submissions WHERE id = ? AND type = 'level-request' AND status = 'pending'").get(id);
  if (!sub) return false;
  const data = JSON.parse(sub.data || '{}');
  addDemon({
    position: data.position != null ? data.position : null,
    name: data.name,
    creator: data.creators || null,
    verifier: data.verifier || null,
    difficulty: data.difficulty || 'Insane',
    video_url: data.video_url || null,
    level_id: data.level_id || null,
    requirement: data.requirement != null ? data.requirement : 100
  });
  updateSubmissionStatus(id, 'approved');
  return true;
}

function createNews(authorId, title, description) {
  return get().prepare(
    "INSERT INTO news (author_id, title, description) VALUES (?, ?, ?)"
  ).run(authorId, title, description).lastInsertRowid;
}

function getNews(limit) {
  const sql =
    "SELECT n.id, n.title, n.description, n.created_at, u.username AS author " +
    "FROM news n LEFT JOIN users u ON u.id = n.author_id ORDER BY n.created_at DESC" +
    (limit ? " LIMIT " + Number(limit) : "");
  return get().prepare(sql).all();
}

function getRegistrationCount(ip) {
  const row = get().prepare(
    "SELECT COUNT(*) AS c FROM registrations WHERE ip = ?"
  ).get(ip);
  return row ? row.c : 0;
}

function recordRegistration(ip) {
  get().prepare(
    "INSERT INTO registrations (ip) VALUES (?)"
  ).run(ip);
}

function getCountryFlag(code) {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1E6;
  const a = code.toUpperCase().charCodeAt(0) - 65;
  const b = code.toUpperCase().charCodeAt(1) - 65;
  return String.fromCodePoint(base + a) + String.fromCodePoint(base + b);
}

function youtubeId(input) {
  if (!input) return '';
  var s = String(input).trim();
  if (!s) return '';
  // already an ID (11 chars, no slashes)
  if (/^[\w-]{11}$/.test(s)) return s;
  var patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/i,
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube\.com\/embed\/)([\w-]{11})/i,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/i,
    /(?:youtube-nocookie\.com\/embed\/)([\w-]{11})/i,
    /(?:youtube\.com\/v\/)([\w-]{11})/i
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = s.match(patterns[i]);
    if (m && m[1]) return m[1];
  }
  return '';
}

function banUser(id) {
  return get().prepare("UPDATE users SET banned = 1, updated_at = datetime('now') WHERE id = ?").run(id);
}

function unbanUser(id) {
  return get().prepare("UPDATE users SET banned = 0, updated_at = datetime('now') WHERE id = ?").run(id);
}

function deleteUser(id) {
  return get().prepare("DELETE FROM users WHERE id = ?").run(id);
}

// Remove all content (submissions, records, sessions) belonging to a user.
function purgeUserContent(id) {
  const d = get();
  d.prepare("DELETE FROM submissions WHERE user_id = ?").run(id);
  d.prepare("DELETE FROM records WHERE user_id = ?").run(id);
  d.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
}

function isUserBanned(id) {
  const row = get().prepare("SELECT banned FROM users WHERE id = ?").get(id);
  return row ? !!row.banned : false;
}

// Log an admin-relevant action (performed by a user) with IP + email.
function logAction(info) {
  const d = get();
  d.prepare(
    "INSERT INTO activity_log (user_id, username, email, ip, action, target, detail, created_at) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
  ).run(
    info.user_id || null,
    info.username || null,
    info.email || null,
    info.ip || null,
    info.action,
    info.target || null,
    info.detail || null
  );
}

function getActivityLog(limit) {
  return get().prepare(
    "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?"
  ).all(limit || 200);
}

function deleteActivityLog(id) {
  return get().prepare("DELETE FROM activity_log WHERE id = ?").run(id);
}

function clearActivityLog() {
  get().prepare("DELETE FROM activity_log").run();
}

function get() {
  if (!db) {
    throw new Error('Database not initialized. Call init() first.');
  }
  return db;
}

// ---- Email verification ----

function generateEmailCode(userId) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  get().prepare(
    "UPDATE users SET email_code = ?, email_code_expires = ? WHERE id = ?"
  ).run(code, expires, userId);
  return code;
}

function verifyEmailCode(userId, code) {
  const u = get().prepare(
    "SELECT email_code, email_code_expires FROM users WHERE id = ?"
  ).get(userId);
  if (!u || !u.email_code) return false;
  if (new Date(u.email_code_expires).getTime() < Date.now()) return false;
  if (u.email_code !== String(code).trim()) return false;
  get().prepare(
    "UPDATE users SET email_verified = 1, email_code = NULL, email_code_expires = NULL WHERE id = ?"
  ).run(userId);
  return true;
}

function setEmailVerified(userId) {
  get().prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(userId);
}

function isEmailVerified(userId) {
  const u = get().prepare("SELECT email_verified FROM users WHERE id = ?").get(userId);
  return u ? !!u.email_verified : false;
}

module.exports = {
  init, get, getStats, getDemons, getDemonById, getDemonRecords, calculateDemonPoints,
  getRecords, getPlayers, getPlayerRating, getPlayerRecords, getCountries,
  createSubmission, getSubmissions, updateSubmissionStatus, getUserById, getUserByEmail,
  setUserRole, getUsers, getTeamMembers, getUsersByRole, addDemon, updateDemon, deleteDemon, setUserCountry, setUserPassword,
  setUsername, usernameExists,
  deleteUserSessions,
  getUserSubmissions,
  addChatMessage, getChatMessages, getChatMessageCount,
  createRecord, createUnregisteredRecord, getPendingRecords, getRecordById, approveRecord, rejectRecord,
  getLevelRequests, approveLevelRequest, createNews, getNews,
  getRecordById, updateRecord,
  generateEmailCode, verifyEmailCode, setEmailVerified, isEmailVerified,
  countRecentRecords, autoBanForSpam,
  getRegistrationCount, recordRegistration, normalizeCountry, getCountryFlag,
  banUser, unbanUser, deleteUser, purgeUserContent, isUserBanned, youtubeId,
  logAction, getActivityLog, deleteActivityLog, clearActivityLog
};
