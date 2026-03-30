package db

func AddUserRole(conn DBTX, userID int64, role string) error {
	_, err := conn.Exec(`
		INSERT INTO user_roles (user_id, role)
		VALUES (?, ?)
		ON CONFLICT(user_id, role) DO NOTHING
	`, userID, role)
	return err
}

func RemoveUserRole(conn DBTX, userID int64, role string) error {
	_, err := conn.Exec(`
		DELETE FROM user_roles
		WHERE user_id = ? AND role = ?
	`, userID, role)
	return err
}

func UserHasExtraRole(conn DBTX, userID int64, role string) (bool, error) {
	var count int
	err := conn.QueryRow(`
		SELECT COUNT(*)
		FROM user_roles
		WHERE user_id = ? AND role = ?
	`, userID, role).Scan(&count)
	return count > 0, err
}

func UserHasRole(conn DBTX, userID int64, role string) (bool, error) {
	var count int
	err := conn.QueryRow(`
		SELECT COUNT(*)
		FROM users u
		WHERE u.id = ?
		  AND (
		    u.role = ?
		    OR EXISTS (
		      SELECT 1
		      FROM user_roles ur
		      WHERE ur.user_id = u.id AND ur.role = ?
		    )
		  )
	`, userID, role, role).Scan(&count)
	return count > 0, err
}

func CountStudentRoleDependencies(conn DBTX, userID int64) (int, error) {
	var count int
	err := conn.QueryRow(`
		SELECT
		  (SELECT COUNT(*) FROM supervisor_students WHERE student_user_id = ?)
		  + (SELECT COUNT(*) FROM board_members WHERE user_id = ?)
		  + (SELECT COUNT(*) FROM card_assignments WHERE user_id = ?)
	`, userID, userID, userID).Scan(&count)
	return count, err
}

func CountSupervisorRoleDependencies(conn DBTX, userID int64) (int, error) {
	var count int
	err := conn.QueryRow(`
		SELECT
		  (SELECT COUNT(*) FROM supervisor_files sf
		    JOIN boards b ON b.supervisor_file_id = sf.id
		    WHERE sf.supervisor_user_id = ?)
		  + (SELECT COUNT(*) FROM supervisor_students WHERE supervisor_user_id = ?)
		  + (SELECT COUNT(*) FROM board_members WHERE user_id = ?)
	`, userID, userID, userID).Scan(&count)
	return count, err
}

func DeleteSupervisorFileByUserID(conn DBTX, userID int64) error {
	_, err := conn.Exec(`
		DELETE FROM supervisor_files
		WHERE supervisor_user_id = ?
	`, userID)
	return err
}

func UpdateUserBasics(conn DBTX, userID int64, fullName, email, nickname, cohort string) error {
	_, err := conn.Exec(`
		UPDATE users
		SET full_name = ?,
		    email = ?,
		    nickname = ?,
		    cohort = ?
		WHERE id = ?
	`, fullName, email, nickname, cohort, userID)
	return err
}

func GetUserByEmailFull(conn DBTX, email string) (id int64, fullName, passwordHash, role string, isActive bool, nickname, cohort string, err error) {
	var activeInt int
	err = conn.QueryRow(`
		SELECT id, full_name, password_hash, role, is_active, IFNULL(nickname,''), IFNULL(cohort,'')
		FROM users
		WHERE email = ?
	`, email).Scan(&id, &fullName, &passwordHash, &role, &activeInt, &nickname, &cohort)
	if err != nil {
		return 0, "", "", "", false, "", "", err
	}
	return id, fullName, passwordHash, role, activeInt == 1, nickname, cohort, nil
}

func UserRoleExistsByEmail(conn DBTX, email, role string) (bool, error) {
	var count int
	err := conn.QueryRow(`
		SELECT COUNT(*)
		FROM users u
		WHERE LOWER(u.email) = LOWER(?)
		  AND (
		    u.role = ?
		    OR EXISTS (
		      SELECT 1
		      FROM user_roles ur
		      WHERE ur.user_id = u.id AND ur.role = ?
		    )
		  )
	`, email, role, role).Scan(&count)
	return count > 0, err
}
