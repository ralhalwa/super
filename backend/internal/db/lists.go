package db

import (
	"database/sql"
	"strings"

	"taskflow/internal/models"
)

// Lists
func CreateList(conn *sql.DB, boardID int64, title string) (int64, error) {
	title = strings.TrimSpace(title)

	var nextPos int64
	_ = conn.QueryRow(`SELECT COALESCE(MAX(position), -1) + 1 FROM lists WHERE board_id = ?`, boardID).Scan(&nextPos)

	res, err := conn.Exec(`
		INSERT INTO lists (board_id, title, position)
		VALUES (?, ?, ?)
	`, boardID, title, nextPos)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func ListLists(conn *sql.DB, boardID int64) ([]models.List, error) {
	rows, err := conn.Query(`
		SELECT id, board_id, title, position, created_at
		FROM lists
		WHERE board_id = ?
		ORDER BY position ASC
	`, boardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.List{}
	for rows.Next() {
		var l models.List
		if err := rows.Scan(&l.ID, &l.BoardID, &l.Title, &l.Position, &l.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, nil
}

func GetBoardIDByListID(conn *sql.DB, listID int64) (int64, error) {
	var boardID int64
	err := conn.QueryRow(`SELECT board_id FROM lists WHERE id = ?`, listID).Scan(&boardID)
	return boardID, err
}

func DeleteList(conn *sql.DB, listID int64) error {
	_, err := conn.Exec(`DELETE FROM lists WHERE id = ?`, listID)
	return err
}

func UpdateListTitle(conn *sql.DB, listID int64, title string) error {
	title = strings.TrimSpace(title)
	_, err := conn.Exec(`UPDATE lists SET title = ? WHERE id = ?`, title, listID)
	return err
}
