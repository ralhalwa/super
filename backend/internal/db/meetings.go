package db

import (
	"database/sql"
	"strings"

	"taskflow/internal/models"
)

func CreateMeeting(conn *sql.DB, boardID, createdBy int64, title, location, notes, startsAt, endsAt string) (int64, error) {
	title = strings.TrimSpace(title)
	location = strings.TrimSpace(location)
	notes = strings.TrimSpace(notes)
	startsAt = strings.TrimSpace(startsAt)
	endsAt = strings.TrimSpace(endsAt)

	res, err := conn.Exec(`
		INSERT INTO meetings (board_id, created_by, title, location, notes, starts_at, ends_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, boardID, createdBy, title, location, notes, startsAt, endsAt)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func GetMeetingByID(conn *sql.DB, meetingID int64) (models.Meeting, error) {
	var meeting models.Meeting
	err := conn.QueryRow(`
		SELECT
			m.id,
			m.board_id,
			b.name,
			sf.supervisor_user_id,
			su.full_name,
			m.created_by,
			cu.full_name,
			m.title,
			m.location,
			IFNULL(m.notes, ''),
			m.starts_at,
			m.ends_at,
			m.created_at
		FROM meetings m
		JOIN boards b ON b.id = m.board_id
		JOIN supervisor_files sf ON sf.id = b.supervisor_file_id
		JOIN users su ON su.id = sf.supervisor_user_id
		JOIN users cu ON cu.id = m.created_by
		WHERE m.id = ?
	`, meetingID).Scan(
		&meeting.ID,
		&meeting.BoardID,
		&meeting.BoardName,
		&meeting.SupervisorID,
		&meeting.Supervisor,
		&meeting.CreatedBy,
		&meeting.CreatedByName,
		&meeting.Title,
		&meeting.Location,
		&meeting.Notes,
		&meeting.StartsAt,
		&meeting.EndsAt,
		&meeting.CreatedAt,
	)
	return meeting, err
}

func UpdateMeeting(conn *sql.DB, meetingID, boardID int64, title, location, notes, startsAt, endsAt string) error {
	title = strings.TrimSpace(title)
	location = strings.TrimSpace(location)
	notes = strings.TrimSpace(notes)
	startsAt = strings.TrimSpace(startsAt)
	endsAt = strings.TrimSpace(endsAt)

	_, err := conn.Exec(`
		UPDATE meetings
		SET board_id = ?, title = ?, location = ?, notes = ?, starts_at = ?, ends_at = ?
		WHERE id = ?
	`, boardID, title, location, notes, startsAt, endsAt, meetingID)
	return err
}

func DeleteMeeting(conn *sql.DB, meetingID int64) error {
	_, err := conn.Exec(`DELETE FROM meetings WHERE id = ?`, meetingID)
	return err
}

func ListMeetings(conn *sql.DB, role string, actorID int64) ([]models.Meeting, error) {
	base := `
		SELECT
			m.id,
			m.board_id,
			b.name,
			sf.supervisor_user_id,
			su.full_name,
			m.created_by,
			cu.full_name,
			m.title,
			m.location,
			IFNULL(m.notes, ''),
			m.starts_at,
			m.ends_at,
			m.created_at
		FROM meetings m
		JOIN boards b ON b.id = m.board_id
		JOIN supervisor_files sf ON sf.id = b.supervisor_file_id
		JOIN users su ON su.id = sf.supervisor_user_id
		JOIN users cu ON cu.id = m.created_by
	`

	var (
		rows *sql.Rows
		err  error
	)

	switch strings.ToLower(strings.TrimSpace(role)) {
	case "admin":
		rows, err = conn.Query(base + ` ORDER BY m.starts_at ASC, m.id ASC`)
	case "supervisor":
		rows, err = conn.Query(base+`
			WHERE sf.supervisor_user_id = ?
			ORDER BY m.starts_at ASC, m.id ASC
		`, actorID)
	case "student":
		rows, err = conn.Query(base+`
			JOIN board_members bm ON bm.board_id = b.id
			WHERE bm.user_id = ?
			ORDER BY m.starts_at ASC, m.id ASC
		`, actorID)
	default:
		rows, err = conn.Query(base + ` WHERE 1 = 0`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.Meeting{}
	for rows.Next() {
		var meeting models.Meeting
		if err := rows.Scan(
			&meeting.ID,
			&meeting.BoardID,
			&meeting.BoardName,
			&meeting.SupervisorID,
			&meeting.Supervisor,
			&meeting.CreatedBy,
			&meeting.CreatedByName,
			&meeting.Title,
			&meeting.Location,
			&meeting.Notes,
			&meeting.StartsAt,
			&meeting.EndsAt,
			&meeting.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, meeting)
	}

	return out, rows.Err()
}
