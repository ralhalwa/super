package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"

	"taskflow/internal/discord"
)

type API struct {
	conn    *sql.DB
	discord *discord.Service
	stop    context.CancelFunc
}

func NewAPI(conn *sql.DB, discordSvc *discord.Service) *API {
	return &API{conn: conn, discord: discordSvc}
}

func (a *API) Shutdown() {
	if a.stop != nil {
		a.stop()
	}
}

// Shared JSON helpers (use everywhere)
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]any{
		"ok":    false,
		"error": msg,
	})
}
