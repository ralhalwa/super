package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"taskflow/internal/auth"
	"taskflow/internal/db"
	"taskflow/internal/models"
	"taskflow/internal/utils"
)

type createUserReq struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"` // supervisor|student
}

func (a *API) AdminCreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserReq
	if err := utils.ReadJSON(r, &req); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "bad json"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.FullName = strings.TrimSpace(req.FullName)

	if req.FullName == "" || req.Email == "" || req.Password == "" {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "full_name, email, password required"})
		return
	}
	if req.Role != "supervisor" && req.Role != "student" {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "role must be supervisor or student"})
		return
	}

	passHash, err := auth.HashPassword(req.Password)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "password hash error"})
		return
	}

	userID, err := db.CreateUser(a.conn, req.FullName, req.Email, passHash, req.Role)
	if err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "email already exists or invalid"})
		return
	}

	if req.Role == "supervisor" {
		if err := db.EnsureSupervisorFile(a.conn, userID); err != nil {
			utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "failed to create supervisor file"})
			return
		}
	}

	utils.WriteJSON(w, http.StatusCreated, map[string]any{
		"id":   userID,
		"role": req.Role,
	})
}

func (a *API) AdminListSupervisors(w http.ResponseWriter, r *http.Request) {
	rows, err := a.conn.Query(`
		SELECT u.id, u.full_name, u.email, sf.id, sf.created_at
		FROM users u
		JOIN supervisor_files sf ON sf.supervisor_user_id = u.id
		WHERE u.role = 'supervisor' AND u.is_active = 1
		ORDER BY u.full_name ASC
	`)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "db error"})
		return
	}
	defer rows.Close()

	out := []models.SupervisorRow{}
	for rows.Next() {
		var s models.SupervisorRow
		if err := rows.Scan(&s.SupervisorUserID, &s.FullName, &s.Email, &s.FileID, &s.CreatedAt); err != nil {
			utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "scan error"})
			return
		}
		out = append(out, s)
	}

	utils.WriteJSON(w, http.StatusOK, out)
}

var _ sql.DB // keeps goimports calm sometimes if your editor complains