package middleware

import (
	"context"
	"database/sql"
	"net/http"
	"strings"

	"taskflow/internal/auth"
	"taskflow/internal/db"
	"taskflow/internal/utils"
)

type ctxKey string

const (
	ctxUserID ctxKey = "user_id"
	ctxRole   ctxKey = "role"
)

func RequireAuth(secret string, conn *sql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if h == "" || !strings.HasPrefix(h, "Bearer ") {
				utils.WriteJSON(w, http.StatusUnauthorized, map[string]any{"error": "missing token"})
				return
			}
			tokenStr := strings.TrimPrefix(h, "Bearer ")

			claims, err := auth.ParseToken(secret, tokenStr)
			if err != nil {
				utils.WriteJSON(w, http.StatusUnauthorized, map[string]any{"error": "invalid token"})
				return
			}

			// optional: check user is still active
			_, _, _, active, err := db.GetUserBasic(conn, claims.UserID)
			if err != nil || !active {
				utils.WriteJSON(w, http.StatusUnauthorized, map[string]any{"error": "user inactive"})
				return
			}

			ctx := context.WithValue(r.Context(), ctxUserID, claims.UserID)
			ctx = context.WithValue(ctx, ctxRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			got, _ := r.Context().Value(ctxRole).(string)
			if got != role {
				utils.WriteJSON(w, http.StatusForbidden, map[string]any{"error": "forbidden"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func UserID(r *http.Request) int64 {
	id, _ := r.Context().Value(ctxUserID).(int64)
	return id
}

func Role(r *http.Request) string {
	role, _ := r.Context().Value(ctxRole).(string)
	return role
}