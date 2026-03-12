PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS discord_due_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  days_before INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(card_id, user_id, days_before, due_date)
);
