package handlers

import (
	"net/http"
	"strings"

	"taskflow/internal/db"
	"taskflow/internal/utils"
)

type discordSettingsResp struct {
	RoomsBookingsChannelID string `json:"rooms_bookings_channel_id"`
	TalentRoleID           string `json:"talent_role_id"`
}

type updateDiscordSettingsReq struct {
	RoomsBookingsChannelID string `json:"rooms_bookings_channel_id"`
	TalentRoleID           string `json:"talent_role_id"`
}

func (a *API) roomBookingConfig() (string, string) {
	channelID, _ := db.GetAppSetting(a.conn, "discord_rooms_bookings_channel_id")
	roleID, _ := db.GetAppSetting(a.conn, "discord_talent_role_id")
	if strings.TrimSpace(channelID) == "" {
		channelID = strings.TrimSpace(a.roomsBookingsChannelID)
	}
	if strings.TrimSpace(roleID) == "" {
		roleID = strings.TrimSpace(a.roomsBookingsRoleID)
	}
	return strings.TrimSpace(channelID), strings.TrimSpace(roleID)
}

func (a *API) DiscordSettings(w http.ResponseWriter, r *http.Request) {
	channelID, roleID := a.roomBookingConfig()
	writeJSON(w, http.StatusOK, discordSettingsResp{
		RoomsBookingsChannelID: channelID,
		TalentRoleID:           roleID,
	})
}

func (a *API) UpdateDiscordSettings(w http.ResponseWriter, r *http.Request) {
	var req updateDiscordSettingsReq
	if err := utils.ReadJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}

	if err := db.UpsertAppSetting(a.conn, "discord_rooms_bookings_channel_id", req.RoomsBookingsChannelID); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to save channel id")
		return
	}
	if err := db.UpsertAppSetting(a.conn, "discord_talent_role_id", req.TalentRoleID); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to save role id")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
