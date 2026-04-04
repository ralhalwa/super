package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"taskflow/internal/db"
	"taskflow/internal/models"
)

type notificationEnvelope struct {
	Type         string                 `json:"type"`
	Notification models.AppNotification `json:"notification"`
}

type notificationHub struct {
	mu      sync.RWMutex
	clients map[int64]map[*websocket.Conn]struct{}
}

func newNotificationHub() *notificationHub {
	return &notificationHub{
		clients: map[int64]map[*websocket.Conn]struct{}{},
	}
}

func (h *notificationHub) add(userID int64, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[userID] == nil {
		h.clients[userID] = map[*websocket.Conn]struct{}{}
	}
	h.clients[userID][conn] = struct{}{}
}

func (h *notificationHub) remove(userID int64, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	userClients := h.clients[userID]
	if userClients == nil {
		return
	}
	delete(userClients, conn)
	if len(userClients) == 0 {
		delete(h.clients, userID)
	}
}

func (h *notificationHub) broadcast(userID int64, item models.AppNotification) {
	h.mu.RLock()
	connections := make([]*websocket.Conn, 0, len(h.clients[userID]))
	for conn := range h.clients[userID] {
		connections = append(connections, conn)
	}
	h.mu.RUnlock()

	if len(connections) == 0 {
		return
	}

	payload := notificationEnvelope{
		Type:         "notification.created",
		Notification: item,
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	for _, conn := range connections {
		_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			_ = conn.Close()
			h.remove(userID, conn)
		}
	}
}

var notificationUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (a *API) NotificationStream(w http.ResponseWriter, r *http.Request) {
	userID := actorID(r, a.conn)
	if userID <= 0 {
		writeErr(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	conn, err := notificationUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	a.notifications.add(userID, conn)
	defer func() {
		a.notifications.remove(userID, conn)
		_ = conn.Close()
	}()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}

func (a *API) createAndBroadcastNotification(userID int64, kind, title, body, link string) {
	item, err := db.CreateNotification(a.conn, userID, kind, title, body, link)
	if err != nil {
		log.Printf("notification create failed for user %d: %v", userID, err)
		return
	}
	a.notifications.broadcast(userID, item)
}
