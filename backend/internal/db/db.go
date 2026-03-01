package db

import (
	"database/sql"
	"errors"
	"os"

	"taskflow/internal/auth"
)

func SeedAdmin(conn *sql.DB) error {
	// if any admin exists, skip
	var count int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM users WHERE role='admin'`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hash, err := auth.HashPassword("Admin123!")
	if err != nil {
		return err
	}

	_, err = conn.Exec(`
		INSERT INTO users (full_name, email, password_hash, role)
		VALUES (?, ?, ?, 'admin')
	`, "System Admin", "admin@local.test", hash)

	// ensure data folder exists if path points there
	_ = os.MkdirAll("./data", 0755)

	return err
}

func GetUserByEmail(conn *sql.DB, email string) (id int64, fullName, passHash, role string, isActive bool, err error) {
	var activeInt int
	err = conn.QueryRow(`
		SELECT id, full_name, password_hash, role, is_active
		FROM users WHERE email = ?
	`, email).Scan(&id, &fullName, &passHash, &role, &activeInt)

	if err != nil {
		return 0, "", "", "", false, err
	}
	return id, fullName, passHash, role, activeInt == 1, nil
}

func GetUserBasic(conn *sql.DB, id int64) (fullName, email, role string, isActive bool, err error) {
	var activeInt int
	err = conn.QueryRow(`
		SELECT full_name, email, role, is_active
		FROM users WHERE id = ?
	`, id).Scan(&fullName, &email, &role, &activeInt)
	if err != nil {
		return "", "", "", false, err
	}
	return fullName, email, role, activeInt == 1, nil
}

func CreateUser(conn *sql.DB, fullName, email, passHash, role string) (int64, error) {
	res, err := conn.Exec(`
		INSERT INTO users (full_name, email, password_hash, role)
		VALUES (?, ?, ?, ?)
	`, fullName, email, passHash, role)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

func EnsureSupervisorFile(conn *sql.DB, supervisorUserID int64) error {
	// insert if not exists
	_, err := conn.Exec(`
		INSERT INTO supervisor_files (supervisor_user_id)
		VALUES (?)
		ON CONFLICT(supervisor_user_id) DO NOTHING
	`, supervisorUserID)
	return err
}

var ErrForbidden = errors.New("forbidden")