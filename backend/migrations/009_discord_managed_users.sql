PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS board_discord_managed_users (
  board_id INTEGER NOT NULL,
  discord_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (board_id, discord_user_id),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);
