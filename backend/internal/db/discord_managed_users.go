package db

import "strings"

func ListBoardManagedDiscordUserIDs(conn DBTX, boardID int64) ([]string, error) {
	rows, err := conn.Query(`
		SELECT discord_user_id
		FROM board_discord_managed_users
		WHERE board_id = ?
		ORDER BY discord_user_id ASC
	`, boardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []string
	for rows.Next() {
		var discordUserID string
		if err := rows.Scan(&discordUserID); err != nil {
			return nil, err
		}
		out = append(out, strings.TrimSpace(discordUserID))
	}
	return out, rows.Err()
}

func ReplaceBoardManagedDiscordUserIDs(conn DBTX, boardID int64, discordUserIDs []string) error {
	tx, ok := conn.(interface {
		Begin() (interface {
			Exec(query string, args ...any) (any, error)
			Commit() error
			Rollback() error
		}, error)
	})
	if ok {
		_ = tx
	}

	_, err := conn.Exec(`DELETE FROM board_discord_managed_users WHERE board_id = ?`, boardID)
	if err != nil {
		return err
	}

	seen := map[string]bool{}
	for _, discordUserID := range discordUserIDs {
		discordUserID = strings.TrimSpace(discordUserID)
		if discordUserID == "" || seen[discordUserID] {
			continue
		}
		seen[discordUserID] = true
		if _, err := conn.Exec(`
			INSERT INTO board_discord_managed_users (board_id, discord_user_id)
			VALUES (?, ?)
		`, boardID, discordUserID); err != nil {
			return err
		}
	}

	return nil
}
