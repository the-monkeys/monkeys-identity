package models

import "time"

// ContentItem represents a generic piece of content (blog, video, tweet, comment, etc.)
// The content_type discriminator determines the kind, while metadata JSONB holds type-specific data.
type ContentItem struct {
	ID             string     `json:"id" db:"id"`
	ContentType    string     `json:"content_type" db:"content_type"` // blog, video, tweet, comment, ...
	Title          string     `json:"title" db:"title"`
	Slug           string     `json:"slug" db:"slug"`
	Body           string     `json:"body" db:"body"`
	Summary        string     `json:"summary" db:"summary"`
	CoverImageURL  string     `json:"cover_image_url" db:"cover_image_url"`
	ParentID       *string    `json:"parent_id,omitempty" db:"parent_id"` // nullable — for comments / threads
	OwnerID        string     `json:"owner_id" db:"owner_id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	Status         string     `json:"status" db:"status"` // draft, published, archived, private, hidden
	Tags           string     `json:"tags" db:"tags"`     // JSONB
	Metadata       string     `json:"metadata" db:"metadata"` // JSONB — type-specific data
	PublishedAt    *time.Time `json:"published_at" db:"published_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// ContentCollaborator represents a user's role on a specific content item
type ContentCollaborator struct {
	ContentID string    `json:"content_id" db:"content_id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Role      string    `json:"role" db:"role"` // owner, co-author
	InvitedBy string    `json:"invited_by" db:"invited_by"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ContentCollaboratorWithUser extends collaborator with user display information
type ContentCollaboratorWithUser struct {
	ContentCollaborator
	Username    string `json:"username" db:"username"`
	Email       string `json:"email" db:"email"`
	DisplayName string `json:"display_name" db:"display_name"`
}
