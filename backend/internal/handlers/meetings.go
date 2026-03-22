package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"taskflow/internal/db"
	"taskflow/internal/utils"
)

type createMeetingReq struct {
	MeetingID int64  `json:"meeting_id"`
	BoardID   int64  `json:"board_id"`
	Title     string `json:"title"`
	Location  string `json:"location"`
	Notes     string `json:"notes"`
	StartsAt  string `json:"starts_at"`
	EndsAt    string `json:"ends_at"`
}

type deleteMeetingReq struct {
	MeetingID int64 `json:"meeting_id"`
}

func normalizeRole(v string) string {
	role := strings.TrimSpace(strings.ToLower(v))
	if role == "" {
		return "admin"
	}
	return role
}

func parseMeetingTime(raw string) (string, time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", time.Time{}, errors.New("empty time")
	}

	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return "", time.Time{}, err
	}
	return t.UTC().Format(time.RFC3339), t.UTC(), nil
}

func (a *API) AdminListMeetings(w http.ResponseWriter, r *http.Request) {
	role := normalizeRole(r.Header.Get("X-User-Role"))
	if role != "admin" && role != "supervisor" && role != "student" {
		writeErr(w, http.StatusForbidden, "forbidden")
		return
	}

	meetings, err := db.ListMeetings(a.conn, role, actorID(r, a.conn))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	writeJSON(w, http.StatusOK, meetings)
}

func (a *API) AdminCreateMeeting(w http.ResponseWriter, r *http.Request) {
	role := normalizeRole(r.Header.Get("X-User-Role"))
	if role != "admin" && role != "supervisor" {
		writeErr(w, http.StatusForbidden, "only admin or supervisor can create meetings")
		return
	}

	var req createMeetingReq
	if err := utils.ReadJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Location = strings.TrimSpace(req.Location)
	req.Notes = strings.TrimSpace(req.Notes)
	if req.BoardID == 0 || req.Title == "" || req.Location == "" || req.StartsAt == "" || req.EndsAt == "" {
		writeErr(w, http.StatusBadRequest, "board_id, title, location, starts_at and ends_at required")
		return
	}

	startsAt, startTime, err := parseMeetingTime(req.StartsAt)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid starts_at")
		return
	}
	endsAt, endTime, err := parseMeetingTime(req.EndsAt)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid ends_at")
		return
	}
	if !endTime.After(startTime) {
		writeErr(w, http.StatusBadRequest, "end time must be after start time")
		return
	}

	if _, err := db.GetBoardBasic(a.conn, req.BoardID); err != nil {
		writeErr(w, http.StatusNotFound, "board not found")
		return
	}

	boardSupervisorID, err := db.GetBoardSupervisorUserID(a.conn, req.BoardID)
	if err != nil || boardSupervisorID == 0 {
		writeErr(w, http.StatusBadRequest, "board has no supervisor")
		return
	}

	actor := actorID(r, a.conn)
	if role == "supervisor" && actor != boardSupervisorID {
		writeErr(w, http.StatusForbidden, "can only schedule meetings for your own boards")
		return
	}

	meetingID, err := db.CreateMeeting(a.conn, req.BoardID, actor, req.Title, req.Location, req.Notes, startsAt, endsAt)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to create meeting")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id": meetingID,
	})
}

func (a *API) AdminUpdateMeeting(w http.ResponseWriter, r *http.Request) {
	role := normalizeRole(r.Header.Get("X-User-Role"))
	if role != "admin" && role != "supervisor" {
		writeErr(w, http.StatusForbidden, "only admin or supervisor can edit meetings")
		return
	}

	var req createMeetingReq
	if err := utils.ReadJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if req.MeetingID == 0 {
		writeErr(w, http.StatusBadRequest, "meeting_id required")
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Location = strings.TrimSpace(req.Location)
	req.Notes = strings.TrimSpace(req.Notes)
	if req.BoardID == 0 || req.Title == "" || req.Location == "" || req.StartsAt == "" || req.EndsAt == "" {
		writeErr(w, http.StatusBadRequest, "board_id, title, location, starts_at and ends_at required")
		return
	}

	existing, err := db.GetMeetingByID(a.conn, req.MeetingID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "meeting not found")
		return
	}

	startsAt, startTime, err := parseMeetingTime(req.StartsAt)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid starts_at")
		return
	}
	endsAt, endTime, err := parseMeetingTime(req.EndsAt)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid ends_at")
		return
	}
	if !endTime.After(startTime) {
		writeErr(w, http.StatusBadRequest, "end time must be after start time")
		return
	}

	boardSupervisorID, err := db.GetBoardSupervisorUserID(a.conn, req.BoardID)
	if err != nil || boardSupervisorID == 0 {
		writeErr(w, http.StatusBadRequest, "board has no supervisor")
		return
	}

	actor := actorID(r, a.conn)
	if role == "supervisor" && (actor != existing.SupervisorID || actor != boardSupervisorID) {
		writeErr(w, http.StatusForbidden, "can only edit meetings for your own boards")
		return
	}

	if err := db.UpdateMeeting(a.conn, req.MeetingID, req.BoardID, req.Title, req.Location, req.Notes, startsAt, endsAt); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to update meeting")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *API) AdminDeleteMeeting(w http.ResponseWriter, r *http.Request) {
	role := normalizeRole(r.Header.Get("X-User-Role"))
	if role != "admin" && role != "supervisor" {
		writeErr(w, http.StatusForbidden, "only admin or supervisor can delete meetings")
		return
	}

	var req deleteMeetingReq
	if err := utils.ReadJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if req.MeetingID == 0 {
		writeErr(w, http.StatusBadRequest, "meeting_id required")
		return
	}

	meeting, err := db.GetMeetingByID(a.conn, req.MeetingID)
	if err != nil {
		writeErr(w, http.StatusNotFound, "meeting not found")
		return
	}

	actor := actorID(r, a.conn)
	if role == "supervisor" && actor != meeting.SupervisorID {
		writeErr(w, http.StatusForbidden, "can only delete meetings for your own boards")
		return
	}

	if err := db.DeleteMeeting(a.conn, req.MeetingID); err != nil {
		writeErr(w, http.StatusInternalServerError, "failed to delete meeting")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
