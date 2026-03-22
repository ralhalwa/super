package db

import (
	"database/sql"
	"strings"

	"taskflow/internal/models"
)

func ListMeetingsForRoomNotifications(conn DBTX) ([]models.MeetingRoomNotification, error) {
	rows, err := conn.Query(`
		SELECT id, board_id, '', title, location, starts_at, ends_at
		FROM meetings
		WHERE TRIM(COALESCE(location, '')) <> ''
		ORDER BY starts_at ASC, id ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.MeetingRoomNotification{}
	for rows.Next() {
		var item models.MeetingRoomNotification
		if err := rows.Scan(
			&item.MeetingID,
			&item.BoardID,
			&item.BoardName,
			&item.Title,
			&item.Location,
			&item.StartsAt,
			&item.EndsAt,
		); err != nil {
			return nil, err
		}
		item.Location = strings.TrimSpace(item.Location)
		out = append(out, item)
	}
	return out, rows.Err()
}

func HasMeetingRoomNotificationSent(conn DBTX, meetingID int64, daysBefore int, meetingDate string) (bool, error) {
	var exists int
	err := conn.QueryRow(`
		SELECT 1
		FROM meeting_room_notifications
		WHERE meeting_id = ? AND days_before = ? AND meeting_date = ?
		LIMIT 1
	`, meetingID, daysBefore, strings.TrimSpace(meetingDate)).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func MarkMeetingRoomNotificationSent(conn DBTX, meetingID int64, daysBefore int, meetingDate string) error {
	_, err := conn.Exec(`
		INSERT INTO meeting_room_notifications (meeting_id, days_before, meeting_date)
		VALUES (?, ?, ?)
		ON CONFLICT(meeting_id, days_before, meeting_date) DO NOTHING
	`, meetingID, daysBefore, strings.TrimSpace(meetingDate))
	return err
}
