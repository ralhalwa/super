package db

import (
	"database/sql"
	"strings"

	"taskflow/internal/models"
)

func ListPendingDiscordDueNotifications(conn DBTX, today string) ([]models.DiscordDueNotification, error) {
	rows, err := conn.Query(`
		SELECT
			c.id,
			c.title,
			COALESCE(c.due_date, ''),
			COALESCE(c.status, 'todo'),
			b.id,
			b.name,
			bdc.channel_id,
			u.id,
			u.full_name,
			IFNULL(u.nickname, ''),
			IFNULL(u.discord_user_id, '')
		FROM cards c
		JOIN lists l ON l.id = c.list_id
		JOIN boards b ON b.id = l.board_id
		JOIN board_discord_channels bdc ON bdc.board_id = b.id
		JOIN card_assignments ca ON ca.card_id = c.id
		JOIN users u ON u.id = ca.user_id
		WHERE TRIM(COALESCE(c.due_date, '')) <> ''
		  AND LOWER(COALESCE(c.status, 'todo')) <> 'done'
		  AND date(c.due_date) BETWEEN date(?) AND date(?, '+2 day')
		ORDER BY date(c.due_date) ASC, c.id ASC, u.id ASC
	`, today, today)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.DiscordDueNotification
	for rows.Next() {
		var item models.DiscordDueNotification
		if err := rows.Scan(
			&item.CardID,
			&item.CardTitle,
			&item.DueDate,
			&item.CardStatus,
			&item.BoardID,
			&item.BoardName,
			&item.ChannelID,
			&item.UserID,
			&item.UserFullName,
			&item.UserNickname,
			&item.DiscordUserID,
		); err != nil {
			return nil, err
		}
		item.DueDate = strings.TrimSpace(item.DueDate)
		item.CardStatus = strings.TrimSpace(strings.ToLower(item.CardStatus))
		item.ChannelID = strings.TrimSpace(item.ChannelID)
		item.DiscordUserID = strings.TrimSpace(item.DiscordUserID)
		out = append(out, item)
	}
	return out, nil
}

func HasDiscordDueNotificationSent(conn DBTX, cardID, userID int64, daysBefore int, dueDate string) (bool, error) {
	var exists int
	err := conn.QueryRow(`
		SELECT 1
		FROM discord_due_notifications
		WHERE card_id = ? AND user_id = ? AND days_before = ? AND due_date = ?
		LIMIT 1
	`, cardID, userID, daysBefore, strings.TrimSpace(dueDate)).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func MarkDiscordDueNotificationSent(conn DBTX, cardID, userID int64, daysBefore int, dueDate string) error {
	_, err := conn.Exec(`
		INSERT INTO discord_due_notifications (card_id, user_id, days_before, due_date)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(card_id, user_id, days_before, due_date) DO NOTHING
	`, cardID, userID, daysBefore, strings.TrimSpace(dueDate))
	return err
}
