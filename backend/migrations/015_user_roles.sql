CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('supervisor','student')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
