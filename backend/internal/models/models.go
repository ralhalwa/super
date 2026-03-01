package models

type User struct {
	ID        int64  `json:"id"`
	FullName  string `json:"full_name"`
	Email     string `json:"email"`
	Role      string `json:"role"` // admin|supervisor|student
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

type SupervisorRow struct {
	SupervisorUserID int64  `json:"supervisor_user_id"`
	FullName         string `json:"full_name"`
	Email            string `json:"email"`
	FileID           int64  `json:"file_id"`
	CreatedAt        string `json:"created_at"`
}