CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL UNIQUE,
  email       TEXT    NOT NULL UNIQUE,
  password_hash TEXT  NOT NULL,
  role        TEXT    NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin', 'moderator')),
  avatar_url  TEXT    DEFAULT NULL,
  country     TEXT    DEFAULT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demons (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  position    INTEGER DEFAULT NULL,
  name        TEXT    NOT NULL,
  creator     TEXT    DEFAULT NULL,
  verifier    TEXT    DEFAULT NULL,
  difficulty  TEXT    NOT NULL DEFAULT 'Insane',
  video_url   TEXT    DEFAULT NULL,
  level_id    TEXT    DEFAULT NULL,
  requirement INTEGER NOT NULL DEFAULT 100,
  verified    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS records (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  demon_id        INTEGER NOT NULL REFERENCES demons(id) ON DELETE CASCADE,
  progress        INTEGER NOT NULL DEFAULT 100,
  status          TEXT    NOT NULL DEFAULT 'verified' CHECK(status IN ('pending', 'verified', 'rejected')),
  youtube_url     TEXT    DEFAULT NULL,
  raw_footage_url TEXT    DEFAULT NULL,
  platform        TEXT    DEFAULT NULL,
  comment         TEXT    DEFAULT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS news (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_demons_verified ON demons(verified);
CREATE INDEX IF NOT EXISTS idx_records_demon_id ON records(demon_id);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);

CREATE TABLE IF NOT EXISTS submissions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT    NOT NULL CHECK(type IN ('level', 'moderator', 'level-request')),
  status      TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  data        TEXT    NOT NULL DEFAULT '{}',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_type ON submissions(type);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
