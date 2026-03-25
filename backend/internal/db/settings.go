package db

import (
	"database/sql"
	"strings"
)

func GetAppSetting(conn DBTX, key string) (string, error) {
	var value string
	err := conn.QueryRow(`
		SELECT value
		FROM app_settings
		WHERE key = ?
		LIMIT 1
	`, strings.TrimSpace(key)).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(value), nil
}

func UpsertAppSetting(conn DBTX, key, value string) error {
	_, err := conn.Exec(`
		INSERT INTO app_settings (key, value, updated_at)
		VALUES (?, ?, datetime('now'))
		ON CONFLICT(key) DO UPDATE SET
		  value = excluded.value,
		  updated_at = datetime('now')
	`, strings.TrimSpace(key), strings.TrimSpace(value))
	return err
}
