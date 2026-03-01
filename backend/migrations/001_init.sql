PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','supervisor','student')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- auto "file" per supervisor (created when supervisor is created)
CREATE TABLE IF NOT EXISTS supervisor_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supervisor_user_id INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (supervisor_user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Seed admin (password = Admin123! ) - change later
-- We'll insert from Go on first run instead (safer), so nothing here for now.