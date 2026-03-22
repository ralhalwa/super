package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"taskflow/internal/discord"
)

type API struct {
	conn                   *sql.DB
	discord                *discord.Service
	stop                   context.CancelFunc
	roomsBookingsChannelID string
	roomsBookingsMention   string
}

func NewAPI(conn *sql.DB, discordSvc *discord.Service) *API {
	channelID := strings.TrimSpace(os.Getenv("DISCORD_ROOMS_BOOKINGS_CHANNEL_ID"))
	roleID := strings.TrimSpace(os.Getenv("DISCORD_TALENT_ROLE_ID"))
	mention := ""
	if roleID != "" {
		mention = "<@&" + roleID + ">"
	}

	return &API{
		conn:                   conn,
		discord:                discordSvc,
		roomsBookingsChannelID: channelID,
		roomsBookingsMention:   mention,
	}
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
