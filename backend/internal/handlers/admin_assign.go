package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
)

type assignUser struct {
	ID       int    `json:"id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Role     string `json:"role,omitempty"`
}


func writeJSON2(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr2(w http.ResponseWriter, status int, msg string) {
	writeJSON2(w, status, map[string]any{
		"ok":    false,
		"error": msg,
	})
}

/*
GET /admin/assign/supervisors
Returns all active supervisors
*/
func (api *API) AdminAssignListSupervisors(w http.ResponseWriter, r *http.Request) {
	rows, err := api.conn.Query(`
		SELECT id, full_name, email, role
		FROM users
		WHERE role='supervisor' AND is_active=1
		ORDER BY full_name ASC
	`)
	if err != nil {
		writeErr2(w, 500, err.Error())
		return
	}
	defer rows.Close()

	out := []assignUser{}
	for rows.Next() {
		var u assignUser
		if err := rows.Scan(&u.ID, &u.FullName, &u.Email, &u.Role); err != nil {
			writeErr2(w, 500, err.Error())
			return
		}
		out = append(out, u)
	}
	writeJSON2(w, 200, out)
}

/*
GET /admin/assign/students?q=
Returns all active students (optionally filtered by q)
*/
func (api *API) AdminAssignListStudents(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	qLike := "%" + strings.ToLower(q) + "%"

	var rows *sql.Rows
	var err error

	if q == "" {
		rows, err = api.conn.Query(`
			SELECT id, full_name, email, role
			FROM users
			WHERE role='student' AND is_active=1
			ORDER BY full_name ASC
		`)
	} else {
		rows, err = api.conn.Query(`
			SELECT id, full_name, email, role
			FROM users
			WHERE role='student' AND is_active=1
			  AND (LOWER(full_name) LIKE ? OR LOWER(email) LIKE ?)
			ORDER BY full_name ASC
			LIMIT 200
		`, qLike, qLike)
	}

	if err != nil {
		writeErr2(w, 500, err.Error())
		return
	}
	defer rows.Close()

	out := []assignUser{}
	for rows.Next() {
		var u assignUser
		if err := rows.Scan(&u.ID, &u.FullName, &u.Email, &u.Role); err != nil {
			writeErr2(w, 500, err.Error())
			return
		}
		out = append(out, u)
	}
	writeJSON2(w, 200, out)
}

/*
GET /admin/assign/list?supervisor_id=#
Returns students assigned to supervisor
*/
func (api *API) AdminAssignList(w http.ResponseWriter, r *http.Request) {
	sid := strings.TrimSpace(r.URL.Query().Get("supervisor_id"))
	if sid == "" {
		writeErr2(w, 400, "supervisor_id is required")
		return
	}

	rows, err := api.conn.Query(`
		SELECT u.id, u.full_name, u.email
		FROM supervisor_students ss
		JOIN users u ON u.id = ss.student_user_id
		WHERE ss.supervisor_user_id = ?
		ORDER BY u.full_name ASC
	`, sid)
	if err != nil {
		writeErr2(w, 500, err.Error())
		return
	}
	defer rows.Close()

	out := []assignUser{}
	for rows.Next() {
		var u assignUser
		if err := rows.Scan(&u.ID, &u.FullName, &u.Email); err != nil {
			writeErr2(w, 500, err.Error())
			return
		}
		out = append(out, u)
	}
	writeJSON2(w, 200, out)
}

type assignBody struct {
	SupervisorID int `json:"supervisor_id"`
	StudentID    int `json:"student_id"`
}

/*
POST /admin/assign
Body: { supervisor_id, student_id }
Assign student to supervisor
*/
func (api *API) AdminAssignAdd(w http.ResponseWriter, r *http.Request) {
	var body assignBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr2(w, 400, "invalid json")
		return
	}
	if body.SupervisorID == 0 || body.StudentID == 0 {
		writeErr2(w, 400, "supervisor_id and student_id are required")
		return
	}

	_, err := api.conn.Exec(`
		INSERT OR IGNORE INTO supervisor_students(supervisor_user_id, student_user_id)
		VALUES(?, ?)
	`, body.SupervisorID, body.StudentID)
	if err != nil {
		writeErr2(w, 500, err.Error())
		return
	}

	writeJSON2(w, 200, map[string]any{"ok": true})
}

/*
POST /admin/assign/remove
Body: { supervisor_id, student_id }
Remove assignment
*/
func (api *API) AdminAssignRemove(w http.ResponseWriter, r *http.Request) {
	var body assignBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr2(w, 400, "invalid json")
		return
	}
	if body.SupervisorID == 0 || body.StudentID == 0 {
		writeErr2(w, 400, "supervisor_id and student_id are required")
		return
	}

	_, err := api.conn.Exec(`
		DELETE FROM supervisor_students
		WHERE supervisor_user_id=? AND student_user_id=?
	`, body.SupervisorID, body.StudentID)
	if err != nil {
		writeErr2(w, 500, err.Error())
		return
	}

	writeJSON2(w, 200, map[string]any{"ok": true})
}