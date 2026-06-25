CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL,
  provider_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_user TEXT,
  core_features TEXT,
  related_trends TEXT,
  why_now TEXT,
  monetization TEXT,
  difficulty TEXT,
  estimated_mvp_days INTEGER,
  source_article TEXT,
  source_article_url TEXT,
  source_article_score REAL,
  source_article_source TEXT,
  social_pulse_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  idea_id TEXT NOT NULL REFERENCES ideas(id),
  vote_type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, idea_id)
);

CREATE TABLE IF NOT EXISTS email_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_votes_idea_id ON votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_date ON ideas(date);
CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email);
