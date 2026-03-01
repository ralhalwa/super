package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"strings"

	"taskflow/internal/auth"
	"taskflow/internal/db"
	"taskflow/internal/middleware"
	"taskflow/internal/utils"
)

type API struct {
	conn *sql.DB
}

func NewAPI(conn *sql.DB) *API {
	return &API{conn: conn}
}

func (a *API) JWTSecret() string {
	return os.Getenv("JWT_SECRET")
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a *API) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := utils.ReadJSON(r, &req); err != nil {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "bad json"})
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || req.Password == "" {
		utils.WriteJSON(w, http.StatusBadRequest, map[string]any{"error": "email and password required"})
		return
	}

	id, _, passHash, role, active, err := db.GetUserByEmail(a.conn, req.Email)
	if err != nil || !active || !auth.CheckPassword(passHash, req.Password) {
		utils.WriteJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid credentials"})
		return
	}

	token, err := auth.SignToken(a.JWTSecret(), id, role)
	if err != nil {
		utils.WriteJSON(w, http.StatusInternalServerError, map[string]any{"error": "token error"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"role":  role,
	})
}

func (a *API) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.UserID(r)

	fullName, email, role, active, err := db.GetUserBasic(a.conn, userID)
	if err != nil || !active {
		utils.WriteJSON(w, http.StatusUnauthorized, map[string]any{"error": "user not found"})
		return
	}

	utils.WriteJSON(w, http.StatusOK, map[string]any{
		"id":        userID,
		"full_name": fullName,
		"email":     email,
		"role":      role,
	})
}