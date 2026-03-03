PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS supervisor_students (
  supervisor_user_id INTEGER NOT NULL,
  student_user_id    INTEGER NOT NULL,
  assigned_at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (supervisor_user_id, student_user_id),
  FOREIGN KEY (supervisor_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_user_id)    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sup_students_supervisor
ON supervisor_students(supervisor_user_id);

CREATE INDEX IF NOT EXISTS idx_sup_students_student
ON supervisor_students(student_user_id);