CREATE TABLE IF NOT EXISTS meeting_room_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  days_before INTEGER NOT NULL,
  meeting_date TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, days_before, meeting_date)
);
