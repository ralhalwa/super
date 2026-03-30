package db

func GetUserRole(conn DBTX, userID int64) (string, error) {
	var role string
	err := conn.QueryRow(`
		SELECT
			CASE
				WHEN u.role IN ('student', 'supervisor') THEN u.role
				WHEN EXISTS (
					SELECT 1
					FROM user_roles ur
					WHERE ur.user_id = u.id AND ur.role = 'supervisor'
				) THEN 'supervisor'
				WHEN EXISTS (
					SELECT 1
					FROM user_roles ur
					WHERE ur.user_id = u.id AND ur.role = 'student'
				) THEN 'student'
				ELSE u.role
			END
		FROM users u
		WHERE u.id = ?
	`, userID).Scan(&role)
	if err != nil {
		return "", err
	}
	return role, nil
}
